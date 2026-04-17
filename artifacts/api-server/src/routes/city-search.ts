import { Router } from "express";

const router = Router();

interface PhotonFeature {
  properties: {
    osm_id?: number;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

interface CityResult {
  id: string;
  name: string;
  state?: string;
  country: string;
  display: string;
}

// Pakistan bounding box for domestic filtering
const PAKISTAN_BBOX = "60.87,23.69,77.84,37.08";

function parsePhoton(features: PhotonFeature[]): CityResult[] {
  const seen = new Set<string>();
  const results: CityResult[] = [];

  for (const f of features) {
    const p = f.properties;
    const name = p.name ?? p.city ?? "";
    const country = p.country ?? "";
    if (!name || !country) continue;
    const key = `${name}|${p.state ?? ""}|${country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const display = p.state
      ? `${name}, ${p.state}, ${country}`
      : `${name}, ${country}`;
    results.push({
      id: `${p.osm_id ?? Math.random()}`,
      name,
      state: p.state,
      country,
      display,
    });
  }

  return results.slice(0, 7);
}

router.get("/city-search", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim() ?? "";
  const domestic = req.query.domestic === "true";

  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }

  try {
    const params = new URLSearchParams({ q, limit: "10", lang: "en" });
    if (domestic) {
      params.set("bbox", PAKISTAN_BBOX);
    }

    const response = await fetch(
      `https://photon.komoot.io/api/?${params.toString()}`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      res.json({ results: [] });
      return;
    }

    const data = (await response.json()) as { features?: PhotonFeature[] };
    let results = parsePhoton(data.features ?? []);

    // Extra filter: when domestic, keep only Pakistan results
    if (domestic) {
      results = results.filter((r) =>
        r.country.toLowerCase().includes("pakistan")
      );
    }

    res.json({ results });
  } catch (err: unknown) {
    req.log?.error(err, "city-search error");
    res.json({ results: [] });
  }
});

export default router;

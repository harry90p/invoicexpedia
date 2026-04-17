import { Router, type IRouter } from "express";
import { eq, desc, sql, ilike, and } from "drizzle-orm";
import { createRequire } from "node:module";
import { db, invoicesTable, settingsTable, creditNotesTable } from "@workspace/db";
import {
  ListInvoicesQueryParams,
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  DeleteInvoiceParams,
  RecordPaymentParams,
  RecordPaymentBody,
  SearchAirportsQueryParams,
} from "@workspace/api-zod";

const _require = createRequire(import.meta.url);

interface AirportRaw {
  iata: string;
  name: string;
  iso: string;
  status: number;
  size: string | null;
}

interface AirportRecord {
  code: string;
  name: string;
  city: string;
  country: string;
}

const COUNTRY_OVERRIDES: Record<string, string> = {
  "United Kingdom of Great Britain and Northern Ireland (the)": "United Kingdom",
  "United States of America (the)": "United States",
  "Korea (the Republic of)": "South Korea",
  "Korea (the Democratic People's Republic of)": "North Korea",
  "Iran (Islamic Republic of)": "Iran",
  "Russian Federation (the)": "Russia",
  "Tanzania, the United Republic of": "Tanzania",
  "Congo (the Democratic Republic of the)": "DR Congo",
  "Congo (the)": "Congo",
  "Lao People's Democratic Republic (the)": "Laos",
  "Viet Nam": "Vietnam",
  "Syrian Arab Republic (the)": "Syria",
  "Bolivia (Plurinational State of)": "Bolivia",
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Taiwan (Province of China)": "Taiwan",
  "Hong Kong": "Hong Kong",
  "Macao": "Macau",
  "Palestine, State of": "Palestine",
  "Moldova (the Republic of)": "Moldova",
  "North Macedonia": "North Macedonia",
  "Micronesia (Federated States of)": "Micronesia",
  "Virgin Islands (U.S.)": "US Virgin Islands",
  "Virgin Islands (British)": "British Virgin Islands",
  "Cocos (Keeling) Islands (the)": "Cocos Islands",
  "Heard Island and McDonald Islands": "Heard Island",
};

function buildAirports(): AirportRecord[] {
  const raw = _require("airports") as AirportRaw[];
  const getCountryName = (_require("country-list") as { getName: (code: string) => string | undefined }).getName;

  function extractCity(name: string): string {
    return name
      .replace(/\s+international\s+airport\s*$/i, "")
      .replace(/\s+intl\.?\s+airport\s*$/i, "")
      .replace(/\s+regional\s+airport\s*$/i, "")
      .replace(/\s+municipal\s+airport\s*$/i, "")
      .replace(/\s+airport\s*$/i, "")
      .replace(/\s+airfield\s*$/i, "")
      .replace(/\s+airstrip\s*$/i, "")
      .replace(/\s+air\s+base\s*$/i, "")
      .replace(/\s+heliport\s*$/i, "")
      .trim();
  }

  return raw
    .filter((a) => a.iata && a.iata.length === 3 && a.status === 1 && a.name)
    .map((a) => ({
      code: a.iata,
      name: a.name,
      city: extractCity(a.name),
      country: (() => { const n = getCountryName(a.iso) ?? a.iso; return COUNTRY_OVERRIDES[n] ?? n; })(),
    }));
}

const airports: AirportRecord[] = buildAirports();

const router: IRouter = Router();

// Strip null values recursively so Zod .optional() fields don't fail on null
function stripNulls(obj: unknown): unknown {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => [k, stripNulls(v)])
        .filter(([, v]) => v !== undefined)
    );
  }
  return obj;
}


function generateInvoiceNumber(category: string): string {
  const prefix =
    category === "hotel"
      ? "INV-HTL"
      : category === "flight"
        ? "INV-FLT"
        : category === "tour"
          ? "INV-TUR"
          : category === "mix_panel_tour"
            ? "INV-MIX"
            : "INV-NTP";
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${num}`;
}

function calculateBalance(totalAmount: number, paidAmount: number, refundAmount: number) {
  return Math.max(0, totalAmount - paidAmount - refundAmount);
}

function formatInvoiceRow(row: typeof invoicesTable.$inferSelect) {
  return {
    ...row,
    totalAmount: parseFloat(String(row.totalAmount)),
    paidAmount: parseFloat(String(row.paidAmount)),
    outstandingBalance: parseFloat(String(row.outstandingBalance)),
    refundAmount: parseFloat(String(row.refundAmount)),
    cancellationCharges: parseFloat(String(row.cancellationCharges ?? "0")),
    otherRetainedCharges: parseFloat(String(row.otherRetainedCharges ?? "0")),
    flightPassengers: row.flightPassengers ?? [],
    hotelRooms: row.hotelRooms ?? [],
    tourItems: row.tourItems ?? [],
    nonTravelItems: row.nonTravelItems ?? [],
    refundType: row.refundType ?? null,
    refundPaymentRef: row.refundPaymentRef ?? null,
    refundModeOfPayment: row.refundModeOfPayment ?? null,
    linkedInvoiceId: row.linkedInvoiceId ?? null,
    linkedInvoiceNumber: row.linkedInvoiceNumber ?? null,
    creditNoteId: row.creditNoteId ?? null,
  };
}

// Airport search
router.get("/airports", async (req, res): Promise<void> => {
  const parsed = SearchAirportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const q = parsed.data.q.toLowerCase();
  const results = airports.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
  ).slice(0, 10);

  res.json(results);
});

// List invoices
router.get("/invoices", async (req, res): Promise<void> => {
  const parsed = ListInvoicesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { status, category, search, clientId, page = 1, limit = 20 } = parsed.data;

  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(invoicesTable.paymentStatus, status));
  }

  if (category && category !== "all") {
    conditions.push(eq(invoicesTable.category, category));
  }

  if (search) {
    conditions.push(
      ilike(invoicesTable.clientName, `%${search}%`)
    );
  }

  if (clientId) {
    conditions.push(eq(invoicesTable.clientId, clientId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, invoices] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(invoicesTable).where(whereClause),
    db
      .select()
      .from(invoicesTable)
      .where(whereClause)
      .orderBy(desc(invoicesTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  res.json({
    invoices: invoices.map(formatInvoiceRow),
    total: Number(totalResult[0]?.count ?? 0),
    page,
    limit,
  });
});

// Create invoice
router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(stripNulls(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const data = parsed.data;

  // Calculate total from line items
  let totalAmount = 0;

  if (data.category === "flight" && data.flightPassengers) {
    totalAmount = (data.flightPassengers as Array<{ total?: number }>).reduce(
      (sum, p) => sum + (p.total ?? 0),
      0
    );
  } else if (data.category === "hotel" && data.hotelRooms) {
    totalAmount = (data.hotelRooms as Array<{ invoiceAmount?: number }>).reduce(
      (sum, r) => sum + (r.invoiceAmount ?? 0),
      0
    );
  } else if (data.category === "tour" && data.tourItems) {
    totalAmount = (data.tourItems as Array<{ total?: number }>).reduce(
      (sum, t) => sum + (t.total ?? 0),
      0
    );
  } else if (data.category === "non_travel" && data.nonTravelItems) {
    totalAmount = (data.nonTravelItems as Array<{ total?: number }>).reduce(
      (sum, i) => sum + (i.total ?? 0),
      0
    );
  } else if (data.category === "mix_panel_tour") {
    const flightTotal = (data.flightPassengers as Array<{ total?: number }> ?? []).reduce(
      (sum, p) => sum + (p.total ?? 0), 0
    );
    const hotelTotal = (data.hotelRooms as Array<{ invoiceAmount?: number }> ?? []).reduce(
      (sum, r) => sum + (r.invoiceAmount ?? 0), 0
    );
    const tourTotal = (data.tourItems as Array<{ total?: number }> ?? []).reduce(
      (sum, t) => sum + (t.total ?? 0), 0
    );
    totalAmount = flightTotal + hotelTotal + tourTotal;
  }

  const invoiceNumber = generateInvoiceNumber(data.category);

  // Try to load settings for defaults
  const [settings] = await db.select().from(settingsTable).limit(1);

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      clientId: data.clientId ?? null,
      invoiceNumber,
      category: data.category,
      clientName: data.clientName,
      clientAddress: data.clientAddress,
      clientNtn: data.clientNtn,
      pocName: data.pocName,
      recipientName: data.recipientName,
      purchaseOrder: data.purchaseOrder,
      poDate: data.poDate,
      dealBookingId: data.dealBookingId,
      currency: data.currency ?? settings?.defaultCurrency ?? "PKR",
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      paymentStatus: "unpaid",
      totalAmount: String(totalAmount),
      paidAmount: "0",
      outstandingBalance: String(totalAmount),
      refundAmount: "0",
      notes: data.notes,
      companyName: data.companyName ?? settings?.companyName,
      companyAddress: data.companyAddress ?? settings?.companyAddress,
      companyPhone: data.companyPhone ?? settings?.companyPhone,
      companyNtn: data.companyNtn ?? settings?.companyNtn,
      companySNtn: data.companySNtn ?? settings?.companySNtn,
      bankName: data.bankName ?? settings?.bankName,
      bankAccountTitle: data.bankAccountTitle ?? settings?.bankAccountTitle,
      bankAccountNumber: data.bankAccountNumber ?? settings?.bankAccountNumber,
      bankSwiftCode: data.bankSwiftCode ?? settings?.bankSwiftCode,
      bankIban: data.bankIban ?? settings?.bankIban,
      logoUrl: data.logoUrl ?? settings?.logoUrl,
      logoPosition: data.logoPosition ?? settings?.logoPosition ?? "left",
      flightPassengers: (data.flightPassengers as unknown[]) ?? [],
      hotelRooms: (data.hotelRooms as unknown[]) ?? [],
      tourItems: (data.tourItems as unknown[]) ?? [],
      nonTravelItems: (data.nonTravelItems as unknown[]) ?? [],
    })
    .returning();

  res.status(201).json(formatInvoiceRow(invoice));
});

// Get single invoice
router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!invoice) {
    res.status(404).json({ error: "Not found", message: "Invoice not found" });
    return;
  }

  res.json(formatInvoiceRow(invoice));
});

// Update invoice
router.put("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const parsed = UpdateInvoiceBody.safeParse(stripNulls(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Not found", message: "Invoice not found" });
    return;
  }

  const data = parsed.data;

  // Recalculate total from updated line items — branch on category first
  let totalAmount = parseFloat(String(existing.totalAmount));

  if (existing.category === "mix_panel_tour") {
    // For mix_panel_tour, always sum all three sub-sections (empty arrays sum to 0 safely)
    const fp = ((data.flightPassengers ?? existing.flightPassengers ?? []) as Array<{ total?: number }>);
    const hr = ((data.hotelRooms ?? existing.hotelRooms ?? []) as Array<{ invoiceAmount?: number }>);
    const ti = ((data.tourItems ?? existing.tourItems ?? []) as Array<{ total?: number }>);
    totalAmount =
      fp.reduce((s, p) => s + (p.total ?? 0), 0) +
      hr.reduce((s, r) => s + (r.invoiceAmount ?? 0), 0) +
      ti.reduce((s, t) => s + (t.total ?? 0), 0);
  } else if (existing.category === "flight" && data.flightPassengers !== undefined) {
    totalAmount = (data.flightPassengers as Array<{ total?: number }>).reduce((s, p) => s + (p.total ?? 0), 0);
  } else if (existing.category === "hotel" && data.hotelRooms !== undefined) {
    totalAmount = (data.hotelRooms as Array<{ invoiceAmount?: number }>).reduce((s, r) => s + (r.invoiceAmount ?? 0), 0);
  } else if (existing.category === "tour" && data.tourItems !== undefined) {
    totalAmount = (data.tourItems as Array<{ total?: number }>).reduce((s, t) => s + (t.total ?? 0), 0);
  } else if (existing.category === "non_travel" && data.nonTravelItems !== undefined) {
    totalAmount = (data.nonTravelItems as Array<{ total?: number }>).reduce((s, i) => s + (i.total ?? 0), 0);
  }

  const paidAmount = data.paidAmount ?? parseFloat(String(existing.paidAmount));
  const refundAmount = data.refundAmount ?? parseFloat(String(existing.refundAmount));
  const outstandingBalance = calculateBalance(totalAmount, paidAmount, refundAmount);

  const updateData: Partial<typeof invoicesTable.$inferInsert> = {
    totalAmount: String(totalAmount),
    paidAmount: String(paidAmount),
    outstandingBalance: String(outstandingBalance),
    refundAmount: String(refundAmount),
  };

  if (data.clientName !== undefined) updateData.clientName = data.clientName;
  if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress;
  if (data.clientNtn !== undefined) updateData.clientNtn = data.clientNtn;
  if (data.pocName !== undefined) updateData.pocName = data.pocName;
  if (data.recipientName !== undefined) updateData.recipientName = data.recipientName;
  if (data.purchaseOrder !== undefined) updateData.purchaseOrder = data.purchaseOrder;
  if (data.poDate !== undefined) updateData.poDate = data.poDate;
  if (data.dealBookingId !== undefined) updateData.dealBookingId = data.dealBookingId;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.invoiceDate !== undefined) updateData.invoiceDate = data.invoiceDate;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.companyAddress !== undefined) updateData.companyAddress = data.companyAddress;
  if (data.companyPhone !== undefined) updateData.companyPhone = data.companyPhone;
  if (data.companyNtn !== undefined) updateData.companyNtn = data.companyNtn;
  if (data.companySNtn !== undefined) updateData.companySNtn = data.companySNtn;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.bankAccountTitle !== undefined) updateData.bankAccountTitle = data.bankAccountTitle;
  if (data.bankAccountNumber !== undefined) updateData.bankAccountNumber = data.bankAccountNumber;
  if (data.bankSwiftCode !== undefined) updateData.bankSwiftCode = data.bankSwiftCode;
  if (data.bankIban !== undefined) updateData.bankIban = data.bankIban;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.logoPosition !== undefined) updateData.logoPosition = data.logoPosition;
  if (data.flightPassengers !== undefined) updateData.flightPassengers = data.flightPassengers as unknown[];
  if (data.hotelRooms !== undefined) updateData.hotelRooms = data.hotelRooms as unknown[];
  if (data.tourItems !== undefined) updateData.tourItems = data.tourItems as unknown[];
  if (data.nonTravelItems !== undefined) updateData.nonTravelItems = data.nonTravelItems as unknown[];

  const [updated] = await db
    .update(invoicesTable)
    .set(updateData)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  res.json(formatInvoiceRow(updated));
});

// Delete invoice
router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found", message: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

// Record payment
async function generateCreditNoteNumber(): Promise<string> {
  const result = await db
    .select({ maxNum: sql<string>`MAX(credit_note_number)` })
    .from(creditNotesTable);
  const maxNum = result[0]?.maxNum;
  if (!maxNum) return "CN-0001";
  const currentNum = parseInt(maxNum.replace("CN-", ""), 10);
  return `CN-${String((isNaN(currentNum) ? 0 : currentNum) + 1).padStart(4, "0")}`;
}

router.post("/invoices/:id/payment", async (req, res): Promise<void> => {
  const params = RecordPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const parsed = RecordPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Not found", message: "Invoice not found" });
    return;
  }

  const totalAmount = parseFloat(String(existing.totalAmount));
  const paidAmount = parsed.data.amount;
  const refundAmount = parsed.data.refundAmount ?? parseFloat(String(existing.refundAmount));
  const cancellationCharges = parsed.data.cancellationCharges ?? parseFloat(String(existing.cancellationCharges ?? "0"));
  const otherRetainedCharges = parsed.data.otherRetainedCharges ?? parseFloat(String(existing.otherRetainedCharges ?? "0"));
  const outstandingBalance = parsed.data.paymentStatus === "refunded" ? 0 : calculateBalance(totalAmount, paidAmount, refundAmount);

  const updateSet: Record<string, unknown> = {
    paidAmount: String(paidAmount),
    outstandingBalance: String(outstandingBalance),
    refundAmount: String(refundAmount),
    cancellationCharges: String(cancellationCharges),
    otherRetainedCharges: String(otherRetainedCharges),
    paymentStatus: parsed.data.paymentStatus,
    notes: parsed.data.notes ?? existing.notes,
  };

  if (parsed.data.refundType !== undefined) updateSet.refundType = parsed.data.refundType;
  if (parsed.data.refundPaymentRef !== undefined) updateSet.refundPaymentRef = parsed.data.refundPaymentRef;
  if (parsed.data.refundModeOfPayment !== undefined) updateSet.refundModeOfPayment = parsed.data.refundModeOfPayment;
  if (parsed.data.linkedInvoiceId !== undefined) updateSet.linkedInvoiceId = parsed.data.linkedInvoiceId;
  if (parsed.data.linkedInvoiceNumber !== undefined) updateSet.linkedInvoiceNumber = parsed.data.linkedInvoiceNumber;

  if (parsed.data.clearPaymentFields) {
    updateSet.modeOfPayment = null;
    updateSet.convenienceFeeAmount = "0";
    updateSet.convenienceFeeRefundable = "non_refundable";
    updateSet.refundType = null;
    updateSet.refundPaymentRef = null;
    updateSet.refundModeOfPayment = null;
    updateSet.linkedInvoiceId = null;
    updateSet.linkedInvoiceNumber = null;
    updateSet.creditNoteId = null;
  } else {
    if (parsed.data.modeOfPayment !== undefined) updateSet.modeOfPayment = parsed.data.modeOfPayment;
    if (parsed.data.convenienceFeeAmount !== undefined) updateSet.convenienceFeeAmount = String(parsed.data.convenienceFeeAmount);
    if (parsed.data.convenienceFeeRefundable !== undefined) updateSet.convenienceFeeRefundable = parsed.data.convenienceFeeRefundable;
  }

  let creditNoteId: number | null = null;
  if (parsed.data.createCreditNote && parsed.data.paymentStatus === "refunded" && refundAmount > 0 && existing.clientId) {
    const creditNoteNumber = await generateCreditNoteNumber();
    const refType = parsed.data.refundType || "partial";
    const cnType = refType === "full" ? "refund_credit" : "refund_credit";

    const [cn] = await db
      .insert(creditNotesTable)
      .values({
        creditNoteNumber,
        clientId: existing.clientId,
        clientName: existing.clientName,
        invoiceId: existing.id,
        invoiceNumber: existing.invoiceNumber,
        type: cnType,
        amount: String(refundAmount),
        usedAmount: "0",
        remainingAmount: String(refundAmount),
        currency: existing.currency,
        description: parsed.data.notes
          ? parsed.data.notes
          : `Refund from ${existing.invoiceNumber} - ${refType === "full" ? "Full Refund" : refType === "partial" ? "Partial Refund" : "Refund Adjustment"}`,
        paymentRef: parsed.data.refundPaymentRef ?? null,
        refundModeOfPayment: parsed.data.refundModeOfPayment ?? null,
        status: "available",
      })
      .returning();

    creditNoteId = cn.id;
    updateSet.creditNoteId = cn.id;
  }

  const [updated] = await db
    .update(invoicesTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updateSet as any)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  const result = formatInvoiceRow(updated);
  (result as Record<string, unknown>).creditNoteId = creditNoteId ?? (updated as Record<string, unknown>).creditNoteId ?? null;
  res.json(result);
});

export default router;

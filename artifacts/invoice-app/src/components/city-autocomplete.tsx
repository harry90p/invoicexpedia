import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CityResult {
  id: string;
  name: string;
  state?: string;
  country: string;
  display: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  domestic?: boolean;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Search city or location...",
  domestic = false,
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const basePath = (import.meta.env.BASE_URL as string)?.replace(/\/$/, "") ?? "";
    const params = new URLSearchParams({ q: debouncedSearch });
    if (domestic) params.set("domestic", "true");

    fetch(`${basePath}/api/city-search?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((r) => r.json() as Promise<{ results: CityResult[] }>)
      .then((data) => {
        setResults(data.results ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setLoading(false);
      });
  }, [debouncedSearch, domestic]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search city or location..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {debouncedSearch.length < 2
                    ? "Type at least 2 characters..."
                    : "No locations found."}
                </CommandEmpty>
                <CommandGroup>
                  {results.map((city) => (
                    <CommandItem
                      key={city.id}
                      value={city.display}
                      onSelect={() => {
                        onChange(city.display);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === city.display ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium">{city.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {city.state ? `${city.state}, ` : ""}{city.country}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

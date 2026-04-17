import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListClients, useListInvoices } from "@workspace/api-client-react";
import { useCreateCreditNote, getListCreditNotesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, Link2, PenLine } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  flight: "Flights",
  hotel: "Hotels",
  tour: "Tours",
  mix_panel_tour: "Mix-Panel Tours",
  non_travel: "Non-Travel Products/Services",
};

const CATEGORY_ORDER = ["flight", "hotel", "tour", "mix_panel_tour", "non_travel"];

export default function NewCreditNote() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clientsData } = useListClients();
  const { data: invoicesData } = useListInvoices({ limit: 500 } as any);
  const createMutation = useCreateCreditNote();

  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<"excess_payment" | "refund_credit" | "manual_adjustment">("excess_payment");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PKR");

  const [invoiceLinkMode, setInvoiceLinkMode] = useState<"dropdown" | "manual">("dropdown");
  const [selectedInvoiceValue, setSelectedInvoiceValue] = useState("");
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState("");

  const [description, setDescription] = useState("");

  const clients = clientsData?.clients || [];
  const selectedClient = clients.find((c) => c.id === Number(clientId));

  const allInvoices = (invoicesData as any)?.invoices || [];

  const clientInvoices = useMemo(() => {
    if (!clientId) return allInvoices;
    return allInvoices.filter((inv: any) =>
      inv.clientId === Number(clientId) || inv.clientName === selectedClient?.name
    );
  }, [allInvoices, clientId, selectedClient]);

  const groupedInvoices = useMemo(() => {
    const groups: Record<string, typeof clientInvoices> = {};
    for (const inv of clientInvoices) {
      const cat = inv.category || "non_travel";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(inv);
    }
    return groups;
  }, [clientInvoices]);

  const effectiveInvoiceNumber =
    invoiceLinkMode === "dropdown"
      ? selectedInvoiceValue
        ? (allInvoices.find((inv: any) => String(inv.id) === selectedInvoiceValue)?.invoiceNumber || "")
        : ""
      : manualInvoiceNumber;

  function handleClientChange(val: string) {
    setClientId(val);
    const c = clients.find((cl) => cl.id === Number(val));
    if (c?.currency) setCurrency(c.currency);
    setSelectedInvoiceValue("");
    setManualInvoiceNumber("");
  }

  function handleDropdownSelect(val: string) {
    setSelectedInvoiceValue(val);
    if (val) {
      const inv = allInvoices.find((i: any) => String(i.id) === val);
      if (inv?.currency) setCurrency(inv.currency);
    }
  }

  function handleSwitchMode(mode: "dropdown" | "manual") {
    setInvoiceLinkMode(mode);
    if (mode === "dropdown") {
      setManualInvoiceNumber("");
    } else {
      setSelectedInvoiceValue("");
      if (effectiveInvoiceNumber) setManualInvoiceNumber(effectiveInvoiceNumber);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId || !amount || Number(amount) <= 0) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    const selectedInvId =
      invoiceLinkMode === "dropdown" && selectedInvoiceValue
        ? Number(selectedInvoiceValue)
        : undefined;

    createMutation.mutate(
      {
        clientId: Number(clientId),
        clientName: selectedClient?.name || "",
        type,
        amount: Number(amount),
        currency,
        invoiceId: selectedInvId,
        invoiceNumber: effectiveInvoiceNumber || undefined,
        description: description || undefined,
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListCreditNotesQueryKey() });
          toast({ title: `Credit Note ${data.creditNoteNumber} Created` });
          navigate("/credit-notes");
        },
        onError: () => {
          toast({ title: "Failed to create credit note", variant: "destructive" });
        },
      }
    );
  }

  const hasInvoices = clientInvoices.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/credit-notes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-purple-500" />
            New Credit Note
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Issue a credit note for a client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">

        {/* Client */}
        <div className="space-y-2">
          <Label htmlFor="client">Client *</Label>
          <Select value={clientId} onValueChange={handleClientChange}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Credit Note Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Credit Note Type *</Label>
          <Select value={type} onValueChange={(val) => setType(val as typeof type)}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excess_payment">Excess Payment</SelectItem>
              <SelectItem value="refund_credit">Refund Credit</SelectItem>
              <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Amount + Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PKR">PKR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linked Invoice — smart picker */}
        <div className="space-y-3 border border-purple-100 dark:border-purple-900/40 rounded-lg p-4 bg-purple-50/40 dark:bg-purple-900/10">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
              <Link2 className="h-4 w-4" />
              Linked Invoice
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchMode("dropdown")}
                className={`px-2.5 py-1 rounded-l-md border transition-colors ${
                  invoiceLinkMode === "dropdown"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white dark:bg-gray-800 text-muted-foreground border-gray-300 dark:border-gray-600 hover:border-purple-400"
                }`}
              >
                Select from list
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("manual")}
                className={`px-2.5 py-1 rounded-r-md border-t border-r border-b transition-colors ${
                  invoiceLinkMode === "manual"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white dark:bg-gray-800 text-muted-foreground border-gray-300 dark:border-gray-600 hover:border-purple-400"
                }`}
              >
                <PenLine className="h-3 w-3 inline mr-1" />
                Enter manually
              </button>
            </div>
          </div>

          {invoiceLinkMode === "dropdown" ? (
            <div className="space-y-1.5">
              {!clientId && (
                <p className="text-xs text-muted-foreground italic">Select a client above to filter invoices by client, or browse all invoices below.</p>
              )}
              <Select
                value={selectedInvoiceValue}
                onValueChange={handleDropdownSelect}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800">
                  <SelectValue placeholder={hasInvoices ? "Select an invoice…" : "No invoices found"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CATEGORY_ORDER.filter((cat) => groupedInvoices[cat]?.length > 0).map((cat) => (
                    <SelectGroup key={cat}>
                      <SelectLabel className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20">
                        {CATEGORY_LABELS[cat] || cat}
                      </SelectLabel>
                      {groupedInvoices[cat].map((inv: any) => (
                        <SelectItem key={inv.id} value={String(inv.id)}>
                          <span className="font-mono font-medium">{inv.invoiceNumber}</span>
                          {inv.clientName && (
                            <span className="text-muted-foreground ml-2 text-xs">— {inv.clientName}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  {clientInvoices.length === 0 && (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {clientId ? "No invoices found for this client" : "No invoices available"}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {selectedInvoiceValue && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-purple-700 dark:text-purple-400 font-medium">
                    Linked: <span className="font-mono">{effectiveInvoiceNumber}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceValue("")}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input
                placeholder="e.g., INV-FLT1042, INV-HTL2983…"
                value={manualInvoiceNumber}
                onChange={(e) => setManualInvoiceNumber(e.target.value)}
                className="bg-white dark:bg-gray-800 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter the invoice number exactly as shown (e.g., INV-FLT1042).
              </p>
            </div>
          )}
        </div>

        {/* Reason / Notes */}
        <div className="space-y-2">
          <Label htmlFor="description">Reason / Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea
            id="description"
            placeholder="Reason for issuing this credit note, airline reference, or any other relevant details…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/credit-notes")}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {createMutation.isPending ? "Creating…" : "Create Credit Note"}
          </Button>
        </div>
      </form>
    </div>
  );
}

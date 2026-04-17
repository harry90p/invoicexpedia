import React, { useMemo } from "react";
import { Link, useParams } from "wouter";
import {
  useGetClient,
  useListInvoices,
  type Invoice,
} from "@workspace/api-client-react";
import { useListCreditNotes, type CreditNote } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Wallet,
  BookOpen,
  CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

function fmtDate(str: string | null | undefined) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const VERTICAL_LABELS: Record<string, string> = {
  flight: "Flights",
  hotel: "Hotels",
  tour: "Tours",
  mix_panel_tour: "Mix-Panel Tours",
  non_travel: "Non Travel",
};

const VERTICAL_COLORS: Record<string, string> = {
  flight:         "bg-sky-100 text-sky-700 border-sky-200",
  hotel:          "bg-amber-100 text-amber-700 border-amber-200",
  tour:           "bg-emerald-100 text-emerald-700 border-emerald-200",
  mix_panel_tour: "bg-purple-100 text-purple-700 border-purple-200",
  non_travel:     "bg-slate-100 text-slate-600 border-slate-200",
};

const MOP_LABELS: Record<string, string> = {
  bank_transfer:    "Bank Transfer",
  cash:             "Cash Deposit",
  cheque:           "Cheque Deposit",
  card:             "Card Payment",
  online_transfer:  "Online Transfer",
};

function getInvoiceType(inv: Invoice): "domestic" | "international" | "mixed" | null {
  const raw = inv as unknown as Record<string, unknown>;
  const passengers = (raw.flightPassengers as Array<{ serviceType?: string }>) ?? [];
  const rooms = (raw.hotelRooms as Array<{ serviceType?: string }>) ?? [];
  const tours = (raw.tourItems as Array<{ serviceType?: string }>) ?? [];
  const items = (raw.nonTravelItems as Array<{ serviceType?: string }>) ?? [];

  const allItems = [...passengers, ...rooms, ...tours, ...items];
  if (allItems.length === 0) return null;

  const types = new Set(allItems.map((i) => i.serviceType ?? "domestic").filter(Boolean));
  if (types.size === 0) return null;
  if (types.size > 1) return "mixed";
  return types.values().next().value as "domestic" | "international";
}

function TypeBadge({ type }: { type: "domestic" | "international" | "mixed" | null }) {
  if (!type) return <span className="text-slate-300 text-xs">—</span>;
  const map = {
    domestic:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    international: "bg-blue-50 text-blue-700 border-blue-200",
    mixed:         "bg-violet-50 text-violet-700 border-violet-200",
  };
  const label = { domestic: "Domestic", international: "International", mixed: "Mixed" };
  return (
    <Badge variant="outline" className={`text-[10px] whitespace-nowrap font-medium ${map[type]}`}>
      {label[type]}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    partial:  "bg-amber-100 text-amber-700 border-amber-200",
    unpaid:   "bg-red-100 text-red-700 border-red-200",
    refunded: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-medium capitalize ${map[status] ?? "text-slate-500 border-slate-200"}`}>
      {status}
    </Badge>
  );
}

function SummaryCard({
  label, value, currency, icon: Icon, iconColor, valueColor, sub,
}: {
  label: string; value: number; currency: string;
  icon: React.ElementType; iconColor: string; valueColor: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold mt-1 ${valueColor}`}>{formatCurrency(value, currency)}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-slate-50">
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
      </div>
    </div>
  );
}

type FlightP = { passengerName?: string; pnr?: string };
type HotelR  = { guestName?: string; propertyName?: string; roomCategory?: string; numberOfRooms?: number };
type TourI   = { passengerName?: string; tourName?: string; tourLocation?: string };

function buildDescriptionLines(inv: Invoice): string[] {
  const raw = inv as unknown as Record<string, unknown>;
  const recipientName = (raw.recipientName as string | undefined)?.trim();
  const pocName       = (raw.pocName as string | undefined)?.trim();
  const notes         = (raw.notes as string | undefined)?.trim();

  const passengers = (raw.flightPassengers as FlightP[]) ?? [];
  const hotelRooms  = (raw.hotelRooms as HotelR[]) ?? [];
  const tourItems   = (raw.tourItems as TourI[]) ?? [];

  const lines: string[] = [];

  if (passengers.length > 0) {
    const name  = recipientName || passengers[0]?.passengerName || "";
    const pnr   = passengers[0]?.pnr;
    const count = passengers.length;
    const parts = [name, pnr ? `PNR: ${pnr}` : null, `${count} Pax`].filter(Boolean);
    lines.push(parts.join(" - "));
  }

  if (hotelRooms.length > 0) {
    const name      = recipientName || hotelRooms[0]?.guestName || "";
    const property  = hotelRooms[0]?.propertyName || "";
    const category  = hotelRooms[0]?.roomCategory || "";
    const totalRooms = hotelRooms.reduce((s, r) => s + (r.numberOfRooms ?? 1), 0);
    const parts = [name, property, category, `${totalRooms} Room${totalRooms !== 1 ? "s" : ""}`].filter(Boolean);
    lines.push(parts.join(" - "));
  }

  if (tourItems.length > 0) {
    const name     = recipientName || tourItems[0]?.passengerName || "";
    const location = tourItems[0]?.tourLocation || "";
    const count    = tourItems.length;
    const parts = [name, location, `${count} Person${count !== 1 ? "s" : ""}`].filter(Boolean);
    lines.push(parts.join(" - "));
  }

  if (lines.length === 0) {
    const fallback = notes || pocName || recipientName || "";
    return fallback ? [fallback] : [];
  }

  return lines;
}

function rowBalance(inv: Invoice): number {
  const raw = inv as unknown as Record<string, number>;
  const cancellationCharges = raw.cancellationCharges ?? 0;
  const otherRetained = raw.otherRetainedCharges ?? 0;
  const penalty = cancellationCharges + otherRetained;
  if (inv.paymentStatus === "refunded") {
    return Math.max(0, penalty - inv.paidAmount);
  }
  return inv.outstandingBalance ?? 0;
}

export default function ClientLedger() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);

  const { data: client, isLoading: clientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId },
  });
  const { data: invoicesData, isLoading: invoicesLoading } = useListInvoices({
    clientId,
    limit: 10000,
  });
  const { data: creditNotesData, isLoading: cnLoading } = useListCreditNotes({ clientId });

  const currency = client?.currency ?? "PKR";
  const creditLimit = client?.creditLimit ?? 0;
  const creditCycleDays = client?.creditCycleDays ?? 0;

  const invoices = useMemo(
    () =>
      [...(invoicesData?.invoices ?? [])].sort(
        (a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
      ),
    [invoicesData]
  );
  const creditNotes = useMemo(() => creditNotesData?.creditNotes ?? [], [creditNotesData]);

  const totalInvoiced = useMemo(() => invoices.reduce((s, v) => s + (v.totalAmount ?? 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.reduce((s, v) => s + (v.paidAmount ?? 0), 0), [invoices]);
  const totalRefunded = useMemo(() => invoices.reduce((s, v) => s + (v.refundAmount ?? 0), 0), [invoices]);
  const totalPenalty = useMemo(
    () => invoices
      .filter((v) => v.paymentStatus === "refunded")
      .reduce((s, v) => {
        const raw = v as unknown as Record<string, number>;
        return s + (raw.cancellationCharges ?? 0) + (raw.otherRetainedCharges ?? 0);
      }, 0),
    [invoices]
  );
  const outstanding = useMemo(() => invoices.reduce((s, v) => s + rowBalance(v), 0), [invoices]);
  const availableCredit = useMemo(
    () => creditNotes.filter((cn) => cn.status === "available").reduce((s, cn) => s + cn.remainingAmount, 0),
    [creditNotes]
  );

  const runningBalances = useMemo(() => {
    let balance = 0;
    return invoices.map((inv) => {
      balance += rowBalance(inv);
      return balance;
    });
  }, [invoices]);

  const isOverLimit = creditLimit > 0 && outstanding > creditLimit;
  const isLoading = clientLoading || invoicesLoading || cnLoading;

  if (!isLoading && !client) {
    return (
      <div className="text-center py-16 text-slate-400">
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Client not found.</p>
        <Link href="/ledgers">
          <span className="text-cyan-600 underline text-sm mt-2 inline-block">Back to Ledgers</span>
        </Link>
      </div>
    );
  }

  const clientType = (client as unknown as Record<string, string>)?.clientType;
  const isCorporate = clientType !== "private";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ledgers">
          <span className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4 cursor-pointer w-fit">
            <ArrowLeft className="h-4 w-4" />
            All Ledgers
          </span>
        </Link>

        {clientLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isCorporate ? "bg-cyan-50" : "bg-emerald-50"}`}>
                  {isCorporate
                    ? <Building2 className="h-5 w-5 text-cyan-600" />
                    : <User className="h-5 w-5 text-emerald-600" />}
                </div>
                <h1 className="text-2xl font-bold text-slate-800">{client?.name}</h1>
                {isCorporate
                  ? <Badge variant="outline" className="text-xs">Corporate</Badge>
                  : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs hover:bg-emerald-100">Private</Badge>}
                {isOverLimit && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />Over Limit
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5 text-sm text-slate-500">
                {creditLimit > 0 && (
                  <span>Credit Limit: <strong className="text-slate-700">{formatCurrency(creditLimit, currency)}</strong></span>
                )}
                {creditCycleDays > 0 && (
                  <span>Cycle: <strong className="text-slate-700">{creditCycleDays} days</strong></span>
                )}
                {client?.currency && (
                  <span>Currency: <strong className="text-slate-700">{client.currency}</strong></span>
                )}
                {client?.contactInfo && <span>{client.contactInfo}</span>}
              </div>
            </div>
            <Link href={`/clients/${clientId}`}>
              <span className="text-xs text-cyan-600 hover:text-cyan-800 underline transition-colors whitespace-nowrap cursor-pointer">
                View Client Profile
              </span>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Invoiced"
          value={totalInvoiced}
          currency={currency}
          icon={Receipt}
          iconColor="text-slate-500"
          valueColor="text-slate-800"
          sub={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
        />
        <SummaryCard
          label="Total Paid"
          value={totalPaid}
          currency={currency}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          valueColor="text-emerald-700"
          sub={[
            totalRefunded > 0 ? `Refunded ${formatCurrency(totalRefunded, currency)}` : null,
            totalPenalty > 0 ? `Penalty ${formatCurrency(totalPenalty, currency)}` : null,
          ].filter(Boolean).join(" · ") || undefined}
        />
        <SummaryCard
          label="Outstanding"
          value={outstanding}
          currency={currency}
          icon={outstanding > 0 ? Clock : CheckCircle2}
          iconColor={outstanding > 0 ? (isOverLimit ? "text-red-600" : "text-amber-600") : "text-emerald-600"}
          valueColor={outstanding > 0 ? (isOverLimit ? "text-red-700" : "text-amber-700") : "text-emerald-700"}
          sub={
            isOverLimit
              ? `${formatCurrency(outstanding - creditLimit, currency)} over limit`
              : creditLimit > 0
              ? `${formatCurrency(Math.max(0, creditLimit - outstanding), currency)} available`
              : undefined
          }
        />
        <SummaryCard
          label="Credit Notes"
          value={availableCredit}
          currency={currency}
          icon={CreditCard}
          iconColor="text-violet-600"
          valueColor="text-violet-700"
          sub={`${creditNotes.filter((c) => c.status === "available").length} available`}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Transaction Ledger</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological invoice-by-invoice ledger with running balance
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: "1200px" }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                <th className="text-left px-3 py-3 whitespace-nowrap">Invoice Date</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Invoice No.</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Deal / Booking ID</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Vertical</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Type</th>
                <th className="text-left px-3 py-3 whitespace-nowrap max-w-[160px]">Description</th>
                <th className="text-right px-3 py-3 whitespace-nowrap">Invoice Amt</th>
                <th className="text-right px-3 py-3 whitespace-nowrap">Refund Amt</th>
                <th className="text-right px-3 py-3 whitespace-nowrap">Penalty</th>
                <th className="text-right px-3 py-3 whitespace-nowrap">Pymt Received</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Pymt Date</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Mode of Payment</th>
                <th className="text-right px-3 py-3 whitespace-nowrap">Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j} className="px-3 py-3">
                          <Skeleton className="h-3.5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : invoices.length === 0
                ? (
                    <tr>
                      <td colSpan={13} className="px-5 py-16 text-center">
                        <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                        <p className="text-slate-400 font-medium">No invoices found</p>
                        <p className="text-slate-300 text-xs mt-1">Invoices for this client will appear here automatically.</p>
                      </td>
                    </tr>
                  )
                : invoices.map((inv, idx) => {
                    const raw = inv as unknown as Record<string, unknown>;
                    const cancellationCharges = (raw.cancellationCharges as number) ?? 0;
                    const otherRetained = (raw.otherRetainedCharges as number) ?? 0;
                    const penalty = cancellationCharges + otherRetained;
                    const mop = raw.modeOfPayment as string | undefined;
                    const refMop = raw.refundModeOfPayment as string | undefined;
                    const dealBookingId = (raw.dealBookingId as string | undefined) || (raw.purchaseOrder as string | undefined);
                    const descLines = buildDescriptionLines(inv);
                    const balance = runningBalances[idx];
                    const invType = getInvoiceType(inv);

                    const activeMop = inv.paymentStatus === "refunded" && !mop ? refMop : mop;
                    const mopLabel = activeMop ? (MOP_LABELS[activeMop] ?? activeMop.replace(/_/g, " ")) : null;

                    const hasPaid = inv.paidAmount > 0 || inv.paymentStatus === "paid";
                    const isRefunded = inv.paymentStatus === "refunded";

                    let rowCls = "border-b border-slate-100 transition-colors hover:bg-slate-50/60";
                    if (isRefunded) rowCls += " bg-blue-50/20";

                    return (
                      <tr key={inv.id} className={rowCls}>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          {fmtDate(inv.invoiceDate)}
                        </td>
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                          <Link href={`/invoices/${inv.id}`}>
                            <span className="text-cyan-600 hover:underline cursor-pointer">{inv.invoiceNumber}</span>
                          </Link>
                          <div className="mt-0.5">
                            <PaymentStatusBadge status={inv.paymentStatus} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                          {dealBookingId
                            ? <span className="text-slate-700">{dealBookingId}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {inv.category ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium ${VERTICAL_COLORS[inv.category] ?? "text-slate-600 border-slate-200"}`}
                            >
                              {VERTICAL_LABELS[inv.category] ?? inv.category}
                            </Badge>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <TypeBadge type={invType} />
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[220px]">
                          {descLines.length === 0
                            ? <span className="text-slate-300">—</span>
                            : descLines.map((line, li) => (
                                <div key={li} className="leading-snug text-[11px]" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {line}
                                </div>
                              ))}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800 font-semibold whitespace-nowrap">
                          {formatCurrency(inv.totalAmount, inv.currency ?? currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {inv.refundAmount > 0
                            ? <span className="text-blue-600 font-medium">{formatCurrency(inv.refundAmount, inv.currency ?? currency)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {penalty > 0
                            ? <span className="text-orange-600 font-medium">{formatCurrency(penalty, inv.currency ?? currency)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {inv.paidAmount > 0
                            ? <span className="text-emerald-600 font-semibold">{formatCurrency(inv.paidAmount, inv.currency ?? currency)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          {hasPaid ? fmtDate(inv.updatedAt) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {mopLabel ? (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block" />
                              {mopLabel}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${balance > 0 ? "text-amber-700" : balance < 0 ? "text-emerald-700" : "text-slate-400"}`}>
                          {balance === 0
                            ? "Nil"
                            : formatCurrency(Math.abs(balance), inv.currency ?? currency)}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
            {!isLoading && invoices.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={6} className="px-3 py-3 font-semibold text-slate-600 text-xs">Totals</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800 text-xs whitespace-nowrap">
                    {formatCurrency(totalInvoiced, currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-blue-600 text-xs whitespace-nowrap">
                    {totalRefunded > 0 ? formatCurrency(totalRefunded, currency) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-orange-600 text-xs whitespace-nowrap">
                    {totalPenalty > 0 ? formatCurrency(totalPenalty, currency) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-700 text-xs whitespace-nowrap">
                    {formatCurrency(totalPaid, currency)}
                  </td>
                  <td colSpan={2} />
                  <td className={`px-3 py-3 text-right font-bold text-xs whitespace-nowrap ${outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {outstanding === 0 ? "Nil" : formatCurrency(outstanding, currency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {creditNotes.length > 0 && (
        <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-100 bg-violet-50/30">
            <h2 className="font-semibold text-slate-800">Credit Notes</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Available and used credit notes for this client
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  <th className="text-left px-5 py-3">Credit Note #</th>
                  <th className="text-left px-5 py-3">Linked Invoice</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Description</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  <th className="text-right px-5 py-3">Used</th>
                  <th className="text-right px-5 py-3">Remaining</th>
                  <th className="text-center px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link href={`/credit-notes/${cn.id}`}>
                        <span className="text-violet-600 hover:underline cursor-pointer">{cn.creditNoteNumber}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {cn.invoiceNumber ? (
                        <Link href={`/invoices/${cn.invoiceId}`}>
                          <span className="text-cyan-600 hover:underline cursor-pointer font-mono">{cn.invoiceNumber}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 capitalize text-xs">
                      {cn.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {cn.description || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">
                      {formatCurrency(cn.amount, cn.currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      {cn.usedAmount > 0 ? formatCurrency(cn.usedAmount, cn.currency) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-violet-700">
                      {formatCurrency(cn.remainingAmount, cn.currency)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          cn.status === "available"
                            ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                            : cn.status === "voided"
                            ? "text-slate-400 border-slate-200"
                            : "text-amber-600 border-amber-200 bg-amber-50"
                        }`}
                      >
                        {cn.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="px-5 py-3 font-semibold text-slate-600 text-sm">Totals</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-700">
                    {formatCurrency(creditNotes.reduce((s, cn) => s + cn.amount, 0), currency)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-500">
                    {formatCurrency(creditNotes.reduce((s, cn) => s + cn.usedAmount, 0), currency)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-violet-700">
                    {formatCurrency(availableCredit, currency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

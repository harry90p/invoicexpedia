import React, { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetClient,
  useListInvoices,
  useGetSettings,
  type Invoice,
} from "@workspace/api-client-react";
import { useListCreditNotes, type CreditNote } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Building2,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  BookOpen,
  CreditCard,
  Download,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { pdf } from "@react-pdf/renderer";
import LedgerPDF, { type LedgerRow, type CreditNoteRow } from "@/components/ledger-pdf";
import ExcelJS from "exceljs";

function fmtDate(str: string | null | undefined) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateShort(str: string | null | undefined) {
  if (!str) return "";
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
  cash:             "Cash",
  cheque:           "Cheque",
  card:             "Credit Card",
  online_transfer:  "Online Transfer",
};

function formatLedgerRemark(row: Pick<LedgerRow, "modeOfPayment" | "notes" | "creditAppliedAmount" | "creditAppliedNoteNumber" | "currency">) {
  const mopLabel = row.modeOfPayment ? (MOP_LABELS[row.modeOfPayment] ?? row.modeOfPayment.replace(/_/g, " ")) : "";
  const creditAmount = Number(row.creditAppliedAmount ?? 0);
  const creditNoteNumber = row.creditAppliedNoteNumber?.trim();
  if (creditAmount > 0 && creditNoteNumber) {
    const creditLabel = `Credit Balance of ${row.currency ?? "PKR"} ${creditAmount.toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Used from Credit Note ${creditNoteNumber}`;
    return mopLabel ? `${mopLabel} - ${creditLabel}` : creditLabel;
  }
  return mopLabel || row.notes || "";
}

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

function rowBalance(inv: Invoice, creditNotes: CreditNote[] = []): number {
  const raw = inv as unknown as Record<string, unknown>;
  const totalAmount = inv.totalAmount ?? 0;
  const refundAmount = getLedgerRefundAmount(inv, creditNotes);
  const penalty =
    Number(raw.cancellationCharges ?? 0) + Number(raw.otherRetainedCharges ?? 0);
  const paidAmount = Math.min(inv.paidAmount ?? 0, totalAmount);
  return totalAmount - refundAmount + penalty - paidAmount;
}

function getLedgerRefundAmount(inv: Invoice, creditNotes: CreditNote[] = []): number {
  const toNumber = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const normalizeType = (value: unknown) => normalize(value).replace(/[\s-]+/g, "_");
  const raw = inv as unknown as Record<string, unknown>;
  const invoiceRefundAmount = toNumber(inv.refundAmount);
  if (invoiceRefundAmount > 0) return invoiceRefundAmount;

  const inlineRefund = toNumber(raw.refundProcessedAmount ?? raw.netRefundAmount ?? raw.refundAmount);
  if (inlineRefund > 0) return inlineRefund;

  const invNumber = normalize(inv.invoiceNumber);
  const linkedNumber = normalize(raw.linkedInvoiceNumber);
  const linkedId = toNumber(raw.linkedInvoiceId);
  const creditNoteId = toNumber(raw.creditNoteId);
  const matchedCreditNotes = creditNotes.filter((cn) => {
    const cnRaw = cn as unknown as Record<string, unknown>;
    const type = normalizeType(cn.type);
    const cnInvoiceNumber = normalize(cn.invoiceNumber);
    const cnDescription = normalize(cn.description);
    const cnPaymentRef = normalize(cnRaw.paymentRef);
    const cnId = toNumber(cn.id);
    const cnInvoiceId = toNumber(cn.invoiceId);
    const isRefundCredit = type.includes("refund") || type === "refund_credit";

    if (!isRefundCredit) return false;
    return (
      (creditNoteId > 0 && cnId === creditNoteId) ||
      (cnInvoiceId > 0 && cnInvoiceId === inv.id) ||
      (linkedId > 0 && cnInvoiceId === linkedId) ||
      (!!cnInvoiceNumber && (cnInvoiceNumber === invNumber || cnInvoiceNumber === linkedNumber)) ||
      (!!invNumber && (cnDescription.includes(invNumber) || cnPaymentRef.includes(invNumber)))
    );
  });

  const creditNoteRefund = matchedCreditNotes
    .reduce((sum, cn) => {
      const cnRaw = cn as unknown as Record<string, unknown>;
      const processed = toNumber(cnRaw.refundProcessedAmount);
      return sum + (processed > 0 ? processed : toNumber(cn.amount));
    }, 0);
  if (creditNoteRefund > 0) return creditNoteRefund;

  if (inv.paymentStatus === "refunded") {
    const paid = toNumber(inv.paidAmount);
    const penalty = toNumber(raw.cancellationCharges) + toNumber(raw.otherRetainedCharges);
    const baseAmount = paid > 0 ? paid : toNumber(inv.totalAmount);
    const inferredRefund = Math.max(0, baseAmount - penalty);
    if (inferredRefund > 0) return inferredRefund;
  }

  return 0;
}

function buildLedgerRows(invoices: Invoice[], runningBalances: number[], creditNotes: CreditNote[] = []): LedgerRow[] {
  return invoices.map((inv, idx) => {
    const raw = inv as unknown as Record<string, unknown>;
    const cancellationCharges = (raw.cancellationCharges as number) ?? 0;
    const otherRetained = (raw.otherRetainedCharges as number) ?? 0;
    const penalty = cancellationCharges + otherRetained;
    const mop = raw.modeOfPayment as string | undefined;
    const refMop = raw.refundModeOfPayment as string | undefined;
    const dealBookingId = (raw.dealBookingId as string | undefined) || (raw.purchaseOrder as string | undefined);
    const descLines = buildDescriptionLines(inv);
    const activeMop = inv.paymentStatus === "refunded" && !mop ? refMop : mop;
    const hasPaid = inv.paidAmount > 0 || inv.paymentStatus === "paid";
    const creditAppliedAmount = toNumber(raw.creditAppliedAmount);
    const creditAppliedNoteNumber = raw.creditAppliedNoteNumber as string | undefined;

    const row: LedgerRow = {
      id: inv.id,
      invoiceDate: inv.invoiceDate,
      invoiceNumber: inv.invoiceNumber,
      dealBookingId: dealBookingId || "",
      category: inv.category,
      description: descLines.join(" | "),
      currency: inv.currency,
      totalAmount: inv.totalAmount ?? 0,
      refundAmount: getLedgerRefundAmount(inv, creditNotes),
      penalty,
      paidAmount: Math.min(inv.paidAmount ?? 0, inv.totalAmount ?? 0),
      paymentDate: hasPaid ? inv.updatedAt : undefined,
      modeOfPayment: activeMop,
      notes: (raw.notes as string | undefined) || undefined,
      creditAppliedAmount,
      creditAppliedNoteNumber,
      balance: runningBalances[idx] ?? 0,
      paymentStatus: inv.paymentStatus,
    };
    return { ...row, remarks: formatLedgerRemark(row) };
  });
}

export default function ClientLedger() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: client, isLoading: clientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId },
  });
  const { data: invoicesData, isLoading: invoicesLoading } = useListInvoices({
    clientId,
    limit: 10000,
  });
  const { data: creditNotesData, isLoading: cnLoading } = useListCreditNotes({ clientId });
  const { data: settings } = useGetSettings();

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
  const totalPaid = useMemo(() => invoices.reduce((s, v) => s + Math.min(v.paidAmount ?? 0, v.totalAmount ?? 0), 0), [invoices]);
  const totalRefunded = useMemo(
    () => invoices.reduce((s, v) => s + getLedgerRefundAmount(v, creditNotes), 0),
    [invoices, creditNotes]
  );
  const totalPenalty = useMemo(
    () => invoices
      .filter((v) => v.paymentStatus === "refunded")
      .reduce((s, v) => {
        const raw = v as unknown as Record<string, number>;
        return s + (raw.cancellationCharges ?? 0) + (raw.otherRetainedCharges ?? 0);
      }, 0),
    [invoices]
  );
  const outstanding = useMemo(() => invoices.reduce((s, v) => s + rowBalance(v, creditNotes), 0), [invoices, creditNotes]);
  const availableCredit = useMemo(
    () => creditNotes.filter((cn) => cn.status === "available").reduce((s, cn) => s + cn.remainingAmount, 0),
    [creditNotes]
  );

  const runningBalances = useMemo(() => {
    let balance = 0;
    return invoices.map((inv) => {
      balance += rowBalance(inv, creditNotes);
      return balance;
    });
  }, [invoices, creditNotes]);

  const isOverLimit = creditLimit > 0 && outstanding > creditLimit;
  const isLoading = clientLoading || invoicesLoading || cnLoading;

  const clientType = (client as unknown as Record<string, string>)?.clientType;
  const isCorporate = clientType !== "private";

  const totals = {
    invoiced: totalInvoiced,
    paid: totalPaid,
    refunded: totalRefunded,
    penalty: totalPenalty,
    outstanding,
    availableCredit,
  };

  const settingsData = {
    companyName: settings?.companyName ?? "",
    companyAddress: settings?.companyAddress ?? "",
    companyPhone: settings?.companyPhone ?? "",
    companyNtn: settings?.companyNtn ?? "",
    companySNtn: settings?.companySNtn ?? "",
    logoUrl: settings?.logoUrl ?? "",
  };

  const generatedAt = new Date().toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const ledgerRows = buildLedgerRows(invoices, runningBalances, creditNotes);
      const cnRows: CreditNoteRow[] = creditNotes.map((cn) => ({
        creditNoteNumber: cn.creditNoteNumber,
        invoiceNumber: cn.invoiceNumber ?? undefined,
        type: cn.type,
        description: cn.description ?? undefined,
        amount: cn.amount,
        usedAmount: cn.usedAmount,
        remainingAmount: cn.remainingAmount,
        status: cn.status,
        currency: cn.currency,
      }));

      const doc = (
        <LedgerPDF
          clientName={client?.name ?? "Client"}
          clientType={clientType ?? "corporate"}
          currency={currency}
          creditLimit={creditLimit}
          creditCycleDays={creditCycleDays}
          rows={ledgerRows}
          creditNotes={cnRows}
          totals={totals}
          settings={settingsData}
          generatedAt={generatedAt}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ledger_${client?.name?.replace(/\s+/g, "_") ?? clientId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadXLSX = async () => {
    setIsDownloading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = settingsData.companyName || "Ledger";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Ledger");
      const accent = "003366";
      const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + accent } };
      const headerFont: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true, size: 9 };
      const boldFont: Partial<ExcelJS.Font> = { bold: true };

      // ── Company header block ──
      ws.mergeCells("A1:M1");
      ws.getCell("A1").value = isCorporate ? "CORPORATE LEDGER" : "LEDGER";
      ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF" + accent } };
      ws.getCell("A1").alignment = { horizontal: "center" };

      if (settingsData.companyName) {
        ws.mergeCells("A2:M2");
        ws.getCell("A2").value = settingsData.companyName;
        ws.getCell("A2").font = { bold: true, size: 11 };
        ws.getCell("A2").alignment = { horizontal: "center" };
      }

      let headerRow = 3;
      if (settingsData.companyAddress) {
        ws.mergeCells(`A${headerRow}:M${headerRow}`);
        ws.getCell(`A${headerRow}`).value = settingsData.companyAddress;
        ws.getCell(`A${headerRow}`).alignment = { horizontal: "center" };
        headerRow++;
      }
      if (settingsData.companyPhone) {
        ws.mergeCells(`A${headerRow}:M${headerRow}`);
        ws.getCell(`A${headerRow}`).value = settingsData.companyPhone;
        ws.getCell(`A${headerRow}`).alignment = { horizontal: "center" };
        headerRow++;
      }
      if (settingsData.companyNtn) {
        ws.mergeCells(`A${headerRow}:M${headerRow}`);
        ws.getCell(`A${headerRow}`).value = `NTN: ${settingsData.companyNtn}${settingsData.companySNtn ? `  |  SNTN: ${settingsData.companySNtn}` : ""}`;
        ws.getCell(`A${headerRow}`).alignment = { horizontal: "center" };
        headerRow++;
      }

      headerRow++; // blank line

      // ── Client info ──
      ws.getCell(`A${headerRow}`).value = "Client:";
      ws.getCell(`A${headerRow}`).font = boldFont;
      ws.getCell(`B${headerRow}`).value = client?.name ?? "";
      ws.getCell(`B${headerRow}`).font = boldFont;
      ws.getCell(`G${headerRow}`).value = "Type:";
      ws.getCell(`H${headerRow}`).value = isCorporate ? "Corporate" : "Private";
      headerRow++;

      ws.getCell(`A${headerRow}`).value = "Currency:";
      ws.getCell(`B${headerRow}`).value = currency;
      ws.getCell(`G${headerRow}`).value = "Generated:";
      ws.getCell(`H${headerRow}`).value = generatedAt;
      headerRow++;

      if (creditLimit > 0) {
        ws.getCell(`A${headerRow}`).value = "Credit Limit:";
        ws.getCell(`B${headerRow}`).value = creditLimit;
        ws.getCell(`G${headerRow}`).value = "Credit Cycle:";
        ws.getCell(`H${headerRow}`).value = creditCycleDays > 0 ? `${creditCycleDays} days` : "—";
        headerRow++;
      }

      headerRow++; // blank line

      // ── Summary ──
      ws.getCell(`A${headerRow}`).value = "SUMMARY";
      ws.getCell(`A${headerRow}`).font = { bold: true, size: 10, color: { argb: "FF" + accent } };
      headerRow++;

      const summaryHeaders = ["Total Invoiced", "Total Paid", "Total Refunded", "Penalty", "Outstanding", "Available Credit"];
      const summaryValues = [totals.invoiced, totals.paid, totals.refunded, totals.penalty, totals.outstanding, totals.availableCredit];
      summaryHeaders.forEach((h, i) => {
        const col = String.fromCharCode(65 + i * 2); // A, C, E, G, I, K
        const col2 = String.fromCharCode(65 + i * 2 + 1);
        ws.getCell(`${col}${headerRow}`).value = h;
        ws.getCell(`${col}${headerRow}`).font = { bold: true, size: 8, color: { argb: "FF9E9EB8" } };
        ws.getCell(`${col2}${headerRow}`).value = summaryValues[i];
        ws.getCell(`${col2}${headerRow}`).numFmt = `#,##0.00`;
        ws.getCell(`${col2}${headerRow}`).font = boldFont;
      });
      headerRow += 2;

      // ── Transaction table ──
      ws.getCell(`A${headerRow}`).value = "TRANSACTION LEDGER";
      ws.getCell(`A${headerRow}`).font = { bold: true, size: 10, color: { argb: "FF" + accent } };
      headerRow++;

      const tableHeaders = [
        "Invoice Date", "Invoice No.", "Deal / Booking ID", "Vertical",
        "Description", "Invoice Amount", "Refund Amount", "Penalty",
        "Pymt Received", "Payment Date", "Remarks", "Status", "Balance",
      ];
      const colWidths = [15, 14, 18, 14, 30, 16, 15, 14, 18, 16, 20, 12, 16];

      const hRow = ws.addRow(tableHeaders);
      hRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        };
      });
      hRow.height = 28;

      ws.columns = tableHeaders.map((_, i) => ({ width: colWidths[i] }));

      const ledgerRows = buildLedgerRows(invoices, runningBalances, creditNotes);
      ledgerRows.forEach((row, idx) => {
        const remarksLabel = row.remarks || "";
        const dataRow = ws.addRow([
          row.invoiceDate ? new Date(row.invoiceDate) : "",
          row.invoiceNumber,
          row.dealBookingId || "",
          row.category ? (VERTICAL_LABELS[row.category] ?? row.category) : "",
          row.description,
          row.totalAmount,
          row.refundAmount || 0,
          row.penalty || 0,
          row.paidAmount || 0,
          row.paymentDate ? new Date(row.paymentDate) : "",
          remarksLabel,
          row.paymentStatus,
          row.balance,
        ]);

        // Format date cells
        dataRow.getCell(1).numFmt = "dd-mmm-yyyy";
        dataRow.getCell(10).numFmt = "dd-mmm-yyyy";
        dataRow.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

        // Format numeric cells
        [6, 7, 8, 9, 13].forEach((col) => {
          dataRow.getCell(col).numFmt = "#,##0.00";
        });
        dataRow.getCell(13).alignment = { horizontal: "right", vertical: "middle" };

        // Alternating row background
        if (idx % 2 === 1) {
          dataRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9FC" } };
          });
        }
        if (row.paymentStatus === "refunded") {
          dataRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
          });
        }

        // Color balance
        const balCell = dataRow.getCell(13);
        if (row.balance > 0) balCell.font = { color: { argb: "FF92400E" }, bold: true };
        else if (row.balance < 0) balCell.font = { color: { argb: "FF065F46" }, bold: true };

        // Color refund
        const refCell = dataRow.getCell(7);
        if (row.refundAmount > 0) refCell.font = { color: { argb: "FF1E40AF" }, bold: true };
      });

      // Totals row
      const totalsRowData = ws.addRow([
        "TOTALS", "", "", "", `${ledgerRows.length} invoice${ledgerRows.length !== 1 ? "s" : ""}`,
        totals.invoiced, totals.refunded, totals.penalty, totals.paid, "", "", "",
        totals.outstanding,
      ]);
      totalsRowData.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6ECF5" } };
        cell.font = { bold: true, color: { argb: "FF" + accent } };
      });
      [6, 7, 8, 9, 13].forEach((col) => {
        totalsRowData.getCell(col).numFmt = "#,##0.00";
      });

      // ── Credit Notes sheet ──
      if (creditNotes.length > 0) {
        const cnWs = workbook.addWorksheet("Credit Notes");
        cnWs.columns = [
          { header: "Credit Note #", key: "creditNoteNumber", width: 18 },
          { header: "Linked Invoice", key: "invoiceNumber", width: 16 },
          { header: "Type", key: "type", width: 20 },
          { header: "Description", key: "description", width: 35 },
          { header: "Amount", key: "amount", width: 14 },
          { header: "Used", key: "usedAmount", width: 14 },
          { header: "Remaining", key: "remainingAmount", width: 14 },
          { header: "Status", key: "status", width: 12 },
        ];
        const cnHeader = cnWs.getRow(1);
        cnHeader.eachCell((cell) => {
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.alignment = { horizontal: "center" };
        });
        creditNotes.forEach((cn) => {
          const row = cnWs.addRow({
            creditNoteNumber: cn.creditNoteNumber,
            invoiceNumber: cn.invoiceNumber ?? "",
            type: cn.type.replace(/_/g, " "),
            description: cn.description ?? "",
            amount: cn.amount,
            usedAmount: cn.usedAmount,
            remainingAmount: cn.remainingAmount,
            status: cn.status,
          });
          [5, 6, 7].forEach((col) => { row.getCell(col).numFmt = "#,##0.00"; });
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ledger_${client?.name?.replace(/\s+/g, "_") ?? clientId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCSV = () => {
    setIsDownloading(true);
    try {
      const escCSV = (v: string | number | undefined | null) => {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const lines: string[] = [];

      // Header info
      lines.push(escCSV(isCorporate ? "CORPORATE LEDGER" : "LEDGER"));
      if (settingsData.companyName) lines.push(escCSV(settingsData.companyName));
      if (settingsData.companyAddress) lines.push(escCSV(settingsData.companyAddress));
      if (settingsData.companyPhone) lines.push(escCSV(settingsData.companyPhone));
      lines.push("");

      // Client info
      lines.push(`Client,${escCSV(client?.name ?? "")},Type,${isCorporate ? "Corporate" : "Private"}`);
      lines.push(`Currency,${currency},Generated,${generatedAt}`);
      if (creditLimit > 0) lines.push(`Credit Limit,${creditLimit},Cycle,${creditCycleDays > 0 ? creditCycleDays + " days" : "—"}`);
      lines.push("");

      // Summary
      lines.push("SUMMARY");
      lines.push("Total Invoiced,Total Paid,Total Refunded,Penalty,Outstanding,Available Credit");
      lines.push(`${totals.invoiced},${totals.paid},${totals.refunded},${totals.penalty},${totals.outstanding},${totals.availableCredit}`);
      lines.push("");

      // Transaction table
      lines.push("TRANSACTION LEDGER");
      lines.push([
        "Invoice Date", "Invoice No.", "Deal / Booking ID", "Vertical",
        "Description", "Invoice Amount", "Refund Amount", "Penalty",
        "Pymt Received", "Payment Date", "Remarks", "Status", "Balance",
      ].map(escCSV).join(","));

      const ledgerRows = buildLedgerRows(invoices, runningBalances, creditNotes);
      ledgerRows.forEach((row) => {
        const remarksLabel = row.remarks || "";
        lines.push([
          fmtDateShort(row.invoiceDate),
          row.invoiceNumber,
          row.dealBookingId || "",
          row.category ? (VERTICAL_LABELS[row.category] ?? row.category) : "",
          row.description,
          row.totalAmount,
          row.refundAmount || 0,
          row.penalty || 0,
          row.paidAmount || 0,
          row.paymentDate ? fmtDateShort(row.paymentDate) : "",
          remarksLabel,
          row.paymentStatus,
          row.balance,
        ].map(escCSV).join(","));
      });

      // Totals
      lines.push([
        "TOTALS", "", "", "", `${ledgerRows.length} invoices`,
        totals.invoiced, totals.refunded, totals.penalty, totals.paid, "", "", "",
        totals.outstanding,
      ].map(escCSV).join(","));

      // Credit notes
      if (creditNotes.length > 0) {
        lines.push("");
        lines.push("CREDIT NOTES");
        lines.push(["Credit Note #", "Linked Invoice", "Type", "Description", "Amount", "Used", "Remaining", "Status"].map(escCSV).join(","));
        creditNotes.forEach((cn) => {
          lines.push([
            cn.creditNoteNumber,
            cn.invoiceNumber ?? "",
            cn.type.replace(/_/g, " "),
            cn.description ?? "",
            cn.amount,
            cn.usedAmount,
            cn.remainingAmount,
            cn.status,
          ].map(escCSV).join(","));
        });
      }

      const csv = lines.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ledger_${client?.name?.replace(/\s+/g, "_") ?? clientId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

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

            <div className="flex items-center gap-2">
              <Link href={`/clients/${clientId}`}>
                <span className="text-xs text-cyan-600 hover:text-cyan-800 underline transition-colors whitespace-nowrap cursor-pointer">
                  View Client Profile
                </span>
              </Link>

              {!isLoading && invoices.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                      disabled={isDownloading}
                    >
                      {isDownloading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />}
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={handleDownloadPDF} className="cursor-pointer">
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadXLSX} className="cursor-pointer">
                      Download XLSX
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadCSV} className="cursor-pointer">
                      Download CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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
          <table className="w-full table-fixed text-xs" style={{ minWidth: "1460px" }}>
            <colgroup>
              <col className="w-[102px]" />
              <col className="w-[116px]" />
              <col className="w-[132px]" />
              <col className="w-[98px]" />
              <col className="w-[100px]" />
              <col className="w-[250px]" />
              <col className="w-[112px]" />
              <col className="w-[112px]" />
              <col className="w-[98px]" />
              <col className="w-[128px]" />
              <col className="w-[108px]" />
              <col className="w-[178px]" />
              <col className="w-[126px]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Invoice Date</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Invoice No.</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Deal / Booking ID</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Vertical</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Type</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Description</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Invoice Amount</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Refund Amount</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Penalty</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Pymt Received</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Pymt Date</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Remarks</span></th>
                <th className="text-center px-2.5 py-3 align-middle"><span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">Balance</span></th>
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
                    const refundAmount = getLedgerRefundAmount(inv, creditNotes);

                    const isRefunded = inv.paymentStatus === "refunded";
                    const hasPaid = inv.paidAmount > 0 || inv.paymentStatus === "paid";
                    const paidDisplayAmount = Math.min(inv.paidAmount ?? 0, inv.totalAmount ?? 0);
                    const activeMop = isRefunded && !mop ? refMop : mop;
                    const mopLabel = activeMop ? (MOP_LABELS[activeMop] ?? activeMop.replace(/_/g, " ")) : null;
                    const invNotes = raw.notes as string | undefined;
                    const remarksLabel = formatLedgerRemark({
                      modeOfPayment: activeMop,
                      notes: invNotes,
                      creditAppliedAmount: toNumber(raw.creditAppliedAmount),
                      creditAppliedNoteNumber: raw.creditAppliedNoteNumber as string | undefined,
                      currency: inv.currency ?? currency,
                    });

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
                        <td className="px-3 py-2.5 text-slate-600 max-w-[260px]">
                          {descLines.length === 0
                            ? <span className="text-slate-300">—</span>
                            : descLines.map((line, li) => (
                                <div key={li} className="leading-snug text-[11px] break-words whitespace-normal">
                                  {line}
                                </div>
                              ))}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-slate-800 font-semibold whitespace-nowrap">
                          {formatCurrency(inv.totalAmount, inv.currency ?? currency)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                          {refundAmount > 0
                            ? <span className="text-blue-600 font-medium">{formatCurrency(refundAmount, inv.currency ?? currency)}</span>
                            : <span className="text-slate-400">{formatCurrency(0, inv.currency ?? currency)}</span>}
                        </td>
                        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                          {penalty > 0
                            ? <span className="text-orange-600 font-medium">{formatCurrency(penalty, inv.currency ?? currency)}</span>
                            : <span className="text-slate-400">{formatCurrency(0, inv.currency ?? currency)}</span>}
                        </td>
                        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                          {paidDisplayAmount > 0
                            ? <span className="text-emerald-600 font-semibold">{formatCurrency(paidDisplayAmount, inv.currency ?? currency)}</span>
                            : <span className="text-slate-400">{formatCurrency(0, inv.currency ?? currency)}</span>}
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-500 whitespace-normal leading-snug text-center">
                          {hasPaid ? fmtDate(inv.updatedAt) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[180px]">
                          {remarksLabel ? (
                            <span className={`inline-flex items-start gap-1 break-words whitespace-normal ${invNotes ? "text-slate-500 italic text-[11px]" : "text-slate-600"}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block mt-1 shrink-0" />
                              {remarksLabel}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`px-3 py-2.5 font-bold whitespace-nowrap ${balance > 0 ? "text-amber-700" : balance < 0 ? "text-emerald-700" : "text-slate-400"}`}>
                          <div className="text-right">
                            {formatCurrency(balance, inv.currency ?? currency)}
                          </div>
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
                    {formatCurrency(totalRefunded, currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-orange-600 text-xs whitespace-nowrap">
                    {formatCurrency(totalPenalty, currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-700 text-xs whitespace-nowrap">
                    {formatCurrency(totalPaid, currency)}
                  </td>
                  <td colSpan={2} />
                  <td className={`px-3 py-3 text-right font-bold text-xs whitespace-nowrap ${outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {formatCurrency(outstanding, currency)}
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
                  <th className="text-center px-5 py-3">Credit Note #</th>
                  <th className="text-center px-5 py-3">Linked Invoice</th>
                  <th className="text-center px-5 py-3">Type</th>
                  <th className="text-center px-5 py-3">Description</th>
                  <th className="text-center px-5 py-3">Amount</th>
                  <th className="text-center px-5 py-3">Used</th>
                  <th className="text-center px-5 py-3">Remaining</th>
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

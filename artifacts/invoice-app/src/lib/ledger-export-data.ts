import type { Invoice } from "@workspace/api-client-react";

export interface LedgerExportRow {
  invoiceDate: string;
  invoiceNumber: string;
  dealBookingId: string;
  vertical: string;
  type: string;
  description: string;
  invoiceAmt: number;
  refundAmt: number;
  penalty: number;
  paymentReceived: number;
  paymentDate: string;
  modeOfPayment: string;
  balance: number;
}

export interface LedgerExportData {
  clientName: string;
  clientType: string;
  currency: string;
  creditLimit: number;
  generatedAt: string;
  rows: LedgerExportRow[];
  totals: {
    invoiceAmt: number;
    refundAmt: number;
    penalty: number;
    paymentReceived: number;
    outstanding: number;
  };
}

const MOP_LABELS: Record<string, string> = {
  bank_transfer:   "Bank Transfer",
  cash:            "Cash Deposit",
  cheque:          "Cheque Deposit",
  card:            "Card Payment",
  online_transfer: "Online Transfer",
};

const VERTICAL_LABELS: Record<string, string> = {
  flight:         "Flights",
  hotel:          "Hotels",
  tour:           "Tours",
  mix_panel_tour: "Mix-Panel Tours",
  non_travel:     "Non Travel",
};

type FlightP = { passengerName?: string; pnr?: string; serviceType?: string };
type HotelR  = { guestName?: string; propertyName?: string; roomCategory?: string; numberOfRooms?: number; serviceType?: string };
type TourI   = { passengerName?: string; tourLocation?: string; serviceType?: string };

function descLines(inv: Invoice): string[] {
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
    lines.push([name, pnr ? `PNR: ${pnr}` : null, `${count} Pax`].filter(Boolean).join(" - "));
  }
  if (hotelRooms.length > 0) {
    const name       = recipientName || hotelRooms[0]?.guestName || "";
    const property   = hotelRooms[0]?.propertyName || "";
    const category   = hotelRooms[0]?.roomCategory || "";
    const totalRooms = hotelRooms.reduce((s, r) => s + (r.numberOfRooms ?? 1), 0);
    lines.push([name, property, category, `${totalRooms} Room${totalRooms !== 1 ? "s" : ""}`].filter(Boolean).join(" - "));
  }
  if (tourItems.length > 0) {
    const name     = recipientName || tourItems[0]?.passengerName || "";
    const location = tourItems[0]?.tourLocation || "";
    const count    = tourItems.length;
    lines.push([name, location, `${count} Person${count !== 1 ? "s" : ""}`].filter(Boolean).join(" - "));
  }
  if (lines.length === 0) {
    const fallback = notes || pocName || recipientName || "";
    if (fallback) lines.push(fallback);
  }
  return lines;
}

function rowBalance(inv: Invoice): number {
  const raw = inv as unknown as Record<string, number>;
  const cc  = raw.cancellationCharges ?? 0;
  const oc  = raw.otherRetainedCharges ?? 0;
  if (inv.paymentStatus === "paid")     return 0;
  if (inv.paymentStatus === "refunded") return cc + oc;
  if (inv.paymentStatus === "partial")  return (inv.totalAmount ?? 0) - (inv.paidAmount ?? 0);
  return inv.totalAmount ?? 0;
}

function getInvoiceType(inv: Invoice): string {
  const raw = inv as unknown as Record<string, unknown>;
  const ps  = (raw.flightPassengers as FlightP[]) ?? [];
  const hrs = (raw.hotelRooms as HotelR[]) ?? [];
  const tis = (raw.tourItems as TourI[]) ?? [];
  const all = [...ps.map(p => p.serviceType), ...hrs.map(r => r.serviceType), ...tis.map(t => t.serviceType)].filter(Boolean);
  if (!all.length) return "";
  const d = all.some(s => s === "domestic");
  const i = all.some(s => s === "international");
  if (d && i) return "Mixed";
  if (i) return "International";
  return "Domestic";
}

export function buildLedgerExportData(
  invoices: Invoice[],
  client: { name?: string; currency?: string; creditLimit?: number } & Record<string, unknown>,
  currency: string,
): LedgerExportData {
  let running = 0;
  const rows: LedgerExportRow[] = invoices.map((inv) => {
    const raw       = inv as unknown as Record<string, unknown>;
    const cc        = (raw.cancellationCharges as number) ?? 0;
    const oc        = (raw.otherRetainedCharges as number) ?? 0;
    const penalty   = cc + oc;
    const mop       = (raw.modeOfPayment as string | undefined);
    const refMop    = (raw.refundModeOfPayment as string | undefined);
    const activeMop = inv.paymentStatus === "refunded" && !mop ? refMop : mop;
    const dealId    = (raw.dealBookingId as string | undefined) || (raw.purchaseOrder as string | undefined) || "";
    const payDate   = (raw.paymentDate as string | undefined) || (raw.refundPaymentDate as string | undefined) || "";
    const bal       = rowBalance(inv);
    running        += bal;

    return {
      invoiceDate:     inv.invoiceDate ?? "",
      invoiceNumber:   inv.invoiceNumber ?? "",
      dealBookingId:   dealId,
      vertical:        VERTICAL_LABELS[inv.category ?? ""] ?? (inv.category ?? ""),
      type:            getInvoiceType(inv),
      description:     descLines(inv).join("\n"),
      invoiceAmt:      inv.totalAmount ?? 0,
      refundAmt:       inv.refundAmount ?? 0,
      penalty,
      paymentReceived: inv.paidAmount ?? 0,
      paymentDate:     payDate,
      modeOfPayment:   activeMop ? (MOP_LABELS[activeMop] ?? activeMop.replace(/_/g, " ")) : "",
      balance:         running,
    };
  });

  const totals = {
    invoiceAmt:      invoices.reduce((s, v) => s + (v.totalAmount ?? 0), 0),
    refundAmt:       invoices.reduce((s, v) => s + (v.refundAmount ?? 0), 0),
    penalty:         invoices.filter(v => v.paymentStatus === "refunded").reduce((s, v) => {
      const r = v as unknown as Record<string, number>;
      return s + (r.cancellationCharges ?? 0) + (r.otherRetainedCharges ?? 0);
    }, 0),
    paymentReceived: invoices.reduce((s, v) => s + (v.paidAmount ?? 0), 0),
    outstanding:     running,
  };

  return {
    clientName:  client?.name ?? "",
    clientType:  (client as Record<string, string>)?.clientType ?? "",
    currency:    client?.currency ?? currency,
    creditLimit: client?.creditLimit ?? 0,
    generatedAt: new Date().toLocaleString("en-PK"),
    rows,
    totals,
  };
}

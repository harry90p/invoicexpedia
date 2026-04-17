import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type {
  FlightPassenger,
  HotelRoom,
  TourItem,
  NonTravelItem,
} from "@workspace/api-client-react";

Font.register({
  family: "Helvetica",
  fonts: [],
});

Font.registerHyphenationCallback((word) => [word]);

const C = {
  black: "#000000",
  darkGray: "#1a1a2e",
  gray: "#4a4a6a",
  lightGray: "#9e9eb8",
  border: "#d0d0e8",
  bgLight: "#f5f5fa",
  accent: "#003366",
  white: "#ffffff",
  red: "#cc0000",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.black,
    paddingTop: 36,
    paddingBottom: 60,
    paddingHorizontal: 44,
    backgroundColor: C.white,
  },

  row: { flexDirection: "row" },
  col: { flexDirection: "column" },
  flex1: { flex: 1 },

  /* Header */
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    minHeight: 80,
  },
  headerLogoCol: {
    width: 160,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCompanyCol: {
    width: 190,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 16,
  },
  companyBlock: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    textAlign: "right",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8,
    color: C.gray,
    textAlign: "right",
    lineHeight: 1.4,
  },
  logo: {
    width: 140,
    height: 65,
    objectFit: "contain",
  },

  /* Divider */
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
    marginBottom: 16,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    marginBottom: 10,
  },
  dottedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderStyle: "dashed",
    marginVertical: 16,
  },

  /* Meta Row: client left, invoice details right */
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  clientBlock: {
    flex: 1,
    paddingRight: 20,
  },
  clientName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    marginBottom: 3,
  },
  clientDetail: {
    fontSize: 8,
    color: C.gray,
    lineHeight: 1.5,
  },
  metaGrid: {
    width: 180,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: C.lightGray,
    textAlign: "left",
    width: 80,
  },
  metaValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    textAlign: "right",
    flex: 1,
  },

  /* Table */
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.accent,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: "#f9f9fc",
  },
  colDescription: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colUnitPrice: { width: 70, textAlign: "right" },
  colAmount: { width: 75, textAlign: "right" },
  cellMain: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    marginBottom: 2,
  },
  cellSub: {
    fontSize: 7.5,
    color: C.gray,
    lineHeight: 1.4,
  },
  cellRight: {
    fontSize: 9,
    color: C.darkGray,
    textAlign: "right",
  },
  cellRightBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    textAlign: "right",
  },

  /* Category label */
  categoryLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    backgroundColor: "#e6ecf5",
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 16,
    marginBottom: 3,
  },

  /* Totals */
  totalsSection: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  totalsGrid: {
    width: 240,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  totalLabel: {
    fontSize: 8.5,
    color: C.gray,
  },
  totalValue: {
    fontSize: 8.5,
    color: C.darkGray,
    textAlign: "right",
  },
  amountDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    backgroundColor: C.accent,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  amountDueLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  amountDueValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  /* Amount in words */
  amountWords: {
    fontSize: 8,
    color: C.gray,
    fontStyle: "italic",
    marginTop: 6,
    textAlign: "right",
  },

  /* Due date */
  dueDateRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  dueDateLabel: {
    fontSize: 8.5,
    color: C.gray,
    marginRight: 4,
  },
  dueDateValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
  },

  /* Notes */
  notesSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: C.bgLight,
    borderRadius: 2,
  },
  notesLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.lightGray,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 8,
    color: C.gray,
    lineHeight: 1.5,
  },

  /* Bank section */
  bankSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: C.bgLight,
    borderRadius: 2,
  },
  bankLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.lightGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bankRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bankKey: {
    fontSize: 8,
    color: C.gray,
    width: 90,
  },
  bankVal: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    flex: 1,
  },

  /* Payment Advice */
  paymentAdvice: {
    marginTop: 16,
  },
  paymentAdviceTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paymentAdviceBody: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentAdviceLeft: {
    flex: 1,
    paddingRight: 20,
  },
  paymentAdviceRight: {
    width: 200,
  },
  paymentAdviceToLabel: {
    fontSize: 7.5,
    color: C.lightGray,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  paymentAdviceCompanyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    marginBottom: 2,
  },
  paymentAdviceAddress: {
    fontSize: 8,
    color: C.gray,
    lineHeight: 1.4,
  },
  paRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  paLabel: {
    fontSize: 8,
    color: C.gray,
    width: 80,
  },
  paValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    flex: 1,
    textAlign: "right",
  },
  amountEnclosedBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 8,
    minHeight: 30,
  },
  amountEnclosedLabel: {
    fontSize: 7.5,
    color: C.lightGray,
    marginBottom: 2,
  },
  amountEnclosedHint: {
    fontSize: 7,
    color: C.lightGray,
    fontStyle: "italic",
  },

  /* Refund section */
  refundSection: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#7c3aed",
    borderRadius: 3,
    overflow: "hidden",
  },
  refundHeader: {
    backgroundColor: "#6d28d9",
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refundHeaderTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  refundHeaderStatus: {
    fontSize: 7.5,
    color: "#ddd6fe",
  },
  refundBody: {
    backgroundColor: "#faf5ff",
    padding: 10,
  },
  refundColsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  refundColLeft: {
    flex: 1,
    paddingRight: 10,
    borderRightWidth: 0.5,
    borderRightColor: "#ddd6fe",
  },
  refundColRight: {
    flex: 1,
    paddingLeft: 10,
  },
  refundColTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  refundColTitlePurple: { color: "#7c3aed" },
  refundColTitleAmber: { color: "#b45309" },
  refundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ede9fe",
  },
  refundRowLabel: {
    fontSize: 8,
    color: "#4b5563",
  },
  refundRowValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  refundRowValueAmber: { color: "#b45309" },
  refundRowValueGreen: { color: "#15803d" },
  refundNetBox: {
    backgroundColor: "#6d28d9",
    borderRadius: 2,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  refundNetLeft: {
    flex: 1,
  },
  refundNetLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ede9fe",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  refundNetWords: {
    fontSize: 7,
    color: "#c4b5fd",
    fontStyle: "italic",
    marginTop: 2,
  },
  refundNetAmount: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  refundReasonBox: {
    borderWidth: 0.5,
    borderColor: "#c4b5fd",
    backgroundColor: "#ffffff",
    borderRadius: 2,
    padding: 7,
  },
  refundReasonLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  refundReasonText: {
    fontSize: 8,
    color: "#374151",
    lineHeight: 1.5,
  },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: C.lightGray,
  },
});

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(s: string) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function numberToWords(amount: number): string {
  if (amount === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function helper(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + helper(n % 100) : "");
  }
  const int = Math.floor(amount);
  const frac = Math.round((amount - int) * 100);
  let words = "";
  if (int >= 1000000) words = helper(Math.floor(int / 1000000)) + " Million" + (int % 1000000 ? " " + numberToWords(int % 1000000) : "");
  else if (int >= 1000) words = helper(Math.floor(int / 1000)) + " Thousand" + (int % 1000 ? " " + helper(int % 1000) : "");
  else words = helper(int);
  if (frac > 0) words += " and " + frac + "/100";
  return words.trim();
}

interface InvoiceData {
  invoiceNumber: string;
  category: string;
  clientName: string;
  clientAddress?: string;
  clientNtn?: string;
  pocName?: string;
  recipientName?: string;
  purchaseOrder?: string;
  dealBookingId?: string;
  currency: string;
  invoiceDate: string;
  dueDate?: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  refundAmount?: number;
  cancellationCharges?: number;
  otherRetainedCharges?: number;
  refundType?: string | null;
  refundPaymentRef?: string | null;
  refundModeOfPayment?: string | null;
  linkedInvoiceNumber?: string | null;
  creditNoteId?: number | null;
  notes?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyNtn?: string;
  companySNtn?: string;
  bankName?: string;
  bankAccountTitle?: string;
  bankAccountNumber?: string;
  bankSwiftCode?: string;
  bankIban?: string;
  logoUrl?: string;
  logoPosition?: string;
  flightPassengers?: FlightPassenger[];
  hotelRooms?: HotelRoom[];
  tourItems?: TourItem[];
  nonTravelItems?: NonTravelItem[];
}

export default function InvoicePDF({ invoice }: { invoice: InvoiceData }) {
  const cur = invoice.currency || "PKR";
  const isRefunded = invoice.paymentStatus === "refunded";
  const cancCharges = Number(invoice.cancellationCharges || 0);
  const otherCharges = Number(invoice.otherRetainedCharges || 0);
  const netRefund = Number(invoice.refundAmount || 0);
  const totalDeductions = cancCharges + otherCharges;

  const hasBank =
    invoice.bankName ||
    invoice.bankAccountTitle ||
    invoice.bankAccountNumber ||
    invoice.bankIban;

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={invoice.companyName || "GoInvoice"}>
      <Page size="A4" style={styles.page}>

        {/* ── HEADER: Logo | Title | Company ── */}
        <View style={styles.headerSection}>
          {/* Left: Logo */}
          <View style={styles.headerLogoCol}>
            {invoice.logoUrl && (
              <Image src={invoice.logoUrl} style={styles.logo} />
            )}
          </View>

          {/* Center: Invoice type title */}
          <View style={styles.headerTitleCol}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
          </View>

          {/* Right: Company details */}
          <View style={styles.headerCompanyCol}>
            <View style={styles.companyBlock}>
              {invoice.companyName && <Text style={styles.companyName}>{invoice.companyName}</Text>}
              {invoice.companyAddress && (
                <Text style={styles.companyDetail}>{invoice.companyAddress}</Text>
              )}
              {invoice.companyPhone && (
                <Text style={styles.companyDetail}>{invoice.companyPhone}</Text>
              )}
              {invoice.companyNtn && (
                <Text style={styles.companyDetail}>NTN: {invoice.companyNtn}</Text>
              )}
              {invoice.companySNtn && (
                <Text style={styles.companyDetail}>SNTN: {invoice.companySNtn}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── META: Client + Invoice Details ── */}
        <View style={styles.metaSection}>
          <View style={styles.clientBlock}>
            <Text style={styles.clientName}>{invoice.clientName}</Text>
            {invoice.recipientName && (
              <Text style={styles.clientDetail}>For: {invoice.recipientName}</Text>
            )}
            {invoice.pocName && (
              <Text style={styles.clientDetail}>Attn: {invoice.pocName}</Text>
            )}
            {invoice.clientAddress && (
              <Text style={styles.clientDetail}>{invoice.clientAddress}</Text>
            )}
            {invoice.clientNtn && (
              <Text style={styles.clientDetail}>NTN: {invoice.clientNtn}</Text>
            )}
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Date</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.invoiceDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Number</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            {invoice.purchaseOrder && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Reference</Text>
                <Text style={styles.metaValue}>{invoice.purchaseOrder}</Text>
              </View>
            )}
            {invoice.dealBookingId && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Booking ID</Text>
                <Text style={styles.metaValue}>{invoice.dealBookingId}</Text>
              </View>
            )}
            {invoice.dueDate && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date</Text>
                <Text style={styles.metaValue}>{fmtDate(invoice.dueDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── LINE ITEMS TABLE ── */}

        {/* Table Header — per-category (mix_panel_tour gets per-section headers inline) */}
        {invoice.category === "flight" ? (
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={{ width: 58 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Basefare</Text>
            </View>
            <View style={{ width: 50 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Taxes</Text>
            </View>
            <View style={{ width: 46 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Add-ons</Text>
            </View>
            <View style={{ width: 46 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Penalty</Text>
            </View>
            <View style={{ width: 58 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>{"Service Fee"}</Text>
              {(() => {
                const fp = invoice.flightPassengers?.[0];
                const pct = fp?.serviceFeePct || 0;
                const base = fp?.serviceFeeBase === "base_fare_plus_taxes" ? "Base+Tax" : "Base Fare";
                return pct > 0 ? (
                  <Text style={[styles.tableHeaderText, { textAlign: "right", fontSize: 7, fontWeight: "normal" }]}>
                    @{pct}% {base}
                  </Text>
                ) : null;
              })()}
            </View>
            <View style={{ width: 62 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount {cur}</Text>
            </View>
          </View>
        ) : invoice.category === "hotel" ? (
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={{ width: 36 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Nights</Text>
            </View>
            <View style={{ width: 34 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Rooms</Text>
            </View>
            <View style={{ width: 54 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Rent/Night</Text>
            </View>
            <View style={{ width: 46 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Tax/Night</Text>
            </View>
            <View style={{ width: 56 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Accom. Cost</Text>
            </View>
            <View style={{ width: 60 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>{"Svc. Charges"}</Text>
              {(() => {
                const hr = invoice.hotelRooms?.[0];
                const pct = hr?.serviceChargesPct || 0;
                const base = hr?.serviceChargeBase === "room_rent_plus_tax" ? "Rent+Tax" : "Room Rent";
                return pct > 0 ? (
                  <Text style={[styles.tableHeaderText, { textAlign: "right", fontSize: 7, fontWeight: "normal" }]}>
                    @{pct}% {base}
                  </Text>
                ) : null;
              })()}
            </View>
            <View style={{ width: 55 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount {cur}</Text>
            </View>
          </View>
        ) : invoice.category === "tour" ? (
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={{ width: 50 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>QTY</Text>
            </View>
            <View style={{ width: 75 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount {cur}</Text>
            </View>
          </View>
        ) : invoice.category === "non_travel" ? (
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderText}>Product / Service</Text>
            </View>
            <View style={{ width: 75 }}>
              <Text style={styles.tableHeaderText}>Type & Location</Text>
            </View>
            <View style={{ width: 40 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Qty</Text>
            </View>
            <View style={{ width: 70 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Unit Price</Text>
            </View>
            <View style={{ width: 75 }}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>
                Amount {cur}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Flight Rows */}
        {(invoice.category === "flight" || invoice.category === "mix_panel_tour") &&
          invoice.flightPassengers &&
          invoice.flightPassengers.length > 0 && (
            <View>
              {invoice.category === "mix_panel_tour" && (
                <View>
                  <Text style={styles.categoryLabel}>Flights</Text>
                  <View style={styles.tableHeader}>
                    <View style={styles.colDescription}>
                      <Text style={styles.tableHeaderText}>Description</Text>
                    </View>
                    <View style={{ width: 58 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Basefare</Text>
                    </View>
                    <View style={{ width: 50 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Taxes</Text>
                    </View>
                    <View style={{ width: 46 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Add-ons</Text>
                    </View>
                    <View style={{ width: 46 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Penalty</Text>
                    </View>
                    <View style={{ width: 58 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Service Fee</Text>
                      {(() => {
                        const fp = invoice.flightPassengers?.[0];
                        const pct = fp?.serviceFeePct || 0;
                        const base = fp?.serviceFeeBase === "base_fare_plus_taxes" ? "Base+Tax" : "Base Fare";
                        return pct > 0 ? (
                          <Text style={[styles.tableHeaderText, { textAlign: "right", fontSize: 7, fontWeight: "normal" }]}>
                            @{pct}% {base}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                    <View style={{ width: 62 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount {cur}</Text>
                    </View>
                  </View>
                </View>
              )}
              {invoice.flightPassengers.map((p, i) => {
                const addOnsTotal = (p.addOns || []).reduce((s, a) => s + Number(a.amount || 0), 0);
                const penaltiesTotal = (p.penalties || []).reduce((s, a) => s + Number(a.amount || 0), 0);
                const flightType = p.flightClass
                  ? p.flightClass.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : "";
                return (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <View style={styles.colDescription}>
                      <Text style={styles.cellMain}>PAX: {p.passengerName}</Text>
                      {p.serviceType && <Text style={styles.cellSub}>Type: {p.serviceType.charAt(0).toUpperCase() + p.serviceType.slice(1)}</Text>}
                      <Text style={styles.cellSub}>Flights {flightType} | {p.airline}</Text>
                      <Text style={styles.cellSub}>
                        {p.sectorFrom}–{p.sectorTo}
                      </Text>
                      <Text style={styles.cellSub}>Dept: {fmtDate(p.departureDate)}</Text>
                      {p.ticketNumber && (
                        <Text style={styles.cellSub}>Tkt: {p.ticketNumber}</Text>
                      )}
                      {p.pnr && <Text style={styles.cellSub}>PNR: {p.pnr}</Text>}
                    </View>
                    <View style={{ width: 58 }}>
                      <Text style={styles.cellRight}>{fmt(p.fare, cur)}</Text>
                    </View>
                    <View style={{ width: 50 }}>
                      <Text style={styles.cellRight}>{fmt(p.taxes || 0, cur)}</Text>
                    </View>
                    <View style={{ width: 46 }}>
                      <Text style={styles.cellRight}>{fmt(addOnsTotal, cur)}</Text>
                    </View>
                    <View style={{ width: 46 }}>
                      <Text style={styles.cellRight}>{fmt(penaltiesTotal, cur)}</Text>
                    </View>
                    <View style={{ width: 58 }}>
                      <Text style={styles.cellRight}>{fmt(p.serviceFeeAmount || 0, cur)}</Text>
                    </View>
                    <View style={{ width: 62 }}>
                      <Text style={styles.cellRightBold}>{fmt(p.total || 0, cur)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        {/* Hotel Rows */}
        {(invoice.category === "hotel" || invoice.category === "mix_panel_tour") &&
          invoice.hotelRooms &&
          invoice.hotelRooms.length > 0 && (
            <View>
              {invoice.category === "mix_panel_tour" && (
                <View>
                  <Text style={styles.categoryLabel}>Hotels</Text>
                  <View style={styles.tableHeader}>
                    <View style={styles.colDescription}>
                      <Text style={styles.tableHeaderText}>Description</Text>
                    </View>
                    <View style={{ width: 36 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Nights</Text>
                    </View>
                    <View style={{ width: 34 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Rooms</Text>
                    </View>
                    <View style={{ width: 54 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Rent/Night</Text>
                    </View>
                    <View style={{ width: 46 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Tax/Night</Text>
                    </View>
                    <View style={{ width: 56 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Accom. Cost</Text>
                    </View>
                    <View style={{ width: 60 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Svc. Charges</Text>
                      {(() => {
                        const hr = invoice.hotelRooms?.[0];
                        const pct = hr?.serviceChargesPct || 0;
                        const base = hr?.serviceChargeBase === "room_rent_plus_tax" ? "Rent+Tax" : "Room Rent";
                        return pct > 0 ? (
                          <Text style={[styles.tableHeaderText, { textAlign: "right", fontSize: 7, fontWeight: "normal" }]}>
                            @{pct}% {base}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                    <View style={{ width: 55 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount {cur}</Text>
                    </View>
                  </View>
                </View>
              )}
              {invoice.hotelRooms.map((r, i) => {
                const rooms = r.numberOfRooms || 1;
                const nights = r.nights || 1;
                const accumCost = r.accommodationCost ?? (r.ratePerNight * rooms * nights);
                return (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <View style={styles.colDescription}>
                      <Text style={styles.cellMain}>GUEST: {r.guestName}</Text>
                      {r.serviceType && <Text style={styles.cellSub}>Type: {r.serviceType.charAt(0).toUpperCase() + r.serviceType.slice(1)}</Text>}
                      <Text style={styles.cellSub}>Property: {r.propertyName}</Text>
                      <Text style={styles.cellSub}>Room: {r.roomCategory}</Text>
                      {r.occupancyType && (
                        <Text style={styles.cellSub}>Occupancy: {r.occupancyType}</Text>
                      )}
                      <Text style={styles.cellSub}>
                        Check-in: {fmtDate(r.checkInDate)} — Check-out: {fmtDate(r.checkOutDate)}
                      </Text>
                    </View>
                    <View style={{ width: 36 }}>
                      <Text style={styles.cellRight}>{nights}</Text>
                    </View>
                    <View style={{ width: 34 }}>
                      <Text style={styles.cellRight}>{rooms}</Text>
                    </View>
                    <View style={{ width: 54 }}>
                      <Text style={styles.cellRight}>{fmt(r.ratePerNight, cur)}</Text>
                    </View>
                    <View style={{ width: 46 }}>
                      <Text style={styles.cellRight}>{fmt(r.taxPerNight || 0, cur)}</Text>
                    </View>
                    <View style={{ width: 56 }}>
                      <Text style={styles.cellRight}>{fmt(accumCost, cur)}</Text>
                    </View>
                    <View style={{ width: 60 }}>
                      <Text style={styles.cellRight}>{fmt(r.serviceChargesAmount || 0, cur)}</Text>
                    </View>
                    <View style={{ width: 55 }}>
                      <Text style={styles.cellRightBold}>{fmt(r.invoiceAmount || 0, cur)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        {/* Tour Rows */}
        {(invoice.category === "tour" || invoice.category === "mix_panel_tour") &&
          invoice.tourItems &&
          invoice.tourItems.length > 0 && (
            <View>
              {invoice.category === "mix_panel_tour" && (
                <View>
                  <Text style={styles.categoryLabel}>Tours</Text>
                  <View style={styles.tableHeader}>
                    <View style={styles.colDescription}>
                      <Text style={styles.tableHeaderText}>Description</Text>
                    </View>
                    <View style={{ width: 50 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>QTY</Text>
                    </View>
                    <View style={{ width: 75 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount {cur}</Text>
                    </View>
                  </View>
                </View>
              )}
              {invoice.tourItems.map((t, i) => {
                const fmtTourDate = (d: string) => {
                  if (!d) return "";
                  const dt = new Date(d + "T00:00:00");
                  const day = dt.getDate();
                  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                  return `${day} ${months[dt.getMonth()]}, ${dt.getFullYear()}`;
                };
                return (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <View style={styles.colDescription}>
                      {(t as unknown as { passengerName?: string }).passengerName ? (
                        <Text style={styles.cellMain}>{(t as unknown as { passengerName?: string }).passengerName}</Text>
                      ) : null}
                      <Text style={styles.cellMain}>{t.tourName}</Text>
                      {t.tourDetails ? (
                        <Text style={[styles.cellSub, { fontStyle: "italic" }]}>{t.tourDetails}</Text>
                      ) : null}
                      {t.tourLocation && (
                        <Text style={styles.cellSub}>{t.tourLocation}</Text>
                      )}
                      {t.serviceType && (
                        <Text style={styles.cellSub}>
                          {t.serviceType.charAt(0).toUpperCase() + t.serviceType.slice(1)}
                        </Text>
                      )}
                      {(t.tourStartDate || t.tourEndDate) && (
                        <Text style={styles.cellSub}>
                          {t.tourStartDate ? fmtTourDate(t.tourStartDate) : ""}
                          {t.tourEndDate ? ` – ${fmtTourDate(t.tourEndDate)}` : ""}
                        </Text>
                      )}
                      {(t.numberOfPeople || 0) > 0 && (
                        <Text style={styles.cellSub}>Persons: {t.numberOfPeople}</Text>
                      )}
                      {(t.taxes || 0) > 0 && (
                        <Text style={styles.cellSub}>Tax: {fmt(t.taxes || 0, cur)}</Text>
                      )}
                    </View>
                    <View style={{ width: 50 }}>
                      <Text style={styles.cellRight}>{(t as unknown as { qty?: number }).qty ?? t.numberOfPeople}</Text>
                    </View>
                    <View style={{ width: 75 }}>
                      <Text style={styles.cellRightBold}>{fmt(t.total || 0, cur)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        {/* Non-Travel Rows */}
        {(invoice.category === "non_travel" || invoice.category === "mix_panel_tour") &&
          invoice.nonTravelItems &&
          invoice.nonTravelItems.length > 0 && (
            <View>
              {invoice.category === "mix_panel_tour" && (
                <View>
                  <Text style={styles.categoryLabel}>Non-Travel Products / Services</Text>
                  <View style={styles.tableHeader}>
                    <View style={styles.colDescription}>
                      <Text style={styles.tableHeaderText}>Product / Service</Text>
                    </View>
                    <View style={{ width: 75 }}>
                      <Text style={styles.tableHeaderText}>Type & Location</Text>
                    </View>
                    <View style={{ width: 40 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Qty</Text>
                    </View>
                    <View style={{ width: 70 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Unit Price</Text>
                    </View>
                    <View style={{ width: 75 }}>
                      <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount {cur}</Text>
                    </View>
                  </View>
                </View>
              )}
              {invoice.nonTravelItems.map((n, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <View style={styles.colDescription}>
                    <Text style={styles.cellMain}>{n.productName}</Text>
                    {(n as unknown as { productCategory?: string }).productCategory && (
                      <Text style={styles.cellSub}>
                        {(n as unknown as { productCategory?: string }).productCategory}
                      </Text>
                    )}
                  </View>
                  <View style={{ width: 75 }}>
                    <Text style={[styles.cellSub, { fontFamily: "Helvetica-Bold", color: n.serviceType === "international" ? "#1d4ed8" : "#15803d" }]}>
                      {n.serviceType === "international" ? "International" : "Domestic"}
                    </Text>
                    {(n as unknown as { location?: string }).location && (
                      <Text style={[styles.cellSub, { marginTop: 2 }]}>
                        {(n as unknown as { location?: string }).location}
                      </Text>
                    )}
                  </View>
                  <View style={{ width: 40 }}>
                    <Text style={styles.cellRight}>{n.quantity}</Text>
                  </View>
                  <View style={{ width: 70 }}>
                    <Text style={styles.cellRight}>{fmt(n.unitPrice, cur)}</Text>
                  </View>
                  <View style={{ width: 75 }}>
                    <Text style={styles.cellRightBold}>{fmt(n.total || 0, cur)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        {/* ── TOTALS ── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsGrid}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(invoice.totalAmount, cur)}</Text>
            </View>
            <View style={[styles.totalRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.totalLabel, { fontFamily: "Helvetica-Bold", color: C.darkGray }]}>
                TOTAL {cur}
              </Text>
              <Text style={[styles.totalValue, { fontFamily: "Helvetica-Bold", color: C.darkGray }]}>
                {fmt(invoice.totalAmount, cur)}
              </Text>
            </View>
            {invoice.paidAmount > 0 && !isRefunded && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Less Amount Paid</Text>
                <Text style={styles.totalValue}>{fmt(invoice.paidAmount, cur)}</Text>
              </View>
            )}
          </View>

          <View style={[styles.totalsGrid, { marginTop: 2 }]}>
            {isRefunded ? (
              <View style={[styles.amountDueRow, { backgroundColor: "#6d28d9" }]}>
                <Text style={styles.amountDueLabel}>NET REFUND {cur}</Text>
                <Text style={styles.amountDueValue}>{fmt(netRefund, cur)}</Text>
              </View>
            ) : (
              <View style={styles.amountDueRow}>
                <Text style={styles.amountDueLabel}>AMOUNT DUE {cur}</Text>
                <Text style={styles.amountDueValue}>
                  {fmt(invoice.outstandingBalance, cur)}
                </Text>
              </View>
            )}
          </View>

          {!isRefunded && invoice.outstandingBalance > 0 && (
            <Text style={styles.amountWords}>
              {numberToWords(invoice.outstandingBalance)} {cur} Only
            </Text>
          )}
          {isRefunded && netRefund > 0 && (
            <Text style={styles.amountWords}>
              {numberToWords(netRefund)} {cur} Only (Net Refund)
            </Text>
          )}
        </View>

        {/* ── REFUND DETAILS SECTION ── */}
        {isRefunded && (
          <View style={styles.refundSection}>
            {/* Header bar */}
            <View style={styles.refundHeader}>
              <Text style={styles.refundHeaderTitle}>Refund Details</Text>
              <Text style={styles.refundHeaderStatus}>Status: REFUNDED</Text>
            </View>

            <View style={styles.refundBody}>
              {/* Two-column grid: original booking | deductions */}
              <View style={styles.refundColsRow}>
                {/* Left: original booking */}
                <View style={styles.refundColLeft}>
                  <Text style={[styles.refundColTitle, styles.refundColTitlePurple]}>Original Booking</Text>
                  <View style={styles.refundRow}>
                    <Text style={styles.refundRowLabel}>Invoice Total</Text>
                    <Text style={styles.refundRowValue}>{cur} {fmt(invoice.totalAmount, cur)}</Text>
                  </View>
                  <View style={styles.refundRow}>
                    <Text style={styles.refundRowLabel}>Amount Received</Text>
                    <Text style={[styles.refundRowValue, styles.refundRowValueGreen]}>{cur} {fmt(invoice.paidAmount, cur)}</Text>
                  </View>
                </View>

                {/* Right: deductions */}
                <View style={styles.refundColRight}>
                  <Text style={[styles.refundColTitle, styles.refundColTitleAmber]}>Deductions (Retained)</Text>
                  {totalDeductions === 0 ? (
                    <Text style={{ fontSize: 7, color: "#94a3b8", fontStyle: "italic", marginTop: 4 }}>
                      No deductions for this refund!
                    </Text>
                  ) : (
                    <>
                      {cancCharges > 0 && (
                        <View style={styles.refundRow}>
                          <Text style={styles.refundRowLabel}>Cancellation Charges</Text>
                          <Text style={[styles.refundRowValue, styles.refundRowValueAmber]}>{cur} {fmt(cancCharges, cur)}</Text>
                        </View>
                      )}
                      {otherCharges > 0 && (
                        <View style={styles.refundRow}>
                          <Text style={styles.refundRowLabel}>Non-Refundable Charges</Text>
                          <Text style={[styles.refundRowValue, styles.refundRowValueAmber]}>{cur} {fmt(otherCharges, cur)}</Text>
                        </View>
                      )}
                      <View style={[styles.refundRow, { borderBottomWidth: 0, marginTop: 2 }]}>
                        <Text style={[styles.refundRowLabel, { fontSize: 7, color: "#b45309" }]}>Total Deductions</Text>
                        <Text style={[styles.refundRowValue, styles.refundRowValueAmber, { fontSize: 7 }]}>{cur} {fmt(totalDeductions, cur)}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Net Refund highlight box */}
              <View style={styles.refundNetBox}>
                <View style={styles.refundNetLeft}>
                  <Text style={styles.refundNetLabel}>Net Refund Amount</Text>
                  <Text style={styles.refundNetWords}>{numberToWords(netRefund)} {cur} Only</Text>
                </View>
                <Text style={styles.refundNetAmount}>{cur} {fmt(netRefund, cur)}</Text>
              </View>

              {/* Refund Payment & Credit Info */}
              {(invoice.refundType || invoice.refundModeOfPayment || invoice.refundPaymentRef || invoice.linkedInvoiceNumber) && (
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                  {invoice.refundType && (
                    <View style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid #d8b4fe", borderRadius: 3, padding: 5 }}>
                      <Text style={{ fontSize: 6, color: "#7c3aed", fontWeight: "bold", textTransform: "uppercase" }}>Refund Type</Text>
                      <Text style={{ fontSize: 8, color: "#334155", fontWeight: "bold", marginTop: 1 }}>
                        {invoice.refundType === "full" ? "Full Refund" : invoice.refundType === "partial" ? "Partial Refund" : "Refund Adjustment"}
                      </Text>
                    </View>
                  )}
                  {invoice.refundModeOfPayment && (
                    <View style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid #d8b4fe", borderRadius: 3, padding: 5 }}>
                      <Text style={{ fontSize: 6, color: "#7c3aed", fontWeight: "bold", textTransform: "uppercase" }}>Refund Mode</Text>
                      <Text style={{ fontSize: 8, color: "#334155", fontWeight: "bold", marginTop: 1 }}>
                        {invoice.refundModeOfPayment === "bank_transfer" ? "Bank Transfer" : invoice.refundModeOfPayment === "online_transfer" ? "Online Transfer" : invoice.refundModeOfPayment.charAt(0).toUpperCase() + invoice.refundModeOfPayment.slice(1)}
                      </Text>
                    </View>
                  )}
                  {invoice.refundPaymentRef && (
                    <View style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid #d8b4fe", borderRadius: 3, padding: 5 }}>
                      <Text style={{ fontSize: 6, color: "#7c3aed", fontWeight: "bold", textTransform: "uppercase" }}>Payment Reference</Text>
                      <Text style={{ fontSize: 8, color: "#334155", fontWeight: "bold", marginTop: 1 }}>{invoice.refundPaymentRef}</Text>
                    </View>
                  )}
                  {invoice.linkedInvoiceNumber && (
                    <View style={{ flex: 1, backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 3, padding: 5 }}>
                      <Text style={{ fontSize: 6, color: "#2563eb", fontWeight: "bold", textTransform: "uppercase" }}>Linked Invoice</Text>
                      <Text style={{ fontSize: 8, color: "#1e40af", fontWeight: "bold", marginTop: 1 }}>{invoice.linkedInvoiceNumber}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Reason for refund */}
              {invoice.notes && (
                <View style={styles.refundReasonBox}>
                  <Text style={styles.refundReasonLabel}>Reason for Refund</Text>
                  <Text style={styles.refundReasonText}>{invoice.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Due Date */}
        {invoice.dueDate && !isRefunded && (
          <View style={styles.dueDateRow}>
            <Text style={styles.dueDateLabel}>Due Date:</Text>
            <Text style={styles.dueDateValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
        )}

        {/* Notes — only shown when not refunded (refund notes shown inside refund section) */}
        {invoice.notes && !isRefunded && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Bank Details */}
        {hasBank && (
          <View style={styles.bankSection}>
            <Text style={styles.bankLabel}>Bank / Payment Details</Text>
            {invoice.bankName && (
              <View style={styles.bankRow}>
                <Text style={styles.bankKey}>Bank:</Text>
                <Text style={styles.bankVal}>{invoice.bankName}</Text>
              </View>
            )}
            {invoice.bankAccountTitle && (
              <View style={styles.bankRow}>
                <Text style={styles.bankKey}>Account Title:</Text>
                <Text style={styles.bankVal}>{invoice.bankAccountTitle}</Text>
              </View>
            )}
            {invoice.bankAccountNumber && (
              <View style={styles.bankRow}>
                <Text style={styles.bankKey}>Account No:</Text>
                <Text style={styles.bankVal}>{invoice.bankAccountNumber}</Text>
              </View>
            )}
            {invoice.bankIban && (
              <View style={styles.bankRow}>
                <Text style={styles.bankKey}>IBAN:</Text>
                <Text style={styles.bankVal}>{invoice.bankIban}</Text>
              </View>
            )}
            {invoice.bankSwiftCode && (
              <View style={styles.bankRow}>
                <Text style={styles.bankKey}>SWIFT:</Text>
                <Text style={styles.bankVal}>{invoice.bankSwiftCode}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── PAYMENT ADVICE ── */}
        <View style={styles.dottedDivider} />
        <View style={styles.paymentAdvice}>
          <Text style={styles.paymentAdviceTitle}>Payment Advice</Text>
          <View style={styles.paymentAdviceBody}>
            <View style={styles.paymentAdviceLeft}>
              <Text style={styles.paymentAdviceToLabel}>To:</Text>
              {invoice.companyName && (
                <Text style={styles.paymentAdviceCompanyName}>{invoice.companyName}</Text>
              )}
              {invoice.companyAddress && (
                <Text style={styles.paymentAdviceAddress}>{invoice.companyAddress}</Text>
              )}
              {invoice.companyNtn && (
                <Text style={styles.paymentAdviceAddress}>NTN: {invoice.companyNtn}</Text>
              )}
            </View>

            <View style={styles.paymentAdviceRight}>
              <View style={styles.paRow}>
                <Text style={styles.paLabel}>Customer</Text>
                <Text style={styles.paValue}>{invoice.clientName}</Text>
              </View>
              <View style={styles.paRow}>
                <Text style={styles.paLabel}>Invoice Number</Text>
                <Text style={styles.paValue}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={styles.paRow}>
                <Text style={styles.paLabel}>Amount Due</Text>
                <Text style={styles.paValue}>{fmt(invoice.outstandingBalance, cur)}</Text>
              </View>
              {invoice.dueDate && (
                <View style={styles.paRow}>
                  <Text style={styles.paLabel}>Due Date</Text>
                  <Text style={styles.paValue}>{fmtDate(invoice.dueDate)}</Text>
                </View>
              )}
              <View style={styles.amountEnclosedBox}>
                <Text style={styles.amountEnclosedLabel}>Amount Enclosed</Text>
                <Text style={styles.amountEnclosedHint}>
                  Enter the amount you are paying above
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── PAGE FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {invoice.companyName || "GoInvoice"} — {invoice.invoiceNumber}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

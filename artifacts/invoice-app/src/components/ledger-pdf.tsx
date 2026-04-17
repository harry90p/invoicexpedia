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
  amber: "#92400e",
  emerald: "#065f46",
  blue: "#1e40af",
  orange: "#9a3412",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: C.black,
    paddingTop: 32,
    paddingBottom: 50,
    paddingHorizontal: 36,
    backgroundColor: C.white,
  },

  row: { flexDirection: "row" },
  col: { flexDirection: "column" },
  flex1: { flex: 1 },

  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    minHeight: 72,
  },
  headerLogoCol: {
    width: 140,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCompanyCol: {
    width: 180,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  ledgerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 2,
    textAlign: "center",
  },
  logo: {
    width: 120,
    height: 58,
    objectFit: "contain",
  },
  companyBlock: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    textAlign: "right",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 7.5,
    color: C.gray,
    textAlign: "right",
    lineHeight: 1.4,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
    marginBottom: 12,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    marginVertical: 8,
  },

  clientSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  clientBlock: {
    flex: 1,
    paddingRight: 16,
  },
  clientName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 7.5,
    color: C.gray,
    lineHeight: 1.5,
  },
  metaGrid: {
    width: 160,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 7.5,
    color: C.lightGray,
  },
  metaValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    textAlign: "right",
  },

  summarySection: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: C.bgLight,
    borderRadius: 2,
    padding: 6,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  summaryLabel: {
    fontSize: 6.5,
    color: C.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
  },
  summaryValueEmber: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.amber,
  },
  summaryValueEmerald: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.emerald,
  },
  summaryValueBlue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
  },

  sectionLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    backgroundColor: "#e6ecf5",
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 4,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.accent,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: "#f9f9fc",
  },
  tableRowRefund: {
    backgroundColor: "#eff6ff",
  },

  cellText: {
    fontSize: 7,
    color: C.darkGray,
  },
  cellTextGray: {
    fontSize: 7,
    color: C.gray,
  },
  cellTextMono: {
    fontSize: 7,
    color: C.accent,
  },
  cellTextRight: {
    fontSize: 7,
    color: C.darkGray,
    textAlign: "right",
  },
  cellTextRightBold: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    textAlign: "right",
  },
  cellTextBlue: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
    textAlign: "right",
  },
  cellTextOrange: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.orange,
    textAlign: "right",
  },
  cellTextEmerald: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.emerald,
    textAlign: "right",
  },
  cellTextAmber: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.amber,
    textAlign: "right",
  },

  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#e6ecf5",
    borderTopWidth: 1,
    borderTopColor: C.accent,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  totalsLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
  },
  totalsValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    textAlign: "right",
  },

  footer: {
    marginTop: 16,
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

const VERTICAL_LABELS: Record<string, string> = {
  flight: "Flights",
  hotel: "Hotels",
  tour: "Tours",
  mix_panel_tour: "Mix-Panel",
  non_travel: "Non-Travel",
};

const MOP_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  online_transfer: "Online Transfer",
};

function fmtDate(str: string | null | undefined) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmt(val: number, cur: string) {
  if (!val || val === 0) return "—";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export interface LedgerRow {
  id: number;
  invoiceDate: string;
  invoiceNumber: string;
  dealBookingId?: string;
  category?: string;
  description: string;
  totalAmount: number;
  refundAmount: number;
  penalty: number;
  paidAmount: number;
  paymentDate?: string;
  modeOfPayment?: string;
  notes?: string;
  balance: number;
  paymentStatus: string;
}

export interface CreditNoteRow {
  creditNoteNumber: string;
  invoiceNumber?: string;
  type: string;
  description?: string;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  status: string;
  currency: string;
}

export interface LedgerPDFProps {
  clientName: string;
  clientType: string;
  currency: string;
  creditLimit?: number;
  creditCycleDays?: number;
  rows: LedgerRow[];
  creditNotes: CreditNoteRow[];
  totals: {
    invoiced: number;
    paid: number;
    refunded: number;
    penalty: number;
    outstanding: number;
    availableCredit: number;
  };
  settings: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyNtn?: string;
    companySNtn?: string;
    logoUrl?: string;
  };
  generatedAt: string;
}

export default function LedgerPDF({
  clientName,
  clientType,
  currency,
  creditLimit,
  creditCycleDays,
  rows,
  creditNotes,
  totals,
  settings,
  generatedAt,
}: LedgerPDFProps) {
  const isCorporate = clientType !== "private";
  const ledgerTitle = isCorporate ? "CORPORATE LEDGER" : "LEDGER";
  const cur = currency || "PKR";

  // Column widths — landscape A4 available ≈ 770pt (841.89 - 36*2)
  // Fixed cols: 50+54+50+44+60+55+46+60+54+88+56 = 617  →  desc flex gets ~153
  const colDate = 50;
  const colInv = 54;
  const colDeal = 50;
  const colVert = 44;
  // colDesc is flex
  const colAmt = 60;
  const colRefund = 55;
  const colPenalty = 46;
  const colPaid = 60;
  const colPayDate = 54;
  const colRemarks = 88;
  const colBal = 56;

  return (
    <Document title={`${ledgerTitle} – ${clientName}`} author={settings.companyName || "Ledger"}>
      <Page size="A4" orientation="landscape" style={styles.page}>

        {/* ── HEADER: Logo | Title | Company ── */}
        <View style={styles.headerSection}>
          <View style={styles.headerLogoCol}>
            {settings.logoUrl && (
              <Image src={settings.logoUrl} style={styles.logo} />
            )}
          </View>
          <View style={styles.headerTitleCol}>
            <Text style={styles.ledgerTitle}>{ledgerTitle}</Text>
          </View>
          <View style={styles.headerCompanyCol}>
            <View style={styles.companyBlock}>
              {settings.companyName && <Text style={styles.companyName}>{settings.companyName}</Text>}
              {settings.companyAddress && <Text style={styles.companyDetail}>{settings.companyAddress}</Text>}
              {settings.companyPhone && <Text style={styles.companyDetail}>{settings.companyPhone}</Text>}
              {settings.companyNtn && <Text style={styles.companyDetail}>NTN: {settings.companyNtn}</Text>}
              {settings.companySNtn && <Text style={styles.companyDetail}>SNTN: {settings.companySNtn}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── CLIENT INFO ── */}
        <View style={styles.clientSection}>
          <View style={styles.clientBlock}>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.clientDetail}>{isCorporate ? "Corporate Client" : "Private Client"}</Text>
            {creditLimit && creditLimit > 0 ? (
              <Text style={styles.clientDetail}>Credit Limit: {fmtAmt(creditLimit, cur)}{creditCycleDays && creditCycleDays > 0 ? `  ·  Cycle: ${creditCycleDays} days` : ""}</Text>
            ) : null}
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Currency</Text>
              <Text style={styles.metaValue}>{cur}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Generated</Text>
              <Text style={styles.metaValue}>{generatedAt}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoices</Text>
              <Text style={styles.metaValue}>{rows.length}</Text>
            </View>
          </View>
        </View>

        {/* ── SUMMARY BOXES ── */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Invoiced</Text>
            <Text style={styles.summaryValue}>{fmtAmt(totals.invoiced, cur)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryValueEmerald}>{fmtAmt(totals.paid, cur)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Refunded</Text>
            <Text style={styles.summaryValueBlue}>{totals.refunded > 0 ? fmtAmt(totals.refunded, cur) : "—"}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Penalty</Text>
            <Text style={styles.summaryValue}>{totals.penalty > 0 ? fmtAmt(totals.penalty, cur) : "—"}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={totals.outstanding > 0 ? styles.summaryValueEmber : styles.summaryValueEmerald}>
              {totals.outstanding === 0 ? "Nil" : fmtAmt(totals.outstanding, cur)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Credit Notes</Text>
            <Text style={styles.summaryValue}>{totals.availableCredit > 0 ? fmtAmt(totals.availableCredit, cur) : "—"}</Text>
          </View>
        </View>

        {/* ── TRANSACTION TABLE ── */}
        <Text style={styles.sectionLabel}>Transaction Ledger</Text>

        <View style={styles.tableHeader}>
          <View style={{ width: colDate }}>
            <Text style={styles.tableHeaderText}>Date</Text>
          </View>
          <View style={{ width: colInv }}>
            <Text style={styles.tableHeaderText}>Invoice No.</Text>
          </View>
          <View style={{ width: colDeal }}>
            <Text style={styles.tableHeaderText}>Deal/Booking</Text>
          </View>
          <View style={{ width: colVert }}>
            <Text style={styles.tableHeaderText}>Vertical</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tableHeaderText}>Description</Text>
          </View>
          <View style={{ width: colAmt }}>
            <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Invoice Amt</Text>
          </View>
          <View style={{ width: colRefund }}>
            <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Refund Amt</Text>
          </View>
          <View style={{ width: colPenalty }}>
            <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Penalty</Text>
          </View>
          <View style={{ width: colPaid }}>
            <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Pymt Rcvd</Text>
          </View>
          <View style={{ width: colPayDate }}>
            <Text style={styles.tableHeaderText}>Pymt Date</Text>
          </View>
          <View style={{ width: colRemarks }}>
            <Text style={styles.tableHeaderText}>Remarks</Text>
          </View>
          <View style={{ width: colBal }}>
            <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Balance</Text>
          </View>
        </View>

        {rows.map((row, idx) => {
          const isRefunded = row.paymentStatus === "refunded";
          const rowStyle = [
            styles.tableRow,
            idx % 2 === 1 ? styles.tableRowAlt : {},
            isRefunded ? styles.tableRowRefund : {},
          ];
          const mopLabel = row.modeOfPayment ? (MOP_LABELS[row.modeOfPayment] ?? row.modeOfPayment.replace(/_/g, " ")) : "";
          // Remarks: for refunded invoices show notes/reason, otherwise show mode of payment
          const remarksText = isRefunded
            ? (row.notes || mopLabel || "—")
            : (mopLabel || "—");

          return (
            <View key={row.id} style={rowStyle}>
              <View style={{ width: colDate, overflow: "hidden" }}>
                <Text style={styles.cellTextGray}>{fmtDate(row.invoiceDate)}</Text>
              </View>
              <View style={{ width: colInv, overflow: "hidden" }}>
                <Text style={styles.cellTextMono}>{row.invoiceNumber}</Text>
              </View>
              <View style={{ width: colDeal, overflow: "hidden" }}>
                <Text style={styles.cellTextGray}>{row.dealBookingId || "—"}</Text>
              </View>
              <View style={{ width: colVert, overflow: "hidden" }}>
                <Text style={styles.cellText}>{row.category ? (VERTICAL_LABELS[row.category] ?? row.category) : "—"}</Text>
              </View>
              {/* Description wraps freely */}
              <View style={{ flex: 1 }}>
                <Text style={styles.cellText}>{row.description || "—"}</Text>
              </View>
              <View style={{ width: colAmt, overflow: "hidden" }}>
                <Text style={[styles.cellTextRightBold]}>{fmtAmt(row.totalAmount, cur)}</Text>
              </View>
              <View style={{ width: colRefund, overflow: "hidden" }}>
                <Text style={row.refundAmount > 0 ? styles.cellTextBlue : styles.cellTextGray}>
                  {row.refundAmount > 0 ? fmtAmt(row.refundAmount, cur) : "—"}
                </Text>
              </View>
              <View style={{ width: colPenalty, overflow: "hidden" }}>
                <Text style={row.penalty > 0 ? styles.cellTextOrange : styles.cellTextGray}>
                  {row.penalty > 0 ? fmtAmt(row.penalty, cur) : "—"}
                </Text>
              </View>
              <View style={{ width: colPaid, overflow: "hidden" }}>
                <Text style={row.paidAmount > 0 ? styles.cellTextEmerald : styles.cellTextGray}>
                  {row.paidAmount > 0 ? fmtAmt(row.paidAmount, cur) : "—"}
                </Text>
              </View>
              <View style={{ width: colPayDate, overflow: "hidden" }}>
                <Text style={styles.cellTextGray}>{row.paymentDate ? fmtDate(row.paymentDate) : "—"}</Text>
              </View>
              {/* Remarks: wraps for long notes */}
              <View style={{ width: colRemarks }}>
                <Text style={isRefunded && row.notes ? styles.cellTextGray : styles.cellText}>{remarksText}</Text>
              </View>
              <View style={{ width: colBal, overflow: "hidden" }}>
                <Text style={
                  row.balance > 0 ? styles.cellTextAmber : row.balance < 0 ? styles.cellTextEmerald : styles.cellTextGray
                }>
                  {row.balance === 0 ? "Nil" : fmtAmt(Math.abs(row.balance), cur)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Totals row */}
        <View style={styles.totalsRow}>
          <View style={{ width: colDate + colInv + colDeal + colVert, overflow: "hidden" }}>
            <Text style={styles.totalsLabel}>Totals</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalsLabel}>{rows.length} invoice{rows.length !== 1 ? "s" : ""}</Text>
          </View>
          <View style={{ width: colAmt, overflow: "hidden" }}>
            <Text style={styles.totalsValue}>{fmtAmt(totals.invoiced, cur)}</Text>
          </View>
          <View style={{ width: colRefund, overflow: "hidden" }}>
            <Text style={styles.totalsValue}>{totals.refunded > 0 ? fmtAmt(totals.refunded, cur) : "—"}</Text>
          </View>
          <View style={{ width: colPenalty, overflow: "hidden" }}>
            <Text style={styles.totalsValue}>{totals.penalty > 0 ? fmtAmt(totals.penalty, cur) : "—"}</Text>
          </View>
          <View style={{ width: colPaid, overflow: "hidden" }}>
            <Text style={styles.totalsValue}>{fmtAmt(totals.paid, cur)}</Text>
          </View>
          <View style={{ width: colPayDate + colRemarks, overflow: "hidden" }}>
            <Text style={styles.totalsLabel}></Text>
          </View>
          <View style={{ width: colBal, overflow: "hidden" }}>
            <Text style={styles.totalsValue}>
              {totals.outstanding === 0 ? "Nil" : fmtAmt(totals.outstanding, cur)}
            </Text>
          </View>
        </View>

        {/* ── CREDIT NOTES ── */}
        {creditNotes.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionLabel}>Credit Notes</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 80 }]}>Credit Note #</Text>
              <Text style={[styles.tableHeaderText, { width: 70 }]}>Linked Invoice</Text>
              <Text style={[styles.tableHeaderText, { width: 80 }]}>Type</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Description</Text>
              <Text style={[styles.tableHeaderText, { width: 70, textAlign: "right" }]}>Amount</Text>
              <Text style={[styles.tableHeaderText, { width: 60, textAlign: "right" }]}>Used</Text>
              <Text style={[styles.tableHeaderText, { width: 70, textAlign: "right" }]}>Remaining</Text>
              <Text style={[styles.tableHeaderText, { width: 50, textAlign: "center" }]}>Status</Text>
            </View>
            {creditNotes.map((cn, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.cellTextMono, { width: 80 }]}>{cn.creditNoteNumber}</Text>
                <Text style={[styles.cellTextGray, { width: 70 }]}>{cn.invoiceNumber || "—"}</Text>
                <Text style={[styles.cellText, { width: 80 }]}>{cn.type.replace(/_/g, " ")}</Text>
                <Text style={[styles.cellTextGray, { flex: 1 }]} numberOfLines={1}>{cn.description || "—"}</Text>
                <Text style={[styles.cellTextRightBold, { width: 70 }]}>{fmtAmt(cn.amount, cn.currency)}</Text>
                <Text style={[styles.cellTextGray, { width: 60, textAlign: "right" }]}>{cn.usedAmount > 0 ? fmtAmt(cn.usedAmount, cn.currency) : "—"}</Text>
                <Text style={[styles.cellTextRightBold, { width: 70 }]}>{fmtAmt(cn.remainingAmount, cn.currency)}</Text>
                <Text style={[styles.cellText, { width: 50, textAlign: "center" }]}>{cn.status}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{settings.companyName || ""}</Text>
          <Text style={styles.footerText}>Generated: {generatedAt}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}

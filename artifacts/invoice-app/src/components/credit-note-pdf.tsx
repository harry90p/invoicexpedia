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
  purple: "#6d28d9",
  purpleLight: "#ede9fe",
  white: "#ffffff",
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

  /* Header — same layout as invoice PDF */
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    minHeight: 80,
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
    minWidth: 200,
  },
  headerCompanyCol: {
    width: 175,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  docTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 16,
  },
  companyBlock: { alignItems: "flex-end" },
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

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
    marginBottom: 16,
  },

  /* CN number badge row */
  cnMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cnMetaBox: {
    backgroundColor: C.bgLight,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.purple,
  },
  cnMetaLabel: { fontSize: 7.5, color: C.lightGray, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2 },
  cnMetaValue: { fontSize: 9, color: C.darkGray, fontFamily: "Helvetica-Bold" },

  /* Amount banner */
  amountBanner: {
    backgroundColor: C.purple,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 9, color: "#c4b5fd" },
  amountValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.white, marginTop: 2 },
  amountRight: { alignItems: "flex-end" },
  amountCurrency: { fontSize: 9, color: "#c4b5fd" },
  amountUsed: { fontSize: 8, color: "#ddd6fe", marginTop: 2 },

  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  detailCell: {
    width: "47%",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: C.bgLight,
    borderRadius: 3,
  },
  detailLabel: { fontSize: 7, color: C.lightGray, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2 },
  detailValue: { fontSize: 9, color: C.darkGray },

  notesBox: {
    backgroundColor: C.bgLight,
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
  },
  notesText: { fontSize: 9, color: C.gray, lineHeight: 1.5 },

  refundBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  refundRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  refundCell: { flex: 1 },
  refundLabel: { fontSize: 7, color: "#16a34a", fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2 },
  refundValue: { fontSize: 9, color: C.darkGray },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: C.lightGray },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: C.purpleLight,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 8, color: C.purple, fontFamily: "Helvetica-Bold" },
});

type CreditNoteData = {
  creditNoteNumber: string;
  clientName: string;
  type: string;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  currency: string;
  status: string;
  description?: string;
  invoiceNumber?: string;
  createdAt: string;
  refundProcessedRef?: string;
  refundProcessedDate?: string;
  refundProcessedAmount?: number;
  refundProcessedNotes?: string;
  logoUrl?: string;
  logoPosition?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyNtn?: string;
  companySNtn?: string;
};

const TYPE_LABELS: Record<string, string> = {
  excess_payment: "Excess Payment",
  refund_credit: "Refund Credit",
  manual_adjustment: "Manual Adjustment",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Fully Available",
  partially_used: "Partially Used",
  fully_used: "Fully Used",
  voided: "Voided",
  fully_refunded: "Fully Refunded",
  partially_available: "Partially Available",
};

function formatDateStr(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CreditNotePDF({ cn }: { cn: CreditNoteData }) {
  const hasRefundProcessed =
    cn.refundProcessedRef || cn.refundProcessedDate || cn.refundProcessedAmount != null || cn.refundProcessedNotes;

  return (
    <Document title={`Credit Note ${cn.creditNoteNumber}`}>
      <Page size="A4" style={styles.page}>

        {/* ── HEADER: Logo | CREDIT NOTE | Company ── */}
        <View style={styles.headerSection}>
          {/* Left: Logo */}
          <View style={styles.headerLogoCol}>
            {cn.logoUrl && (
              <Image src={cn.logoUrl} style={styles.logo} />
            )}
          </View>

          {/* Center: Document title */}
          <View style={styles.headerTitleCol}>
            <Text style={styles.docTitle}>CREDIT NOTE</Text>
          </View>

          {/* Right: Company details */}
          <View style={styles.headerCompanyCol}>
            <View style={styles.companyBlock}>
              {cn.companyName && <Text style={styles.companyName}>{cn.companyName}</Text>}
              {cn.companyAddress && <Text style={styles.companyDetail}>{cn.companyAddress}</Text>}
              {cn.companyPhone && <Text style={styles.companyDetail}>{cn.companyPhone}</Text>}
              {cn.companyNtn && <Text style={styles.companyDetail}>NTN: {cn.companyNtn}</Text>}
              {cn.companySNtn && <Text style={styles.companyDetail}>SNTN: {cn.companySNtn}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* CN number + status + client meta row */}
        <View style={styles.cnMeta}>
          <View style={styles.cnMetaBox}>
            <Text style={styles.cnMetaLabel}>Credit Note No.</Text>
            <Text style={styles.cnMetaValue}>{cn.creditNoteNumber}</Text>
          </View>
          <View style={styles.cnMetaBox}>
            <Text style={styles.cnMetaLabel}>Issued To</Text>
            <Text style={styles.cnMetaValue}>{cn.clientName}</Text>
          </View>
          <View style={styles.cnMetaBox}>
            <Text style={styles.cnMetaLabel}>Type</Text>
            <Text style={styles.cnMetaValue}>{TYPE_LABELS[cn.type] || cn.type}</Text>
          </View>
          <View style={styles.cnMetaBox}>
            <Text style={styles.cnMetaLabel}>Date Issued</Text>
            <Text style={styles.cnMetaValue}>{formatDateStr(cn.createdAt)}</Text>
          </View>
        </View>

        {/* Status + linked invoice */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{STATUS_LABELS[cn.status] || cn.status}</Text>
          </View>
          {cn.invoiceNumber && (
            <View style={[styles.statusBadge, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.statusText, { color: "#1d4ed8" }]}>Linked Invoice: {cn.invoiceNumber}</Text>
            </View>
          )}
        </View>

        {/* Amount banner */}
        <View style={styles.amountBanner}>
          <View>
            <Text style={styles.amountLabel}>Credit Amount</Text>
            <Text style={styles.amountValue}>{formatAmount(cn.amount, cn.currency)}</Text>
          </View>
          <View style={styles.amountRight}>
            <Text style={styles.amountCurrency}>{cn.currency}</Text>
            {cn.usedAmount > 0 && (
              <>
                <Text style={styles.amountUsed}>Used: {formatAmount(cn.usedAmount, cn.currency)}</Text>
                <Text style={[styles.amountUsed, { color: "#a5f3fc" }]}>
                  Remaining: {formatAmount(cn.remainingAmount, cn.currency)}
                </Text>
              </>
            )}
            {cn.status === "partially_available" && cn.refundProcessedAmount != null && (
              <>
                <Text style={styles.amountUsed}>Refunded: {formatAmount(cn.refundProcessedAmount, cn.currency)}</Text>
                <Text style={[styles.amountUsed, { color: "#a5f3fc" }]}>
                  Available: {formatAmount(cn.remainingAmount, cn.currency)}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Reason / Notes */}
        {cn.description && (
          <>
            <Text style={styles.sectionTitle}>Reason / Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{cn.description}</Text>
            </View>
          </>
        )}

        {/* Refund Processed Details */}
        {hasRefundProcessed && (
          <>
            <Text style={styles.sectionTitle}>Refund Processed Details</Text>
            <View style={styles.refundBox}>
              <View style={styles.refundRow}>
                {cn.refundProcessedRef && (
                  <View style={styles.refundCell}>
                    <Text style={styles.refundLabel}>Payment Reference</Text>
                    <Text style={styles.refundValue}>{cn.refundProcessedRef}</Text>
                  </View>
                )}
                {cn.refundProcessedDate && (
                  <View style={styles.refundCell}>
                    <Text style={styles.refundLabel}>Date Processed</Text>
                    <Text style={styles.refundValue}>{cn.refundProcessedDate}</Text>
                  </View>
                )}
              </View>
              {cn.refundProcessedAmount != null && (
                <View style={[styles.refundRow, { marginTop: 2 }]}>
                  <View style={styles.refundCell}>
                    <Text style={styles.refundLabel}>Amount Refunded</Text>
                    <Text style={[styles.refundValue, { fontFamily: "Helvetica-Bold" }]}>
                      {formatAmount(cn.refundProcessedAmount, cn.currency)}
                    </Text>
                  </View>
                </View>
              )}
              {cn.refundProcessedNotes && (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.refundLabel}>Notes for Client</Text>
                  <Text style={styles.refundValue}>{cn.refundProcessedNotes}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{cn.creditNoteNumber} — {cn.companyName || "InvoiceXPedia"}</Text>
          <Text style={styles.footerText}>
            Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </Text>
        </View>

      </Page>
    </Document>
  );
}

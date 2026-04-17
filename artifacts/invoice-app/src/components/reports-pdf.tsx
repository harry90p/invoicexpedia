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
  green: "#16a34a",
  red: "#dc2626",
  yellow: "#ca8a04",
  blue: "#1d4ed8",
  purple: "#6d28d9",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: C.black,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
    backgroundColor: C.white,
  },

  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    minHeight: 70,
  },
  headerLogoCol: { width: 120, alignItems: "flex-start", justifyContent: "center" },
  headerTitleCol: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerCompanyCol: { width: 160, alignItems: "flex-end", justifyContent: "center" },
  logo: { width: 110, height: 55, objectFit: "contain" },
  reportTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 1,
    textAlign: "center",
  },
  reportSubtitle: { fontSize: 8, color: C.gray, textAlign: "center", marginTop: 3 },
  companyName: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.darkGray, textAlign: "right", marginBottom: 1 },
  companyDetail: { fontSize: 7.5, color: C.gray, textAlign: "right", lineHeight: 1.4 },

  divider: { borderBottomWidth: 1.5, borderBottomColor: C.accent, marginBottom: 14 },
  thinDivider: { borderBottomWidth: 0.5, borderBottomColor: C.border, marginVertical: 10 },

  summaryGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: C.bgLight,
    borderRadius: 4,
    padding: 10,
    borderLeftWidth: 3,
  },
  summaryLabel: { fontSize: 7, color: C.lightGray, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 3 },
  summaryValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  summaryNote: { fontSize: 7, color: C.gray, marginTop: 2 },

  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.darkGray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 7,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.accent,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.white },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRowAlt: { backgroundColor: "#f9f9fc" },
  tableCell: { fontSize: 7.5, color: C.darkGray },
  tableCellMuted: { fontSize: 7.5, color: C.gray },

  badge: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 },

  agingBucketRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  agingBucketLabel: { width: 100, fontSize: 8, fontFamily: "Helvetica-Bold" },
  agingBucketCount: { width: 50, fontSize: 8, textAlign: "right" },
  agingBucketAmount: { flex: 1, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" },
  agingBucketBar: { height: 6, borderRadius: 2, marginTop: 4 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: C.lightGray },
});

function fmt(amount: number, currency = "PKR") {
  return `${currency} ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function today() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export type AgingBucket = {
  label: string;
  count: number;
  total: number;
  currency: string;
  color: string;
};

export type ReportInvoice = {
  id: number;
  invoiceNumber: string;
  clientName: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  paymentStatus: string;
  category: string;
  daysPastDue?: number;
};

type CompanyInfo = {
  logoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyNtn?: string;
  companySNtn?: string;
};

type SummaryData = {
  totalInvoices?: number;
  totalAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paidCount?: number;
  unpaidCount?: number;
  partialCount?: number;
};

function Header({ company, title, subtitle }: { company: CompanyInfo; title: string; subtitle?: string }) {
  return (
    <>
      <View style={styles.headerSection}>
        <View style={styles.headerLogoCol}>
          {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
        </View>
        <View style={styles.headerTitleCol}>
          <Text style={styles.reportTitle}>{title}</Text>
          {subtitle && <Text style={styles.reportSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.headerCompanyCol}>
          {company.companyName && <Text style={styles.companyName}>{company.companyName}</Text>}
          {company.companyAddress && <Text style={styles.companyDetail}>{company.companyAddress}</Text>}
          {company.companyPhone && <Text style={styles.companyDetail}>{company.companyPhone}</Text>}
          {company.companyNtn && <Text style={styles.companyDetail}>NTN: {company.companyNtn}</Text>}
          {company.companySNtn && <Text style={styles.companyDetail}>SNTN: {company.companySNtn}</Text>}
        </View>
      </View>
      <View style={styles.divider} />
    </>
  );
}

function Footer({ company }: { company: CompanyInfo }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{company.companyName || "InvoiceXPedia"}</Text>
      <Text style={styles.footerText}>Generated on {today()}</Text>
    </View>
  );
}

/* ── Aging Report PDF ── */
export function AgingReportPDF({
  buckets,
  invoices,
  company,
}: {
  buckets: AgingBucket[];
  invoices: ReportInvoice[];
  company: CompanyInfo;
}) {
  const totalOutstanding = buckets.reduce((s, b) => s + b.total, 0);
  const currency = buckets[0]?.currency || "PKR";

  return (
    <Document title="Aging Report">
      <Page size="A4" style={styles.page}>
        <Header company={company} title="AGING REPORT" subtitle={`Generated on ${today()}`} />

        {/* Summary buckets */}
        <View style={[styles.summaryGrid, { marginBottom: 18 }]}>
          {buckets.map((b) => (
            <View key={b.label} style={[styles.summaryCard, { borderLeftColor: b.color }]}>
              <Text style={styles.summaryLabel}>{b.label}</Text>
              <Text style={[styles.summaryValue, { color: b.color }]}>{fmt(b.total, currency)}</Text>
              <Text style={styles.summaryNote}>{b.count} invoice{b.count !== 1 ? "s" : ""}</Text>
            </View>
          ))}
        </View>

        {/* Total outstanding */}
        <View style={{ backgroundColor: "#1e3a5f", borderRadius: 4, padding: 10, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 9, color: "#93c5fd", fontFamily: "Helvetica-Bold" }}>TOTAL OUTSTANDING</Text>
          <Text style={{ fontSize: 14, color: C.white, fontFamily: "Helvetica-Bold" }}>{fmt(totalOutstanding, currency)}</Text>
        </View>

        {/* Invoice detail table */}
        <Text style={styles.sectionTitle}>Invoice Detail by Aging</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 80 }]}>Invoice #</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Client</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Due Date</Text>
          <Text style={[styles.tableHeaderCell, { width: 45, textAlign: "right" }]}>Days OD</Text>
          <Text style={[styles.tableHeaderCell, { width: 85, textAlign: "right" }]}>Outstanding</Text>
          <Text style={[styles.tableHeaderCell, { width: 60, textAlign: "right" }]}>Bucket</Text>
        </View>
        {invoices.map((inv, i) => {
          const bucket = buckets.find(b => {
            const d = inv.daysPastDue ?? -1;
            if (b.label === "Current") return d <= 0;
            if (b.label === "1–30 Days") return d >= 1 && d <= 30;
            if (b.label === "31–60 Days") return d >= 31 && d <= 60;
            if (b.label === "61–90 Days") return d >= 61 && d <= 90;
            if (b.label === "91+ Days") return d > 90;
            return false;
          });
          return (
            <View key={inv.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: 80, fontFamily: "Helvetica-Bold" }]}>{inv.invoiceNumber}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{inv.clientName}</Text>
              <Text style={[styles.tableCellMuted, { width: 60 }]}>{inv.dueDate ? fmtDate(inv.dueDate) : "—"}</Text>
              <Text style={[styles.tableCell, { width: 45, textAlign: "right", color: (inv.daysPastDue ?? 0) > 0 ? C.red : C.green }]}>
                {inv.daysPastDue != null && inv.daysPastDue > 0 ? `+${inv.daysPastDue}` : inv.daysPastDue === 0 ? "Today" : "—"}
              </Text>
              <Text style={[styles.tableCell, { width: 85, textAlign: "right", fontFamily: "Helvetica-Bold", color: C.red }]}>
                {fmt(inv.outstandingBalance, inv.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: 60, textAlign: "right", color: bucket?.color || C.gray }]}>
                {bucket?.label || "—"}
              </Text>
            </View>
          );
        })}

        <Footer company={company} />
      </Page>
    </Document>
  );
}

/* ── Outstanding Invoices PDF ── */
export function OutstandingReportPDF({
  invoices,
  company,
}: {
  invoices: ReportInvoice[];
  company: CompanyInfo;
}) {
  const total = invoices.reduce((s, i) => s + i.outstandingBalance, 0);
  const currency = invoices[0]?.currency || "PKR";

  return (
    <Document title="Outstanding Invoices Report">
      <Page size="A4" style={[styles.page, { paddingHorizontal: 30 }]}>
        <Header company={company} title="OUTSTANDING INVOICES" subtitle={`Generated on ${today()} · ${invoices.length} invoices`} />

        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 78 }]}>Invoice #</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Client</Text>
          <Text style={[styles.tableHeaderCell, { width: 52 }]}>Date</Text>
          <Text style={[styles.tableHeaderCell, { width: 52 }]}>Due Date</Text>
          <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>Total</Text>
          <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>Paid</Text>
          <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>Outstanding</Text>
          <Text style={[styles.tableHeaderCell, { width: 42, textAlign: "center" }]}>Status</Text>
        </View>

        {invoices.map((inv, i) => {
          const statusColor = inv.paymentStatus === "partial" ? C.yellow : C.red;
          return (
            <View key={inv.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: 78, fontFamily: "Helvetica-Bold" }]}>{inv.invoiceNumber}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{inv.clientName}</Text>
              <Text style={[styles.tableCellMuted, { width: 52 }]}>{fmtDate(inv.invoiceDate)}</Text>
              <Text style={[styles.tableCellMuted, { width: 52 }]}>{inv.dueDate ? fmtDate(inv.dueDate) : "—"}</Text>
              <Text style={[styles.tableCell, { width: 70, textAlign: "right" }]}>{fmt(inv.totalAmount, inv.currency)}</Text>
              <Text style={[styles.tableCell, { width: 70, textAlign: "right", color: C.green }]}>{fmt(inv.paidAmount, inv.currency)}</Text>
              <Text style={[styles.tableCell, { width: 70, textAlign: "right", fontFamily: "Helvetica-Bold", color: C.red }]}>{fmt(inv.outstandingBalance, inv.currency)}</Text>
              <Text style={[styles.tableCell, { width: 42, textAlign: "center", color: statusColor, fontFamily: "Helvetica-Bold" }]}>
                {inv.paymentStatus === "partial" ? "Partial" : "Unpaid"}
              </Text>
            </View>
          );
        })}

        {/* Totals row */}
        <View style={{ flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: "#1e3a5f", marginTop: 2 }}>
          <Text style={{ flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white }}>TOTAL OUTSTANDING</Text>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fde68a", width: 70, textAlign: "right" }}>
            {fmt(total, currency)}
          </Text>
          <View style={{ width: 42 }} />
        </View>

        <Footer company={company} />
      </Page>
    </Document>
  );
}

/* ── Summary Report PDF ── */
export function SummaryReportPDF({
  summary,
  byCategory,
  company,
}: {
  summary: SummaryData;
  byCategory: Record<string, { count: number; total: number; paid: number; outstanding: number }>;
  company: CompanyInfo;
}) {
  const collectionRate = summary.totalAmount
    ? Math.round(((summary.paidAmount || 0) / summary.totalAmount) * 100)
    : 0;

  const CAT_LABELS: Record<string, string> = {
    flight: "Flights",
    hotel: "Hotels",
    tour: "Tours",
    mix_panel_tour: "Mix-Panel Tours",
    non_travel: "Non-Travel Products",
  };

  return (
    <Document title="Summary Report">
      <Page size="A4" style={styles.page}>
        <Header company={company} title="SUMMARY REPORT" subtitle={`Generated on ${today()}`} />

        {/* Key metrics */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { borderLeftColor: C.blue }]}>
            <Text style={styles.summaryLabel}>Total Invoiced</Text>
            <Text style={[styles.summaryValue, { color: C.blue }]}>{fmt(summary.totalAmount || 0)}</Text>
            <Text style={styles.summaryNote}>{summary.totalInvoices || 0} invoices</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: C.green }]}>
            <Text style={styles.summaryLabel}>Total Collected</Text>
            <Text style={[styles.summaryValue, { color: C.green }]}>{fmt(summary.paidAmount || 0)}</Text>
            <Text style={styles.summaryNote}>{collectionRate}% collection rate</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: C.red }]}>
            <Text style={styles.summaryLabel}>Outstanding Balance</Text>
            <Text style={[styles.summaryValue, { color: C.red }]}>{fmt(summary.outstandingAmount || 0)}</Text>
            <Text style={styles.summaryNote}>
              {(summary.unpaidCount || 0) + (summary.partialCount || 0)} invoices pending
            </Text>
          </View>
        </View>

        {/* Status breakdown */}
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Invoice Status Breakdown</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { width: 80, textAlign: "right" }]}>Count</Text>
          <Text style={[styles.tableHeaderCell, { width: 80, textAlign: "right" }]}>% of Total</Text>
        </View>
        {[
          { label: "Paid", count: summary.paidCount || 0, color: C.green },
          { label: "Partial Payment", count: summary.partialCount || 0, color: C.yellow },
          { label: "Unpaid", count: summary.unpaidCount || 0, color: C.red },
        ].map((s, i) => (
          <View key={s.label} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold", color: s.color }]}>{s.label}</Text>
            <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>{s.count}</Text>
            <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>
              {summary.totalInvoices ? Math.round((s.count / summary.totalInvoices) * 100) : 0}%
            </Text>
          </View>
        ))}

        {/* By category */}
        {Object.keys(byCategory).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Revenue by Category</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { width: 50, textAlign: "right" }]}>Count</Text>
              <Text style={[styles.tableHeaderCell, { width: 90, textAlign: "right" }]}>Total Billed</Text>
              <Text style={[styles.tableHeaderCell, { width: 90, textAlign: "right" }]}>Collected</Text>
              <Text style={[styles.tableHeaderCell, { width: 90, textAlign: "right" }]}>Outstanding</Text>
            </View>
            {Object.entries(byCategory).map(([cat, val], i) => (
              <View key={cat} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>
                  {CAT_LABELS[cat] || cat}
                </Text>
                <Text style={[styles.tableCell, { width: 50, textAlign: "right" }]}>{val.count}</Text>
                <Text style={[styles.tableCell, { width: 90, textAlign: "right" }]}>{fmt(val.total)}</Text>
                <Text style={[styles.tableCell, { width: 90, textAlign: "right", color: C.green }]}>{fmt(val.paid)}</Text>
                <Text style={[styles.tableCell, { width: 90, textAlign: "right", color: C.red }]}>{fmt(val.outstanding)}</Text>
              </View>
            ))}
          </>
        )}

        <Footer company={company} />
      </Page>
    </Document>
  );
}

/* ── Client Wise Report PDF ── */
export type ClientRow = {
  clientName: string;
  invoiceCount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
  currency: string;
};

export function ClientWiseReportPDF({
  rows,
  company,
}: {
  rows: ClientRow[];
  company: CompanyInfo;
}) {
  const grandTotal = rows.reduce((s, r) => s + r.totalAmount, 0);
  const grandPaid = rows.reduce((s, r) => s + r.paidAmount, 0);
  const grandOutstanding = rows.reduce((s, r) => s + r.outstandingBalance, 0);
  const currency = rows[0]?.currency || "PKR";

  return (
    <Document title="Client Wise Report">
      <Page size="A4" style={[styles.page, { paddingHorizontal: 30 }]}>
        <Header
          company={company}
          title="CLIENT WISE REPORT"
          subtitle={`Generated on ${today()} · ${rows.length} client${rows.length !== 1 ? "s" : ""}`}
        />

        <View style={[styles.summaryGrid, { marginBottom: 16 }]}>
          <View style={[styles.summaryCard, { borderLeftColor: C.blue }]}>
            <Text style={styles.summaryLabel}>Total Clients</Text>
            <Text style={[styles.summaryValue, { color: C.blue }]}>{rows.length}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: C.darkGray }]}>
            <Text style={styles.summaryLabel}>Total Invoiced</Text>
            <Text style={[styles.summaryValue, { color: C.darkGray }]}>{fmt(grandTotal, currency)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: C.green }]}>
            <Text style={styles.summaryLabel}>Total Collected</Text>
            <Text style={[styles.summaryValue, { color: C.green }]}>{fmt(grandPaid, currency)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: C.red }]}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={[styles.summaryValue, { color: C.red }]}>{fmt(grandOutstanding, currency)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Breakdown by Client</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Client</Text>
          <Text style={[styles.tableHeaderCell, { width: 36, textAlign: "center" }]}>Inv</Text>
          <Text style={[styles.tableHeaderCell, { width: 36, textAlign: "center" }]}>Paid</Text>
          <Text style={[styles.tableHeaderCell, { width: 36, textAlign: "center" }]}>Part</Text>
          <Text style={[styles.tableHeaderCell, { width: 36, textAlign: "center" }]}>Unp</Text>
          <Text style={[styles.tableHeaderCell, { width: 82, textAlign: "right" }]}>Total Billed</Text>
          <Text style={[styles.tableHeaderCell, { width: 82, textAlign: "right" }]}>Collected</Text>
          <Text style={[styles.tableHeaderCell, { width: 82, textAlign: "right" }]}>Outstanding</Text>
        </View>

        {rows.map((row, i) => (
          <View key={row.clientName} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{row.clientName}</Text>
            <Text style={[styles.tableCell, { width: 36, textAlign: "center" }]}>{row.invoiceCount}</Text>
            <Text style={[styles.tableCell, { width: 36, textAlign: "center", color: C.green }]}>{row.paidCount}</Text>
            <Text style={[styles.tableCell, { width: 36, textAlign: "center", color: C.yellow }]}>{row.partialCount}</Text>
            <Text style={[styles.tableCell, { width: 36, textAlign: "center", color: C.red }]}>{row.unpaidCount}</Text>
            <Text style={[styles.tableCell, { width: 82, textAlign: "right" }]}>{fmt(row.totalAmount, row.currency)}</Text>
            <Text style={[styles.tableCell, { width: 82, textAlign: "right", color: C.green }]}>{fmt(row.paidAmount, row.currency)}</Text>
            <Text style={[styles.tableCell, { width: 82, textAlign: "right", fontFamily: "Helvetica-Bold", color: row.outstandingBalance > 0 ? C.red : C.green }]}>
              {fmt(row.outstandingBalance, row.currency)}
            </Text>
          </View>
        ))}

        <View style={{ flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: "#1e3a5f", marginTop: 2 }}>
          <Text style={{ flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white }}>GRAND TOTAL</Text>
          <View style={{ width: 144 }} />
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white, width: 82, textAlign: "right" }}>
            {fmt(grandTotal, currency)}
          </Text>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#86efac", width: 82, textAlign: "right" }}>
            {fmt(grandPaid, currency)}
          </Text>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#fca5a5", width: 82, textAlign: "right" }}>
            {fmt(grandOutstanding, currency)}
          </Text>
        </View>

        <Footer company={company} />
      </Page>
    </Document>
  );
}

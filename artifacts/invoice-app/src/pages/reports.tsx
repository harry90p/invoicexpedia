import React, { useState, useMemo } from "react";
import {
  useGetReportSummary,
  useGetOutstandingInvoices,
  useGetSettings,
  useListInvoices,
  type Invoice,
} from "@workspace/api-client-react";
import { pdf } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import {
  AgingReportPDF,
  OutstandingReportPDF,
  SummaryReportPDF,
  ClientWiseReportPDF,
  type AgingBucket,
  type ReportInvoice,
  type ClientRow,
} from "@/components/reports-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileDown, Download, FileSpreadsheet, ChevronDown, AlertTriangle, Clock, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AGING_BUCKETS = [
  { label: "Current",     color: "#16a34a", min: -Infinity, max: 0 },
  { label: "1–30 Days",   color: "#ca8a04", min: 1,         max: 30 },
  { label: "31–60 Days",  color: "#ea580c", min: 31,        max: 60 },
  { label: "61–90 Days",  color: "#dc2626", min: 61,        max: 90 },
  { label: "91+ Days",    color: "#7f1d1d", min: 91,        max: Infinity },
];

function daysPastDue(dueDate?: string): number | undefined {
  if (!dueDate) return undefined;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86400000);
}

function getBucket(dpd?: number) {
  if (dpd === undefined) return AGING_BUCKETS[0];
  return AGING_BUCKETS.find(b => dpd >= b.min && dpd <= b.max) || AGING_BUCKETS[4];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":    return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
    case "partial": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>;
    case "unpaid":  return <Badge className="bg-red-100 text-red-800 border-red-200">Unpaid</Badge>;
    default:        return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Reports() {
  const { data: summary, isLoading: isSummaryLoading } = useGetReportSummary();
  const { data: outstandingInvoices, isLoading: isOutstandingLoading } = useGetOutstandingInvoices();
  const { data: allInvoicesData, isLoading: isAllInvoicesLoading } = useListInvoices({ limit: 9999, status: "all" });
  const { data: settings } = useGetSettings();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("all");

  const company = {
    logoUrl: settings?.logoUrl ?? undefined,
    companyName: settings?.companyName ?? undefined,
    companyAddress: settings?.companyAddress ?? undefined,
    companyPhone: settings?.companyPhone ?? undefined,
    companyNtn: settings?.companyNtn ?? undefined,
    companySNtn: settings?.companySNtn ?? undefined,
  };

  const reportInvoices: ReportInvoice[] = useMemo(() =>
    (outstandingInvoices || []).map((inv: Invoice) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      currency: inv.currency || "PKR",
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      outstandingBalance: inv.outstandingBalance,
      paymentStatus: inv.paymentStatus,
      category: inv.category,
      daysPastDue: daysPastDue(inv.dueDate),
    })),
    [outstandingInvoices]
  );

  const agingBuckets: AgingBucket[] = useMemo(() => {
    const currency = reportInvoices[0]?.currency || "PKR";
    return AGING_BUCKETS.map(b => ({
      label: b.label,
      color: b.color,
      currency,
      count: reportInvoices.filter(i => {
        const d = i.daysPastDue;
        if (d === undefined) return b.label === "Current";
        return d >= b.min && d <= b.max;
      }).length,
      total: reportInvoices
        .filter(i => {
          const d = i.daysPastDue;
          if (d === undefined) return b.label === "Current";
          return d >= b.min && d <= b.max;
        })
        .reduce((s, i) => s + i.outstandingBalance, 0),
    }));
  }, [reportInvoices]);

  const clientRows: ClientRow[] = useMemo(() => {
    const allInvoices = allInvoicesData?.invoices || [];
    const map = new Map<string, ClientRow>();
    for (const inv of allInvoices) {
      const name = inv.clientName || "Unknown";
      const existing = map.get(name) || {
        clientName: name,
        invoiceCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        paidCount: 0,
        unpaidCount: 0,
        partialCount: 0,
        currency: inv.currency || "PKR",
      };
      existing.invoiceCount += 1;
      existing.totalAmount += inv.totalAmount || 0;
      existing.paidAmount += inv.paidAmount || 0;
      existing.outstandingBalance += inv.outstandingBalance || 0;
      if (inv.paymentStatus === "paid") existing.paidCount += 1;
      else if (inv.paymentStatus === "partial") existing.partialCount += 1;
      else existing.unpaidCount += 1;
      map.set(name, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [allInvoicesData]);

  const categoryData = summary?.byCategory
    ? Object.entries(summary.byCategory).map(([key, value]) => {
        const v = value as { count?: number; total?: number };
        return {
          name: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          value: v.total || 0,
          count: v.count || 0,
        };
      })
    : [];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  async function downloadPDF(type: "aging" | "outstanding" | "summary" | "clientwise") {
    try {
      let blob: Blob;
      let filename: string;

      if (type === "aging") {
        blob = await pdf(<AgingReportPDF buckets={agingBuckets} invoices={reportInvoices} company={company} />).toBlob();
        filename = "Aging_Report.pdf";
      } else if (type === "outstanding") {
        blob = await pdf(<OutstandingReportPDF invoices={reportInvoices} company={company} />).toBlob();
        filename = "Outstanding_Invoices_Report.pdf";
      } else if (type === "clientwise") {
        blob = await pdf(<ClientWiseReportPDF rows={clientRows} company={company} />).toBlob();
        filename = "Client_Wise_Report.pdf";
      } else {
        const byCategory: Record<string, { count: number; total: number; paid: number; outstanding: number }> = {};
        Object.entries(summary?.byCategory || {}).forEach(([k, v]) => {
          const cat = v as { count?: number; total?: number };
          byCategory[k] = { count: cat.count || 0, total: cat.total || 0, paid: 0, outstanding: 0 };
        });
        blob = await pdf(
          <SummaryReportPDF summary={summary || {}} byCategory={byCategory} company={company} />
        ).toBlob();
        filename = "Summary_Report.pdf";
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF Downloaded", description: filename });
    } catch (err) {
      console.error(err);
      toast({ title: "PDF export failed", variant: "destructive" });
    }
  }

  async function downloadExcel(type: "aging" | "outstanding" | "clientwise") {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = company.companyName || "InvoiceXPedia";
      wb.created = new Date();

      const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
      const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      const redFont: Partial<ExcelJS.Font> = { color: { argb: "FFDC2626" }, bold: true };
      const greenFont: Partial<ExcelJS.Font> = { color: { argb: "FF16A34A" } };

      if (type === "aging") {
        const ws = wb.addWorksheet("Aging Report");
        ws.columns = [
          { header: "Invoice #",    key: "invoiceNumber",    width: 16 },
          { header: "Client",       key: "clientName",       width: 28 },
          { header: "Invoice Date", key: "invoiceDate",      width: 14 },
          { header: "Due Date",     key: "dueDate",          width: 14 },
          { header: "Days Overdue", key: "daysPastDue",      width: 14 },
          { header: "Total (PKR)",  key: "totalAmount",      width: 16 },
          { header: "Outstanding",  key: "outstandingBalance", width: 18 },
          { header: "Status",       key: "paymentStatus",    width: 12 },
          { header: "Aging Bucket", key: "bucket",           width: 16 },
        ];
        const hRow = ws.getRow(1);
        hRow.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: "middle", horizontal: "center" }; });
        hRow.height = 22;

        for (const inv of reportInvoices) {
          const b = getBucket(inv.daysPastDue);
          const row = ws.addRow({
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.clientName,
            invoiceDate: formatDate(inv.invoiceDate),
            dueDate: inv.dueDate ? formatDate(inv.dueDate) : "",
            daysPastDue: inv.daysPastDue != null && inv.daysPastDue > 0 ? inv.daysPastDue : 0,
            totalAmount: inv.totalAmount,
            outstandingBalance: inv.outstandingBalance,
            paymentStatus: inv.paymentStatus,
            bucket: b?.label || "—",
          });
          row.getCell("outstandingBalance").font = redFont;
          row.getCell("totalAmount").numFmt = "#,##0.00";
          row.getCell("outstandingBalance").numFmt = "#,##0.00";
        }

        // Bucket summary sheet
        const ws2 = wb.addWorksheet("Summary by Bucket");
        ws2.columns = [
          { header: "Aging Bucket", key: "label",  width: 18 },
          { header: "Invoices",     key: "count",  width: 12 },
          { header: "Outstanding",  key: "total",  width: 18 },
        ];
        const h2 = ws2.getRow(1);
        h2.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { horizontal: "center" }; });
        h2.height = 22;
        for (const b of agingBuckets) {
          const row = ws2.addRow({ label: b.label, count: b.count, total: b.total });
          row.getCell("total").numFmt = "#,##0.00";
        }

      } else if (type === "outstanding") {
        const ws = wb.addWorksheet("Outstanding Invoices");
        ws.columns = [
          { header: "Invoice #",    key: "invoiceNumber",     width: 16 },
          { header: "Client",       key: "clientName",        width: 28 },
          { header: "Category",     key: "category",          width: 16 },
          { header: "Invoice Date", key: "invoiceDate",       width: 14 },
          { header: "Due Date",     key: "dueDate",           width: 14 },
          { header: "Currency",     key: "currency",          width: 10 },
          { header: "Total Amount", key: "totalAmount",       width: 16 },
          { header: "Paid",         key: "paidAmount",        width: 16 },
          { header: "Outstanding",  key: "outstandingBalance",width: 18 },
          { header: "Status",       key: "paymentStatus",     width: 12 },
        ];
        const hRow = ws.getRow(1);
        hRow.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: "middle", horizontal: "center" }; });
        hRow.height = 22;

        for (const inv of reportInvoices) {
          const row = ws.addRow({
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.clientName,
            category: inv.category.replace(/_/g, " "),
            invoiceDate: formatDate(inv.invoiceDate),
            dueDate: inv.dueDate ? formatDate(inv.dueDate) : "",
            currency: inv.currency,
            totalAmount: inv.totalAmount,
            paidAmount: inv.paidAmount,
            outstandingBalance: inv.outstandingBalance,
            paymentStatus: inv.paymentStatus,
          });
          ["totalAmount", "paidAmount", "outstandingBalance"].forEach(k => { row.getCell(k).numFmt = "#,##0.00"; });
          row.getCell("outstandingBalance").font = redFont;
          row.getCell("paidAmount").font = greenFont;
        }

        // Total row
        const totalRow = ws.addRow({
          invoiceNumber: "TOTAL",
          outstandingBalance: reportInvoices.reduce((s, i) => s + i.outstandingBalance, 0),
        });
        totalRow.font = { bold: true };
        totalRow.getCell("outstandingBalance").numFmt = "#,##0.00";
        totalRow.getCell("outstandingBalance").font = { ...redFont, bold: true };
      } else if (type === "clientwise") {
        const ws = wb.addWorksheet("Client Wise Report");
        ws.columns = [
          { header: "Client",       key: "clientName",        width: 30 },
          { header: "Total Invoices", key: "invoiceCount",    width: 14 },
          { header: "Paid",         key: "paidCount",         width: 10 },
          { header: "Partial",      key: "partialCount",      width: 10 },
          { header: "Unpaid",       key: "unpaidCount",       width: 10 },
          { header: "Total Billed", key: "totalAmount",       width: 18 },
          { header: "Collected",    key: "paidAmount",        width: 18 },
          { header: "Outstanding",  key: "outstandingBalance",width: 18 },
        ];
        const hRow = ws.getRow(1);
        hRow.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: "middle", horizontal: "center" }; });
        hRow.height = 22;

        for (const row of clientRows) {
          const wsRow = ws.addRow({
            clientName: row.clientName,
            invoiceCount: row.invoiceCount,
            paidCount: row.paidCount,
            partialCount: row.partialCount,
            unpaidCount: row.unpaidCount,
            totalAmount: row.totalAmount,
            paidAmount: row.paidAmount,
            outstandingBalance: row.outstandingBalance,
          });
          ["totalAmount", "paidAmount", "outstandingBalance"].forEach(k => { wsRow.getCell(k).numFmt = "#,##0.00"; });
          wsRow.getCell("paidAmount").font = greenFont;
          if (row.outstandingBalance > 0) wsRow.getCell("outstandingBalance").font = redFont;
        }

        const totalsRow = ws.addRow({
          clientName: "GRAND TOTAL",
          invoiceCount: clientRows.reduce((s, r) => s + r.invoiceCount, 0),
          totalAmount: clientRows.reduce((s, r) => s + r.totalAmount, 0),
          paidAmount: clientRows.reduce((s, r) => s + r.paidAmount, 0),
          outstandingBalance: clientRows.reduce((s, r) => s + r.outstandingBalance, 0),
        });
        totalsRow.font = { bold: true };
        ["totalAmount", "paidAmount", "outstandingBalance"].forEach(k => { totalsRow.getCell(k).numFmt = "#,##0.00"; });
        totalsRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "aging" ? "Aging_Report.xlsx" : type === "clientwise" ? "Client_Wise_Report.xlsx" : "Outstanding_Invoices.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Excel Downloaded" });
    } catch (err) {
      console.error(err);
      toast({ title: "Excel export failed", variant: "destructive" });
    }
  }

  if (isSummaryLoading || isOutstandingLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const totalOutstanding = agingBuckets.reduce((s, b) => s + b.total, 0);
  const currency = reportInvoices[0]?.currency || "PKR";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <FileDown className="h-4 w-4" />
                Download Report
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => downloadPDF("summary")} className="gap-2">
                <FileDown className="h-4 w-4 text-blue-500" />
                Summary Report (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPDF("clientwise")} className="gap-2">
                <FileDown className="h-4 w-4 text-purple-500" />
                Client Wise Report (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadExcel("clientwise")} className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Client Wise Report (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPDF("aging")} className="gap-2">
                <FileDown className="h-4 w-4 text-orange-500" />
                Aging Report (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadExcel("aging")} className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Aging Report (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPDF("outstanding")} className="gap-2">
                <FileDown className="h-4 w-4 text-red-500" />
                Outstanding Invoices (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadExcel("outstanding")} className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Outstanding Invoices (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary?.totalAmount || 0)}</div>
            <p className="text-sm text-muted-foreground mt-1">{summary?.totalInvoices || 0} total invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-500">{formatCurrency(summary?.paidAmount || 0)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.round(((summary?.paidAmount || 0) / (summary?.totalAmount || 1)) * 100)}% collection rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-500">{formatCurrency(summary?.outstandingAmount || 0)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              From {(summary?.unpaidCount || 0) + (summary?.partialCount || 0)} invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue by Category</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invoice Status Breakdown</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Paid",    count: summary?.paidCount    || 0, fill: "#22c55e" },
                  { name: "Partial", count: summary?.partialCount || 0, fill: "#eab308" },
                  { name: "Unpaid",  count: summary?.unpaidCount  || 0, fill: "#ef4444" },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {[
                    { name: "Paid",    fill: "#22c55e" },
                    { name: "Partial", fill: "#eab308" },
                    { name: "Unpaid",  fill: "#ef4444" },
                  ].map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Client Wise Report ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Client Wise Report
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadPDF("clientwise")} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExcel("clientwise")} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAllInvoicesLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : clientRows.length > 0 ? (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 p-3 text-center">
                  <p className="text-xs font-semibold text-purple-600 mb-1">Total Clients</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{clientRows.length}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 dark:bg-slate-900/30 border-slate-200 p-3 text-center">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Total Invoiced</p>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-50">
                    {formatCurrency(clientRows.reduce((s, r) => s + r.totalAmount, 0))}
                  </p>
                </div>
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 p-3 text-center">
                  <p className="text-xs font-semibold text-green-600 mb-1">Total Collected</p>
                  <p className="text-base font-bold text-green-700">
                    {formatCurrency(clientRows.reduce((s, r) => s + r.paidAmount, 0))}
                  </p>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 p-3 text-center">
                  <p className="text-xs font-semibold text-red-600 mb-1">Outstanding</p>
                  <p className="text-base font-bold text-red-600">
                    {formatCurrency(clientRows.reduce((s, r) => s + r.outstandingBalance, 0))}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-center">Paid</TableHead>
                    <TableHead className="text-center">Partial</TableHead>
                    <TableHead className="text-center">Unpaid</TableHead>
                    <TableHead className="text-right">Total Billed</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientRows.map((row) => (
                    <TableRow key={row.clientName}>
                      <TableCell className="font-semibold">{row.clientName}</TableCell>
                      <TableCell className="text-right">{row.invoiceCount}</TableCell>
                      <TableCell className="text-center">
                        {row.paidCount > 0 && <Badge className="bg-green-100 text-green-800 border-green-200">{row.paidCount}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.partialCount > 0 && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{row.partialCount}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.unpaidCount > 0 && <Badge className="bg-red-100 text-red-800 border-red-200">{row.unpaidCount}</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.totalAmount, row.currency)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(row.paidAmount, row.currency)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={row.outstandingBalance > 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(row.outstandingBalance, row.currency)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-right">{clientRows.reduce((s, r) => s + r.invoiceCount, 0)}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right">{formatCurrency(clientRows.reduce((s, r) => s + r.totalAmount, 0))}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(clientRows.reduce((s, r) => s + r.paidAmount, 0))}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(clientRows.reduce((s, r) => s + r.outstandingBalance, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="py-10 text-center text-muted-foreground">No invoice data found.</div>
          )}
        </CardContent>
      </Card>

      {/* ── Aging Report ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Aging Report
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadPDF("aging")} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExcel("aging")} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bucket summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {agingBuckets.map((b) => (
              <div
                key={b.label}
                className="rounded-lg border p-3 text-center"
                style={{ borderColor: b.color + "40", backgroundColor: b.color + "08" }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: b.color }}>{b.label}</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-50">
                  {formatCurrency(b.total, b.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.count} invoice{b.count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
          {/* Total outstanding banner */}
          <div className="bg-slate-800 dark:bg-slate-900 rounded-lg px-5 py-3 flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-300">Total Outstanding</span>
            <span className="text-xl font-bold text-white">{formatCurrency(totalOutstanding, currency)}</span>
          </div>
          {/* Aging detail table */}
          {reportInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Bucket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportInvoices.map((inv) => {
                  const b = getBucket(inv.daysPastDue);
                  const dpd = inv.daysPastDue;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline text-primary">
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.clientName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.dueDate ? formatDate(inv.dueDate) : <span className="italic">No due date</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {dpd != null && dpd > 0
                          ? <span className="font-semibold text-red-600">+{dpd} days</span>
                          : dpd === 0
                          ? <span className="text-orange-500 font-medium">Due today</span>
                          : <span className="text-green-600 text-xs">Not due</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(inv.outstandingBalance, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: b?.color + "20", color: b?.color, border: `1px solid ${b?.color}40` }}>
                          {b?.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No outstanding invoices — you're all clear!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Outstanding Invoices ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Outstanding Invoices</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadPDF("outstanding")} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExcel("outstanding")} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstandingInvoices?.map((invoice: Invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.totalAmount, invoice.currency)}</TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatCurrency(invoice.outstandingBalance, invoice.currency)}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.paymentStatus)}</TableCell>
                </TableRow>
              ))}
              {!outstandingInvoices?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No outstanding invoices found. Excellent!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

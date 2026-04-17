import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetClient,
  useUpdateClient,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Building2,
  User,
  Pencil,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Plus,
  BookOpen,
} from "lucide-react";

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "QAR", "KWD", "OMR", "BHD"];

function statusColor(status: string) {
  if (status === "paid") return "bg-green-100 text-green-800 border-green-200";
  if (status === "partial") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function isOverdue(invoice: { dueDate?: string | null; paymentStatus: string }, creditCycleDays: number) {
  if (invoice.paymentStatus === "paid") return false;
  const due = invoice.dueDate ? new Date(invoice.dueDate) : null;
  if (due) return due < new Date();
  return false;
}

export default function ClientProfile() {
  const params = useParams();
  const clientId = Number(params.id);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const { data: client, isLoading } = useGetClient(clientId, { query: { enabled: !!clientId } });
  const updateClient = useUpdateClient();

  const [form, setForm] = useState<Record<string, string>>({});

  function startEdit() {
    if (!client) return;
    setForm({
      name: client.name,
      contactPerson: client.contactPerson || "",
      address: client.address || "",
      ntn: client.ntn || "",
      contactInfo: client.contactInfo || "",
      defaultPurchaseOrder: client.defaultPurchaseOrder || "",
      defaultPoDate: client.defaultPoDate || "",
      creditLimit: String(client.creditLimit ?? 0),
      creditCycleDays: String(client.creditCycleDays ?? 30),
      serviceChargePct: String(client.serviceChargePct ?? 0),
      internationalServiceChargePct: String((client as any).internationalServiceChargePct ?? 0),
      serviceChargeBase: client.serviceChargeBase || "base_fare",
      currency: client.currency || "PKR",
      notes: client.notes || "",
    });
    setEditing(true);
  }

  function handleSave() {
    updateClient.mutate(
      {
        id: clientId,
        data: {
          name: form.name,
          contactPerson: form.contactPerson || undefined,
          address: form.address || undefined,
          ntn: form.ntn || undefined,
          contactInfo: form.contactInfo || undefined,
          defaultPurchaseOrder: form.defaultPurchaseOrder || undefined,
          defaultPoDate: form.defaultPoDate || undefined,
          creditLimit: Number(form.creditLimit),
          creditCycleDays: Number(form.creditCycleDays),
          serviceChargePct: Number(form.serviceChargePct),
          internationalServiceChargePct: Number(form.internationalServiceChargePct),
          serviceChargeBase: form.serviceChargeBase as "base_fare" | "base_fare_plus_taxes",
          currency: form.currency,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          toast({ title: "Client Updated" });
          setEditing(false);
        },
        onError: () => toast({ title: "Update Failed", variant: "destructive" }),
      }
    );
  }

  if (isLoading || !client) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const invoices = client.invoices || [];
  const creditLimit = Number(client.creditLimit ?? 0);
  const creditCycleDays = Number(client.creditCycleDays ?? 30);
  const totalOutstanding = Number(client.totalOutstanding ?? 0);
  const totalInvoiced = Number(client.totalInvoiced ?? 0);
  const totalPaid = Number(client.totalPaid ?? 0);
  const isCreditExceeded = creditLimit > 0 && totalOutstanding > creditLimit;
  const overdueInvoices = invoices.filter((inv) => isOverdue(inv, creditCycleDays));
  const cur = client.currency || "PKR";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/clients")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {(client as unknown as { clientType?: string }).clientType === "private" ? (
              <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {(client as unknown as { clientType?: string }).clientType === "private" ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Private</Badge>
            ) : (
              <Badge variant="outline">Corporate</Badge>
            )}
            <Badge variant="outline">{cur}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/ledgers/${clientId}`}>
            <Button size="sm" variant="outline">
              <BookOpen className="h-4 w-4 mr-1.5" /> View Ledger
            </Button>
          </Link>
          <Link href={`/invoices/new?clientId=${clientId}`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> New Invoice
            </Button>
          </Link>
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={updateClient.isPending}>
                <Save className="h-4 w-4 mr-1.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {isCreditExceeded && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Credit Limit Exceeded</p>
            <p className="text-sm">
              Outstanding balance of{" "}
              <span className="font-bold">{formatCurrency(totalOutstanding, cur)}</span> exceeds
              the credit limit of{" "}
              <span className="font-bold">{formatCurrency(creditLimit, cur)}</span>.
            </p>
          </div>
        </div>
      )}
      {overdueInvoices.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">
              {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? "s" : ""}
            </p>
            <p className="text-sm">
              {overdueInvoices.map((i) => i.invoiceNumber).join(", ")} — payment past due.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
              Client Details
            </h2>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Contact Info</Label>
                  <Input value={form.contactInfo} onChange={(e) => setForm((p) => ({ ...p, contactInfo: e.target.value }))} placeholder="Phone or email" />
                </div>
                {(client as unknown as { clientType?: string }).clientType !== "private" && (
                  <>
                    <div>
                      <Label>Point of Contact</Label>
                      <Input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Primary contact person" />
                    </div>
                    <div>
                      <Label>Client Address</Label>
                      <Textarea rows={2} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div>
                      <Label>NTN</Label>
                      <Input value={form.ntn} onChange={(e) => setForm((p) => ({ ...p, ntn: e.target.value }))} placeholder="Tax registration number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <Label>Default PO Number</Label>
                        <Input value={form.defaultPurchaseOrder} onChange={(e) => setForm((p) => ({ ...p, defaultPurchaseOrder: e.target.value }))} placeholder="PO number" />
                      </div>
                      <div>
                        <Label>Default PO Date</Label>
                        <Input type="date" value={form.defaultPoDate} onChange={(e) => setForm((p) => ({ ...p, defaultPoDate: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-2 border-t">
                      <Label>Credit Limit</Label>
                      <Input type="number" value={form.creditLimit} onChange={(e) => setForm((p) => ({ ...p, creditLimit: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Credit Cycle (Days)</Label>
                      <Input type="number" value={form.creditCycleDays} onChange={(e) => setForm((p) => ({ ...p, creditCycleDays: e.target.value }))} />
                    </div>
                    <div>
                      <Label>🇵🇰 Domestic SC %</Label>
                      <Input type="number" step="0.5" value={form.serviceChargePct} onChange={(e) => setForm((p) => ({ ...p, serviceChargePct: e.target.value }))} />
                    </div>
                    <div>
                      <Label>🌍 International SC %</Label>
                      <Input type="number" step="0.5" value={form.internationalServiceChargePct} onChange={(e) => setForm((p) => ({ ...p, internationalServiceChargePct: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Applied On</Label>
                      <Select value={form.serviceChargeBase} onValueChange={(v) => setForm((p) => ({ ...p, serviceChargeBase: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base_fare">Base Fare Only</SelectItem>
                          <SelectItem value="base_fare_plus_taxes">Base Fare + Taxes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div>
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {client.contactInfo && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Contact</p>
                    <p>{client.contactInfo}</p>
                  </div>
                )}
                {(client as unknown as { clientType?: string }).clientType !== "private" && (
                  <>
                    {client.contactPerson && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Point of Contact</p>
                        <p className="font-medium">{client.contactPerson}</p>
                      </div>
                    )}
                    {client.address && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Address</p>
                        <p className="whitespace-pre-line">{client.address}</p>
                      </div>
                    )}
                    {client.ntn && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">NTN</p>
                        <p>{client.ntn}</p>
                      </div>
                    )}
                    {(client.defaultPurchaseOrder || client.defaultPoDate) && (
                      <div className="pt-2 border-t">
                        {client.defaultPurchaseOrder && (
                          <div className="mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Default PO</p>
                            <p>{client.defaultPurchaseOrder}</p>
                          </div>
                        )}
                        {client.defaultPoDate && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Default PO Date</p>
                            <p>{client.defaultPoDate}</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit Limit</span>
                        <span className="font-medium">{formatCurrency(creditLimit, cur)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit Cycle</span>
                        <span className="font-medium">{creditCycleDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">🇵🇰 Domestic SC</span>
                        <span className="font-medium">{client.serviceChargePct ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">🌍 International SC</span>
                        <span className="font-medium">{(client as any).internationalServiceChargePct ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Applied On</span>
                        <span className="font-medium text-xs">
                          {client.serviceChargeBase === "base_fare_plus_taxes" ? "Fare + Taxes" : "Base Fare"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                {client.notes && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Notes</p>
                    <p className="text-muted-foreground">{client.notes}</p>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Client since {formatDate(client.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats + Invoices */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-zinc-900 border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
              </div>
              <p className="text-xl font-bold">{formatCurrency(totalInvoiced, cur)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalPaid, cur)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}% collected
              </p>
            </div>
            <div className={`border rounded-lg p-4 shadow-sm ${isCreditExceeded ? "bg-red-50 dark:bg-red-950 border-red-200" : "bg-white dark:bg-zinc-900"}`}>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className={`h-4 w-4 ${isCreditExceeded ? "text-red-500" : "text-amber-500"}`} />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding</p>
              </div>
              <p className={`text-xl font-bold ${isCreditExceeded ? "text-red-700 dark:text-red-400" : ""}`}>
                {formatCurrency(totalOutstanding, cur)}
              </p>
              {creditLimit > 0 && (
                <div className="mt-1.5">
                  <div className="h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isCreditExceeded ? "bg-red-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min((totalOutstanding / creditLimit) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round((totalOutstanding / creditLimit) * 100)}% of{" "}
                    {formatCurrency(creditLimit, cur)} limit
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Table */}
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Linked Invoices</h2>
              </div>
              <Link href={`/invoices?clientId=${clientId}`}>
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
              </Link>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No invoices linked to this client yet.</p>
                <Link href={`/invoices/new?clientId=${clientId}`}>
                  <Button size="sm" className="mt-3">
                    <Plus className="h-4 w-4 mr-1" /> Create Invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-zinc-800 border-b text-xs text-muted-foreground uppercase tracking-wide">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Invoice #</th>
                      <th className="py-2.5 px-4 text-left">Date</th>
                      <th className="py-2.5 px-4 text-left">Status</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right">Outstanding</th>
                      <th className="py-2.5 px-4 text-left">Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const overdue = isOverdue(inv, creditCycleDays);
                      return (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                          <td className="py-3 px-4">
                            <Link href={`/invoices/${inv.id}`} className="text-primary hover:underline font-medium">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                          <td className="py-3 px-4">
                            <Badge className={`text-xs capitalize ${statusColor(inv.paymentStatus)}`}>
                              {inv.paymentStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatCurrency(inv.totalAmount, inv.currency || cur)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {inv.outstandingBalance > 0 ? (
                              <span className="text-red-600 font-medium">
                                {formatCurrency(inv.outstandingBalance, inv.currency || cur)}
                              </span>
                            ) : (
                              <span className="text-green-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {overdue && (
                              <div className="flex items-center gap-1 text-amber-600">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-xs">Overdue</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

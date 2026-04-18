import { useState, useMemo } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCreditNote,
  useUpdateCreditNote,
  useDeleteCreditNote,
  useGetSettings,
  useListInvoices,
  getGetCreditNoteQueryKey,
  getListCreditNotesQueryKey,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { pdf } from "@react-pdf/renderer";
import CreditNotePDF from "@/components/credit-note-pdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Calendar,
  DollarSign,
  User,
  AlertTriangle,
  Ban,
  Trash2,
  Clock,
  FileDown,
  Banknote,
  CheckCircle2,
  Pencil,
  Zap,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  excess_payment: "Excess Payment",
  refund_credit: "Refund Credit",
  manual_adjustment: "Manual Adjustment",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "Fully Available", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  partially_used: { label: "Partially Used", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  fully_used: { label: "Fully Used", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400" },
  voided: { label: "Voided", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  fully_refunded: { label: "Fully Refunded", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  partially_available: { label: "Partially Available", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function CreditNoteDetail() {
  const [, params] = useRoute("/credit-notes/:id");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const id = Number(params?.id);
  const { data: cn, isLoading } = useGetCreditNote(id);
  const { data: settings } = useGetSettings();
  const updateMutation = useUpdateCreditNote();
  const deleteMutation = useDeleteCreditNote();
  const clientId = (cn as any)?.clientId as number | undefined;
  const { data: invoicesData } = useListInvoices(
    { clientId },
    { query: { enabled: !!clientId } }
  );

  // Must stay before early returns — hooks cannot be called conditionally
  const applicableInvoices = useMemo(() => {
    return (invoicesData?.invoices ?? []).filter(
      (inv) => inv.paymentStatus !== "paid" && inv.paymentStatus !== "refunded" && (inv.outstandingBalance ?? 0) > 0
    );
  }, [invoicesData]);

  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteRefundDialog, setShowDeleteRefundDialog] = useState(false);

  // Apply Credit state
  const [applyInvoiceId, setApplyInvoiceId] = useState<string>("");
  const [applyAmount, setApplyAmount] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  // Refund processed form state
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [rpRef, setRpRef] = useState("");
  const [rpDate, setRpDate] = useState("");
  const [rpAmount, setRpAmount] = useState("");
  const [rpNotes, setRpNotes] = useState("");

  function handleVoid() {
    updateMutation.mutate(
      { id, body: { status: "voided" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCreditNoteQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListCreditNotesQueryKey() });
          toast({ title: "Credit Note Voided" });
          setShowVoidDialog(false);
        },
        onError: (err) => {
          toast({ title: "Void Failed", description: String(err.message || ""), variant: "destructive" });
          setShowVoidDialog(false);
        },
      }
    );
  }

  function handleDelete() {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCreditNotesQueryKey() });
          toast({ title: "Credit Note Deleted" });
          navigate("/credit-notes");
        },
        onError: (err) => {
          toast({ title: "Delete Failed", description: String(err.message || ""), variant: "destructive" });
          setShowDeleteDialog(false);
        },
      }
    );
  }

  function handleOpenRefundForm() {
    if (cn) {
      setRpRef((cn as any).refundProcessedRef || "");
      setRpDate((cn as any).refundProcessedDate || "");
      setRpAmount((cn as any).refundProcessedAmount != null ? String((cn as any).refundProcessedAmount) : "");
      setRpNotes((cn as any).refundProcessedNotes || "");
    }
    setShowRefundForm(true);
  }

  function handleSaveRefund() {
    updateMutation.mutate(
      {
        id,
        body: {
          refundProcessedRef: rpRef || undefined,
          refundProcessedDate: rpDate || undefined,
          refundProcessedAmount: rpAmount ? Number(rpAmount) : undefined,
          refundProcessedNotes: rpNotes || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCreditNoteQueryKey(id) });
          toast({ title: "Refund details saved" });
          setShowRefundForm(false);
        },
        onError: () => {
          toast({ title: "Failed to save refund details", variant: "destructive" });
        },
      }
    );
  }

  function handleDeleteRefund() {
    updateMutation.mutate(
      { id, body: { clearRefund: true } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCreditNoteQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListCreditNotesQueryKey() });
          toast({ title: "Refund record deleted", description: "The refund details have been cleared." });
          setShowDeleteRefundDialog(false);
        },
        onError: () => {
          toast({ title: "Failed to delete refund record", variant: "destructive" });
          setShowDeleteRefundDialog(false);
        },
      }
    );
  }

  async function handleDownloadPDF() {
    if (!cn) return;
    try {
      const cnWithSettings = {
        ...(cn as any),
        logoUrl: settings?.logoUrl ?? undefined,
        companyName: settings?.companyName ?? undefined,
        companyAddress: settings?.companyAddress ?? undefined,
        companyPhone: settings?.companyPhone ?? undefined,
        companyNtn: settings?.companyNtn ?? undefined,
        companySNtn: settings?.companySNtn ?? undefined,
      };
      const blob = await pdf(
        <CreditNotePDF cn={cnWithSettings} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CreditNote_${cn.creditNoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF Downloaded", description: `CreditNote_${cn.creditNoteNumber}.pdf` });
    } catch {
      toast({ title: "PDF generation failed", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!cn) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold">Credit Note Not Found</h3>
        <p className="text-sm text-muted-foreground mt-1">The requested credit note could not be found.</p>
        <Link href="/credit-notes">
          <Button className="mt-4" variant="outline">Back to Credit Notes</Button>
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[cn.status] || STATUS_CONFIG.available;
  const usedPct = cn.amount > 0 ? Math.round((cn.usedAmount / cn.amount) * 100) : 0;
  const terminalStatuses = ["voided", "fully_used", "fully_refunded"];
  const canVoid = !terminalStatuses.includes(cn.status);
  const canDelete = cn.usedAmount === 0 && cn.status !== "voided";
  const canApply = !terminalStatuses.includes(cn.status) && cn.remainingAmount > 0;

  const selectedInvoice = applicableInvoices.find((inv) => String(inv.id) === applyInvoiceId);
  const maxApply = selectedInvoice
    ? Math.min(cn.remainingAmount, selectedInvoice.outstandingBalance ?? 0)
    : cn.remainingAmount;

  async function handleApplyCredit() {
    if (!applyInvoiceId || !applyAmount || Number(applyAmount) <= 0) return;
    const selectedInv = applicableInvoices.find((inv) => String(inv.id) === applyInvoiceId);
    if (!selectedInv) return;
    setIsApplying(true);
    try {
      const res = await fetch(`/api/credit-notes/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInv.id,
          invoiceNumber: selectedInv.invoiceNumber,
          amount: Number(applyAmount),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to apply credit", description: err.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetCreditNoteQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListCreditNotesQueryKey() });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey.some((k) => String(k).includes("/api/invoices")) });
      toast({ title: "Credit Applied", description: `${formatCurrency(Number(applyAmount), cn.currency)} applied to ${selectedInv.invoiceNumber}` });
      setApplyInvoiceId("");
      setApplyAmount("");
    } catch {
      toast({ title: "Failed to apply credit", variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  }

  const cnAny = cn as any;
  const hasRefundProcessed =
    cnAny.refundProcessedRef || cnAny.refundProcessedDate || cnAny.refundProcessedAmount != null || cnAny.refundProcessedNotes;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/credit-notes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-purple-500" />
            {cn.creditNoteNumber}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Credit Note Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <FileDown className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>
          {canVoid && (
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setShowVoidDialog(true)}>
              <Ban className="h-4 w-4 mr-1" />
              Void
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-200 text-sm mb-1">Credit Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(cn.amount, cn.currency)}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </div>
          </div>

          {cn.usedAmount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-purple-200 mb-1">
                <span>Usage</span>
                <span>{usedPct}%</span>
              </div>
              <div className="w-full bg-purple-400/30 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${usedPct}%` }} />
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-purple-200">Used: {formatCurrency(cn.usedAmount, cn.currency)}</span>
                <span className="text-white font-medium">Remaining: {formatCurrency(cn.remainingAmount, cn.currency)}</span>
              </div>
            </div>
          )}
          {cn.status === "partially_available" && cnAny.refundProcessedAmount != null && (
            <div className="mt-4 bg-amber-500/20 rounded-lg px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-amber-200">Refunded: {formatCurrency(cnAny.refundProcessedAmount, cn.currency)}</span>
                <span className="text-white font-semibold">Remaining Credit: {formatCurrency(cn.remainingAmount, cn.currency)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow icon={User} label="Client" value={cn.clientName} />
          <DetailRow icon={CreditCard} label="Type" value={TYPE_LABELS[cn.type] || cn.type} />
          <DetailRow icon={DollarSign} label="Currency" value={cn.currency} />
          <DetailRow icon={Calendar} label="Created" value={formatDate(cn.createdAt)} />
          {cn.invoiceNumber && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Linked Invoice</p>
                {cnAny.invoiceId ? (
                  <Link href={`/invoices/${cnAny.invoiceId}`}>
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-400 underline hover:text-purple-900 dark:hover:text-purple-200 cursor-pointer font-mono">
                      {cn.invoiceNumber}
                    </span>
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">{cn.invoiceNumber}</p>
                )}
              </div>
            </div>
          )}
          <DetailRow icon={Clock} label="Last Updated" value={formatDate(cn.updatedAt)} />
        </div>

        {cn.description && (
          <div className="px-6 pb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Reason / Notes</h3>
            <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{cn.description}</p>
          </div>
        )}
      </div>

      {/* Apply Credit to Invoice section */}
      {canApply && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-100 dark:border-purple-700 flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20">
            <Zap className="h-5 w-5 text-purple-600" />
            <h2 className="text-base font-semibold text-purple-900 dark:text-purple-100">Apply Credit to Invoice</h2>
            <span className="ml-auto text-sm text-purple-600 dark:text-purple-300 font-medium">
              Available: {formatCurrency(cn.remainingAmount, cn.currency)}
            </span>
          </div>

          <div className="p-6 space-y-4">
            {applicableInvoices.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No outstanding invoices found for this client.</p>
                <p className="text-xs text-muted-foreground mt-1">Credits can only be applied to invoices with an outstanding balance.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Invoice</Label>
                  <Select value={applyInvoiceId} onValueChange={(v) => { setApplyInvoiceId(v); setApplyAmount(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an invoice to apply credit to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {applicableInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={String(inv.id)}>
                          <span className="font-mono">{inv.invoiceNumber}</span>
                          <span className="ml-2 text-muted-foreground">
                            — Outstanding: {formatCurrency(inv.outstandingBalance ?? 0, cn.currency)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedInvoice && (
                  <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg px-4 py-3 text-sm grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-purple-600 font-medium mb-0.5">Invoice Total</p>
                      <p className="font-semibold">{formatCurrency(selectedInvoice.totalAmount ?? 0, cn.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-600 font-medium mb-0.5">Already Paid</p>
                      <p className="font-semibold text-emerald-700">{formatCurrency(selectedInvoice.paidAmount ?? 0, cn.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-600 font-medium mb-0.5">Outstanding</p>
                      <p className="font-semibold text-amber-700">{formatCurrency(selectedInvoice.outstandingBalance ?? 0, cn.currency)}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Amount to Apply ({cn.currency})</Label>
                    {selectedInvoice && (
                      <button
                        type="button"
                        className="text-xs text-purple-600 hover:text-purple-800 underline"
                        onClick={() => setApplyAmount(String(maxApply))}
                      >
                        Use max ({formatCurrency(maxApply, cn.currency)})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxApply}
                    placeholder="0.00"
                    value={applyAmount}
                    onChange={(e) => setApplyAmount(e.target.value)}
                    disabled={!applyInvoiceId}
                  />
                  {applyAmount && Number(applyAmount) > maxApply && (
                    <p className="text-xs text-red-600">
                      Exceeds maximum of {formatCurrency(maxApply, cn.currency)}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleApplyCredit}
                  disabled={
                    isApplying ||
                    !applyInvoiceId ||
                    !applyAmount ||
                    Number(applyAmount) <= 0 ||
                    Number(applyAmount) > maxApply
                  }
                >
                  {isApplying ? "Applying..." : "Apply Credit"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Refund Processed section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">Refund Processed</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasRefundProcessed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteRefundDialog(true)}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenRefundForm}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
            >
              {hasRefundProcessed ? <><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Record Refund</>}
            </Button>
          </div>
        </div>

        {hasRefundProcessed ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cnAny.refundProcessedRef && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-4 py-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Payment Reference</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">{cnAny.refundProcessedRef}</p>
              </div>
            )}
            {cnAny.refundProcessedDate && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-4 py-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Date Processed</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cnAny.refundProcessedDate}</p>
              </div>
            )}
            {cnAny.refundProcessedAmount != null && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-4 py-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Amount Refunded</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(cnAny.refundProcessedAmount, cn.currency)}</p>
              </div>
            )}
            {cnAny.refundProcessedNotes && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-4 py-3 sm:col-span-2">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Notes for Client</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{cnAny.refundProcessedNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <Banknote className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bank refund has been recorded yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Use "Record Refund" when you've sent money back to the client from your bank account.</p>
          </div>
        )}
      </div>

      {/* Record/Edit Refund Dialog */}
      <Dialog open={showRefundForm} onOpenChange={setShowRefundForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              {hasRefundProcessed ? "Edit Refund Details" : "Record Bank Refund"}
            </DialogTitle>
            <DialogDescription>
              Enter the details of the refund you've processed from your bank account to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rpRef">Payment Reference Number</Label>
              <Input
                id="rpRef"
                placeholder="Bank transaction ref, transfer ID, etc."
                value={rpRef}
                onChange={(e) => setRpRef(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rpDate">Date of Refund</Label>
                <Input
                  id="rpDate"
                  type="date"
                  value={rpDate}
                  onChange={(e) => setRpDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rpAmount">Amount Refunded ({cn.currency})</Label>
                <Input
                  id="rpAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={rpAmount}
                  onChange={(e) => setRpAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rpNotes">Notes for Client <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="rpNotes"
                placeholder="e.g., Refund processed via IBFT to your registered account…"
                value={rpNotes}
                onChange={(e) => setRpNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundForm(false)}>Cancel</Button>
            <Button
              onClick={handleSaveRefund}
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending ? "Saving…" : "Save Refund Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Void Credit Note
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to void <strong>{cn.creditNoteNumber}</strong>? This will mark the credit as no longer available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleVoid} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Voiding..." : "Void Credit Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Refund dialog */}
      <Dialog open={showDeleteRefundDialog} onOpenChange={setShowDeleteRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Refund Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the refund record for <strong>{cn.creditNoteNumber}</strong>? This will clear all refund details and restore the credit note status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteRefundDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRefund} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Deleting..." : "Delete Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Credit Note
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{cn.creditNoteNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-purple-500" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

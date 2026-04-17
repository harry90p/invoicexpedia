import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListCreditNotes, useDeleteCreditNote, getListCreditNotesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, CreditCard, Trash2, Eye, FileText, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  excess_payment: "Excess Payment",
  refund_credit: "Refund Credit",
  manual_adjustment: "Manual Adjustment",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available: { label: "Fully Available", variant: "default" },
  partially_used: { label: "Partially Used", variant: "secondary" },
  fully_used: { label: "Fully Used", variant: "outline" },
  voided: { label: "Voided", variant: "destructive" },
  fully_refunded: { label: "Fully Refunded", variant: "destructive" },
  partially_available: { label: "Partially Available", variant: "secondary" },
};

export default function CreditNotesList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; number: string } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter && statusFilter !== "all") params.status = statusFilter;

  const { data, isLoading } = useListCreditNotes(
    Object.keys(params).length > 0 ? params : undefined
  );
  const deleteMutation = useDeleteCreditNote();

  const creditNotes = data?.creditNotes || [];

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCreditNotesQueryKey() });
          toast({ title: "Credit Note Deleted" });
          setDeleteTarget(null);
        },
        onError: (err) => {
          toast({ title: "Delete Failed", description: String(err.message || "Cannot delete used credit notes"), variant: "destructive" });
          setDeleteTarget(null);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Credit Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} credit note{(data?.total ?? 0) !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Link href="/credit-notes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Credit Note
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Fully Available</SelectItem>
            <SelectItem value="partially_available">Partially Available</SelectItem>
            <SelectItem value="partially_used">Partially Used</SelectItem>
            <SelectItem value="fully_used">Fully Used</SelectItem>
            <SelectItem value="fully_refunded">Fully Refunded</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : creditNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">No Credit Notes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first credit note to track client credits
          </p>
          <Link href="/credit-notes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Credit Note
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {creditNotes.map((cn) => {
            const statusCfg = STATUS_CONFIG[cn.status] || STATUS_CONFIG.available;
            return (
              <div
                key={cn.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {cn.creditNoteNumber}
                      </span>
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      <Badge variant="outline">{TYPE_LABELS[cn.type] || cn.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{cn.clientName}</p>
                    {cn.invoiceNumber && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <FileText className="h-3 w-3" />
                        Linked to {cn.invoiceNumber}
                      </p>
                    )}
                    {cn.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{cn.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-50">
                        {formatCurrency(cn.amount, cn.currency)}
                      </p>
                      {cn.usedAmount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Used: {formatCurrency(cn.usedAmount, cn.currency)} | Remaining: {formatCurrency(cn.remainingAmount, cn.currency)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(cn.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/credit-notes/${cn.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {cn.status === "available" && cn.usedAmount === 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget({ id: cn.id, number: cn.creditNoteNumber })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Credit Note
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete credit note <strong>{deleteTarget?.number}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useListClients, useListInvoices } from "@workspace/api-client-react";
import { useListCreditNotes } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, Building2, User, ChevronRight, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function LedgersList() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const { data: clientsData, isLoading: clientsLoading } = useListClients();
  const { data: invoicesData, isLoading: invoicesLoading } = useListInvoices({ limit: 10000 });
  const { data: creditNotesData } = useListCreditNotes({ status: "available" });

  const clients = clientsData?.clients ?? [];
  const allInvoices = invoicesData?.invoices ?? [];
  const allCreditNotes = creditNotesData?.creditNotes ?? [];

  const invoicesByClient = useMemo(() => {
    const map: Record<number, typeof allInvoices> = {};
    for (const inv of allInvoices) {
      if (inv.clientId != null) {
        if (!map[inv.clientId]) map[inv.clientId] = [];
        map[inv.clientId].push(inv);
      }
    }
    return map;
  }, [allInvoices]);

  const creditByClient = useMemo(() => {
    const map: Record<number, number> = {};
    for (const cn of allCreditNotes) {
      map[cn.clientId] = (map[cn.clientId] ?? 0) + cn.remainingAmount;
    }
    return map;
  }, [allCreditNotes]);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = clientsLoading || invoicesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ledgers</h1>
          <p className="text-sm text-slate-500 mt-1">Click any client to open their full ledger</p>
        </div>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Client</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Credit Limit</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Credit Cycle</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total Invoiced</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total Paid</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Outstanding</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Credit Notes</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
              ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>{search ? "No clients match your search." : "No clients found."}</p>
                    </td>
                  </tr>
                )
              : filtered.map((client) => {
                  const invs = invoicesByClient[client.id] ?? [];
                  const totalInvoiced = invs.reduce((s, v) => s + (v.totalAmount ?? 0), 0);
                  const totalPaid = invs.reduce((s, v) => s + (v.paidAmount ?? 0), 0);
                  const outstanding = invs.reduce((s, v) => s + (v.outstandingBalance ?? 0), 0);
                  const availableCredit = creditByClient[client.id] ?? 0;
                  const creditLimit = client.creditLimit ?? 0;
                  const isOverLimit = creditLimit > 0 && outstanding > creditLimit;
                  const currency = client.currency ?? "PKR";

                  return (
                    <tr
                      key={client.id}
                      className="border-b border-slate-100 hover:bg-cyan-50/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/ledgers/${client.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(14,165,233,0.1)" }}>
                            {creditLimit > 0
                              ? <Building2 className="h-3.5 w-3.5 text-cyan-600" />
                              : <User className="h-3.5 w-3.5 text-cyan-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{client.name}</p>
                            {creditLimit > 0 && (
                              <p className="text-xs text-slate-400">Corporate</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {creditLimit > 0 ? formatCurrency(creditLimit, currency) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {client.creditCycleDays ? `${client.creditCycleDays}d` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {invs.length > 0 ? formatCurrency(totalInvoiced, currency) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-600 font-medium">
                        {totalPaid > 0 ? formatCurrency(totalPaid, currency) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {outstanding > 0 ? (
                          <span className={`font-semibold ${isOverLimit ? "text-red-600" : "text-amber-600"}`}>
                            {formatCurrency(outstanding, currency)}
                            {isOverLimit && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 mb-0.5" />}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Nil</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {availableCredit > 0 ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                            {formatCurrency(availableCredit, currency)}
                          </Badge>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {filtered.length} client{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

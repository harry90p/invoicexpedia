import React, { useState } from "react";
import { useListInvoices, ListInvoicesStatus, ListInvoicesCategory } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, Plus, SlidersHorizontal, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";

export default function InvoicesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<ListInvoicesStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<ListInvoicesCategory>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useListInvoices({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    page,
    limit,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case "partial": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>;
      case "unpaid": return <Badge className="bg-red-100 text-red-800 border-red-200">Unpaid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const formatted = category.replace('_', ' ').toUpperCase();
    switch (category) {
      case "flight": return <Badge variant="secondary" className="bg-blue-50 text-blue-700">{formatted}</Badge>;
      case "hotel": return <Badge variant="secondary" className="bg-purple-50 text-purple-700">{formatted}</Badge>;
      case "tour": return <Badge variant="secondary" className="bg-orange-50 text-orange-700">{formatted}</Badge>;
      case "non_travel": return <Badge variant="secondary" className="bg-gray-100 text-gray-700">{formatted}</Badge>;
      case "mix_panel_tour": return <Badge variant="secondary" className="bg-teal-50 text-teal-700">MIX PANEL</Badge>;
      default: return <Badge variant="secondary">{formatted}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <Link href="/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, client name..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v: ListInvoicesStatus) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={(v: ListInvoicesCategory) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SlidersHorizontal className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="flight">Flight</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="tour">Tour</SelectItem>
                  <SelectItem value="non_travel">Non-Travel</SelectItem>
                  <SelectItem value="mix_panel_tour">Mix Panel Tours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">Loading...</TableCell>
              </TableRow>
            ) : data?.invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No invoices found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              data?.invoices.map((invoice) => (
                <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{invoice.clientName}</div>
                    {invoice.pocName && <div className="text-xs text-muted-foreground">{invoice.pocName}</div>}
                  </TableCell>
                  <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                  <TableCell>{getCategoryBadge(invoice.category)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(invoice.totalAmount, invoice.currency)}</div>
                    {invoice.outstandingBalance > 0 && invoice.paymentStatus !== 'unpaid' && (
                      <div className="text-xs text-red-600 dark:text-red-500">
                        Balance: {formatCurrency(invoice.outstandingBalance, invoice.currency)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.paymentStatus)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {data && data.total > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} entries
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= data.total}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

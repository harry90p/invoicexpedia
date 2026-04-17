import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetInvoice, useRecordPayment, getGetInvoiceQueryKey, FlightPassenger, HotelRoom, TourItem, NonTravelItem } from "@workspace/api-client-react";
import { formatCurrency, formatDate, numberToWords } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FileDown, Download, Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ExcelJS from "exceljs";
import { pdf } from "@react-pdf/renderer";
import InvoicePDF from "@/components/invoice-pdf";

const MOP_LABELS: Record<string, string> = {
  cash: "Cash", card: "Card", bank_transfer: "Bank Transfer",
  cheque: "Cheque", online_transfer: "Online Transfer",
};

export default function InvoiceDetail() {
  const params = useParams();
  const invoiceId = Number(params.id);
  const { data: invoice, isLoading } = useGetInvoice(invoiceId, { query: { enabled: !!invoiceId } });
  const recordPayment = useRecordPayment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Record Payment state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial">("paid");
  const [paymentModeOfPayment, setPaymentModeOfPayment] = useState<string>("");
  const [convenienceFeeAmount, setConvenienceFeeAmount] = useState<string>("");
  const [convenienceFeeRefundable, setConvenienceFeeRefundable] = useState<"non_refundable" | "refundable">("non_refundable");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Refund state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState<"full" | "partial" | "adjustment">("full");
  const [cancellationCharges, setCancellationCharges] = useState("");
  const [nonRefundableTaxes, setNonRefundableTaxes] = useState("");
  const [convenienceFeeDeduction, setConvenienceFeeDeduction] = useState("");
  const [otherRetainedCharges, setOtherRetainedCharges] = useState("");
  const [otherChargesDescription, setOtherChargesDescription] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [linkedInvoiceNumber, setLinkedInvoiceNumber] = useState("");
  const [createCreditNote, setCreateCreditNote] = useState(true);

  // Revert state
  const [isRevertPaymentOpen, setIsRevertPaymentOpen] = useState(false);
  const [isRevertRefundOpen, setIsRevertRefundOpen] = useState(false);

  if (isLoading || !invoice) {
    return <div className="space-y-6 p-8"><Skeleton className="w-full h-[800px]" /></div>;
  }

  const handleRecordPayment = () => {
    const data: Parameters<typeof recordPayment.mutate>[0]["data"] = {
      amount: Number(paymentAmount),
      paymentStatus,
    };
    if (paymentModeOfPayment) (data as Record<string, unknown>).modeOfPayment = paymentModeOfPayment;
    if (paymentModeOfPayment === "card" && convenienceFeeAmount) {
      (data as Record<string, unknown>).convenienceFeeAmount = Number(convenienceFeeAmount);
      (data as Record<string, unknown>).convenienceFeeRefundable = convenienceFeeRefundable;
    }
    recordPayment.mutate(
      { id: invoiceId, data },
      {
        onSuccess: (updatedInvoice) => {
          queryClient.setQueryData(getGetInvoiceQueryKey(invoiceId), updatedInvoice);
          toast({ title: "Payment Recorded", description: "Payment details saved successfully." });
          setIsPaymentModalOpen(false);
          setPaymentAmount("");
          setPaymentModeOfPayment("");
          setConvenienceFeeAmount("");
          setConvenienceFeeRefundable("non_refundable");
        }
      }
    );
  };

  const isUnpaidRefund = invoice.paymentStatus === "unpaid";
  const isPartialRefund = invoice.paymentStatus === "partial";
  const refundBaseAmount = isUnpaidRefund ? 0 : invoice.paidAmount;
  const creditEligibleAmount = refundBaseAmount;

  const totalDeductionsInput = Number(cancellationCharges || 0) + Number(nonRefundableTaxes || 0) + Number(convenienceFeeDeduction || 0) + Number(otherRetainedCharges || 0);

  const netRefundAmount = refundType === "full"
    ? refundBaseAmount
    : Math.max(0, refundBaseAmount - totalDeductionsInput);

  const shouldAutoCreateCredit = !isUnpaidRefund && netRefundAmount > 0;

  const handleRefund = () => {
    const isFullRefund = refundType === "full";
    const cCharges = isFullRefund ? 0 : Number(cancellationCharges || 0);
    const nrTaxes = isFullRefund ? 0 : Number(nonRefundableTaxes || 0);
    const cfDeduction = isFullRefund ? 0 : Number(convenienceFeeDeduction || 0);
    const oCharges = isFullRefund ? 0 : Number(otherRetainedCharges || 0);
    const totalDeductions = cCharges + nrTaxes + cfDeduction + oCharges;
    const netAmount = isFullRefund ? refundBaseAmount : Math.max(0, refundBaseAmount - totalDeductions);

    recordPayment.mutate(
      {
        id: invoiceId,
        data: {
          amount: invoice.paidAmount,
          paymentStatus: "refunded",
          refundAmount: netAmount,
          cancellationCharges: cCharges,
          otherRetainedCharges: nrTaxes + cfDeduction + oCharges,
          notes: refundNotes || invoice.notes || undefined,
          refundType,
          linkedInvoiceNumber: refundType === "adjustment" ? linkedInvoiceNumber || undefined : undefined,
          createCreditNote: shouldAutoCreateCredit && createCreditNote,
        } as Parameters<typeof recordPayment.mutate>[0]["data"],
      },
      {
        onSuccess: (updatedInvoice) => {
          queryClient.setQueryData(getGetInvoiceQueryKey(invoiceId), updatedInvoice);
          const creditMsg = shouldAutoCreateCredit && createCreditNote ? " Credit note created." : "";
          const desc = isUnpaidRefund
            ? `Invoice settled to zero (no payment received).${creditMsg}`
            : `Refund of ${formatCurrency(netAmount, invoice.currency)} recorded.${creditMsg}`;
          toast({ title: "Refund Issued", description: desc });
          setIsRefundModalOpen(false);
          setCancellationCharges("");
          setNonRefundableTaxes("");
          setConvenienceFeeDeduction("");
          setOtherRetainedCharges("");
          setOtherChargesDescription("");
          setRefundNotes("");
          setLinkedInvoiceNumber("");
          setRefundType("full");
          setCreateCreditNote(true);
        }
      }
    );
  };

  const handleRevertPayment = () => {
    recordPayment.mutate(
      {
        id: invoiceId,
        data: {
          amount: 0,
          paymentStatus: "unpaid",
          refundAmount: 0,
          cancellationCharges: 0,
          otherRetainedCharges: 0,
          clearPaymentFields: true,
        } as Parameters<typeof recordPayment.mutate>[0]["data"],
      },
      {
        onSuccess: (updatedInvoice) => {
          queryClient.setQueryData(getGetInvoiceQueryKey(invoiceId), updatedInvoice);
          toast({ title: "Payment Reverted", description: "Invoice has been reset to Unpaid." });
          setIsRevertPaymentOpen(false);
        }
      }
    );
  };

  const handleRevertRefund = () => {
    const prevStatus = invoice.paidAmount <= 0 ? "unpaid" as const : invoice.paidAmount >= invoice.totalAmount ? "paid" as const : "partial" as const;
    recordPayment.mutate(
      {
        id: invoiceId,
        data: {
          amount: invoice.paidAmount,
          paymentStatus: prevStatus,
          refundAmount: 0,
          cancellationCharges: 0,
          otherRetainedCharges: 0,
        } as Parameters<typeof recordPayment.mutate>[0]["data"],
      },
      {
        onSuccess: (updatedInvoice) => {
          queryClient.setQueryData(getGetInvoiceQueryKey(invoiceId), updatedInvoice);
          toast({ title: "Refund Reverted", description: "Invoice has been restored to its pre-refund state." });
          setIsRevertRefundOpen(false);
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case "partial": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>;
      case "unpaid": return <Badge className="bg-red-100 text-red-800 border-red-200">Unpaid</Badge>;
      case "refunded": return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Refunded</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "PDF Downloaded", description: `Invoice_${invoice.invoiceNumber}.pdf` });
    } catch (err) {
      toast({ title: "Export Failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Invoice");

      const bold = { bold: true };
      ws.addRow(["Invoice Number", invoice.invoiceNumber]);
      ws.addRow(["Date", invoice.invoiceDate]);
      ws.addRow(["Client", invoice.clientName]);
      if (invoice.purchaseOrder) ws.addRow(["PO Number", invoice.purchaseOrder]);
      ws.addRow(["Currency", invoice.currency]);
      ws.addRow([]);

      const addFlights = (passengers: FlightPassenger[]) => {
        ws.addRow(["#", "Passenger", "Route", "Airline", "Ticket", "Fare", "Taxes", "Add-Ons", "Penalties", "Service Fee", "Total"]).font = bold;
        passengers.forEach((p: FlightPassenger, i: number) => {
          const addOnsTotal = (p.addOns || []).reduce((s, a) => s + Number(a.amount || 0), 0);
          const penaltiesTotal = (p.penalties || []).reduce((s, a) => s + Number(a.amount || 0), 0);
          ws.addRow([i + 1, p.passengerName, `${p.sectorFrom} → ${p.sectorTo}`, p.airline, p.ticketNumber,
            p.fare, p.taxes || 0, addOnsTotal, penaltiesTotal, p.serviceFeeAmount || 0, p.total || 0]);
        });
      };

      const addHotels = (rooms: HotelRoom[]) => {
        ws.addRow(["#", "Property", "Guest", "Room", "Check-in", "Check-out", "Rooms", "Nights", "Rate/Night", "Tax/Night", "Service Charge", "Total"]).font = bold;
        rooms.forEach((r: HotelRoom, i: number) => {
          ws.addRow([i + 1, r.propertyName, r.guestName, r.roomCategory, r.checkInDate, r.checkOutDate,
            r.numberOfRooms || 1, r.nights || 1, r.ratePerNight, r.taxPerNight, r.serviceChargesAmount || 0, r.invoiceAmount || 0]);
        });
      };

      const addTours = (tours: TourItem[]) => {
        ws.addRow(["#", "Tour Name", "Location", "Start Date", "End Date", "People", "Fee/Person", "Taxes", "Service Fee", "Total"]).font = bold;
        tours.forEach((t: TourItem, i: number) => {
          ws.addRow([i + 1, t.tourName, t.tourLocation || "", t.tourStartDate || "", t.tourEndDate || "",
            t.numberOfPeople, t.feePerPerson, t.taxes || 0, t.serviceFeeAmount || 0, t.total || 0]);
        });
      };

      if (invoice.category === "flight" && invoice.flightPassengers) {
        addFlights(invoice.flightPassengers);
      } else if (invoice.category === "hotel" && invoice.hotelRooms) {
        addHotels(invoice.hotelRooms);
      } else if (invoice.category === "tour" && invoice.tourItems) {
        addTours(invoice.tourItems);
      } else if (invoice.category === "non_travel" && invoice.nonTravelItems) {
        ws.addRow(["#", "Description", "Qty", "Unit Price", "Total"]).font = bold;
        invoice.nonTravelItems.forEach((n: NonTravelItem, i: number) => {
          ws.addRow([i + 1, n.productName, n.quantity, n.unitPrice, n.total || 0]);
        });
      } else if (invoice.category === "mix_panel_tour") {
        if (invoice.flightPassengers && invoice.flightPassengers.length > 0) {
          ws.addRow(["--- FLIGHTS ---"]);
          addFlights(invoice.flightPassengers);
          ws.addRow([]);
        }
        if (invoice.hotelRooms && invoice.hotelRooms.length > 0) {
          ws.addRow(["--- HOTELS ---"]);
          addHotels(invoice.hotelRooms);
          ws.addRow([]);
        }
        if (invoice.tourItems && invoice.tourItems.length > 0) {
          ws.addRow(["--- TOURS ---"]);
          addTours(invoice.tourItems);
          ws.addRow([]);
        }
      }

      ws.addRow([]);
      ws.addRow(["Grand Total", "", "", "", "", invoice.totalAmount]).font = bold;
      if (invoice.paidAmount > 0) ws.addRow(["Paid Amount", "", "", "", "", invoice.paidAmount]);
      if (invoice.outstandingBalance > 0) ws.addRow(["Balance Due", "", "", "", "", invoice.outstandingBalance]).font = bold;
      const invExt = invoice as unknown as { modeOfPayment?: string; convenienceFeeAmount?: number; convenienceFeeRefundable?: string; cancellationCharges?: number; otherRetainedCharges?: number };
      if (invExt.modeOfPayment) ws.addRow(["Payment Mode", "", "", "", "", MOP_LABELS[invExt.modeOfPayment] || invExt.modeOfPayment]);
      if (invExt.convenienceFeeAmount && invExt.convenienceFeeAmount > 0) {
        ws.addRow(["Convenience Fee", "", "", "", "", invExt.convenienceFeeAmount]);
        ws.addRow(["Conv. Fee Status", "", "", "", "", invExt.convenienceFeeRefundable === "refundable" ? "Refundable" : "Non-Refundable"]);
      }
      if (invoice.paymentStatus === "refunded") {
        ws.addRow([]);
        ws.addRow(["--- REFUND DETAILS ---"]).font = bold;
        if (invExt.cancellationCharges && invExt.cancellationCharges > 0) ws.addRow(["Cancellation Charges", "", "", "", "", invExt.cancellationCharges]);
        if (invExt.otherRetainedCharges && invExt.otherRetainedCharges > 0) ws.addRow(["Other Retained Charges", "", "", "", "", invExt.otherRetainedCharges]);
        if (invoice.refundAmount > 0) ws.addRow(["Net Refunded", "", "", "", "", invoice.refundAmount]).font = bold;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Invoice_${invoice.invoiceNumber}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not generate Excel file.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-zinc-900 p-4 border rounded-lg shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-bold text-xl">{invoice.invoiceNumber}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground capitalize">{invoice.category.replace('_', ' ')}</span>
              {getStatusBadge(invoice.paymentStatus)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Record Payment */}
          {invoice.paymentStatus !== "paid" && invoice.paymentStatus !== "refunded" && (
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white">Record Payment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Outstanding Balance</Label>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(invoice.outstandingBalance, invoice.currency)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Amount</Label>
                    <Input type="number" step="0.01" value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={invoice.outstandingBalance.toString()} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mode of Payment</Label>
                    <Select value={paymentModeOfPayment} onValueChange={setPaymentModeOfPayment}>
                      <SelectTrigger><SelectValue placeholder="Select payment method..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="online_transfer">Online Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentModeOfPayment === "card" && (
                    <>
                      <div className="space-y-2">
                        <Label>Convenience Fee <span className="text-muted-foreground text-xs">(if applicable)</span></Label>
                        <Input type="number" step="0.01" min={0} value={convenienceFeeAmount}
                          onChange={(e) => setConvenienceFeeAmount(e.target.value)} placeholder="0.00" />
                      </div>
                      {convenienceFeeAmount && Number(convenienceFeeAmount) > 0 && (
                        <div className="space-y-2">
                          <Label>Convenience Fee Status</Label>
                          <Select value={convenienceFeeRefundable} onValueChange={(v: "refundable" | "non_refundable") => setConvenienceFeeRefundable(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="non_refundable">Non-Refundable</SelectItem>
                              <SelectItem value="refundable">Refundable</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Company policy: Convenience Fee is Non-Refundable by default.</p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={(val: "paid" | "partial") => setPaymentStatus(val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Fully Paid</SelectItem>
                        <SelectItem value="partial">Partial Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleRecordPayment} className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!paymentAmount || recordPayment.isPending}>
                    Save Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Refund Button */}
          {(invoice.paymentStatus === "paid" || invoice.paymentStatus === "partial" || invoice.paymentStatus === "unpaid") && (
            <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-purple-700 border-purple-300 hover:bg-purple-50">
                  <RotateCcw className="w-4 h-4 mr-2" /> Refund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Issue Refund</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Refund Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Refund Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: "full" as const, label: "Full Refund", desc: "100% refund" },
                        { value: "partial" as const, label: "Partial Refund", desc: "After deductions" },
                        { value: "adjustment" as const, label: "Adjustment", desc: "Link to invoice" },
                      ] as const).map((opt) => (
                        <button key={opt.value} type="button"
                          onClick={() => setRefundType(opt.value)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${refundType === opt.value
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"}`}
                        >
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-md p-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Invoice Total</div>
                      <div className="font-semibold">{formatCurrency(invoice.totalAmount, invoice.currency)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Amount Paid</div>
                      <div className={`font-semibold ${invoice.paidAmount > 0 ? "text-green-700" : "text-slate-400"}`}>{formatCurrency(invoice.paidAmount, invoice.currency)}</div>
                    </div>
                  </div>

                  {/* Unpaid refund notice */}
                  {isUnpaidRefund && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                      <strong>No payment received.</strong> This invoice will be marked as settled/set-off with zero balance. No amount will be transferred to the Credit Section.
                    </div>
                  )}

                  {/* Partial payment refund notice */}
                  {isPartialRefund && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                      <strong>Partial payment received:</strong> {formatCurrency(invoice.paidAmount, invoice.currency)} of {formatCurrency(invoice.totalAmount, invoice.currency)}. After any deductions, the remaining paid amount will be transferred to the client's Credit Section.
                    </div>
                  )}

                  {/* Deductions — for partial & adjustment refunds */}
                  {refundType !== "full" && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-700">Deductions (amounts to retain)</Label>
                        <p className="text-xs text-muted-foreground">These amounts will NOT be refunded to the customer.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Cancellation Charges</Label>
                            <Input type="number" step="0.01" min={0}
                              value={cancellationCharges} onChange={(e) => setCancellationCharges(e.target.value)}
                              placeholder="0.00" />
                          </div>
                          <div className="space-y-2">
                            <Label>Non-Refundable Taxes</Label>
                            <Input type="number" step="0.01" min={0}
                              value={nonRefundableTaxes} onChange={(e) => setNonRefundableTaxes(e.target.value)}
                              placeholder="0.00" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Convenience Fee — Non-Refundable</Label>
                            <Input type="number" step="0.01" min={0}
                              value={convenienceFeeDeduction} onChange={(e) => setConvenienceFeeDeduction(e.target.value)}
                              placeholder="0.00" />
                          </div>
                          <div className="space-y-2">
                            <Label>Other Charges</Label>
                            <Input type="number" step="0.01" min={0}
                              value={otherRetainedCharges} onChange={(e) => setOtherRetainedCharges(e.target.value)}
                              placeholder="0.00" />
                          </div>
                        </div>
                        {Number(otherRetainedCharges) > 0 && (
                          <div className="space-y-2">
                            <Label>Specify Other Charges <span className="text-muted-foreground font-normal text-xs">(describe what these charges are)</span></Label>
                            <Input
                              value={otherChargesDescription}
                              onChange={(e) => setOtherChargesDescription(e.target.value)}
                              placeholder="e.g. Admin fee, processing charge, service charge retained..." />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Linked Invoice — only for adjustment */}
                  {refundType === "adjustment" && (
                    <div className="space-y-2">
                      <Label>Linked Invoice Number <span className="text-muted-foreground text-xs">(new invoice applying this refund)</span></Label>
                      <Input value={linkedInvoiceNumber} onChange={(e) => setLinkedInvoiceNumber(e.target.value)}
                        placeholder="e.g., INV-0055" />
                    </div>
                  )}

                  {/* Full Refund info */}
                  {refundType === "full" && !isUnpaidRefund && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                      Full refund of <strong>{formatCurrency(invoice.paidAmount, invoice.currency)}</strong> will be transferred to the client's Credit Section for tracking.
                    </div>
                  )}

                  {/* Net Refund — auto calculated */}
                  <div className={`rounded-md p-4 ${isUnpaidRefund ? "bg-slate-100 border border-slate-300" : "bg-purple-50 border border-purple-300"}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-semibold ${isUnpaidRefund ? "text-slate-700" : "text-purple-800"}`}>
                        {isUnpaidRefund ? "Settlement Amount" : "Net Refund Amount"}
                      </span>
                      <span className={`text-xl font-bold ${isUnpaidRefund ? "text-slate-600" : "text-purple-700"}`}>
                        {formatCurrency(netRefundAmount, invoice.currency)}
                      </span>
                    </div>
                    {isUnpaidRefund && refundType === "full" ? (
                      <div className="text-xs text-slate-500 mt-1">Invoice will be settled to zero — no credit transfer</div>
                    ) : refundType !== "full" ? (
                      <div className="text-xs text-purple-600 mt-1 space-y-0.5">
                        {!isUnpaidRefund && <div>Paid: {formatCurrency(invoice.paidAmount, invoice.currency)}</div>}
                        {Number(cancellationCharges) > 0 && <div>− Cancellation Charges: {formatCurrency(Number(cancellationCharges), invoice.currency)}</div>}
                        {Number(nonRefundableTaxes) > 0 && <div>− Non-Refundable Taxes: {formatCurrency(Number(nonRefundableTaxes), invoice.currency)}</div>}
                        {Number(convenienceFeeDeduction) > 0 && <div>− Convenience Fee: {formatCurrency(Number(convenienceFeeDeduction), invoice.currency)}</div>}
                        {Number(otherRetainedCharges) > 0 && <div>− Other Charges: {formatCurrency(Number(otherRetainedCharges), invoice.currency)}</div>}
                      </div>
                    ) : null}
                  </div>

                  {/* Credit Note Toggle — only when there's money to credit */}
                  {shouldAutoCreateCredit ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-md p-3">
                      <input type="checkbox" id="createCreditNote" checked={createCreditNote}
                        onChange={(e) => setCreateCreditNote(e.target.checked)}
                        className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                      <label htmlFor="createCreditNote" className="text-sm text-emerald-800 cursor-pointer">
                        <span className="font-medium">Create Credit Note</span>
                        <span className="block text-xs text-emerald-600">Automatically transfer refund amount to client's credit section for future use</span>
                      </label>
                    </div>
                  ) : isUnpaidRefund ? (
                    <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-sm text-slate-500">
                      No credit note will be created — no payment was received for this invoice.
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label>Reason / Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Textarea value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)}
                      placeholder="Reason for refund, airline ref, etc..." rows={2} />
                  </div>
                  <Button onClick={handleRefund} className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={(!isUnpaidRefund && netRefundAmount < 0) || recordPayment.isPending}>
                    {isUnpaidRefund
                      ? "Settle Invoice to Zero"
                      : `Confirm ${refundType === "full" ? "Full" : refundType === "partial" ? "Partial" : "Adjustment"} Refund of ${formatCurrency(netRefundAmount, invoice.currency)}`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Revert Payment */}
          {(invoice.paymentStatus === "paid" || invoice.paymentStatus === "partial") && (
            <Dialog open={isRevertPaymentOpen} onOpenChange={setIsRevertPaymentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs px-3">
                  Revert Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Revert Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
                    This will <strong>undo the recorded payment</strong> and reset the invoice back to <strong>Unpaid</strong>. All payment details (mode, convenience fee) will also be cleared.
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">Paid Amount</div>
                      <div className="font-semibold text-green-700">{formatCurrency(invoice.paidAmount, invoice.currency)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Status After</div>
                      <div className="font-semibold text-red-600">Unpaid</div></div>
                  </div>
                  <Button onClick={handleRevertPayment} className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={recordPayment.isPending}>
                    Yes, Revert Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Revert Refund */}
          {invoice.paymentStatus === "refunded" && (
            <Dialog open={isRevertRefundOpen} onOpenChange={setIsRevertRefundOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs px-3">
                  Revert Refund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Revert Refund</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
                    This will <strong>undo the refund</strong> and restore the invoice to its pre-refund state. The cancellation charges and refund amount will be cleared.
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">Previously Paid</div>
                      <div className="font-semibold text-green-700">{formatCurrency(invoice.paidAmount, invoice.currency)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Status After</div>
                      <div className="font-semibold text-green-700">
                        {invoice.paidAmount >= invoice.totalAmount ? "Paid" : "Partial"}
                      </div></div>
                  </div>
                  <Button onClick={handleRevertRefund} className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={recordPayment.isPending}>
                    Yes, Revert Refund
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> Edit</Button>
          </Link>
          <Button variant="outline" onClick={handleExportPDF}><FileDown className="w-4 h-4 mr-2" /> Download PDF</Button>
          <Button variant="outline" onClick={handleExportExcel}><Download className="w-4 h-4 mr-2" /> Excel</Button>
        </div>
      </div>

      {/* Invoice Print View */}
      <div className="bg-white border shadow-sm rounded-lg overflow-hidden relative">
        <div id="invoice-print-area" className="p-10 bg-white text-black min-h-[1056px] text-sm">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight uppercase">SERVICES INVOICE</h1>
              {invoice.logoPosition === "left" && invoice.logoUrl && (
                <img src={invoice.logoUrl} alt="Logo" className="h-16 mt-4 object-contain" />
              )}
            </div>
            {invoice.logoPosition === "center" && invoice.logoUrl && (
              <div className="flex-1 flex justify-center">
                <img src={invoice.logoUrl} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            <div className="flex-1 text-right space-y-1">
              {invoice.logoPosition === "right" && invoice.logoUrl && (
                <img src={invoice.logoUrl} alt="Logo" className="h-16 mb-4 ml-auto object-contain" />
              )}
              {invoice.companyName && <div className="font-bold text-base">{invoice.companyName}</div>}
              {invoice.companyAddress && <div className="whitespace-pre-line text-slate-600">{invoice.companyAddress}</div>}
              {invoice.companyPhone && <div className="text-slate-600">{invoice.companyPhone}</div>}
              {invoice.companyNtn && <div className="text-slate-600">NTN: {invoice.companyNtn}</div>}
            </div>
          </div>

          <div className="border-t-2 border-slate-200 my-6"></div>

          {/* Info Section */}
          <div className="flex justify-between mb-8">
            <div className="w-1/2 pr-4 space-y-2">
              <div className="text-slate-500 font-medium uppercase text-xs">Billed To</div>
              <div className="font-bold text-base">{invoice.clientName}</div>
              {(invoice as unknown as { recipientName?: string }).recipientName && (
                <div className="text-slate-700">
                  For: <span className="font-medium">{(invoice as unknown as { recipientName?: string }).recipientName}</span>
                </div>
              )}
              {invoice.pocName && <div>Attn: {invoice.pocName}</div>}
              {invoice.clientAddress && <div className="whitespace-pre-line text-slate-600">{invoice.clientAddress}</div>}
              {invoice.clientNtn && <div className="text-slate-600">NTN: {invoice.clientNtn}</div>}
            </div>
            
            <div className="w-1/3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Invoice No:</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Date:</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Due Date:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
              )}
              {invoice.purchaseOrder && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">PO No:</span>
                  <span>{invoice.purchaseOrder}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-medium uppercase" style={{
                  color: invoice.paymentStatus === 'paid' ? '#16a34a' : invoice.paymentStatus === 'partial' ? '#ca8a04' : invoice.paymentStatus === 'refunded' ? '#7c3aed' : '#dc2626'
                }}>{invoice.paymentStatus}</span>
              </div>
              {(invoice as unknown as { modeOfPayment?: string }).modeOfPayment && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Payment Via:</span>
                  <span className="font-medium">{MOP_LABELS[(invoice as unknown as { modeOfPayment?: string }).modeOfPayment!] || (invoice as unknown as { modeOfPayment?: string }).modeOfPayment}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8 space-y-6">
            {/* Flight rows */}
            {(invoice.category === "flight" || invoice.category === "mix_panel_tour") && invoice.flightPassengers && invoice.flightPassengers.length > 0 && (
              <div>
                {invoice.category === "mix_panel_tour" && <div className="text-xs font-bold uppercase text-slate-500 mb-2">✈ Flights</div>}
                {(() => {
                    const firstPax = invoice.flightPassengers[0];
                    const feePct = firstPax?.serviceFeePct || 0;
                    const feeBaseLabel = firstPax?.serviceFeeBase === "base_fare_plus_taxes" ? "Base+Taxes" : "Base Fare";
                    return (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300 text-slate-700">
                      <th className="py-3 px-3 font-bold w-8 text-center">#</th>
                      <th className="py-3 px-3 font-bold">Description</th>
                      <th className="py-3 px-3 font-bold text-right">Basefare</th>
                      <th className="py-3 px-3 font-bold text-right">Taxes</th>
                      <th className="py-3 px-3 font-bold text-right">Add-ons</th>
                      <th className="py-3 px-3 font-bold text-right">Penalty</th>
                      <th className="py-3 px-3 font-bold text-right leading-tight">
                        Service Fee
                        {feePct > 0 && <><br/><span className="font-normal text-xs">@{feePct}% {feeBaseLabel}</span></>}
                      </th>
                      <th className="py-3 px-3 font-bold text-right w-28">Amount {invoice.currency}</th>
                    </tr>
                  </thead>
                  <tbody className="border-b border-slate-200">
                    {invoice.flightPassengers.map((p: FlightPassenger, i: number) => {
                      const addOnsTotal = (p.addOns || []).reduce((s, a) => s + Number(a.amount || 0), 0);
                      const penaltiesTotal = (p.penalties || []).reduce((s, a) => s + Number(a.amount || 0), 0);
                      return (
                        <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                          <td className="py-3 px-3 text-center text-slate-500">{i + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold">{p.passengerName}</div>
                            {p.serviceType && <div className="text-xs text-blue-600 font-medium capitalize">{p.serviceType}</div>}
                            <div className="text-xs text-slate-500 mt-0.5">{p.airline} · {p.sectorFrom}–{p.sectorTo}</div>
                            {p.ticketNumber && <div className="text-xs text-slate-400">Tkt: {p.ticketNumber}{p.pnr ? ` | PNR: ${p.pnr}` : ""}</div>}
                            <div className="text-xs text-slate-400">{p.departureDate}</div>
                          </td>
                          <td className="py-3 px-3 text-right">{formatCurrency(p.fare, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(p.taxes || 0, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(addOnsTotal, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(penaltiesTotal, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(p.serviceFeeAmount || 0, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right font-semibold">{formatCurrency(p.total || 0, invoice.currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                    );
                  })()}
              </div>
            )}

            {/* Hotel rows */}
            {(invoice.category === "hotel" || invoice.category === "mix_panel_tour") && invoice.hotelRooms && invoice.hotelRooms.length > 0 && (
              <div>
                {invoice.category === "mix_panel_tour" && <div className="text-xs font-bold uppercase text-slate-500 mb-2">🏨 Hotels</div>}
                {(() => {
                  const firstRoom = invoice.hotelRooms[0];
                  const scPct = firstRoom?.serviceChargesPct || 0;
                  const scBaseLabel = firstRoom?.serviceChargeBase === "room_rent_plus_tax" ? "Room Rent+Tax" : "Room Rent";
                  return (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-y border-slate-300 text-slate-700">
                        <th className="py-3 px-3 font-bold w-8 text-center">#</th>
                        <th className="py-3 px-3 font-bold">Description</th>
                        <th className="py-3 px-3 font-bold text-right">No. of Nights</th>
                        <th className="py-3 px-3 font-bold text-right">No. of Rooms</th>
                        <th className="py-3 px-3 font-bold text-right leading-tight">Room Rent<br/><span className="font-normal text-xs">(Per Night/Room)</span></th>
                        <th className="py-3 px-3 font-bold text-right leading-tight">Tax<br/><span className="font-normal text-xs">(Per Night/Room)</span></th>
                        <th className="py-3 px-3 font-bold text-right">Accom. Cost</th>
                        <th className="py-3 px-3 font-bold text-right leading-tight">
                          Service Charges
                          {scPct > 0 && <><br/><span className="font-normal text-xs">@{scPct}% on {scBaseLabel}</span></>}
                        </th>
                        <th className="py-3 px-3 font-bold text-right w-28">Amount {invoice.currency}</th>
                      </tr>
                    </thead>
                    <tbody className="border-b border-slate-200">
                      {invoice.hotelRooms.map((r: HotelRoom, i: number) => {
                        const nights = r.nights || 1;
                        const rooms = r.numberOfRooms || 1;
                        const accumCost = r.accommodationCost ?? (r.ratePerNight * rooms * nights);
                        return (
                        <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                          <td className="py-3 px-3 text-center text-slate-500">{i + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold">{r.propertyName}</div>
                            {r.serviceType && <div className="text-xs text-blue-600 font-medium capitalize">{r.serviceType}</div>}
                            <div className="text-xs text-slate-500 mt-0.5">Guest: {r.guestName} | {r.roomCategory}</div>
                            {r.occupancyType && <div className="text-xs text-slate-400">{r.occupancyType}</div>}
                            <div className="text-xs text-slate-400">{r.checkInDate} → {r.checkOutDate}</div>
                          </td>
                          <td className="py-3 px-3 text-right">{nights}</td>
                          <td className="py-3 px-3 text-right">{rooms}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(r.ratePerNight, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(r.taxPerNight || 0, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(accumCost, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(r.serviceChargesAmount || 0, invoice.currency)}</td>
                          <td className="py-3 px-3 text-right font-semibold">{formatCurrency(r.invoiceAmount || 0, invoice.currency)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  );
                })()}
              </div>
            )}

            {/* Tour rows */}
            {(invoice.category === "tour" || invoice.category === "mix_panel_tour") && invoice.tourItems && invoice.tourItems.length > 0 && (
              <div>
                {invoice.category === "mix_panel_tour" && <div className="text-xs font-bold uppercase text-slate-500 mb-2">🗺 Tours</div>}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300 text-slate-700">
                      <th className="py-3 px-3 font-bold w-8 text-center">#</th>
                      <th className="py-3 px-3 font-bold">Description</th>
                      <th className="py-3 px-3 font-bold text-right w-24">QTY</th>
                      <th className="py-3 px-3 font-bold text-right w-36">Amount {invoice.currency}</th>
                    </tr>
                  </thead>
                  <tbody className="border-b border-slate-200">
                    {invoice.tourItems.map((t: TourItem, i: number) => {
                      const fmtTourDate = (d: string) => {
                        if (!d) return "";
                        const dt = new Date(d + "T00:00:00");
                        const day = dt.getDate();
                        const month = dt.toLocaleString("en-US", { month: "long" });
                        const year = dt.getFullYear();
                        return `${day} ${month}, ${year}`;
                      };
                      return (
                        <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                          <td className="py-3 px-3 text-center text-slate-500">{i + 1}</td>
                          <td className="py-3 px-3">
                            {(t as unknown as { passengerName?: string }).passengerName && (
                              <div className="font-semibold text-slate-800">{(t as unknown as { passengerName?: string }).passengerName}</div>
                            )}
                            <div className="font-semibold text-slate-800">{t.tourName}</div>
                            {t.tourDetails && <div className="text-xs text-slate-600 mt-1 italic">{t.tourDetails}</div>}
                            {t.tourLocation && <div className="text-xs text-slate-500 mt-0.5">{t.tourLocation}</div>}
                            {t.serviceType && <div className="text-xs text-blue-600 font-medium capitalize mt-0.5">{t.serviceType}</div>}
                            {(t.tourStartDate || t.tourEndDate) && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {t.tourStartDate ? fmtTourDate(t.tourStartDate) : ""}
                                {t.tourEndDate ? ` – ${fmtTourDate(t.tourEndDate)}` : ""}
                              </div>
                            )}
                            {(t.numberOfPeople || 0) > 0 && (
                              <div className="text-xs text-slate-500 mt-0.5">Persons: {t.numberOfPeople}</div>
                            )}
                            {(t.taxes || 0) > 0 && (
                              <div className="text-xs text-slate-500 mt-0.5">Tax: {formatCurrency(t.taxes, invoice.currency)}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">{(t as unknown as { qty?: number }).qty ?? t.numberOfPeople}</td>
                          <td className="py-3 px-3 text-right font-semibold">{formatCurrency(t.total || 0, invoice.currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Non-travel rows */}
            {invoice.category === "non_travel" && invoice.nonTravelItems && invoice.nonTravelItems.length > 0 && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-700 text-sm">
                    <th className="py-3 px-4 font-bold w-10 text-center">#</th>
                    <th className="py-3 px-4 font-bold">Product / Service</th>
                    <th className="py-3 px-4 font-bold">Type</th>
                    <th className="py-3 px-4 font-bold">Location</th>
                    <th className="py-3 px-4 font-bold text-right w-16">Qty</th>
                    <th className="py-3 px-4 font-bold text-right w-28">Unit Price</th>
                    <th className="py-3 px-4 font-bold text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="border-b border-slate-200">
                  {invoice.nonTravelItems.map((n: NonTravelItem, i: number) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 text-sm">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{i + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{n.productName}</div>
                        {n.productCategory && (
                          <div className="text-xs text-slate-500 mt-0.5">{n.productCategory}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {n.serviceType === "international" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            🌍 International
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            🇵🇰 Domestic
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {n.location || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">{n.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(n.unitPrice, invoice.currency)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(n.total || 0, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals Section */}
          {(() => {
            const invEx = invoice as unknown as { cancellationCharges?: number; otherRetainedCharges?: number; convenienceFeeAmount?: number; convenienceFeeRefundable?: string };
            const cancCharges = Number(invEx.cancellationCharges || 0);
            const otherCharges = Number(invEx.otherRetainedCharges || 0);
            const totalDeductions = cancCharges + otherCharges;
            const isRefunded = invoice.paymentStatus === "refunded";
            const amountInWordsValue = isRefunded ? invoice.refundAmount : invoice.outstandingBalance > 0 ? invoice.outstandingBalance : invoice.totalAmount;
            return (
              <>
                <div className="flex justify-between items-end mb-4">
                  <div className="w-1/2 pr-8 text-slate-600 bg-slate-50 p-4 rounded-md">
                    <span className="font-bold block mb-1 text-slate-800">Amount in words:</span>
                    <span className="italic">
                      {invoice.currency} {numberToWords(amountInWordsValue)}{" "}
                      {isRefunded ? "(Net Refund)" : "Only"}
                    </span>
                  </div>

                  <div className="w-1/3">
                    <table className="w-full text-right border-collapse">
                      <tbody>
                        <tr>
                          <td className="py-2 text-slate-500 font-medium">Grand Total</td>
                          <td className="py-2 font-bold text-lg">{formatCurrency(invoice.totalAmount, invoice.currency)}</td>
                        </tr>
                        {invoice.paidAmount > 0 && !isRefunded && (
                          <tr>
                            <td className="py-2 text-green-600 font-medium">Paid Amount</td>
                            <td className="py-2 font-medium text-green-600">-{formatCurrency(invoice.paidAmount, invoice.currency)}</td>
                          </tr>
                        )}
                        {invEx.convenienceFeeAmount! > 0 && (
                          <tr>
                            <td className="py-2 text-slate-500 font-medium text-xs">
                              Conv. Fee{" "}
                              <span className={invEx.convenienceFeeRefundable === "refundable" ? "text-emerald-600" : "text-amber-600"}>
                                ({invEx.convenienceFeeRefundable === "refundable" ? "Refundable" : "Non-Refundable"})
                              </span>
                            </td>
                            <td className="py-2 text-xs text-slate-500">{formatCurrency(Number(invEx.convenienceFeeAmount || 0), invoice.currency)}</td>
                          </tr>
                        )}
                        {!isRefunded && invoice.outstandingBalance > 0 && (
                          <tr className="border-t-2 border-slate-800">
                            <td className="py-3 text-slate-800 font-bold">Balance Due</td>
                            <td className="py-3 font-bold text-xl text-red-600">{formatCurrency(invoice.outstandingBalance, invoice.currency)}</td>
                          </tr>
                        )}
                        {isRefunded && (
                          <tr className="border-t-2 border-purple-400">
                            <td className="py-3 text-purple-700 font-bold">Net Refund</td>
                            <td className="py-3 font-bold text-xl text-purple-700">{formatCurrency(invoice.refundAmount, invoice.currency)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── REFUND DETAILS SECTION ── only when refunded */}
                {isRefunded && (() => {
                  const invRefund = invoice as unknown as {
                    refundType?: string | null;
                    refundPaymentRef?: string | null;
                    refundModeOfPayment?: string | null;
                    linkedInvoiceId?: number | null;
                    linkedInvoiceNumber?: string | null;
                    creditNoteId?: number | null;
                  };
                  const REFUND_TYPE_LABELS: Record<string, string> = { full: "Full Refund", partial: "Partial Refund", adjustment: "Refund Adjustment" };
                  return (
                  <div className="mb-8 border-2 border-purple-300 rounded-lg overflow-hidden">
                    <div className="bg-purple-700 px-5 py-3 flex items-center justify-between">
                      <span className="text-white font-bold text-sm uppercase tracking-widest">Refund Details</span>
                      <div className="flex items-center gap-3">
                        {invRefund.refundType && (
                          <span className="bg-purple-500 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                            {REFUND_TYPE_LABELS[invRefund.refundType] || invRefund.refundType}
                          </span>
                        )}
                        <span className="text-purple-200 text-xs font-medium">Status: REFUNDED</span>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-5">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-0 text-sm mb-4">
                        <div>
                          <div className="text-xs text-purple-600 font-bold uppercase mb-2">Original Booking</div>
                          <div className="flex justify-between py-1.5 border-b border-purple-100">
                            <span className="text-slate-600">Invoice Total</span>
                            <span className="font-semibold">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-purple-100">
                            <span className="text-slate-600">Amount Received</span>
                            <span className="font-semibold text-green-700">{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-amber-600 font-bold uppercase mb-2">Deductions (Retained)</div>
                          <div className="flex justify-between py-1.5 border-b border-purple-100">
                            <span className="text-slate-600">Cancellation Charges</span>
                            <span className="font-semibold text-amber-700">{formatCurrency(cancCharges, invoice.currency)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-purple-100">
                            <span className="text-slate-600">Non-Refundable Charges</span>
                            <span className="font-semibold text-amber-700">{formatCurrency(otherCharges, invoice.currency)}</span>
                          </div>
                          {totalDeductions > 0 && (
                            <div className="flex justify-between py-1.5">
                              <span className="text-slate-500 text-xs">Total Deductions</span>
                              <span className="text-xs font-semibold text-amber-800">{formatCurrency(totalDeductions, invoice.currency)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-purple-700 rounded-md px-5 py-3 flex items-center justify-between mb-3">
                        <div>
                          <div className="text-purple-200 text-xs uppercase tracking-wide">Net Refund Amount</div>
                          <div className="text-white text-xs mt-0.5 italic">{invoice.currency} {numberToWords(invoice.refundAmount)} Only</div>
                        </div>
                        <div className="text-white font-bold text-xl">{formatCurrency(invoice.refundAmount, invoice.currency)}</div>
                      </div>

                      {/* Refund Payment & Credit Info */}
                      {(invRefund.refundModeOfPayment || invRefund.refundPaymentRef || invRefund.creditNoteId || invRefund.linkedInvoiceNumber) && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {invRefund.refundModeOfPayment && (
                            <div className="bg-white border border-purple-200 rounded px-3 py-2">
                              <span className="text-xs text-purple-500 font-bold uppercase block">Refund Mode</span>
                              <span className="text-sm font-medium text-slate-700">{MOP_LABELS[invRefund.refundModeOfPayment] || invRefund.refundModeOfPayment}</span>
                            </div>
                          )}
                          {invRefund.refundPaymentRef && (
                            <div className="bg-white border border-purple-200 rounded px-3 py-2">
                              <span className="text-xs text-purple-500 font-bold uppercase block">Payment Reference</span>
                              <span className="text-sm font-medium text-slate-700">{invRefund.refundPaymentRef}</span>
                            </div>
                          )}
                          {invRefund.creditNoteId && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                              <span className="text-xs text-emerald-600 font-bold uppercase block">Credit Note</span>
                              <Link href={`/credit-notes/${invRefund.creditNoteId}`}>
                                <span className="text-sm font-medium text-emerald-700 underline cursor-pointer hover:text-emerald-800">
                                  View Credit Note
                                </span>
                              </Link>
                            </div>
                          )}
                          {invRefund.linkedInvoiceNumber && (
                            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                              <span className="text-xs text-blue-600 font-bold uppercase block">Linked Invoice</span>
                              <span className="text-sm font-medium text-blue-700">{invRefund.linkedInvoiceNumber}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {invoice.notes && (
                        <div className="border border-purple-200 rounded bg-white px-4 py-2.5">
                          <span className="text-xs text-purple-500 font-bold uppercase block mb-1">Reason for Refund</span>
                          <span className="text-sm text-slate-700 whitespace-pre-line">{invoice.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </>
            );
          })()}

          {/* Notes and Bank Details */}
          <div className="flex flex-col gap-6">
            {invoice.notes && (
              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs">Notes & Terms</h4>
                <p className="text-slate-600 whitespace-pre-line text-sm bg-slate-50 p-4 rounded">{invoice.notes}</p>
              </div>
            )}
            
            {(invoice.bankName || invoice.bankAccountNumber) && (
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase text-xs">
                  Payment Details
                </h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {invoice.bankName && <div><span className="text-slate-500 w-24 inline-block">Bank:</span> <span className="font-medium">{invoice.bankName}</span></div>}
                  {invoice.bankAccountTitle && <div><span className="text-slate-500 w-24 inline-block">Title:</span> <span className="font-medium">{invoice.bankAccountTitle}</span></div>}
                  {invoice.bankAccountNumber && <div><span className="text-slate-500 w-24 inline-block">A/C No:</span> <span className="font-medium">{invoice.bankAccountNumber}</span></div>}
                  {invoice.bankIban && <div><span className="text-slate-500 w-24 inline-block">IBAN:</span> <span className="font-medium">{invoice.bankIban}</span></div>}
                  {invoice.bankSwiftCode && <div><span className="text-slate-500 w-24 inline-block">SWIFT:</span> <span className="font-medium">{invoice.bankSwiftCode}</span></div>}
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 text-center text-xs text-slate-400 border-t pt-4">
            Note: This is a computer generated invoice and does not require a physical signature.
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetInvoice, useUpdateInvoice, useGetSettings, getGetInvoiceQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { InvoiceForm, InvoiceFormValues } from "@/components/invoice-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditInvoice() {
  const params = useParams();
  const invoiceId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useGetInvoice(invoiceId, { query: { enabled: !!invoiceId } });
  const { data: settings } = useGetSettings();
  const updateInvoice = useUpdateInvoice();

  const handleSubmit = (data: InvoiceFormValues) => {
    updateInvoice.mutate(
      { id: invoiceId, data },
      {
        onSuccess: (updatedInvoice) => {
          queryClient.setQueryData(getGetInvoiceQueryKey(invoiceId), updatedInvoice);
          toast({ title: "Invoice Updated", description: `Invoice ${updatedInvoice.invoiceNumber} updated successfully.` });
          setLocation(`/invoices/${updatedInvoice.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update invoice.", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Invoice</h1>
        <Skeleton className="w-full h-[600px]" />
      </div>
    );
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  // Map API data back to form schema
  const initialData = {
    category: invoice.category,
    clientName: invoice.clientName,
    clientAddress: invoice.clientAddress || undefined,
    clientNtn: invoice.clientNtn || undefined,
    pocName: invoice.pocName || undefined,
    purchaseOrder: invoice.purchaseOrder || undefined,
    poDate: invoice.poDate || undefined,
    dealBookingId: invoice.dealBookingId || undefined,
    currency: invoice.currency,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate || undefined,
    notes: invoice.notes || undefined,
    flightPassengers: invoice.flightPassengers,
    hotelRooms: invoice.hotelRooms,
    tourItems: invoice.tourItems,
    nonTravelItems: invoice.nonTravelItems,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Edit Invoice: {invoice.invoiceNumber}</h1>
      <InvoiceForm 
        initialData={initialData} 
        settings={settings} 
        onSubmit={handleSubmit} 
        isSubmitting={updateInvoice.isPending} 
      />
    </div>
  );
}

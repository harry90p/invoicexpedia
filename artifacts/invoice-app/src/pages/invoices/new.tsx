import React from "react";
import { useCreateInvoice, useGetSettings } from "@workspace/api-client-react";
import { useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { InvoiceForm, InvoiceFormValues } from "@/components/invoice-form";

function nullToUndefined<T>(val: T | null | undefined): T | undefined {
  return val ?? undefined;
}

export default function NewInvoice() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialClientId = params.get("clientId") ? Number(params.get("clientId")) : undefined;

  const { toast } = useToast();
  const { data: settings } = useGetSettings();
  const createInvoice = useCreateInvoice();

  const handleSubmit = (data: InvoiceFormValues) => {
    const enrichedData = {
      ...data,
      clientId: data.clientId,
      companyName: nullToUndefined(settings?.companyName),
      companyAddress: nullToUndefined(settings?.companyAddress),
      companyPhone: nullToUndefined(settings?.companyPhone),
      companyNtn: nullToUndefined(settings?.companyNtn),
      companySNtn: nullToUndefined(settings?.companySNtn),
      bankName: nullToUndefined(settings?.bankName),
      bankAccountTitle: nullToUndefined(settings?.bankAccountTitle),
      bankAccountNumber: nullToUndefined(settings?.bankAccountNumber),
      bankSwiftCode: nullToUndefined(settings?.bankSwiftCode),
      bankIban: nullToUndefined(settings?.bankIban),
      logoUrl: nullToUndefined(settings?.logoUrl),
      logoPosition: (nullToUndefined(settings?.logoPosition) ?? "left") as "left" | "center" | "right",
    };

    createInvoice.mutate(
      { data: enrichedData },
      {
        onSuccess: (invoice) => {
          toast({ title: "Invoice Created", description: `Invoice ${invoice.invoiceNumber} created successfully.` });
          setLocation(`/invoices/${invoice.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
      <InvoiceForm
        settings={settings}
        initialClientId={initialClientId}
        onSubmit={handleSubmit}
        isSubmitting={createInvoice.isPending}
      />
    </div>
  );
}

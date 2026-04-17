import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateClient } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Building2, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "QAR", "KWD", "OMR", "BHD"];

type ClientType = "private" | "corporate";

export default function NewClient() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createClient = useCreateClient();

  const [clientType, setClientType] = useState<ClientType | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactInfo: "",
    notes: "",
    contactPerson: "",
    address: "",
    ntn: "",
    defaultPurchaseOrder: "",
    defaultPoDate: "",
    creditLimit: "",
    creditCycleDays: "30",
    serviceChargePct: "0",
    internationalServiceChargePct: "0",
    serviceChargeBase: "base_fare" as "base_fare" | "base_fare_plus_taxes",
    currency: "PKR",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Client Name is required", variant: "destructive" });
      return;
    }
    if (clientType === "corporate" && !form.contactPerson.trim()) {
      toast({ title: "Point of Contact is required for Corporate clients", variant: "destructive" });
      return;
    }

    createClient.mutate(
      {
        data: {
          name: form.name.trim(),
          clientType: clientType!,
          contactInfo: form.contactInfo || undefined,
          notes: form.notes || undefined,
          ...(clientType === "corporate" && {
            contactPerson: form.contactPerson.trim() || undefined,
            address: form.address || undefined,
            ntn: form.ntn || undefined,
            defaultPurchaseOrder: form.defaultPurchaseOrder || undefined,
            defaultPoDate: form.defaultPoDate || undefined,
            creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
            creditCycleDays: Number(form.creditCycleDays) || 30,
            serviceChargePct: Number(form.serviceChargePct) || 0,
            internationalServiceChargePct: Number(form.internationalServiceChargePct) || 0,
            serviceChargeBase: form.serviceChargeBase,
            currency: form.currency,
          }),
        },
      },
      {
        onSuccess: (client) => {
          toast({ title: "Client Created", description: `${client.name} has been added.` });
          navigate(`/clients/${client.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create client", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => clientType ? setClientType(null) : navigate("/clients")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">New Client</h1>
          <p className="text-sm text-muted-foreground">
            {clientType
              ? `Registering a ${clientType === "corporate" ? "Corporate" : "Private"} client`
              : "Select client type to begin"}
          </p>
        </div>
      </div>

      {/* Step 1: Type Selection */}
      {!clientType && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">What type of client are you registering?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setClientType("corporate")}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition-all duration-150",
                "border-slate-200 bg-white hover:border-primary hover:shadow-md dark:bg-zinc-900 dark:border-zinc-700 dark:hover:border-primary"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="font-bold text-base">Corporate Client</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Company or business with full billing details — address, NTN, POC, PO number, credit terms, and service charges.
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {["Address", "NTN", "POC", "Credit Limit", "Service Charge"].map((tag) => (
                  <span key={tag} className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </button>

            <button
              onClick={() => setClientType("private")}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition-all duration-150",
                "border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md dark:bg-zinc-900 dark:border-zinc-700 dark:hover:border-emerald-500"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </div>
              <div>
                <div className="font-bold text-base">Private Client</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Individual person or walk-in customer. Quick registration with just name and contact details.
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {["Name", "Contact Number", "Email"].map((tag) => (
                  <span key={tag} className="text-xs bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Private Client Form */}
      {clientType === "private" && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border rounded-lg p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <User className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Private Client</span>
          </div>

          <div className="space-y-2">
            <Label>Client Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Ahmed Khan"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Contact Number <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input
              value={form.contactInfo}
              onChange={(e) => set("contactInfo", e.target.value)}
              placeholder="+92 300 0000000"
            />
          </div>

          <div className="space-y-2">
            <Label>Email Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input
              type="email"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="client@email.com"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createClient.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-2" />
              {createClient.isPending ? "Saving..." : "Register Private Client"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setClientType(null)}>
              Back
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: Corporate Client Form */}
      {clientType === "corporate" && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border rounded-lg p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Corporate Client</span>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Basic Information</h2>

            <div className="space-y-2">
              <Label>Company / Client Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. ACME Corporation"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Point of Contact <span className="text-red-500">*</span></Label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) => set("contactPerson", e.target.value)}
                  placeholder="Primary contact person"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Info <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  value={form.contactInfo}
                  onChange={(e) => set("contactInfo", e.target.value)}
                  placeholder="Phone or email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Client Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Full billing address..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NTN <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  value={form.ntn}
                  onChange={(e) => set("ntn", e.target.value)}
                  placeholder="Tax registration number"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* PO Settings */}
          <div className="space-y-4 pt-2 border-t">
            <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Purchase Order</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default PO Number <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  value={form.defaultPurchaseOrder}
                  onChange={(e) => set("defaultPurchaseOrder", e.target.value)}
                  placeholder="PO number"
                />
              </div>
              <div className="space-y-2">
                <Label>Default PO Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  type="date"
                  value={form.defaultPoDate}
                  onChange={(e) => set("defaultPoDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Credit Settings */}
          <div className="space-y-4 pt-2 border-t">
            <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Credit Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credit Limit ({form.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.creditLimit}
                  onChange={(e) => set("creditLimit", e.target.value)}
                  placeholder="0 = no limit"
                />
                <p className="text-xs text-muted-foreground">Alert when outstanding balance exceeds this</p>
              </div>
              <div className="space-y-2">
                <Label>Credit Cycle (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.creditCycleDays}
                  onChange={(e) => set("creditCycleDays", e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">Invoice payment due period</p>
              </div>
            </div>
          </div>

          {/* Service Charge */}
          <div className="space-y-4 pt-2 border-t">
            <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Service Charge</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>🇵🇰 Domestic Service Charge %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.serviceChargePct}
                  onChange={(e) => set("serviceChargePct", e.target.value)}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground">Applied on domestic invoices</p>
              </div>
              <div className="space-y-2">
                <Label>🌍 International Service Charge %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.internationalServiceChargePct}
                  onChange={(e) => set("internationalServiceChargePct", e.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">Applied on international invoices</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applied On</Label>
              <Select
                value={form.serviceChargeBase}
                onValueChange={(v: any) => set("serviceChargeBase", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base_fare">Base Fare Only</SelectItem>
                  <SelectItem value="base_fare_plus_taxes">Base Fare + Taxes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Notes <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes about this client..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createClient.isPending} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {createClient.isPending ? "Saving..." : "Register Corporate Client"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setClientType(null)}>
              Back
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

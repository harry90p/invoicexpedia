import React, { useEffect, useRef, useState } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyNtn: "",
    companySNtn: "",
    defaultCurrency: "PKR",
    defaultServiceFeePct: 0,
    defaultServiceFeeBase: "base_fare" as "base_fare" | "base_fare_plus_taxes",
    bankName: "",
    bankAccountTitle: "",
    bankAccountNumber: "",
    bankSwiftCode: "",
    bankIban: "",
    logoPosition: "left" as "left" | "center" | "right",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || "",
        companyAddress: settings.companyAddress || "",
        companyPhone: settings.companyPhone || "",
        companyNtn: settings.companyNtn || "",
        companySNtn: settings.companySNtn || "",
        defaultCurrency: settings.defaultCurrency || "PKR",
        defaultServiceFeePct: settings.defaultServiceFeePct || 0,
        defaultServiceFeeBase: settings.defaultServiceFeeBase || "base_fare",
        bankName: settings.bankName || "",
        bankAccountTitle: settings.bankAccountTitle || "",
        bankAccountNumber: settings.bankAccountNumber || "",
        bankSwiftCode: settings.bankSwiftCode || "",
        bankIban: settings.bankIban || "",
        logoPosition: settings.logoPosition || "left",
      });
      setLogoPreview(settings.logoUrl || null);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(
      {
        data: {
          ...formData,
          defaultServiceFeePct: Number(formData.defaultServiceFeePct),
          logoUrl: logoPreview || undefined,
        }
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetSettingsQueryKey(), data);
          toast({
            title: "Settings saved",
            description: "Company settings have been updated successfully.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update settings.",
            variant: "destructive",
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
            <CardDescription>This information will appear on your invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone Number</Label>
                  <Input id="companyPhone" name="companyPhone" value={formData.companyPhone} onChange={handleChange} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Address</Label>
                <Textarea id="companyAddress" name="companyAddress" value={formData.companyAddress} onChange={handleChange} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyNtn">NTN</Label>
                  <Input id="companyNtn" name="companyNtn" value={formData.companyNtn} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySNtn">SNTN</Label>
                  <Input id="companySNtn" name="companySNtn" value={formData.companySNtn} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h3 className="text-lg font-medium">Company Logo</h3>
              <div className="flex items-start gap-8">
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logoUpload">Upload Logo (PNG, JPG)</Label>
                    <Input 
                      id="logoUpload" 
                      type="file" 
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoPosition">Logo Position on Invoice</Label>
                    <Select value={formData.logoPosition} onValueChange={(val) => handleSelectChange("logoPosition", val)}>
                      <SelectTrigger id="logoPosition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left Align</SelectItem>
                        <SelectItem value="center">Center Align</SelectItem>
                        <SelectItem value="right">Right Align</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {logoPreview && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setLogoPreview(null)}
                    >
                      Remove Logo
                    </Button>
                  )}
                </div>
                <div className="w-48 h-48 border rounded-md flex items-center justify-center bg-gray-50 overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No logo</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Defaults</CardTitle>
            <CardDescription>Default settings for new invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select value={formData.defaultCurrency} onValueChange={(val) => handleSelectChange("defaultCurrency", val)}>
                  <SelectTrigger id="defaultCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["PKR", "USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD"].map(currency => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultServiceFeePct">Default Service Fee (%)</Label>
                <Input 
                  id="defaultServiceFeePct" 
                  name="defaultServiceFeePct" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={formData.defaultServiceFeePct} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultServiceFeeBase">Service Fee Calculation Base</Label>
                <Select value={formData.defaultServiceFeeBase} onValueChange={(val) => handleSelectChange("defaultServiceFeeBase", val)}>
                  <SelectTrigger id="defaultServiceFeeBase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base_fare">Base Fare Only</SelectItem>
                    <SelectItem value="base_fare_plus_taxes">Base Fare + Taxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <CardDescription>Where clients should send payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountTitle">Account Title</Label>
                <Input id="bankAccountTitle" name="bankAccountTitle" value={formData.bankAccountTitle} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input id="bankAccountNumber" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankSwiftCode">SWIFT / BIC Code</Label>
                <Input id="bankSwiftCode" name="bankSwiftCode" value={formData.bankSwiftCode} onChange={handleChange} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="bankIban">IBAN</Label>
                <Input id="bankIban" name="bankIban" value={formData.bankIban} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

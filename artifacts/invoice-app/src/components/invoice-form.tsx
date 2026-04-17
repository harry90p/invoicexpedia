import React, { useEffect, useState, useRef, useCallback } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AirportAutocomplete } from "./airport-autocomplete";
import { CityAutocomplete } from "./city-autocomplete";
import { CountryAutocomplete } from "./country-autocomplete";
import { Trash2, Plus, X, Building2, ChevronDown, UserPlus, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useListClients, useCreateClient } from "@workspace/api-client-react";
import type { Client } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getListClientsQueryKey } from "@workspace/api-client-react";

// --- Sub-schemas

const flightAddOnItemSchema = z.object({
  category: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0),
});

const flightPassengerSchema = z.object({
  passengerName: z.string().min(1, "Required"),
  ticketNumber: z.string().min(1, "Required"),
  pnr: z.string().min(1, "Required"),
  airline: z.string().min(1, "Required"),
  sectorFrom: z.string().min(1, "Required"),
  sectorTo: z.string().min(1, "Required"),
  flightClass: z.enum(["economy", "premium_economy", "business", "first_class"]),
  departureDate: z.string().min(1, "Required"),
  returnDate: z.string().optional(),
  serviceType: z.enum(["domestic", "international"]).optional().default("domestic"),
  fare: z.coerce.number().min(0),
  taxes: z.coerce.number().min(0),
  addOns: z.array(flightAddOnItemSchema).optional().default([]),
  penalties: z.array(flightAddOnItemSchema).optional().default([]),
  serviceFeePct: z.coerce.number().min(0),
  serviceFeeBase: z.enum(["base_fare", "base_fare_plus_taxes"]),
  serviceFeeAmount: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
});

const hotelRoomSchema = z.object({
  guestName: z.string().min(1, "Required"),
  propertyName: z.string().min(1, "Required"),
  occupancyType: z.string().optional(),
  checkInDate: z.string().min(1, "Required"),
  checkOutDate: z.string().min(1, "Required"),
  serviceType: z.enum(["domestic", "international"]).optional().default("domestic"),
  numberOfRooms: z.coerce.number().min(1),
  roomCategory: z.string().min(1, "Required"),
  ratePerNight: z.coerce.number().min(0),
  taxPerNight: z.coerce.number().min(0),
  serviceChargeBase: z.enum(["room_rent_only", "room_rent_plus_tax"]),
  serviceChargesPct: z.coerce.number().min(0),
  nights: z.coerce.number().optional(),
  accommodationCost: z.coerce.number().optional(),
  taxTotal: z.coerce.number().optional(),
  serviceChargesAmount: z.coerce.number().optional(),
  invoiceAmount: z.coerce.number().optional(),
});

const tourItemSchema = z.object({
  tourName: z.string().min(1, "Required"),
  passengerName: z.string().optional().default(""),
  tourDetails: z.string().optional().default(""),
  tourLocation: z.string().optional(),
  serviceType: z.enum(["domestic", "international"]).optional().default("domestic"),
  tourStartDate: z.string().min(1, "Required"),
  tourEndDate: z.string().optional(),
  numberOfPeople: z.coerce.number().min(0).optional().default(0),
  qty: z.coerce.number().min(1),
  feePerPerson: z.coerce.number().min(0),
  taxes: z.coerce.number().min(0).optional().default(0),
  tourInvoiceAmount: z.coerce.number().optional(),
  subtotal: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
});

const DOMESTIC_CATEGORIES: Record<string, string[]> = {
  "Travel Accessories": [
    "Luggage Bags", "Backpacks", "Travel Pillows", "Neck Pillows", "Packing Cubes",
    "Travel Wallets", "Passport Holders", "Cable Organizers", "Travel Adapters",
    "Luggage Locks", "Compression Bags", "Toiletry Kits", "Travel Umbrellas",
    "Sleep Masks", "Earplugs", "Travel Towels",
  ],
  "Local Experiences": [
    "Cultural Tour", "Cooking Class", "Language Class", "Traditional Dance Show",
    "Local Market Tour", "Craft Workshop", "Heritage Walk", "Guided Hike",
    "Camping Experience", "Village Homestay", "Wildlife Safari", "River Rafting",
  ],
  "Transportation Services": [
    "Airport Transfer", "Car Rental", "Chauffeur Service", "Shuttle Service",
    "Motorbike Rental", "Bicycle Rental", "Boat Charter", "Cable Car Ticket",
  ],
  "Food & Beverage Services": [
    "Cultural Dining Experience", "Cooking Class", "Food Tour",
    "Special Dietary Meal", "Snack Pack", "Mineral Water Pack",
  ],
  "Wellness & Spa Services": [
    "Massage Session", "Yoga Class", "Meditation Session",
    "Hot Spring Package", "Wellness Retreat Package",
  ],
  "Photographic Services": [
    "Professional Photo Shoot", "Tour Photography Package", "Drone Photography",
    "Wedding Photography (Travel)", "Photo Editing Services", "Photo Printing", "Photo Album Creation",
  ],
  "Guides & Books": [
    "City Travel Guide", "Local Trail Map", "Cultural Guide",
    "Restaurant Guide", "Photography Location Guide", "Travel Journal",
  ],
  "Souvenirs": [
    "Handicrafts", "Local Artwork", "Keychains", "Refrigerator Magnets",
    "Traditional Clothing", "Ceramic Items", "Jewelry", "Decorative Items",
    "Miniature Replicas", "Custom T-Shirts",
  ],
};

const INTERNATIONAL_CATEGORIES: Record<string, string[]> = {
  "Travel Insurance": [
    "Single Trip Insurance", "Multi-Trip Annual Insurance", "Medical Evacuation Coverage",
    "Trip Cancellation Insurance", "Baggage Loss Insurance", "Adventure Sports Coverage",
    "Senior Travel Insurance", "Family Travel Insurance", "Business Travel Insurance",
  ],
  "Visa Services": [
    "Visa Application Assistance", "Visa Document Preparation", "Visa Appointment Booking",
    "Embassy Letter", "Visa Fee Payment", "Document Attestation",
    "Document Translation", "Travel Insurance Certificate", "Bank Statement Preparation",
  ],
  "Specialized Services": [
    "Airport Meet & Greet", "Fast Track Immigration", "VIP Lounge Access",
    "Concierge Services", "Travel Consultation", "Group Leader Coordination",
  ],
  "Digital Products": [
    "E-Visa Fee", "Portable WiFi Rental", "International SIM Card",
    "Online Booking Fee", "E-Ticket", "Digital Travel Guide", "Membership Fee",
  ],
  "Mobile Applications": [
    "Offline Maps Subscription", "Language Translation App", "Travel Planner App",
    "Currency Converter App", "Flight Tracker App", "Hotel Booking App Premium",
  ],
  "Food & Beverage Services": [
    "Airport Lounge Access", "In-Flight Meal Upgrade", "Special Dietary Meal",
  ],
  "Photographic Services": [
    "Professional Photo Shoot", "Tour Photography Package", "Drone Photography", "Photo Editing Services",
  ],
  "Guides & Books": [
    "Country Travel Guide", "Phrase Book", "Road Atlas",
    "Hiking Trail Map", "Cultural Guide", "Restaurant Guide",
  ],
  "Transportation Services": [
    "Airport Transfer", "Car Rental", "Chauffeur Service", "Helicopter Transfer", "Boat Charter",
  ],
};

function getNonTravelCategories(serviceType: string): Record<string, string[]> {
  return serviceType === "international" ? INTERNATIONAL_CATEGORIES : DOMESTIC_CATEGORIES;
}

const nonTravelItemSchema = z.object({
  productCategory: z.string().optional().default(""),
  productName: z.string().min(1, "Required"),
  serviceType: z.enum(["domestic", "international"]).optional().default("domestic"),
  location: z.string().optional().default(""),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  subtotal: z.coerce.number().default(0),
  total: z.coerce.number().default(0),
});

const invoiceSchema = z.object({
  clientId: z.number({ required_error: "Please select a client" }),
  category: z.enum(["flight", "hotel", "tour", "non_travel", "mix_panel_tour"]),
  clientName: z.string().min(1, "Client Name is required"),
  clientAddress: z.string().optional(),
  clientNtn: z.string().optional(),
  pocName: z.string().optional(),
  recipientName: z.string().optional(),
  purchaseOrder: z.string().optional(),
  poDate: z.string().optional(),
  dealBookingId: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  invoiceDate: z.string().min(1, "Invoice Date is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),

  flightPassengers: z.array(flightPassengerSchema).optional(),
  hotelRooms: z.array(hotelRoomSchema).optional(),
  tourItems: z.array(tourItemSchema).optional(),
  nonTravelItems: z.array(nonTravelItemSchema).optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// --- Constants

const ADD_ON_CATEGORIES = ["Baggage Charges", "Seat Selection", "Meal Charges", "Other"];
const PENALTY_CATEGORIES = ["Cancellation Charges", "Non-Refundable Charges", "Change Charges", "Service Charge Retained"];

// --- Default values

interface AppSettings {
  defaultServiceFeePct?: number;
  defaultServiceFeeBase?: "base_fare" | "base_fare_plus_taxes";
  defaultCurrency?: string;
}

function defaultFlight(settings?: AppSettings) {
  return {
    passengerName: "", ticketNumber: "", pnr: "", airline: "",
    sectorFrom: "", sectorTo: "", flightClass: "economy" as const,
    departureDate: "", serviceType: "domestic" as const,
    fare: 0, taxes: 0, addOns: [], penalties: [],
    serviceFeePct: settings?.defaultServiceFeePct ?? 0,
    serviceFeeBase: (settings?.defaultServiceFeeBase ?? "base_fare") as "base_fare" | "base_fare_plus_taxes",
  };
}

function defaultHotel(settings?: AppSettings) {
  return {
    guestName: "", propertyName: "", checkInDate: "", checkOutDate: "",
    serviceType: "domestic" as const,
    numberOfRooms: 1, roomCategory: "", ratePerNight: 0, taxPerNight: 0,
    serviceChargeBase: "room_rent_only" as const,
    serviceChargesPct: settings?.defaultServiceFeePct ?? 0,
  };
}

function defaultTour() {
  return {
    tourName: "", passengerName: "", tourDetails: "", tourStartDate: "", serviceType: "domestic" as const,
    numberOfPeople: 1, qty: 1, feePerPerson: 0,
    taxes: 0, subtotal: 0, total: 0,
  };
}

function defaultNonTravel(_settings?: AppSettings) {
  return {
    productCategory: "", productName: "", serviceType: "domestic" as const,
    location: "",
    quantity: 1, unitPrice: 0,
    subtotal: 0, total: 0,
  };
}

// --- Helpers

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// --- Sub-section components

type FlightPassenger = InvoiceFormValues["flightPassengers"] extends Array<infer T> ? T : never;

interface FlightPassengerRowProps {
  form: UseFormReturn<InvoiceFormValues>;
  index: number;
  onRemove: () => void;
  watchPassenger: FlightPassenger | undefined;
  selectedClient?: Client | null;
}

function FlightPassengerRow({ form, index, onRemove, watchPassenger, selectedClient }: FlightPassengerRowProps) {
  const addOnsArray = useFieldArray({ control: form.control, name: `flightPassengers.${index}.addOns` });
  const penaltiesArray = useFieldArray({ control: form.control, name: `flightPassengers.${index}.penalties` });

  const addOns = watchPassenger?.addOns || [];
  const penalties = watchPassenger?.penalties || [];

  return (
    <div className="p-4 border rounded-md relative bg-gray-50/50 dark:bg-zinc-900/50">
      <Button type="button" variant="ghost" size="icon"
        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>

      <h4 className="font-medium mb-4">Passenger {index + 1}</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField control={form.control} name={`flightPassengers.${index}.passengerName`} render={({ field }) => (
          <FormItem><FormLabel>Passenger Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.ticketNumber`} render={({ field }) => (
          <FormItem><FormLabel>Ticket Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.pnr`} render={({ field }) => (
          <FormItem><FormLabel>PNR</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.airline`} render={({ field }) => (
          <FormItem><FormLabel>Airline</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.sectorFrom`} render={({ field }) => (
          <FormItem><FormLabel>Sector From</FormLabel><FormControl><AirportAutocomplete value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.sectorTo`} render={({ field }) => (
          <FormItem><FormLabel>Sector To</FormLabel><FormControl><AirportAutocomplete value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.flightClass`} render={({ field }) => (
          <FormItem>
            <FormLabel>Class</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="economy">Economy</SelectItem>
                <SelectItem value="premium_economy">Premium Economy</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first_class">First Class</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.departureDate`} render={({ field }) => (
          <FormItem><FormLabel>Departure Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.returnDate`} render={({ field }) => (
          <FormItem><FormLabel>Return Date (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`flightPassengers.${index}.serviceType`} render={({ field }) => (
          <FormItem>
            <FormLabel>Service / Product Type</FormLabel>
            <Select
              onValueChange={(val) => {
                field.onChange(val);
                if (selectedClient) {
                  const st = val as "domestic" | "international";
                  const pct = st === "international"
                    ? Number((selectedClient as any).internationalServiceChargePct ?? 0)
                    : Number(selectedClient.serviceChargePct ?? 0);
                  const base = (selectedClient.serviceChargeBase ?? "base_fare") as "base_fare" | "base_fare_plus_taxes";
                  form.setValue(`flightPassengers.${index}.serviceFeePct`, pct);
                  form.setValue(`flightPassengers.${index}.serviceFeeBase`, base);
                }
              }}
              value={field.value || "domestic"}
            >
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="domestic">🇵🇰 Domestic</SelectItem>
                <SelectItem value="international">🌍 International</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Fare & Service Fee */}
        <FormField control={form.control} name={`flightPassengers.${index}.fare`} render={({ field }) => (
          <FormItem><FormLabel>Base Fare</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-2">
          <FormField control={form.control} name={`flightPassengers.${index}.serviceFeePct`} render={({ field }) => (
            <FormItem><FormLabel>Fee %</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name={`flightPassengers.${index}.serviceFeeBase`} render={({ field }) => (
            <FormItem>
              <FormLabel>Fee Base</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="base_fare">Base Fare Only</SelectItem>
                  <SelectItem value="base_fare_plus_taxes">Base Fare + Taxes</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Taxes */}
        <FormField control={form.control} name={`flightPassengers.${index}.taxes`} render={({ field }) => (
          <FormItem><FormLabel>Taxes</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        {/* Add-Ons */}
        <div className="col-span-3">
          <div className="border rounded-md p-3 space-y-2 bg-white dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Add-Ons</span>
              <Button type="button" variant="outline" size="sm" onClick={() => addOnsArray.append({ category: "Baggage Charges", amount: 0 })}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {addOnsArray.fields.map((f, ai) => (
              <div key={f.id} className="flex gap-2 items-start">
                <FormField control={form.control} name={`flightPassengers.${index}.addOns.${ai}.category`} render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ADD_ON_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name={`flightPassengers.${index}.addOns.${ai}.amount`} render={({ field }) => (
                  <FormItem className="w-32">
                    <FormControl><Input type="number" step="0.01" className="h-8 text-xs" {...field} /></FormControl>
                  </FormItem>
                )} />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => addOnsArray.remove(ai)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {addOns.length > 0 && (
              <div className="text-xs text-muted-foreground text-right">
                Subtotal: {addOns.reduce((s, a) => s + Number(a.amount || 0), 0).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Penalties */}
        <div className="col-span-3">
          <div className="border rounded-md p-3 space-y-2 bg-white dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Penalties</span>
              <Button type="button" variant="outline" size="sm" onClick={() => penaltiesArray.append({ category: "Cancellation Charges", amount: 0 })}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {penaltiesArray.fields.map((f, pi) => (
              <div key={f.id} className="flex gap-2 items-start">
                <FormField control={form.control} name={`flightPassengers.${index}.penalties.${pi}.category`} render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PENALTY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name={`flightPassengers.${index}.penalties.${pi}.amount`} render={({ field }) => (
                  <FormItem className="w-32">
                    <FormControl><Input type="number" step="0.01" className="h-8 text-xs" {...field} /></FormControl>
                  </FormItem>
                )} />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => penaltiesArray.remove(pi)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {penalties.length > 0 && (
              <div className="text-xs text-muted-foreground text-right">
                Subtotal: {penalties.reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="col-span-3 border-t pt-4 mt-2 grid grid-cols-3 gap-4 text-sm">
          <div className="text-muted-foreground">
            Taxes: <strong>{Number(watchPassenger?.taxes || 0).toFixed(2)}</strong>
          </div>
          <div className="text-muted-foreground">
            Service Fee: <strong>{watchPassenger?.serviceFeeAmount?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="text-right">
            Total: <strong className="text-lg">{watchPassenger?.total?.toFixed(2) || "0.00"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

type HotelRoom = InvoiceFormValues["hotelRooms"] extends Array<infer T> ? T : never;

interface HotelRoomRowProps {
  form: UseFormReturn<InvoiceFormValues>;
  index: number;
  onRemove: () => void;
  watchRoom: HotelRoom | undefined;
  selectedClient?: Client | null;
}

function HotelRoomRow({ form, index, onRemove, watchRoom, selectedClient }: HotelRoomRowProps) {
  return (
    <div className="p-4 border rounded-md relative bg-gray-50/50 dark:bg-zinc-900/50">
      <Button type="button" variant="ghost" size="icon"
        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      <h4 className="font-medium mb-4">Room {index + 1}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField control={form.control} name={`hotelRooms.${index}.guestName`} render={({ field }) => (
          <FormItem><FormLabel>Guest Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.propertyName`} render={({ field }) => (
          <FormItem><FormLabel>Property Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.roomCategory`} render={({ field }) => (
          <FormItem><FormLabel>Room Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.checkInDate`} render={({ field }) => (
          <FormItem><FormLabel>Check-in Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.checkOutDate`} render={({ field }) => (
          <FormItem><FormLabel>Check-out Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.occupancyType`} render={({ field }) => (
          <FormItem><FormLabel>Occupancy Type (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.serviceType`} render={({ field }) => (
          <FormItem>
            <FormLabel>Service / Product Type</FormLabel>
            <Select
              onValueChange={(val) => {
                field.onChange(val);
                if (selectedClient) {
                  const st = val as "domestic" | "international";
                  const pct = st === "international"
                    ? Number((selectedClient as any).internationalServiceChargePct ?? 0)
                    : Number(selectedClient.serviceChargePct ?? 0);
                  const base = (selectedClient.serviceChargeBase ?? "base_fare") as "base_fare" | "base_fare_plus_taxes";
                  const hotelBase = base === "base_fare_plus_taxes" ? "room_rent_plus_tax" : "room_rent_only";
                  form.setValue(`hotelRooms.${index}.serviceChargesPct`, pct);
                  form.setValue(`hotelRooms.${index}.serviceChargeBase`, hotelBase);
                }
              }}
              value={field.value || "domestic"}
            >
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="domestic">🇵🇰 Domestic</SelectItem>
                <SelectItem value="international">🌍 International</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.numberOfRooms`} render={({ field }) => (
          <FormItem><FormLabel>Number of Rooms</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Number of Nights</label>
            <div className="h-10 flex items-center px-3 bg-gray-100 dark:bg-zinc-800 rounded-md text-sm font-semibold">
              {watchRoom?.nights || 1} night(s)
            </div>
          </div>
        </div>
        <FormField control={form.control} name={`hotelRooms.${index}.ratePerNight`} render={({ field }) => (
          <FormItem><FormLabel>Room Rent / Night</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.taxPerNight`} render={({ field }) => (
          <FormItem><FormLabel>Tax / Night</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.serviceChargesPct`} render={({ field }) => (
          <FormItem><FormLabel>Service Charge %</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`hotelRooms.${index}.serviceChargeBase`} render={({ field }) => (
          <FormItem>
            <FormLabel>Service Charge On</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="room_rent_only">Room Rent Only</SelectItem>
                <SelectItem value="room_rent_plus_tax">Room Rent + Tax</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="col-span-3 border-t pt-4 mt-2 grid grid-cols-4 gap-4 text-sm">
          <div className="text-muted-foreground">
            Room Rent Base: <strong>{watchRoom?.accommodationCost?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="text-muted-foreground">
            Tax Total: <strong>{watchRoom?.taxTotal?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="text-muted-foreground">
            Service Charge: <strong>{watchRoom?.serviceChargesAmount?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="text-right">
            Total: <strong className="text-lg">{watchRoom?.invoiceAmount?.toFixed(2) || "0.00"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

type TourItem = InvoiceFormValues["tourItems"] extends Array<infer T> ? T : never;

interface TourSuggestion {
  name: string;
  description: string;
}

interface TourItemRowProps {
  form: UseFormReturn<InvoiceFormValues>;
  index: number;
  onRemove: () => void;
  watchTour: TourItem | undefined;
}

function TourItemRow({ form, index, onRemove, watchTour }: TourItemRowProps) {
  const [suggestions, setSuggestions] = useState<TourSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiFilledName, setAiFilledName] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (name: string) => {
    if (name.trim().length < 4) { setSuggestions([]); setShowSuggestions(false); return; }
    setSuggestions([]);
    setShowSuggestions(false);
    setIsLoadingSuggestions(true);
    try {
      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${basePath}/api/tour-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourName: name }),
      });
      if (!res.ok || !res.body) { setIsLoadingSuggestions(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as {
              suggestion?: TourSuggestion;
              done?: boolean;
              error?: string;
            };
            if (payload.suggestion) {
              setSuggestions(prev => {
                const next = [...prev, payload.suggestion!];
                if (next.length === 1) setShowSuggestions(true);
                return next;
              });
              setIsLoadingSuggestions(false);
            }
            if (payload.done) { setIsLoadingSuggestions(false); }
          } catch { /* skip malformed event */ }
        }
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleTourNameChange = useCallback((value: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(value);
    setAiFilledName(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 500);
  }, [fetchSuggestions]);

  const applySuggestion = useCallback((s: TourSuggestion) => {
    form.setValue(`tourItems.${index}.tourName`, s.name);
    form.setValue(`tourItems.${index}.tourDetails`, s.description);
    setAiFilledName(s.name);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [form, index]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-4 border rounded-md relative bg-gray-50/50 dark:bg-zinc-900/50">
      <Button type="button" variant="ghost" size="icon"
        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      <h4 className="font-medium mb-4">Tour {index + 1}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Tour Name with AI Suggestions */}
        <FormField control={form.control} name={`tourItems.${index}.tourName`} render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              Tour Name
              <span className="flex items-center gap-1 text-xs text-violet-600 font-normal">
                <Sparkles className="h-3 w-3" /> AI suggestions
              </span>
            </FormLabel>
            <FormControl>
              <div className="relative" ref={containerRef}>
                <Input
                  {...field}
                  placeholder="e.g. 5 days tour to Skardu"
                  onChange={(e) => handleTourNameChange(e.target.value, field.onChange)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  className={aiFilledName ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/20" : ""}
                />
                {isLoadingSuggestions && (
                  <div className="absolute right-2 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-3 py-2 bg-violet-50 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                      <span className="text-xs font-medium text-violet-700 dark:text-violet-400">AI-suggested formal package names</span>
                    </div>
                    {suggestions.map((s, si) => (
                      <button
                        key={si}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors border-b last:border-0 border-gray-100 dark:border-zinc-800"
                        onClick={() => applySuggestion(s)}
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{s.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{s.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name={`tourItems.${index}.passengerName`} render={({ field }) => (
          <FormItem>
            <FormLabel>Passenger / Client Name</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="e.g. Ahmad Khan" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name={`tourItems.${index}.tourLocation`} render={({ field }) => (
          <FormItem>
            <FormLabel>Tour Location (Optional)</FormLabel>
            <FormControl>
              <CityAutocomplete
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Search city or location..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name={`tourItems.${index}.serviceType`} render={({ field }) => (
          <FormItem>
            <FormLabel>Service / Product Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || "domestic"}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="domestic">Domestic</SelectItem>
                <SelectItem value="international">International</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name={`tourItems.${index}.tourStartDate`} render={({ field }) => (
          <FormItem><FormLabel>Tour Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`tourItems.${index}.tourEndDate`} render={({ field }) => (
          <FormItem><FormLabel>Tour End Date (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`tourItems.${index}.numberOfPeople`} render={({ field }) => (
          <FormItem><FormLabel>No. of Persons</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`tourItems.${index}.qty`} render={({ field }) => (
          <FormItem><FormLabel>QTY</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`tourItems.${index}.feePerPerson`} render={({ field }) => (
          <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={`tourItems.${index}.taxes`} render={({ field }) => (
          <FormItem><FormLabel>Taxes (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
        )} />

        {/* Tour Details — spans full width */}
        <FormField control={form.control} name={`tourItems.${index}.tourDetails`} render={({ field }) => (
          <FormItem className="col-span-1 md:col-span-3">
            <FormLabel className="flex items-center gap-2">
              Tour Details
              {aiFilledName && (
                <span className="flex items-center gap-1 text-xs text-violet-600 font-normal">
                  <CheckCircle2 className="h-3 w-3" /> AI-filled — edit as needed
                </span>
              )}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ""}
                rows={3}
                placeholder="Brief description of what's included in this tour package (e.g. sightseeing, accommodation, meals, activities)…"
                className={aiFilledName ? "border-violet-300 bg-violet-50/30 dark:bg-violet-950/10 focus:border-violet-400" : ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="col-span-3 border-t pt-4 mt-2 flex justify-end text-sm">
          <div className="text-right">
            Tour Invoice Amount: <strong className="text-lg">{watchTour?.total?.toFixed(2) || "0.00"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main form component

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormValues>;
  initialClientId?: number;
  settings?: AppSettings;
  onSubmit: (data: InvoiceFormValues) => void;
  isSubmitting?: boolean;
}

export function InvoiceForm({ initialData, initialClientId, settings, onSubmit, isSubmitting }: InvoiceFormProps) {
  const [mixFlightEnabled, setMixFlightEnabled] = useState(true);
  const [mixHotelEnabled, setMixHotelEnabled] = useState(true);
  const [mixTourEnabled, setMixTourEnabled] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "", contactPerson: "", address: "", ntn: "",
    defaultPurchaseOrder: "", defaultPoDate: "",
    contactInfo: "", serviceChargePct: "0",
    serviceChargeBase: "base_fare" as "base_fare" | "base_fare_plus_taxes",
    currency: "PKR",
  });

  const { data: clientsData } = useListClients(clientSearch ? { search: clientSearch } : {});
  const createClientMutation = useCreateClient();
  const qc = useQueryClient();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData || {
      category: "flight",
      currency: settings?.defaultCurrency || "PKR",
      invoiceDate: new Date().toISOString().split("T")[0],
      flightPassengers: [defaultFlight(settings || {})],
    },
  });

  const category = form.watch("category");

  const flightArray = useFieldArray({ control: form.control, name: "flightPassengers" });
  const hotelArray = useFieldArray({ control: form.control, name: "hotelRooms" });
  const tourArray = useFieldArray({ control: form.control, name: "tourItems" });
  const nonTravelArray = useFieldArray({ control: form.control, name: "nonTravelItems" });

  const watchFlightPassengers = form.watch("flightPassengers") || [];
  const watchHotelRooms = form.watch("hotelRooms") || [];
  const watchTourItems = form.watch("tourItems") || [];
  const watchNonTravelItems = form.watch("nonTravelItems") || [];

  // --- Resolve the correct SC% based on trip type
  function getClientScPct(client: Client, tripType: "domestic" | "international"): number {
    if (tripType === "international") {
      return Number((client as any).internationalServiceChargePct ?? 0);
    }
    return Number(client.serviceChargePct ?? 0);
  }

  // --- Effective settings (client overrides app settings)
  const effectiveSettings: AppSettings = selectedClient
    ? {
        defaultServiceFeePct: getClientScPct(selectedClient, "domestic"),
        defaultServiceFeeBase: (selectedClient.serviceChargeBase as "base_fare" | "base_fare_plus_taxes") ?? "base_fare",
        defaultCurrency: selectedClient.currency || settings?.defaultCurrency || "PKR",
      }
    : settings || {};

  // --- Apply SC% to a single flight passenger based on its serviceType
  function applyScToPassenger(client: Client, i: number, serviceType: "domestic" | "international") {
    const pct = getClientScPct(client, serviceType);
    const base = (client.serviceChargeBase ?? "base_fare") as "base_fare" | "base_fare_plus_taxes";
    form.setValue(`flightPassengers.${i}.serviceFeePct`, pct);
    form.setValue(`flightPassengers.${i}.serviceFeeBase`, base);
  }

  // --- Apply SC% to a single hotel room based on its serviceType
  function applyScToRoom(client: Client, i: number, serviceType: "domestic" | "international") {
    const pct = getClientScPct(client, serviceType);
    const base = (client.serviceChargeBase ?? "base_fare") as "base_fare" | "base_fare_plus_taxes";
    const hotelBase = base === "base_fare_plus_taxes" ? "room_rent_plus_tax" : "room_rent_only";
    form.setValue(`hotelRooms.${i}.serviceChargesPct`, pct);
    form.setValue(`hotelRooms.${i}.serviceChargeBase`, hotelBase);
  }

  // --- Apply client data when selected, using each item's existing serviceType
  function applyClient(client: Client) {
    setSelectedClient(client);
    setClientDropOpen(false);
    setClientSearch("");
    form.setValue("clientId", client.id);
    form.setValue("clientName", client.name);
    if (client.address) form.setValue("clientAddress", client.address);
    if (client.contactPerson) form.setValue("pocName", client.contactPerson);
    if (client.ntn) form.setValue("clientNtn", client.ntn);
    if (client.defaultPurchaseOrder) form.setValue("purchaseOrder", client.defaultPurchaseOrder);
    if (client.defaultPoDate) form.setValue("poDate", client.defaultPoDate);
    if (client.currency) form.setValue("currency", client.currency);

    const passengers = form.getValues("flightPassengers") || [];
    passengers.forEach((p, i) => applyScToPassenger(client, i, (p.serviceType || "domestic") as "domestic" | "international"));
    const hotelRooms = form.getValues("hotelRooms") || [];
    hotelRooms.forEach((r, i) => applyScToRoom(client, i, (r.serviceType || "domestic") as "domestic" | "international"));
  }

  // --- Pre-load initial client from clientsData when initialClientId is set
  useEffect(() => {
    if (!initialClientId || selectedClient) return;
    const clients = clientsData?.clients || [];
    const found = clients.find((c) => c.id === initialClientId);
    if (found) applyClient(found);
  }, [initialClientId, clientsData]);

  // --- Auto-calculations
  useEffect(() => {
    const isFlight = category === "flight" || category === "mix_panel_tour";
    const isHotel = category === "hotel" || category === "mix_panel_tour";
    const isTour = category === "tour" || category === "mix_panel_tour";
    const isNonTravel = category === "non_travel";

    if (isFlight) {
      watchFlightPassengers.forEach((p, i) => {
        const addOnsTotal = (p.addOns || []).reduce((s, a) => s + Number(a.amount || 0), 0);
        const penaltiesTotal = (p.penalties || []).reduce((s, a) => s + Number(a.amount || 0), 0);
        const allCharges = Number(p.taxes || 0) + addOnsTotal + penaltiesTotal;
        const baseForFee = p.serviceFeeBase === "base_fare" ? Number(p.fare) : (Number(p.fare) + allCharges);
        const serviceFeeAmount = (baseForFee * Number(p.serviceFeePct)) / 100;
        const total = Number(p.fare) + allCharges + serviceFeeAmount;
        if (p.serviceFeeAmount !== serviceFeeAmount || p.total !== total) {
          form.setValue(`flightPassengers.${i}.serviceFeeAmount`, serviceFeeAmount);
          form.setValue(`flightPassengers.${i}.total`, total);
        }
      });
    }

    if (isHotel) {
      watchHotelRooms.forEach((r, i) => {
        const nights = calcNights(r.checkInDate, r.checkOutDate);
        const rooms = Number(r.numberOfRooms || 1);
        const roomRentBase = Number(r.ratePerNight) * rooms * nights;
        const taxTotal = Number(r.taxPerNight) * rooms * nights;
        const serviceBase = r.serviceChargeBase === "room_rent_plus_tax" ? (roomRentBase + taxTotal) : roomRentBase;
        const scAmount = (serviceBase * Number(r.serviceChargesPct)) / 100;
        const total = roomRentBase + taxTotal + scAmount;

        if (r.nights !== nights || r.accommodationCost !== roomRentBase || r.taxTotal !== taxTotal ||
            r.serviceChargesAmount !== scAmount || r.invoiceAmount !== total) {
          form.setValue(`hotelRooms.${i}.nights`, nights);
          form.setValue(`hotelRooms.${i}.accommodationCost`, roomRentBase);
          form.setValue(`hotelRooms.${i}.taxTotal`, taxTotal);
          form.setValue(`hotelRooms.${i}.serviceChargesAmount`, scAmount);
          form.setValue(`hotelRooms.${i}.invoiceAmount`, total);
        }
      });
    }

    if (isTour) {
      watchTourItems.forEach((t, i) => {
        const amount = Number(t.feePerPerson) * Number(t.qty || 1);
        const total = amount + Number(t.taxes || 0);

        if (t.subtotal !== amount || t.total !== total) {
          form.setValue(`tourItems.${i}.subtotal`, amount);
          form.setValue(`tourItems.${i}.total`, total);
          form.setValue(`tourItems.${i}.tourInvoiceAmount`, total);
        }
      });
    }

    if (isNonTravel) {
      watchNonTravelItems.forEach((n, i) => {
        const sub = Number(n.quantity) * Number(n.unitPrice);
        if (n.subtotal !== sub || n.total !== sub) {
          form.setValue(`nonTravelItems.${i}.subtotal`, sub);
          form.setValue(`nonTravelItems.${i}.total`, sub);
        }
      });
    }
  }, [
    JSON.stringify(watchFlightPassengers),
    JSON.stringify(watchHotelRooms),
    JSON.stringify(watchTourItems),
    JSON.stringify(watchNonTravelItems),
    category,
  ]);

  // --- Category change handler
  const handleCategoryChange = (val: string) => {
    form.setValue("category", val as InvoiceFormValues["category"]);

    if (val === "flight") {
      if (!form.getValues("flightPassengers")?.length)
        form.setValue("flightPassengers", [defaultFlight(effectiveSettings)]);
      // Clear unrelated arrays so their required-field validation doesn't block submit
      form.setValue("hotelRooms", []);
      form.setValue("tourItems", []);
      form.setValue("nonTravelItems", []);
    } else if (val === "hotel") {
      form.setValue("flightPassengers", []);
      if (!form.getValues("hotelRooms")?.length)
        form.setValue("hotelRooms", [defaultHotel(effectiveSettings)]);
      form.setValue("tourItems", []);
      form.setValue("nonTravelItems", []);
    } else if (val === "tour") {
      form.setValue("flightPassengers", []);
      form.setValue("hotelRooms", []);
      if (!form.getValues("tourItems")?.length)
        form.setValue("tourItems", [defaultTour()]);
      form.setValue("nonTravelItems", []);
    } else if (val === "non_travel") {
      form.setValue("flightPassengers", []);
      form.setValue("hotelRooms", []);
      form.setValue("tourItems", []);
      if (!form.getValues("nonTravelItems")?.length)
        form.setValue("nonTravelItems", [defaultNonTravel(effectiveSettings)]);
    } else if (val === "mix_panel_tour") {
      if (!form.getValues("flightPassengers")?.length) form.setValue("flightPassengers", [defaultFlight(effectiveSettings)]);
      if (!form.getValues("hotelRooms")?.length) form.setValue("hotelRooms", [defaultHotel(effectiveSettings)]);
      if (!form.getValues("tourItems")?.length) form.setValue("tourItems", [defaultTour()]);
      form.setValue("nonTravelItems", []);
      setMixFlightEnabled(true);
      setMixHotelEnabled(true);
      setMixTourEnabled(true);
    }
  };

  // --- Render
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">

        {/* Invoice Details */}
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={handleCategoryChange} defaultValue={field.value} disabled={!!initialData}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="flight">Flight</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="tour">Tour</SelectItem>
                      <SelectItem value="non_travel">Non-Travel</SelectItem>
                      <SelectItem value="mix_panel_tour">Mix Panel Tours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["PKR", "USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                <FormItem><FormLabel>Invoice Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Due Date (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
          <CardContent>
            {/* Client Selector */}
            <div className="mb-6">
              <div className="text-sm font-medium mb-2">
                Select Client <span className="text-red-500">*</span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  className={`w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${form.formState.errors.clientId ? "border-red-500" : ""}`}
                  onClick={() => setClientDropOpen((o) => !o)}
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {selectedClient ? (
                      <span className="font-medium">{selectedClient.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Select a client...</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedClient && (
                      <span
                        className="p-1 hover:text-destructive rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(null);
                          form.setValue("clientId", undefined as any);
                          form.setValue("clientName", "");
                          form.setValue("clientAddress", "");
                          form.setValue("pocName", "");
                          form.setValue("clientNtn", "");
                          form.setValue("purchaseOrder", "");
                          form.setValue("poDate", "");
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
                {form.formState.errors.clientId && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.clientId.message}</p>
                )}

                {clientDropOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setClientDropOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-zinc-900 border rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search clients..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {(clientsData?.clients || []).length === 0 && !clientSearch ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">No clients yet</div>
                        ) : (clientsData?.clients || []).length === 0 ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">No clients found</div>
                        ) : (
                          (clientsData?.clients || []).map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                              onClick={() => { applyClient(client); setClientDropOpen(false); }}
                            >
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div>
                                <div className="font-medium">{client.name}</div>
                                {client.contactPerson && (
                                  <div className="text-xs text-muted-foreground">{client.contactPerson}</div>
                                )}
                              </div>
                              {selectedClient?.id === client.id && (
                                <span className="ml-auto text-primary text-xs">✓</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                      <div className="border-t p-1">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded flex items-center gap-2 font-medium"
                          onClick={() => { setClientDropOpen(false); setCreateClientOpen(true); }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Create New Client
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {selectedClient && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  🇵🇰 Domestic SC: <span className="font-medium">{Number(selectedClient.serviceChargePct ?? 0)}%</span>{" "}
                  · 🌍 International SC: <span className="font-medium">{Number((selectedClient as any).internationalServiceChargePct ?? 0)}%</span>{" "}
                  — auto-applied per line item based on its Domestic / International selection •{" "}
                  Credit cycle: <span className="font-medium">{selectedClient.creditCycleDays ?? 30} days</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="recipientName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient / Service For <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} placeholder="Enter individual or sub-client name..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pocName" render={({ field }) => (
                <FormItem><FormLabel>Point of Contact (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientAddress" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Client Address (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientNtn" render={({ field }) => (
                <FormItem><FormLabel>Client NTN (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dealBookingId" render={({ field }) => (
                <FormItem><FormLabel>Deal / Booking ID (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="purchaseOrder" render={({ field }) => (
                <FormItem><FormLabel>Purchase Order (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="poDate" render={({ field }) => (
                <FormItem><FormLabel>PO Date (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* FLIGHT */}
            {category === "flight" && (
              <div className="space-y-6">
                {flightArray.fields.map((field, index) => (
                  <FlightPassengerRow
                    key={field.id}
                    form={form}
                    index={index}
                    onRemove={() => flightArray.remove(index)}
                    watchPassenger={watchFlightPassengers[index]}
                    selectedClient={selectedClient}
                  />
                ))}
                <Button type="button" variant="outline" onClick={() => flightArray.append(defaultFlight(effectiveSettings))}>
                  <Plus className="h-4 w-4 mr-2" /> Add Passenger
                </Button>
              </div>
            )}

            {/* HOTEL */}
            {category === "hotel" && (
              <div className="space-y-6">
                {hotelArray.fields.map((field, index) => (
                  <HotelRoomRow
                    key={field.id}
                    form={form}
                    index={index}
                    onRemove={() => hotelArray.remove(index)}
                    watchRoom={watchHotelRooms[index]}
                    selectedClient={selectedClient}
                  />
                ))}
                <Button type="button" variant="outline" onClick={() => hotelArray.append(defaultHotel(effectiveSettings))}>
                  <Plus className="h-4 w-4 mr-2" /> Add Room
                </Button>
              </div>
            )}

            {/* TOUR */}
            {category === "tour" && (
              <div className="space-y-6">
                {tourArray.fields.map((field, index) => (
                  <TourItemRow
                    key={field.id}
                    form={form}
                    index={index}
                    onRemove={() => tourArray.remove(index)}
                    watchTour={watchTourItems[index]}
                  />
                ))}
                <Button type="button" variant="outline" onClick={() => tourArray.append(defaultTour())}>
                  <Plus className="h-4 w-4 mr-2" /> Add Tour
                </Button>
              </div>
            )}

            {/* NON-TRAVEL */}
            {category === "non_travel" && (
              <div className="space-y-6">
                {nonTravelArray.fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative bg-gray-50/50 dark:bg-zinc-900/50">
                    <Button type="button" variant="ghost" size="icon"
                      className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => nonTravelArray.remove(index)}><Trash2 className="h-4 w-4" /></Button>
                    <h4 className="font-medium mb-4">Item {index + 1}</h4>
                    <div className="space-y-4">
                      {/* Row 1: Type + Location — Type drives what location field and categories appear */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField control={form.control} name={`nonTravelItems.${index}.serviceType`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue(`nonTravelItems.${index}.location`, "");
                                form.setValue(`nonTravelItems.${index}.productCategory`, "");
                                form.setValue(`nonTravelItems.${index}.productName`, "");
                              }}
                              value={field.value || "domestic"}
                            >
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="domestic">🇵🇰 Domestic</SelectItem>
                                <SelectItem value="international">🌍 International</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Location field — city for Domestic, country for International */}
                        <FormField control={form.control} name={`nonTravelItems.${index}.location`} render={({ field }) => {
                          const svcType = form.watch(`nonTravelItems.${index}.serviceType`) || "domestic";
                          return (
                            <FormItem className="md:col-span-3">
                              <FormLabel>{svcType === "international" ? "Country" : "City / Location"}</FormLabel>
                              <FormControl>
                                {svcType === "international" ? (
                                  <CountryAutocomplete
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    placeholder="Select country..."
                                  />
                                ) : (
                                  <CityAutocomplete
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    placeholder="Search Pakistani city or location..."
                                    domestic
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }} />
                      </div>

                      {/* Row 2: Category + Product — filtered by selected Type */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField control={form.control} name={`nonTravelItems.${index}.productCategory`} render={({ field }) => {
                          const svcType = form.watch(`nonTravelItems.${index}.serviceType`) || "domestic";
                          const categories = getNonTravelCategories(svcType);
                          return (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Category</FormLabel>
                              <Select
                                value={field.value || ""}
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  form.setValue(`nonTravelItems.${index}.productName`, "");
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.keys(categories).map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }} />

                        <FormField control={form.control} name={`nonTravelItems.${index}.productName`} render={({ field }) => {
                          const svcType = form.watch(`nonTravelItems.${index}.serviceType`) || "domestic";
                          const selectedCat = form.watch(`nonTravelItems.${index}.productCategory`);
                          const categories = getNonTravelCategories(svcType);
                          const items = selectedCat ? categories[selectedCat] ?? [] : [];
                          const isPreset = items.includes(field.value ?? "");
                          const selectValue = isPreset ? (field.value ?? "") : (items.length > 0 ? "__other__" : "");
                          return (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Product / Service</FormLabel>
                              {items.length > 0 && (
                                <Select
                                  value={selectValue}
                                  onValueChange={(val) => {
                                    if (val !== "__other__") field.onChange(val);
                                    else field.onChange("");
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select an item..." /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {items.map((item) => (
                                      <SelectItem key={item} value={item}>{item}</SelectItem>
                                    ))}
                                    <SelectItem value="__other__">Other (specify below)</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {(!isPreset || items.length === 0) && (
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value ?? ""}
                                    className={items.length > 0 ? "mt-2" : ""}
                                    placeholder={items.length > 0 ? "Specify custom product / service..." : "Enter product / service name"}
                                    disabled={!selectedCat && items.length === 0}
                                  />
                                </FormControl>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }} />
                      </div>

                      {/* Row 3: Pricing */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField control={form.control} name={`nonTravelItems.${index}.quantity`} render={({ field }) => (
                          <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`nonTravelItems.${index}.unitPrice`} render={({ field }) => (
                          <FormItem><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="flex flex-col justify-end pb-1 text-sm text-right md:col-span-2">
                          <div className="text-muted-foreground text-xs">Total</div>
                          <div className="font-semibold text-base">{watchNonTravelItems[index]?.total?.toFixed(2) || "0.00"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => nonTravelArray.append(defaultNonTravel(effectiveSettings))}>
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>
            )}

            {/* MIX PANEL TOURS */}
            {category === "mix_panel_tour" && (
              <div className="space-y-8">
                {/* Flights Sub-section */}
                <div className="border-2 border-blue-200 dark:border-blue-900 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">✈ Flights</h3>
                    {mixFlightEnabled ? (
                      <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                        onClick={() => { setMixFlightEnabled(false); form.setValue("flightPassengers", []); }}>
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => { setMixFlightEnabled(true); form.setValue("flightPassengers", [defaultFlight(effectiveSettings)]); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Flights
                      </Button>
                    )}
                  </div>
                  {mixFlightEnabled && (
                    <div className="p-4 space-y-4">
                      {flightArray.fields.map((field, index) => (
                        <FlightPassengerRow
                          key={field.id}
                          form={form}
                          index={index}
                          onRemove={() => flightArray.remove(index)}
                          watchPassenger={watchFlightPassengers[index]}
                          selectedClient={selectedClient}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => flightArray.append(defaultFlight(effectiveSettings))}>
                        <Plus className="h-4 w-4 mr-2" /> Add Passenger
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hotels Sub-section */}
                <div className="border-2 border-green-200 dark:border-green-900 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 px-4 py-3">
                    <h3 className="font-semibold text-green-800 dark:text-green-200">🏨 Hotels</h3>
                    {mixHotelEnabled ? (
                      <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                        onClick={() => { setMixHotelEnabled(false); form.setValue("hotelRooms", []); }}>
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => { setMixHotelEnabled(true); form.setValue("hotelRooms", [defaultHotel(effectiveSettings)]); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Hotels
                      </Button>
                    )}
                  </div>
                  {mixHotelEnabled && (
                    <div className="p-4 space-y-4">
                      {hotelArray.fields.map((field, index) => (
                        <HotelRoomRow
                          key={field.id}
                          form={form}
                          index={index}
                          onRemove={() => hotelArray.remove(index)}
                          watchRoom={watchHotelRooms[index]}
                          selectedClient={selectedClient}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => hotelArray.append(defaultHotel(effectiveSettings))}>
                        <Plus className="h-4 w-4 mr-2" /> Add Room
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tours Sub-section */}
                <div className="border-2 border-orange-200 dark:border-orange-900 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 px-4 py-3">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200">🗺 Tours</h3>
                    {mixTourEnabled ? (
                      <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                        onClick={() => { setMixTourEnabled(false); form.setValue("tourItems", []); }}>
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => { setMixTourEnabled(true); form.setValue("tourItems", [defaultTour()]); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Tours
                      </Button>
                    )}
                  </div>
                  {mixTourEnabled && (
                    <div className="p-4 space-y-4">
                      {tourArray.fields.map((field, index) => (
                        <TourItemRow
                          key={field.id}
                          form={form}
                          index={index}
                          onRemove={() => tourArray.remove(index)}
                          watchTour={watchTourItems[index]}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => tourArray.append(defaultTour())}>
                        <Plus className="h-4 w-4 mr-2" /> Add Tour
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mix Panel Grand Total */}
                <div className="border-t-2 pt-4 flex justify-end">
                  <div className="text-sm">
                    Grand Total:{" "}
                    <strong className="text-xl">
                      {(
                        (mixFlightEnabled ? watchFlightPassengers.reduce((s, p) => s + Number(p.total || 0), 0) : 0) +
                        (mixHotelEnabled ? watchHotelRooms.reduce((s, r) => s + Number(r.invoiceAmount || 0), 0) : 0) +
                        (mixTourEnabled ? watchTourItems.reduce((s, t) => s + Number(t.total || 0), 0) : 0)
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle>Additional Notes</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea {...field} value={field.value || ""} rows={4}
                    placeholder="Any specific terms, conditions or notes to display on the invoice..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </form>

      {/* Create New Client Dialog */}
      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Client Name <span className="text-red-500">*</span></Label>
            <Input
              value={newClientForm.name}
              onChange={(e) => setNewClientForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. ACME Corporation"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Point of Contact <span className="text-red-500">*</span></Label>
            <Input
              value={newClientForm.contactPerson}
              onChange={(e) => setNewClientForm((f) => ({ ...f, contactPerson: e.target.value }))}
              placeholder="Primary contact person name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Client Address <span className="text-red-500">*</span></Label>
            <Textarea
              value={newClientForm.address}
              onChange={(e) => setNewClientForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Full client address..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>NTN (Optional)</Label>
              <Input
                value={newClientForm.ntn}
                onChange={(e) => setNewClientForm((f) => ({ ...f, ntn: e.target.value }))}
                placeholder="Tax registration number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Info (Optional)</Label>
              <Input
                value={newClientForm.contactInfo}
                onChange={(e) => setNewClientForm((f) => ({ ...f, contactInfo: e.target.value }))}
                placeholder="Phone or email"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Default Purchase Order (Optional)</Label>
              <Input
                value={newClientForm.defaultPurchaseOrder}
                onChange={(e) => setNewClientForm((f) => ({ ...f, defaultPurchaseOrder: e.target.value }))}
                placeholder="PO number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default PO Date (Optional)</Label>
              <Input
                type="date"
                value={newClientForm.defaultPoDate}
                onChange={(e) => setNewClientForm((f) => ({ ...f, defaultPoDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1.5">
              <Label>Service Charge %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={newClientForm.serviceChargePct}
                onChange={(e) => setNewClientForm((f) => ({ ...f, serviceChargePct: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Applied On</Label>
              <Select
                value={newClientForm.serviceChargeBase}
                onValueChange={(v: "base_fare" | "base_fare_plus_taxes") =>
                  setNewClientForm((f) => ({ ...f, serviceChargeBase: v }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base_fare">Base Fare Only</SelectItem>
                  <SelectItem value="base_fare_plus_taxes">Base Fare + Taxes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select
              value={newClientForm.currency}
              onValueChange={(v) => setNewClientForm((f) => ({ ...f, currency: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PKR","USD","EUR","GBP","AED","SAR","QAR","KWD","OMR","BHD"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setCreateClientOpen(false)}>Cancel</Button>
          <Button
            disabled={createClientMutation.isPending}
            onClick={() => {
              if (!newClientForm.name.trim()) return;
              if (!newClientForm.contactPerson.trim()) return;
              if (!newClientForm.address.trim()) return;
              createClientMutation.mutate(
                {
                  data: {
                    name: newClientForm.name.trim(),
                    address: newClientForm.address || undefined,
                    contactPerson: newClientForm.contactPerson || undefined,
                    contactInfo: newClientForm.contactInfo || undefined,
                    ntn: newClientForm.ntn || undefined,
                    defaultPurchaseOrder: newClientForm.defaultPurchaseOrder || undefined,
                    defaultPoDate: newClientForm.defaultPoDate || undefined,
                    serviceChargePct: Number(newClientForm.serviceChargePct) || 0,
                    serviceChargeBase: newClientForm.serviceChargeBase,
                    currency: newClientForm.currency,
                  },
                },
                {
                  onSuccess: (client) => {
                    qc.invalidateQueries({ queryKey: getListClientsQueryKey({}) });
                    applyClient(client as unknown as Client);
                    setCreateClientOpen(false);
                    setNewClientForm({
                      name: "", contactPerson: "", address: "", ntn: "",
                      defaultPurchaseOrder: "", defaultPoDate: "",
                      contactInfo: "", serviceChargePct: "0",
                      serviceChargeBase: "base_fare", currency: "PKR",
                    });
                  },
                }
              );
            }}
          >
            {createClientMutation.isPending ? "Saving..." : "Save & Select Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </Form>
  );
}

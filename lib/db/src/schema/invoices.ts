import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  clientType: text("client_type").default("corporate"),
  contactPerson: text("contact_person"),
  contactInfo: text("contact_info"),
  ntn: text("ntn"),
  defaultPurchaseOrder: text("default_purchase_order"),
  defaultPoDate: text("default_po_date"),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }).default("0"),
  creditCycleDays: integer("credit_cycle_days").default(30),
  serviceChargePct: numeric("service_charge_pct", { precision: 5, scale: 2 }).default("0"),
  internationalServiceChargePct: numeric("international_service_charge_pct", { precision: 5, scale: 2 }).default("0"),
  serviceChargeBase: text("service_charge_base").default("base_fare"),
  currency: text("currency").default("PKR"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  invoiceNumber: text("invoice_number").notNull(),
  category: text("category").notNull(),
  clientName: text("client_name").notNull(),
  clientAddress: text("client_address"),
  clientNtn: text("client_ntn"),
  pocName: text("poc_name"),
  recipientName: text("recipient_name"),
  purchaseOrder: text("purchase_order"),
  poDate: text("po_date"),
  dealBookingId: text("deal_booking_id"),
  currency: text("currency").notNull().default("PKR"),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  outstandingBalance: numeric("outstanding_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  refundAmount: numeric("refund_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  cancellationCharges: numeric("cancellation_charges", { precision: 15, scale: 2 }).notNull().default("0"),
  otherRetainedCharges: numeric("other_retained_charges", { precision: 15, scale: 2 }).notNull().default("0"),
  modeOfPayment: text("mode_of_payment"),
  convenienceFeeAmount: numeric("convenience_fee_amount", { precision: 15, scale: 2 }).default("0"),
  convenienceFeeRefundable: text("convenience_fee_refundable").default("non_refundable"),
  notes: text("notes"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyNtn: text("company_ntn"),
  companySNtn: text("company_sntn"),
  bankName: text("bank_name"),
  bankAccountTitle: text("bank_account_title"),
  bankAccountNumber: text("bank_account_number"),
  bankSwiftCode: text("bank_swift_code"),
  bankIban: text("bank_iban"),
  logoUrl: text("logo_url"),
  logoPosition: text("logo_position").default("left"),
  flightPassengers: jsonb("flight_passengers"),
  hotelRooms: jsonb("hotel_rooms"),
  tourItems: jsonb("tour_items"),
  nonTravelItems: jsonb("non_travel_items"),
  refundType: text("refund_type"),
  refundPaymentRef: text("refund_payment_ref"),
  refundModeOfPayment: text("refund_mode_of_payment"),
  linkedInvoiceId: integer("linked_invoice_id"),
  linkedInvoiceNumber: text("linked_invoice_number"),
  creditNoteId: integer("credit_note_id"),
  creditAppliedAmount: numeric("credit_applied_amount", { precision: 15, scale: 2 }).default("0"),
  creditAppliedNoteNumber: text("credit_applied_note_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

export const creditNotesTable = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  creditNoteNumber: text("credit_note_number").notNull(),
  clientId: integer("client_id").notNull(),
  clientName: text("client_name").notNull(),
  invoiceId: integer("invoice_id"),
  invoiceNumber: text("invoice_number"),
  type: text("type").notNull().default("excess_payment"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  usedAmount: numeric("used_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  remainingAmount: numeric("remaining_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("PKR"),
  description: text("description"),
  paymentRef: text("payment_ref"),
  refundModeOfPayment: text("refund_mode_of_payment"),
  refundProcessedRef: text("refund_processed_ref"),
  refundProcessedDate: text("refund_processed_date"),
  refundProcessedAmount: numeric("refund_processed_amount", { precision: 15, scale: 2 }),
  refundProcessedNotes: text("refund_processed_notes"),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCreditNoteSchema = createInsertSchema(creditNotesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCreditNote = z.infer<typeof insertCreditNoteSchema>;
export type CreditNote = typeof creditNotesTable.$inferSelect;

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  defaultCurrency: text("default_currency").notNull().default("PKR"),
  defaultServiceFeePct: numeric("default_service_fee_pct", { precision: 5, scale: 2 }).notNull().default("5"),
  defaultServiceFeeBase: text("default_service_fee_base").notNull().default("base_fare"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyNtn: text("company_ntn"),
  companySNtn: text("company_sntn"),
  bankName: text("bank_name"),
  bankAccountTitle: text("bank_account_title"),
  bankAccountNumber: text("bank_account_number"),
  bankSwiftCode: text("bank_swift_code"),
  bankIban: text("bank_iban"),
  logoUrl: text("logo_url"),
  logoPosition: text("logo_position").default("left"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;

import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { db, clientsTable, invoicesTable } from "@workspace/db";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function stripNulls(obj: unknown): unknown {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => [k, stripNulls(v)])
        .filter(([, v]) => v !== undefined)
    );
  }
  return obj;
}

function toClient(row: typeof clientsTable.$inferSelect) {
  return {
    ...row,
    contactPerson: row.contactPerson ?? undefined,
    ntn: row.ntn ?? undefined,
    defaultPurchaseOrder: row.defaultPurchaseOrder ?? undefined,
    defaultPoDate: row.defaultPoDate ?? undefined,
    creditLimit: row.creditLimit !== null ? Number(row.creditLimit) : 0,
    creditCycleDays: row.creditCycleDays ?? 30,
    serviceChargePct: row.serviceChargePct !== null ? Number(row.serviceChargePct) : 0,
    internationalServiceChargePct: (row as any).internationalServiceChargePct !== null && (row as any).internationalServiceChargePct !== undefined ? Number((row as any).internationalServiceChargePct) : 0,
    serviceChargeBase: row.serviceChargeBase ?? "base_fare",
    currency: row.currency ?? "PKR",
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

router.get("/clients", async (req, res) => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const { search } = parsed.data;
  const where = search ? ilike(clientsTable.name, `%${search}%`) : undefined;

  const rows = await db
    .select()
    .from(clientsTable)
    .where(where)
    .orderBy(desc(clientsTable.createdAt));

  res.json({ clients: rows.map(toClient), total: rows.length });
});

router.post("/clients", async (req, res) => {
  const parsed = CreateClientBody.safeParse(stripNulls(req.body));
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });

  const [row] = await db
    .insert(clientsTable)
    .values({
      name: parsed.data.name,
      clientType: parsed.data.clientType ?? "corporate",
      address: parsed.data.address ?? null,
      contactPerson: parsed.data.contactPerson ?? null,
      contactInfo: parsed.data.contactInfo ?? null,
      ntn: parsed.data.ntn ?? null,
      defaultPurchaseOrder: parsed.data.defaultPurchaseOrder ?? null,
      defaultPoDate: parsed.data.defaultPoDate ?? null,
      creditLimit: parsed.data.creditLimit !== undefined ? String(parsed.data.creditLimit) : "0",
      creditCycleDays: parsed.data.creditCycleDays ?? 30,
      serviceChargePct: parsed.data.serviceChargePct !== undefined ? String(parsed.data.serviceChargePct) : "0",
      internationalServiceChargePct: parsed.data.internationalServiceChargePct !== undefined ? String(parsed.data.internationalServiceChargePct) : "0",
      serviceChargeBase: parsed.data.serviceChargeBase ?? "base_fare",
      currency: parsed.data.currency ?? "PKR",
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(toClient(row));
});

router.get("/clients/:id", async (req, res) => {
  const parsed = GetClientParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, parsed.data.id));

  if (!client) return res.status(404).json({ error: "Client not found" });

  const linkedInvoices = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      category: invoicesTable.category,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
      paymentStatus: invoicesTable.paymentStatus,
      totalAmount: invoicesTable.totalAmount,
      paidAmount: invoicesTable.paidAmount,
      outstandingBalance: invoicesTable.outstandingBalance,
      currency: invoicesTable.currency,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.clientId, parsed.data.id))
    .orderBy(desc(invoicesTable.createdAt));

  const invoices = linkedInvoices.map((inv) => ({
    ...inv,
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    outstandingBalance: Number(inv.outstandingBalance),
  }));

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.outstandingBalance, 0);

  res.json({
    ...toClient(client),
    invoices,
    totalInvoiced,
    totalPaid,
    totalOutstanding,
  });
});

router.put("/clients/:id", async (req, res) => {
  const paramsParsed = UpdateClientParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateClientBody.safeParse(stripNulls(req.body));
  if (!bodyParsed.success) return res.status(400).json({ error: "Validation failed", details: bodyParsed.error.issues });

  const data = bodyParsed.data;
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.clientType !== undefined) update.clientType = data.clientType;
  if (data.address !== undefined) update.address = data.address;
  if (data.contactPerson !== undefined) update.contactPerson = data.contactPerson;
  if (data.contactInfo !== undefined) update.contactInfo = data.contactInfo;
  if (data.ntn !== undefined) update.ntn = data.ntn;
  if (data.defaultPurchaseOrder !== undefined) update.defaultPurchaseOrder = data.defaultPurchaseOrder;
  if (data.defaultPoDate !== undefined) update.defaultPoDate = data.defaultPoDate;
  if (data.creditLimit !== undefined) update.creditLimit = String(data.creditLimit);
  if (data.creditCycleDays !== undefined) update.creditCycleDays = data.creditCycleDays;
  if (data.serviceChargePct !== undefined) update.serviceChargePct = String(data.serviceChargePct);
  if (data.internationalServiceChargePct !== undefined) update.internationalServiceChargePct = String(data.internationalServiceChargePct);
  if (data.serviceChargeBase !== undefined) update.serviceChargeBase = data.serviceChargeBase;
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.notes !== undefined) update.notes = data.notes;

  const [row] = await db
    .update(clientsTable)
    .set(update)
    .where(eq(clientsTable.id, paramsParsed.data.id))
    .returning();

  if (!row) return res.status(404).json({ error: "Client not found" });
  res.json(toClient(row));
});

router.delete("/clients/:id", async (req, res) => {
  const parsed = DeleteClientParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(clientsTable).where(eq(clientsTable.id, parsed.data.id));
  res.json({ success: true });
});

export default router;

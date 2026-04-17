import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { db, creditNotesTable, clientsTable, pool } from "@workspace/db";
import {
  ListCreditNotesQueryParams,
  CreateCreditNoteBody,
  GetCreditNoteParams,
  UpdateCreditNoteParams,
  UpdateCreditNoteBody,
  DeleteCreditNoteParams,
  ApplyCreditNoteParams,
  ApplyCreditNoteBody,
  ClientCreditBalanceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toCreditNote(row: typeof creditNotesTable.$inferSelect) {
  return {
    ...row,
    amount: Number(row.amount),
    usedAmount: Number(row.usedAmount),
    remainingAmount: Number(row.remainingAmount),
    invoiceId: row.invoiceId ?? undefined,
    invoiceNumber: row.invoiceNumber ?? undefined,
    description: row.description ?? undefined,
    paymentRef: row.paymentRef ?? undefined,
    refundModeOfPayment: row.refundModeOfPayment ?? undefined,
    refundProcessedRef: row.refundProcessedRef ?? undefined,
    refundProcessedDate: row.refundProcessedDate ?? undefined,
    refundProcessedAmount: row.refundProcessedAmount != null ? Number(row.refundProcessedAmount) : undefined,
    refundProcessedNotes: row.refundProcessedNotes ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

async function generateCreditNoteNumber(): Promise<string> {
  const result = await db
    .select({ maxNum: sql<string>`MAX(credit_note_number)` })
    .from(creditNotesTable);
  const maxNum = result[0]?.maxNum;
  if (!maxNum) return "CN-0001";
  const currentNum = parseInt(maxNum.replace("CN-", ""), 10);
  return `CN-${String((isNaN(currentNum) ? 0 : currentNum) + 1).padStart(4, "0")}`;
}

router.get("/credit-notes", async (req, res) => {
  const parsed = ListCreditNotesQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const { search, clientId, status } = parsed.data;
  const conditions = [];
  if (search) conditions.push(ilike(creditNotesTable.clientName, `%${search}%`));
  if (clientId) conditions.push(eq(creditNotesTable.clientId, clientId));
  if (status) conditions.push(eq(creditNotesTable.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(creditNotesTable)
    .where(where)
    .orderBy(desc(creditNotesTable.createdAt));

  res.json({ creditNotes: rows.map(toCreditNote), total: rows.length });
});

router.post("/credit-notes", async (req, res) => {
  const parsed = CreateCreditNoteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body", details: parsed.error.issues });

  const data = parsed.data;

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, data.clientId));

  if (!client) {
    return res.status(400).json({ error: "Client not found" });
  }

  const creditNoteNumber = await generateCreditNoteNumber();

  const [row] = await db
    .insert(creditNotesTable)
    .values({
      creditNoteNumber,
      clientId: data.clientId,
      clientName: client.name,
      invoiceId: data.invoiceId ?? null,
      invoiceNumber: data.invoiceNumber ?? null,
      type: data.type,
      amount: String(data.amount),
      usedAmount: "0",
      remainingAmount: String(data.amount),
      currency: data.currency,
      description: data.description ?? null,
      paymentRef: data.paymentRef ?? null,
      refundModeOfPayment: data.refundModeOfPayment ?? null,
      status: "available",
    })
    .returning();

  res.status(201).json(toCreditNote(row));
});

router.get("/credit-notes/:id", async (req, res) => {
  const parsed = GetCreditNoteParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });

  const [row] = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.id, parsed.data.id));

  if (!row) return res.status(404).json({ error: "Credit note not found" });
  res.json(toCreditNote(row));
});

router.put("/credit-notes/:id", async (req, res) => {
  const paramsParsed = UpdateCreditNoteParams.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid params" });

  const bodyParsed = UpdateCreditNoteBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid body" });

  const { description, status, refundProcessedRef, refundProcessedDate, refundProcessedAmount, refundProcessedNotes, clearRefund } = bodyParsed.data;

  const [existing] = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.id, paramsParsed.data.id));
  if (!existing) return res.status(404).json({ error: "Credit note not found" });

  if (status === "voided" && Number(existing.usedAmount) > 0) {
    return res.status(400).json({ error: "Cannot void a credit note that has been partially or fully used" });
  }

  const updateData: Record<string, unknown> = {};
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;

  // Clear all refund fields and reset status
  if (clearRefund) {
    updateData.refundProcessedRef = null;
    updateData.refundProcessedDate = null;
    updateData.refundProcessedAmount = null;
    updateData.refundProcessedNotes = null;
    const alreadyUsed = Number(existing.usedAmount);
    const cnAmount = Number(existing.amount);
    if (alreadyUsed <= 0) {
      updateData.status = "available";
      updateData.remainingAmount = String(cnAmount);
    } else if (alreadyUsed >= cnAmount) {
      updateData.status = "fully_used";
      updateData.remainingAmount = "0";
    } else {
      updateData.status = "partially_used";
      updateData.remainingAmount = String(cnAmount - alreadyUsed);
    }
  } else {
    if (refundProcessedRef !== undefined) updateData.refundProcessedRef = refundProcessedRef ?? null;
    if (refundProcessedDate !== undefined) updateData.refundProcessedDate = refundProcessedDate ?? null;
    if (refundProcessedAmount !== undefined) {
      if (refundProcessedAmount === null) {
        updateData.refundProcessedAmount = null;
      } else {
        updateData.refundProcessedAmount = String(refundProcessedAmount);
        const cnAmount = Number(existing.amount);
        const alreadyUsed = Number(existing.usedAmount);
        const newRemaining = Math.max(0, cnAmount - alreadyUsed - refundProcessedAmount);
        if (refundProcessedAmount >= cnAmount - alreadyUsed) {
          updateData.status = "fully_refunded";
          updateData.remainingAmount = "0";
        } else {
          updateData.status = "partially_available";
          updateData.remainingAmount = String(newRemaining);
        }
      }
    }
    if (refundProcessedNotes !== undefined) updateData.refundProcessedNotes = refundProcessedNotes ?? null;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const [row] = await db
    .update(creditNotesTable)
    .set(updateData)
    .where(eq(creditNotesTable.id, paramsParsed.data.id))
    .returning();

  res.json(toCreditNote(row));
});

router.delete("/credit-notes/:id", async (req, res) => {
  const parsed = DeleteCreditNoteParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });

  const [existing] = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.id, parsed.data.id));
  if (!existing) return res.status(404).json({ error: "Credit note not found" });

  if (Number(existing.usedAmount) > 0) {
    return res.status(400).json({ error: "Cannot delete a credit note that has been used" });
  }

  await db.delete(creditNotesTable).where(eq(creditNotesTable.id, parsed.data.id));
  res.json({ success: true });
});

router.post("/credit-notes/:id/apply", async (req, res) => {
  const paramsParsed = ApplyCreditNoteParams.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid params" });

  const bodyParsed = ApplyCreditNoteBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid body" });

  const cnId = paramsParsed.data.id;
  const applyAmount = bodyParsed.data.amount;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lockResult = await client.query(
      "SELECT * FROM credit_notes WHERE id = $1 FOR UPDATE",
      [cnId]
    );
    if (lockResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Credit note not found" });
    }

    const cn = lockResult.rows[0];
    if (cn.status === "voided" || cn.status === "fully_used" || cn.status === "fully_refunded") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Credit note is not available for use" });
    }

    const remaining = Number(cn.remaining_amount);
    if (applyAmount > remaining) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Amount exceeds remaining credit of ${remaining}` });
    }

    const newUsed = Number(cn.used_amount) + applyAmount;
    const newRemaining = remaining - applyAmount;
    const newStatus = newRemaining <= 0 ? "fully_used" : "partially_used";

    await client.query(
      `UPDATE credit_notes SET used_amount = $1, remaining_amount = $2, status = $3, updated_at = NOW() WHERE id = $4`,
      [String(newUsed), String(newRemaining), newStatus, cnId]
    );

    await client.query("COMMIT");

    const [row] = await db
      .select()
      .from(creditNotesTable)
      .where(eq(creditNotesTable.id, cnId));

    res.json(toCreditNote(row));
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.get("/clients/:clientId/credit-balance", async (req, res) => {
  const parsed = ClientCreditBalanceParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });

  const rows = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.clientId, parsed.data.clientId))
    .orderBy(desc(creditNotesTable.createdAt));

  const totalCredit = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const usedCredit = rows.reduce((sum, r) => sum + Number(r.usedAmount), 0);
  const availableCredit = rows.reduce((sum, r) => sum + Number(r.remainingAmount), 0);

  res.json({
    totalCredit,
    usedCredit,
    availableCredit,
    creditNotes: rows.map(toCreditNote),
  });
});

export default router;

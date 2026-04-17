import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatSettings(row: typeof settingsTable.$inferSelect) {
  return {
    ...row,
    defaultServiceFeePct: parseFloat(String(row.defaultServiceFeePct)),
  };
}

// Get settings (returns first row, creates default if none)
router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);

  if (!settings) {
    [settings] = await db
      .insert(settingsTable)
      .values({
        defaultCurrency: "PKR",
        defaultServiceFeePct: "5",
        defaultServiceFeeBase: "base_fare",
      })
      .returning();
  }

  res.json(formatSettings(settings));
});

// Update settings
router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  // Ensure settings row exists
  let [existing] = await db.select().from(settingsTable).limit(1);
  if (!existing) {
    [existing] = await db
      .insert(settingsTable)
      .values({
        defaultCurrency: "PKR",
        defaultServiceFeePct: "5",
        defaultServiceFeeBase: "base_fare",
      })
      .returning();
  }

  const data = parsed.data;
  const updateData: Partial<typeof settingsTable.$inferInsert> = {};

  if (data.defaultCurrency !== undefined) updateData.defaultCurrency = data.defaultCurrency;
  if (data.defaultServiceFeePct !== undefined) updateData.defaultServiceFeePct = String(data.defaultServiceFeePct);
  if (data.defaultServiceFeeBase !== undefined) updateData.defaultServiceFeeBase = data.defaultServiceFeeBase;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.companyAddress !== undefined) updateData.companyAddress = data.companyAddress;
  if (data.companyPhone !== undefined) updateData.companyPhone = data.companyPhone;
  if (data.companyNtn !== undefined) updateData.companyNtn = data.companyNtn;
  if (data.companySNtn !== undefined) updateData.companySNtn = data.companySNtn;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.bankAccountTitle !== undefined) updateData.bankAccountTitle = data.bankAccountTitle;
  if (data.bankAccountNumber !== undefined) updateData.bankAccountNumber = data.bankAccountNumber;
  if (data.bankSwiftCode !== undefined) updateData.bankSwiftCode = data.bankSwiftCode;
  if (data.bankIban !== undefined) updateData.bankIban = data.bankIban;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.logoPosition !== undefined) updateData.logoPosition = data.logoPosition;

  const [updated] = await db
    .update(settingsTable)
    .set(updateData)
    .returning();

  res.json(formatSettings(updated));
});

export default router;

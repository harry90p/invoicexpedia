import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, invoicesTable } from "@workspace/db";

const router: IRouter = Router();

// Get report summary
router.get("/reports/summary", async (_req, res): Promise<void> => {
  const [countStats] = await db
    .select({
      totalInvoices: sql<number>`count(*)`,
      totalAmount: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
      paidAmount: sql<number>`coalesce(sum(paid_amount::numeric), 0)`,
      outstandingAmount: sql<number>`coalesce(sum(outstanding_balance::numeric), 0)`,
      paidCount: sql<number>`count(*) filter (where payment_status = 'paid')`,
      unpaidCount: sql<number>`count(*) filter (where payment_status = 'unpaid')`,
      partialCount: sql<number>`count(*) filter (where payment_status = 'partial')`,
    })
    .from(invoicesTable);

  const categoryStats = await db
    .select({
      category: invoicesTable.category,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
    })
    .from(invoicesTable)
    .groupBy(invoicesTable.category);

  const recentActivity = await db
    .select()
    .from(invoicesTable)
    .orderBy(desc(invoicesTable.createdAt))
    .limit(5);

  const byCategory: Record<string, { count: number; total: number }> = {};
  for (const stat of categoryStats) {
    byCategory[stat.category] = {
      count: Number(stat.count),
      total: Number(stat.total),
    };
  }

  res.json({
    totalInvoices: Number(countStats?.totalInvoices ?? 0),
    totalAmount: Number(countStats?.totalAmount ?? 0),
    paidAmount: Number(countStats?.paidAmount ?? 0),
    outstandingAmount: Number(countStats?.outstandingAmount ?? 0),
    paidCount: Number(countStats?.paidCount ?? 0),
    unpaidCount: Number(countStats?.unpaidCount ?? 0),
    partialCount: Number(countStats?.partialCount ?? 0),
    byCategory,
    recentActivity: recentActivity.map((row) => ({
      ...row,
      totalAmount: parseFloat(String(row.totalAmount)),
      paidAmount: parseFloat(String(row.paidAmount)),
      outstandingBalance: parseFloat(String(row.outstandingBalance)),
      refundAmount: parseFloat(String(row.refundAmount)),
      flightPassengers: row.flightPassengers ?? [],
      hotelRooms: row.hotelRooms ?? [],
      tourItems: row.tourItems ?? [],
      nonTravelItems: row.nonTravelItems ?? [],
    })),
  });
});

// Get outstanding invoices
router.get("/reports/outstanding", async (_req, res): Promise<void> => {
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.paymentStatus, "unpaid"))
    .orderBy(desc(invoicesTable.outstandingBalance));

  res.json(
    invoices.map((row) => ({
      ...row,
      totalAmount: parseFloat(String(row.totalAmount)),
      paidAmount: parseFloat(String(row.paidAmount)),
      outstandingBalance: parseFloat(String(row.outstandingBalance)),
      refundAmount: parseFloat(String(row.refundAmount)),
      flightPassengers: row.flightPassengers ?? [],
      hotelRooms: row.hotelRooms ?? [],
      tourItems: row.tourItems ?? [],
      nonTravelItems: row.nonTravelItems ?? [],
    }))
  );
});

export default router;

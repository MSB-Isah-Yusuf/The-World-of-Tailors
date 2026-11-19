import { describe, expect, it, vi } from "vitest";
import {
  createBookingReturningId,
  customerBookingDetailLegacySelect,
  customerBookingListLegacySelect,
  findTailorDashboardBookings,
  tailorBookingListLegacySelect,
} from "@/lib/bookings/schema-compat";

const financialMigrationFields = [
  "agreedAmountMinor",
  "depositAmountMinor",
  "fulfillmentConfirmedAt",
  "fulfillmentConfirmedByUserId",
  "quoteAcceptedAt",
  "quoteDetails",
  "quoteExpiresAt",
  "quoteStatus",
];

describe("booking compatibility before the financial-core migration", () => {
  it("creates a booking but asks Prisma to return only its legacy id", async () => {
    const data = {
      reference: "SC-2026-ABC123",
      customerId: "customer-1",
      tailorId: "tailor-1",
      description: "Use the submitted measurements",
      status: "REQUESTED",
      measurementSnapshot: { chest: 40 },
      agreedPrice: null,
    } as any;
    const create = vi.fn().mockResolvedValue({ id: "booking-1" });

    const result = await createBookingReturningId({ create } as any, data);

    expect(result).toEqual({ id: "booking-1" });
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({ data, select: { id: true } });
  });

  it("uses only pre-migration fields for customer and tailor fallback projections", () => {
    for (const projection of [
      customerBookingListLegacySelect,
      customerBookingDetailLegacySelect,
      tailorBookingListLegacySelect,
    ]) {
      for (const field of financialMigrationFields) {
        expect(projection).not.toHaveProperty(field);
      }
    }
    expect(tailorBookingListLegacySelect).toHaveProperty("measurementSnapshot", true);
  });

  it("retries a missing-column tailor-list query with the legacy projection", async () => {
    const legacyRows = [{ id: "booking-1", reference: "SC-2026-ABC123", measurementSnapshot: { chest: 40 } }];
    const findMany = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("column does not exist"), { code: "P2022" }))
      .mockResolvedValueOnce(legacyRows);
    const query = {
      where: { tailorId: "tailor-1" },
      orderBy: { updatedAt: "desc" },
      skip: 0,
      take: 12,
    };

    const result = await findTailorDashboardBookings({ findMany } as any, query as any);

    expect(result).toEqual({ bookings: legacyRows, financialSchemaReady: false });
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenNthCalledWith(1, {
      ...query,
      include: {
        customer: { select: { name: true, email: true } },
        design: { select: { title: true, slug: true } },
      },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      ...query,
      select: tailorBookingListLegacySelect,
    });
  });

  it("does not hide unrelated tailor-list query failures as schema drift", async () => {
    const databaseError = Object.assign(new Error("database unavailable"), { code: "P1001" });
    const findMany = vi.fn().mockRejectedValue(databaseError);

    await expect(findTailorDashboardBookings({ findMany } as any, {
      where: { tailorId: "tailor-1" },
      orderBy: { updatedAt: "desc" },
      skip: 0,
      take: 12,
    } as any)).rejects.toBe(databaseError);
    expect(findMany).toHaveBeenCalledOnce();
  });
});

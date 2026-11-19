import type { Prisma, PrismaClient } from "@prisma/client";

/** Fields that existed before the separately deployed financial-core migration. */
export const customerBookingListLegacySelect = {
  id: true,
  reference: true,
  status: true,
  description: true,
  agreedPrice: true,
  createdAt: true,
  tailor: { select: { businessName: true, city: true, slug: true } },
  design: { select: { title: true, slug: true } },
} satisfies Prisma.TailoringBookingSelect;

export const customerBookingDetailLegacySelect = {
  id: true,
  reference: true,
  customerId: true,
  tailorId: true,
  designId: true,
  description: true,
  status: true,
  estimatedCompletion: true,
  agreedPrice: true,
  paymentStatus: true,
  tailor: { select: { businessName: true, slug: true } },
  design: { select: { title: true, slug: true } },
  statusHistory: { orderBy: { createdAt: "asc" } },
  notes: { orderBy: { createdAt: "desc" }, take: 5 },
} satisfies Prisma.TailoringBookingSelect;

export const tailorBookingListLegacySelect = {
  id: true,
  reference: true,
  description: true,
  status: true,
  estimatedCompletion: true,
  updatedAt: true,
  measurementSnapshot: true,
  customer: { select: { name: true, email: true } },
  design: { select: { title: true, slug: true } },
} satisfies Prisma.TailoringBookingSelect;

const bookingCreateIdSelect = { id: true } satisfies Prisma.TailoringBookingSelect;

type TailoringBookingCreateDelegate = Pick<PrismaClient["tailoringBooking"], "create">;
type TailoringBookingFindManyDelegate = Pick<PrismaClient["tailoringBooking"], "findMany">;
type TailorBookingPageQuery = Pick<
  Prisma.TailoringBookingFindManyArgs,
  "where" | "orderBy" | "skip" | "take"
>;

/** Avoid Prisma's default all-scalar create response, which reads post-migration columns. */
export function createBookingReturningId(
  delegate: TailoringBookingCreateDelegate,
  data: Prisma.TailoringBookingUncheckedCreateInput,
) {
  return delegate.create({ data, select: bookingCreateIdSelect });
}

export function isPrismaMissingColumnError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "P2022";
}

/**
 * Try the financial-schema query first, then retry with only pre-migration fields
 * when Prisma reports a missing database column. Other failures still propagate.
 */
export async function findTailorDashboardBookings(
  delegate: TailoringBookingFindManyDelegate,
  query: TailorBookingPageQuery,
): Promise<{ bookings: any[]; financialSchemaReady: boolean }> {
  try {
    const bookings = await delegate.findMany({
      ...query,
      include: {
        customer: { select: { name: true, email: true } },
        design: { select: { title: true, slug: true } },
      },
    });
    return { bookings, financialSchemaReady: true };
  } catch (error) {
    if (!isPrismaMissingColumnError(error)) throw error;
    const bookings = await delegate.findMany({
      ...query,
      select: tailorBookingListLegacySelect,
    });
    return { bookings, financialSchemaReady: false };
  }
}

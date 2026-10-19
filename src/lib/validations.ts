import { z } from "zod";
export const bookingStatusTransition = {
  REQUESTED: ["ACCEPTED","DECLINED","CANCELLED"],
  ACCEPTED: ["IN_PRODUCTION","ON_HOLD","CANCELLED"],
  IN_PRODUCTION: ["READY","ON_HOLD","CANCELLED"],
  READY: ["COMPLETED","ON_HOLD"],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
  ON_HOLD: ["ACCEPTED","IN_PRODUCTION","CANCELLED"]
} as const;
export function canTransitionBooking(from: string, to: string) {
  const allowed = (bookingStatusTransition as any)[from] as string[] | undefined;
  return allowed?.includes(to);
}
export const fabricOrderTransition = {
  PENDING: ["CONFIRMED","CANCELLED"],
  CONFIRMED: ["PREPARING","CANCELLED"],
  PREPARING: ["READY_FOR_DISPATCH","CANCELLED"],
  READY_FOR_DISPATCH: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED","FAILED_DELIVERY"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED_DELIVERY: ["IN_TRANSIT","CANCELLED"]
} as const;
export const measurementSchema = z.object({
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  shoulder: z.number().positive().optional(),
  sleeve: z.number().positive().optional(),
  unit: z.enum(["cm","in"])
});

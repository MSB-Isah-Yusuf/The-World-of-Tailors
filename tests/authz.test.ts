import { describe, expect, it } from "vitest";
import { canTransitionBooking, fabricOrderTransition } from "@/lib/validations";

describe("Tailoring booking state machine", () => {
  it("allows request acceptance/decline/cancellation and rejects jumps", () => {
    expect(canTransitionBooking("REQUESTED", "ACCEPTED")).toBe(true);
    expect(canTransitionBooking("REQUESTED", "DECLINED")).toBe(true);
    expect(canTransitionBooking("REQUESTED", "CANCELLED")).toBe(true);
    expect(canTransitionBooking("REQUESTED", "COMPLETED")).toBe(false);
    expect(canTransitionBooking("REQUESTED", "IN_PRODUCTION")).toBe(false);
  });

  it("requires the production and ready stages before completion", () => {
    expect(canTransitionBooking("ACCEPTED", "IN_PRODUCTION")).toBe(true);
    expect(canTransitionBooking("ACCEPTED", "COMPLETED")).toBe(false);
    expect(canTransitionBooking("IN_PRODUCTION", "READY")).toBe(true);
    expect(canTransitionBooking("READY", "COMPLETED")).toBe(true);
    expect(canTransitionBooking("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("keeps hold recovery paths explicit", () => {
    expect(canTransitionBooking("ON_HOLD", "ACCEPTED")).toBe(true);
    expect(canTransitionBooking("ON_HOLD", "IN_PRODUCTION")).toBe(true);
    expect(canTransitionBooking("ON_HOLD", "CANCELLED")).toBe(true);
    expect(canTransitionBooking("ON_HOLD", "COMPLETED")).toBe(false);
  });
});

describe("Fabric order state machine", () => {
  it("requires the confirmed fulfillment chain", () => {
    expect(fabricOrderTransition.PENDING).toContain("CONFIRMED");
    expect(fabricOrderTransition.CONFIRMED).toContain("PREPARING");
    expect(fabricOrderTransition.PREPARING).toContain("READY_FOR_DISPATCH");
    expect(fabricOrderTransition.READY_FOR_DISPATCH).toContain("IN_TRANSIT");
    expect(fabricOrderTransition.IN_TRANSIT).toContain("DELIVERED");
  });

  it("keeps delivered and cancelled terminal", () => {
    expect(fabricOrderTransition.DELIVERED).toEqual([]);
    expect(fabricOrderTransition.CANCELLED).toEqual([]);
  });
});

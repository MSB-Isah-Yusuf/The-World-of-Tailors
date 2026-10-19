import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Role = "CUSTOMER" | "TAILOR" | "FABRIC_SELLER" | "ADMIN";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}
export async function requireRole(roles: Role[]) {
  const session = await requireAuth();
  const role = (session.user as any).role as Role;
  if (!roles.includes(role)) redirect(`/dashboard/${role.toLowerCase().replace('_','')}`.replace('fabricseller','seller') || "/");
  return session;
}
export function assertOwnership(ownerId: string, actorId: string) {
  if (ownerId !== actorId) throw new Error("FORBIDDEN: not owner");
}
export const roleHome: Record<string,string> = {
  CUSTOMER: "/dashboard/customer",
  TAILOR: "/dashboard/tailor",
  FABRIC_SELLER: "/dashboard/seller",
  ADMIN: "/admin"
};

import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "./session";
import { ADMIN_PRNS } from "./constants";

export type User = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return result[0] ?? null;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (!ADMIN_PRNS.has(user.pesuprn)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function isAdmin(user: User): boolean {
  return ADMIN_PRNS.has(user.pesuprn);
}
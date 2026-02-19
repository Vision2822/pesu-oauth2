"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { loginAndGetProfile } from "@/lib/pesu-auth";
import { loginLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await loginLimit.limit(ip);
  if (!success) {
    return { error: "Too many login attempts. Try again later." };
  }

  const result = await loginAndGetProfile(username, password);

  if (!result.success || !result.profile) {
    return { error: result.error ?? "Login failed." };
  }

  const prn = (result.profile.prn ?? username).toLowerCase();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.pesuprn, prn))
    .limit(1);

  let userId: number;

  if (existing.length > 0) {
    const merged = {
      ...((existing[0].profileData as Record<string, unknown>) ?? {}),
      ...result.profile,
    };
    await db
      .update(users)
      .set({ profileData: merged })
      .where(eq(users.id, existing[0].id));
    userId = existing[0].id;
  } else {
    const inserted = await db
      .insert(users)
      .values({ pesuprn: prn, profileData: result.profile })
      .returning({ id: users.id });
    userId = inserted[0].id;
  }

  const session = await getSession();
  session.userId = userId;
  await session.save();

  let redirectTo = "/";
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    redirectTo = next;
  }

  redirect(redirectTo);
}
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { oauth2Tokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getSession();

  if (session.userId) {

    await db
      .update(oauth2Tokens)
      .set({ revoked: true })
      .where(eq(oauth2Tokens.userId, session.userId));
  }

  session.destroy();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!));
}

export async function GET() {
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!));
}
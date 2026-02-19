import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
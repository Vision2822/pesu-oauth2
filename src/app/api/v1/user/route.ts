import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/oauth2/tokens";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiLimit } from "@/lib/rate-limit";
import { corsHeaders, handlePreflight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function GET(request: NextRequest) {
  const cors = corsHeaders(request);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await apiLimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "rate_limit", message: "Too many requests" },
      { status: 429, headers: cors }
    );
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "invalid_token", message: "Missing or malformed Authorization header" },
      { status: 401, headers: cors }
    );
  }

  const tokenString = auth.slice(7);
  const token = await validateAccessToken(tokenString);

  if (!token) {
    return NextResponse.json(
      { error: "invalid_token", message: "Token is invalid or expired" },
      { status: 401, headers: cors }
    );
  }

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, token.userId))
    .limit(1);

  if (userResult.length === 0) {
    return NextResponse.json(
      { error: "invalid_token", message: "User not found" },
      { status: 401, headers: cors }
    );
  }

  const profile = (userResult[0].profileData ?? {}) as Record<string, unknown>;
  const tokenScopes = (token.scope ?? "").split(" ");
  const grantedFields = (token.grantedFields ?? {}) as Record<string, string[]>;
  const response: Record<string, unknown> = {};

  for (const scope of tokenScopes) {
    const fields = grantedFields[scope];
    if (!fields) continue;
    for (const field of fields) {
      if (field in profile) {
        response[field] = profile[field];
      }
    }
  }

  if (Object.keys(response).length === 0) {
    return NextResponse.json(
      { error: "insufficient_scope", message: "No data available with granted permissions" },
      { status: 403, headers: cors }
    );
  }

  return NextResponse.json(response, {
    headers: {
      ...cors,
      "Cache-Control": "no-store",
    },
  });
}
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { oauth2Tokens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const ACCESS_TOKEN_LENGTH = 48;
const REFRESH_TOKEN_LENGTH = 48;
const ACCESS_TOKEN_TTL = 3600;

interface TokenPayload {
  userId: number;
  clientId: string;
  scope: string;
  grantedFields: Record<string, string[]> | null;
}

export async function issueTokenPair(payload: TokenPayload) {
  const accessToken = nanoid(ACCESS_TOKEN_LENGTH);
  const refreshToken = nanoid(REFRESH_TOKEN_LENGTH);
  const now = Math.floor(Date.now() / 1000);

  await db.insert(oauth2Tokens).values({
    userId: payload.userId,
    clientId: payload.clientId,
    accessToken,
    refreshToken,
    scope: payload.scope,
    grantedFields: payload.grantedFields,
    issuedAt: now,
    expiresIn: ACCESS_TOKEN_TTL,
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    refresh_token: refreshToken,
    scope: payload.scope,
  };
}

export async function validateAccessToken(token: string) {
  const result = await db
    .select()
    .from(oauth2Tokens)
    .where(
      and(eq(oauth2Tokens.accessToken, token), eq(oauth2Tokens.revoked, false))
    )
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  const now = Math.floor(Date.now() / 1000);

  if (row.issuedAt + row.expiresIn < now) return null;

  return row;
}

export async function validateRefreshToken(token: string) {

  const claimed = await db
    .update(oauth2Tokens)
    .set({ revoked: true })
    .where(
      and(
        eq(oauth2Tokens.refreshToken, token),
        eq(oauth2Tokens.revoked, false)
      )
    )
    .returning();

  if (claimed.length === 0) {

    const existing = await db
      .select()
      .from(oauth2Tokens)
      .where(eq(oauth2Tokens.refreshToken, token))
      .limit(1);

    if (existing.length > 0 && existing[0].revoked) {

      await db
        .update(oauth2Tokens)
        .set({ revoked: true })
        .where(
          and(
            eq(oauth2Tokens.clientId, existing[0].clientId),
            eq(oauth2Tokens.userId, existing[0].userId)
          )
        );
    }

    return null;
  }

  const row = claimed[0];
  const now = Math.floor(Date.now() / 1000);
  const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; 

  if (row.issuedAt + REFRESH_TOKEN_TTL < now) return null;

  return row;
}

export async function revokeToken(id: number) {
  await db
    .update(oauth2Tokens)
    .set({ revoked: true })
    .where(eq(oauth2Tokens.id, id));
}
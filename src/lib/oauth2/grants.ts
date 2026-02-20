import { db } from "@/lib/db";
import {
  oauth2Clients,
  oauth2AuthorizationCodes,
  oauth2Tokens,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { verifyCodeChallenge } from "./pkce";
import {
  issueTokenPair,
  validateRefreshToken,
  revokeToken,
} from "./tokens";

const CODE_LENGTH = 48;
const CODE_TTL = 600;

export async function getClient(clientId: string) {
  const result = await db
    .select()
    .from(oauth2Clients)
    .where(eq(oauth2Clients.clientId, clientId))
    .limit(1);
  return result[0] ?? null;
}

export async function createAuthorizationCode(params: {
  userId: number;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  grantedFields: Record<string, string[]>;
}) {
  const code = nanoid(CODE_LENGTH);
  const now = Math.floor(Date.now() / 1000);

  await db.insert(oauth2AuthorizationCodes).values({
    userId: params.userId,
    clientId: params.clientId,
    code,
    redirectUri: params.redirectUri,
    scope: params.scope,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    grantedFields: params.grantedFields,
    expiresAt: now + CODE_TTL,
  });

  return code;
}

interface TokenRequest {
  grant_type: string;
  code?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret?: string;
  code_verifier?: string;
  refresh_token?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface TokenError {
  error: string;
  error_description: string;
}

export async function handleTokenRequest(
  params: TokenRequest
): Promise<{ data: TokenResponse; status: 200 } | { data: TokenError; status: 400 | 401 }> {
  const client = await getClient(params.client_id);
  if (!client) {
    return {
      data: { error: "invalid_client", error_description: "Unknown client_id" },
      status: 401,
    };
  }

  if (client.tokenEndpointAuthMethod !== "none") {
    if (!params.client_secret) {
      return {
        data: {
          error: "invalid_client",
          error_description: "Missing client_secret",
        },
        status: 401,
      };
    }
    if (!client.clientSecret) {
      return {
        data: {
          error: "invalid_client",
          error_description: "Client misconfigured",
        },
        status: 401,
      };
    }
    const valid = await bcrypt.compare(params.client_secret, client.clientSecret);
    if (!valid) {
      return {
        data: {
          error: "invalid_client",
          error_description: "Invalid client_secret",
        },
        status: 401,
      };
    }
  }

  if (params.grant_type === "authorization_code") {
    return handleAuthCodeGrant(params, client);
  }

  if (params.grant_type === "refresh_token") {
    return handleRefreshGrant(params, client);
  }

  return {
    data: {
      error: "unsupported_grant_type",
      error_description: "Only authorization_code and refresh_token are supported",
    },
    status: 400,
  };
}

async function handleAuthCodeGrant(
  params: TokenRequest,
  client: typeof oauth2Clients.$inferSelect
): Promise<{ data: TokenResponse; status: 200 } | { data: TokenError; status: 400 }> {
  if (!params.code || !params.redirect_uri || !params.code_verifier) {
    return {
      data: {
        error: "invalid_request",
        error_description: "Missing code, redirect_uri, or code_verifier",
      },
      status: 400,
    };
  }

  const claimedCodes = await db
    .update(oauth2AuthorizationCodes)
    .set({ used: true })
    .where(
      and(
        eq(oauth2AuthorizationCodes.code, params.code),
        eq(oauth2AuthorizationCodes.clientId, client.clientId),
        eq(oauth2AuthorizationCodes.used, false)
      )
    )
    .returning();

  const authCode = claimedCodes[0];

  if (!authCode) {

    const existing = await db
      .select()
      .from(oauth2AuthorizationCodes)
      .where(
        and(
          eq(oauth2AuthorizationCodes.code, params.code),
          eq(oauth2AuthorizationCodes.clientId, client.clientId)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].used) {

      await db
        .update(oauth2Tokens)
        .set({ revoked: true })
        .where(
          and(
            eq(oauth2Tokens.clientId, client.clientId),
            eq(oauth2Tokens.userId, existing[0].userId)
          )
        );

      return {
        data: {
          error: "invalid_grant",
          error_description: "Code already used. All tokens revoked for security.",
        },
        status: 400,
      };
    }

    return {
      data: { error: "invalid_grant", error_description: "Invalid authorization code" },
      status: 400,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  if (authCode.expiresAt < now) {
    return {
      data: { error: "invalid_grant", error_description: "Code expired" },
      status: 400,
    };
  }

  if (authCode.redirectUri !== params.redirect_uri) {
    return {
      data: { error: "invalid_grant", error_description: "Redirect URI mismatch" },
      status: 400,
    };
  }

  if (!authCode.codeChallenge || !authCode.codeChallengeMethod) {
    return {
      data: { error: "invalid_grant", error_description: "Missing PKCE challenge" },
      status: 400,
    };
  }

  const pkceValid = await verifyCodeChallenge(
    params.code_verifier,
    authCode.codeChallenge,
    authCode.codeChallengeMethod
  );

  if (!pkceValid) {
    return {
      data: { error: "invalid_grant", error_description: "PKCE verification failed" },
      status: 400,
    };
  }

  const tokenData = await issueTokenPair({
    userId: authCode.userId,
    clientId: client.clientId,
    scope: authCode.scope ?? "",
    grantedFields: authCode.grantedFields ?? null,
  });

  return { data: tokenData, status: 200 };
}

async function handleRefreshGrant(
  params: TokenRequest,
  client: typeof oauth2Clients.$inferSelect
): Promise<{ data: TokenResponse; status: 200 } | { data: TokenError; status: 400 }> {
  if (!params.refresh_token) {
    return {
      data: { error: "invalid_request", error_description: "Missing refresh_token" },
      status: 400,
    };
  }

  const oldToken = await validateRefreshToken(params.refresh_token);

  if (!oldToken) {
    return {
      data: { error: "invalid_grant", error_description: "Invalid or expired refresh token" },
      status: 400,
    };
  }

  if (oldToken.clientId !== client.clientId) {
    return {
      data: { error: "invalid_grant", error_description: "Token does not belong to this client" },
      status: 400,
    };
  }

  const tokenData = await issueTokenPair({
    userId: oldToken.userId,
    clientId: client.clientId,
    scope: oldToken.scope ?? "",
    grantedFields: oldToken.grantedFields ?? null,
  });

  return { data: tokenData, status: 200 };
}
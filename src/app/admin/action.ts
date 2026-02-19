"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { oauth2Clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { oauth2Tokens, oauth2AuthorizationCodes } from "@/lib/db/schema";

interface CreateState {
  error: string | null;
  success: string | null;
  clientId: string | null;
  clientSecret: string | null;
}

export async function createClientAction(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    return { error: "Unauthorized.", success: null, clientId: null, clientSecret: null };
  }

  const clientName = (formData.get("client_name") as string)?.trim();
  const redirectUrisRaw = (formData.get("redirect_uris") as string)?.trim();
  const clientType = formData.get("client_type") as string;
  const scopes = formData.getAll("scope") as string[];

  if (!clientName) {
    return { error: "Client name is required.", success: null, clientId: null, clientSecret: null };
  }

  const redirectUris = redirectUrisRaw
    .split(/\s+/)
    .filter((uri) => {
      try {
        const parsed = new URL(uri);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    });

  if (redirectUris.length === 0) {
    return { error: "At least one valid redirect URI required.", success: null, clientId: null, clientSecret: null };
  }

  if (scopes.length === 0) {
    return { error: "At least one scope required.", success: null, clientId: null, clientSecret: null };
  }

  const clientId = nanoid(32);
  const isPublic = clientType !== "confidential";

  if (isPublic) {
    await db.insert(oauth2Clients).values({
      userId: user.id,
      clientId,
      clientSecret: null,
      clientName,
      redirectUris,
      scope: scopes.join(" "),
      tokenEndpointAuthMethod: "none",
    });

    revalidatePath("/admin");
    return {
      error: null,
      success: "Public client created.",
      clientId,
      clientSecret: null,
    };
  } else {
    const plainSecret = nanoid(48);
    const hashed = await bcrypt.hash(plainSecret, 12);

    await db.insert(oauth2Clients).values({
      userId: user.id,
      clientId,
      clientSecret: hashed,
      clientName,
      redirectUris,
      scope: scopes.join(" "),
      tokenEndpointAuthMethod: "client_secret_post",
    });

    revalidatePath("/admin");
    return {
      error: null,
      success: "Confidential client created.",
      clientId,
      clientSecret: plainSecret,
    };
  }
}

export async function deleteClientAction(formData: FormData) {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    return;
  }

  const id = parseInt(formData.get("id") as string, 10);
  if (isNaN(id)) return;

  const client = await db
    .select()
    .from(oauth2Clients)
    .where(and(eq(oauth2Clients.id, id), eq(oauth2Clients.userId, user.id)))
    .limit(1);

  if (client.length === 0) return;

  const clientId = client[0].clientId;

  await db
    .update(oauth2Tokens)
    .set({ revoked: true })
    .where(eq(oauth2Tokens.clientId, clientId));

  await db
    .update(oauth2AuthorizationCodes)
    .set({ used: true })
    .where(
      and(
        eq(oauth2AuthorizationCodes.clientId, clientId),
        eq(oauth2AuthorizationCodes.used, false)
      )
    );

  await db
    .delete(oauth2Clients)
    .where(and(eq(oauth2Clients.id, id), eq(oauth2Clients.userId, user.id)));

  revalidatePath("/admin");
}
"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAuthorizationCode } from "@/lib/oauth2/grants";
import { SCOPE_FIELDS } from "@/lib/constants";

interface ConsentState {
  error: string | null;
}

export async function consentAction(
  _prev: ConsentState,
  formData: FormData
): Promise<ConsentState> {
  const user = await requireAuth();

  const action = formData.get("action") as string;
  const clientId = formData.get("client_id") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const scope = formData.get("scope") as string;
  const state = formData.get("state") as string;
  const codeChallenge = formData.get("code_challenge") as string;
  const codeChallengeMethod = formData.get("code_challenge_method") as string;

  if (!clientId || !redirectUri || !scope || !codeChallenge) {
    return { error: "Missing required parameters." };
  }

  if (action === "deny") {
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("error_description", "User denied the request");
    if (state) url.searchParams.set("state", state);
    redirect(url.toString());
  }

  const rawFields = formData.getAll("granted_fields") as string[];
  const requestedScopes = scope.split(" ");
  const grantedFields: Record<string, string[]> = {};

  for (const entry of rawFields) {
    const lastColon = entry.lastIndexOf(":");
    if (lastColon === -1) continue;

    const scopePart = entry.substring(0, lastColon);
    const fieldPart = entry.substring(lastColon + 1);

    if (!requestedScopes.includes(scopePart)) continue;
    if (!SCOPE_FIELDS[scopePart]?.[fieldPart]) continue;

    if (!grantedFields[scopePart]) grantedFields[scopePart] = [];
    grantedFields[scopePart].push(fieldPart);
  }

  const code = await createAuthorizationCode({
    userId: user.id,
    clientId,
    redirectUri,
    scope,
    codeChallenge,
    codeChallengeMethod,
    grantedFields,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  redirect(url.toString());
}
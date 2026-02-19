import { NextRequest, NextResponse } from "next/server";
import { handleTokenRequest } from "@/lib/oauth2/grants";
import { tokenLimit } from "@/lib/rate-limit";
import { corsHeaders, handlePreflight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await tokenLimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "rate_limit", error_description: "Too many requests" },
      { status: 429, headers: cors }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let params: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const parsed = new URLSearchParams(body);
    parsed.forEach((value, key) => {
      params[key] = value;
    });
  } else if (contentType.includes("application/json")) {
    params = await request.json();
  } else {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Unsupported content type" },
      { status: 400, headers: cors }
    );
  }

  const result = await handleTokenRequest({
    grant_type: params.grant_type ?? "",
    code: params.code,
    redirect_uri: params.redirect_uri,
    client_id: params.client_id ?? "",
    client_secret: params.client_secret,
    code_verifier: params.code_verifier,
    refresh_token: params.refresh_token,
  });

  return NextResponse.json(result.data, {
    status: result.status,
    headers: {
      ...cors,
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
    },
  });
}
import { NextResponse, NextRequest } from "next/server";

const ALLOW_ALL_ORIGINS = true;

export function corsHeaders(request: NextRequest, clientRedirectUris?: string[]): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  
  if (clientRedirectUris) {
    const allowed = clientRedirectUris.some(uri => {
      try { return new URL(uri).origin === origin; } 
      catch { return false; }
    });
    if (!allowed) return {};
  }
  
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

export function handlePreflight(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}
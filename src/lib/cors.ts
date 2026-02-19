import { NextResponse, NextRequest } from "next/server";

const ALLOW_ALL_ORIGINS = true;

export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";

  if (ALLOW_ALL_ORIGINS) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };
  }

  return {};
}

export function handlePreflight(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}
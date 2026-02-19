import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getSession();


  session.destroy();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!));
}

export async function GET() {
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!));
}
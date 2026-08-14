import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXTAUTH_URL: Boolean(process.env.NEXTAUTH_URL),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
  });
}

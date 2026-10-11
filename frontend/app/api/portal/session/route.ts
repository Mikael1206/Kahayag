import { officialFromToken, PORTAL_COOKIE, signInOfficial } from "@/lib/portalAuth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const token = await signInOfficial(email, password);
    const official = await officialFromToken(token);
    cookies().set(PORTAL_COOKIE, token, cookieOptions());
    return NextResponse.json({
      official: {
        barangayName: official.barangayName,
        municipality: official.municipality,
        role: official.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "SUPABASE_AUTH_MISSING") {
      return NextResponse.json(
        { error: "Portal login is not configured on this server." },
        { status: 500 }
      );
    }
    if (message === "NOT_AN_OFFICIAL") {
      return NextResponse.json(
        { error: "This account is not linked to a barangay." },
        { status: 403 }
      );
    }
    if (message === "AUTH_FAILED") {
      return NextResponse.json({ error: "Email or password is wrong." }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}

export async function DELETE() {
  cookies().delete(PORTAL_COOKIE);
  return NextResponse.json({ ok: true });
}

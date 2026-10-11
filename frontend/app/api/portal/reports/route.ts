import { officialFromRequest } from "@/lib/portalAuth";
import { advanceOfficialReport, listOfficialReports } from "@/lib/portalReports";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function authError(message: string) {
  if (message === "AUTH_FAILED") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (message === "NOT_AN_OFFICIAL") {
    return NextResponse.json({ error: "This account is not linked to a barangay." }, { status: 403 });
  }
  if (message === "SUPABASE_AUTH_MISSING") {
    return NextResponse.json({ error: "Portal login is not configured on this server." }, { status: 500 });
  }
  if (message === "DATABASE_URL_MISSING") {
    return NextResponse.json({ error: "Server database is not configured." }, { status: 500 });
  }
  return null;
}

export async function GET() {
  try {
    const official = await officialFromRequest();
    const payload = await listOfficialReports(official);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    return authError(message) ?? NextResponse.json({ error: "Could not load reports." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: { id?: string; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status are required." }, { status: 400 });
  }

  try {
    const official = await officialFromRequest();
    const report = await advanceOfficialReport(official, body.id, body.status);
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const mapped = authError(message);
    if (mapped) return mapped;
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "That report is outside your barangay." }, { status: 403 });
    }
    if (message === "INVALID_STATUS") {
      return NextResponse.json({ error: "That status change is not allowed." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not update the report." }, { status: 500 });
  }
}

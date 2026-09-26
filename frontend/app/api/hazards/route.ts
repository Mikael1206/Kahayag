import {
  confirmHazard,
  createHazard,
  findNearbyHazard,
  isHazardCategory,
} from "@/lib/hazards";
import { isValidLatLng, type LatLng } from "@/lib/calculateRoute";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parsePoint(lat: unknown, lng: unknown): LatLng | null {
  const point = { lat: Number(lat), lng: Number(lng) };
  return isValidLatLng(point) ? point : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const point = parsePoint(url.searchParams.get("lat"), url.searchParams.get("lng"));
  const category = url.searchParams.get("category") ?? "";
  if (!point || !isHazardCategory(category)) {
    return NextResponse.json(
      { error: "lat, lng, and a valid category are required." },
      { status: 400 }
    );
  }

  try {
    const pin = await findNearbyHazard(point, category);
    return NextResponse.json({ pin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "DATABASE_URL_MISSING") {
      return NextResponse.json({ error: "Server database is not configured." }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not look up nearby reports." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: {
    lat?: number;
    lng?: number;
    category?: string;
    description?: string;
    confirmId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const point = parsePoint(body.lat, body.lng);
  const category = body.category ?? "";
  if (!point || !isHazardCategory(category)) {
    return NextResponse.json(
      { error: "lat, lng, and a valid category are required." },
      { status: 400 }
    );
  }

  let description: string | undefined;
  if (typeof body.description === "string" && body.description.trim()) {
    description = body.description.trim().slice(0, 280);
  }

  try {
    if (body.confirmId) {
      const pin = await confirmHazard(body.confirmId, point, category);
      return NextResponse.json({ pin, action: "confirmed" });
    }

    const result = await createHazard(point, category, description);
    if (!result.created) {
      return NextResponse.json(
        { pin: result.pin, error: "A report already exists within 25 meters." },
        { status: 409 }
      );
    }
    return NextResponse.json({ pin: result.pin, action: "created" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "DATABASE_URL_MISSING") {
      return NextResponse.json({ error: "Server database is not configured." }, { status: 500 });
    }
    if (message === "CONFIRM_MISMATCH") {
      return NextResponse.json(
        { error: "That report is no longer available to confirm." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not save the report." }, { status: 500 });
  }
}

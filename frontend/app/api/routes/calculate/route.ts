import { calculateRoutes, isValidLatLng, type LatLng } from "@/lib/calculateRoute";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  origin?: LatLng;
  destination?: LatLng;
  accuracyMeters?: number;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const origin = body.origin;
  const destination = body.destination;
  if (!origin || !destination || !isValidLatLng(origin) || !isValidLatLng(destination)) {
    return NextResponse.json(
      { error: "origin and destination must include valid lat and lng." },
      { status: 400 }
    );
  }

  try {
    const result = await calculateRoutes(origin, destination, body.accuracyMeters);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "DATABASE_URL_MISSING") {
      return NextResponse.json({ error: "Server database is not configured." }, { status: 500 });
    }
    if (message === "OSRM_NO_ROUTE") {
      return NextResponse.json({ error: "No walking route found." }, { status: 404 });
    }
    if (message.startsWith("OSRM_UNAVAILABLE")) {
      return NextResponse.json({ error: "Routing service is unavailable." }, { status: 502 });
    }
    return NextResponse.json({ error: "Route calculation failed." }, { status: 500 });
  }
}

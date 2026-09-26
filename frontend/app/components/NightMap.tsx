"use client";

import type { RouteOption } from "@/lib/calculateRoute";
import type { HazardPin } from "@/lib/hazardTypes";
import { ROUTE_COLORS, isNightHours } from "@/lib/mapStyle";
import { useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HazardPins from "./HazardPins";
import HazardViewport from "./HazardViewport";
import RouteLayers from "./RouteLayers";

export const DEFAULT_CENTER: [number, number] = [14.5862, 121.0565];

export default function NightMap({
  wellLit,
  direct,
  active,
  hazards,
}: {
  wellLit: RouteOption | null;
  direct: RouteOption | null;
  active: "wellLit" | "direct" | null;
  hazards: HazardPin[];
}) {
  const night = useMemo(() => isNightHours(new Date()), []);
  const [pins, setPins] = useState<HazardPin[]>(hazards);
  const [zoom, setZoom] = useState(15);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={15}
        scrollWheelZoom
        className={`h-full w-full${night ? " leaflet-osm-fallback" : ""}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HazardViewport
          extraPins={hazards}
          setPins={setPins}
          setZoom={setZoom}
          setStatus={setStatus}
        />
        <RouteLayers
          wellLit={wellLit}
          direct={direct}
          active={active}
          hazards={pins}
        />
        <HazardPins pins={pins} zoom={zoom} />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-36 left-3 z-[1000] max-w-[16rem] space-y-1 rounded-md bg-[#1E293B]/95 p-2 text-xs text-[#E2E8F0]">
        <p>
          <span className="mr-1 inline-block h-2 w-4" style={{ background: ROUTE_COLORS.wellLit }} />
          Well-lit (no nearby report)
        </p>
        <p>
          <span
            className="mr-1 inline-block h-2 w-4"
            style={{ background: ROUTE_COLORS.unconfirmed }}
          />
          Direct / unconfirmed
        </p>
        <p>
          <span
            className="mr-1 inline-block h-2 w-4"
            style={{ background: ROUTE_COLORS.nearHazard }}
          />
          Within 30 m of a dark-spot pin
        </p>
        {status === "loading" ? <p role="status">Loading reports…</p> : null}
        {status === "ready" && pins.length === 0 ? (
          <p>No community reports in this view.</p>
        ) : null}
        {status === "error" ? (
          <p role="alert">Could not refresh reports. Pan the map to try again.</p>
        ) : null}
      </div>
    </div>
  );
}

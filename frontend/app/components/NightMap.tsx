"use client";

import type { RouteOption } from "@/lib/calculateRoute";
import type { HazardPin } from "@/lib/hazardTypes";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HazardPins from "./HazardPins";
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
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={15}
      scrollWheelZoom
      className="h-full w-full leaflet-osm-fallback"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RouteLayers wellLit={wellLit} direct={direct} active={active} />
      <HazardPins pins={hazards} />
    </MapContainer>
  );
}

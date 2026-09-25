"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/** U-Belt corridor used in docs/qa-test-plan.md TC-001. */
export const DEFAULT_CENTER: [number, number] = [14.5862, 121.0565];

export default function NightMap() {
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
    </MapContainer>
  );
}

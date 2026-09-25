"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/** U-Belt corridor used in docs/qa-test-plan.md TC-001. */
export const DEFAULT_CENTER: [number, number] = [14.5862, 121.0565];

const cartoKey = process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY;

export default function NightMap() {
  const useCarto = Boolean(cartoKey);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={15}
      scrollWheelZoom
      className={`h-full w-full${useCarto ? "" : " leaflet-osm-fallback"}`}
    >
      {useCarto ? (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`}
        />
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}
    </MapContainer>
  );
}

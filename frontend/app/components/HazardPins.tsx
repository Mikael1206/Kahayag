"use client";

import { categoryLabel, type HazardPin } from "@/lib/hazardTypes";
import { CircleMarker, Popup } from "react-leaflet";

export default function HazardPins({ pins }: { pins: HazardPin[] }) {
  return (
    <>
      {pins.map((pin) => (
        <CircleMarker
          key={pin.id}
          center={[pin.lat, pin.lng]}
          radius={10}
          pathOptions={{ color: "#F59E0B", fillColor: "#F59E0B", fillOpacity: 0.85 }}
        >
          <Popup>
            <p className="font-medium">Community Reported</p>
            <p>{categoryLabel(pin.category)}</p>
            <p>{pin.confirmCount} confirmation{pin.confirmCount === 1 ? "" : "s"}</p>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

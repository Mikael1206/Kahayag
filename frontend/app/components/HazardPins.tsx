"use client";

import { categoryLabel, type HazardPin } from "@/lib/hazardTypes";
import { CLUSTER_ZOOM, clusterHazards, reportedAgo } from "@/lib/mapStyle";
import L from "leaflet";
import { CircleMarker, Marker, Popup, useMap } from "react-leaflet";

function clusterIcon(count: number) {
  return L.divIcon({
    className: "hazard-cluster",
    html: `<span>${count}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function HazardPins({ pins, zoom }: { pins: HazardPin[]; zoom: number }) {
  const map = useMap();
  const groups = clusterHazards(pins, zoom);

  return (
    <>
      {groups.map((group) => {
        if (group.count === 1) {
          const pin = group.pins[0];
          return (
            <CircleMarker
              key={pin.id}
              center={[pin.lat, pin.lng]}
              radius={10}
              pathOptions={{ color: "#F59E0B", fillColor: "#F59E0B", fillOpacity: 0.85 }}
            >
              <Popup>
                <p className="font-medium">Community Reported</p>
                <p>{categoryLabel(pin.category)}</p>
                <p>{reportedAgo(pin.createdAt)}</p>
                <p>
                  {pin.confirmCount} confirmation{pin.confirmCount === 1 ? "" : "s"}
                </p>
              </Popup>
            </CircleMarker>
          );
        }
        return (
          <Marker
            key={group.id}
            position={[group.lat, group.lng]}
            icon={clusterIcon(group.count)}
            eventHandlers={{
              click: () => {
                map.setView([group.lat, group.lng], Math.min(map.getZoom() + 2, CLUSTER_ZOOM));
              },
            }}
          />
        );
      })}
    </>
  );
}

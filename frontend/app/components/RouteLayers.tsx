"use client";

import type { RouteOption } from "@/lib/calculateRoute";
import { colorRouteSegments } from "@/lib/mapStyle";
import { useEffect } from "react";
import { Polyline, useMap } from "react-leaflet";

function toLatLngs(route: RouteOption): [number, number][] {
  return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

function RoutePolylines({
  route,
  kind,
  hazards,
  weight,
}: {
  route: RouteOption;
  kind: "wellLit" | "direct";
  hazards: Array<{ lat: number; lng: number }>;
  weight: number;
}) {
  return (
    <>
      {colorRouteSegments(route.geometry.coordinates, hazards, kind).map(
        (segment, index) => (
          <Polyline
            key={`${kind}-${index}-${segment.color}`}
            positions={segment.positions}
            pathOptions={{
              color: segment.color,
              weight,
              dashArray: segment.dashed ? "8 10" : undefined,
              opacity: 0.95,
            }}
          />
        )
      )}
    </>
  );
}

export default function RouteLayers({
  wellLit,
  direct,
  active,
  hazards,
}: {
  wellLit: RouteOption | null;
  direct: RouteOption | null;
  active: "wellLit" | "direct" | null;
  hazards: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();

  useEffect(() => {
    const selected = active === "direct" ? direct : wellLit;
    if (!selected || selected.geometry.coordinates.length < 2) return;
    map.fitBounds(toLatLngs(selected), { padding: [48, 48] });
  }, [active, direct, map, wellLit]);

  return (
    <>
      {direct ? (
        <RoutePolylines
          route={direct}
          kind="direct"
          hazards={hazards}
          weight={active === "direct" ? 6 : 4}
        />
      ) : null}
      {wellLit ? (
        <RoutePolylines
          route={wellLit}
          kind="wellLit"
          hazards={hazards}
          weight={active === "wellLit" || !active ? 6 : 4}
        />
      ) : null}
    </>
  );
}

"use client";

import type { RouteOption } from "@/lib/calculateRoute";
import { useEffect } from "react";
import { Polyline, useMap } from "react-leaflet";

function toLatLngs(route: RouteOption): [number, number][] {
  return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

export default function RouteLayers({
  wellLit,
  direct,
  active,
}: {
  wellLit: RouteOption | null;
  direct: RouteOption | null;
  active: "wellLit" | "direct" | null;
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
        <Polyline
          positions={toLatLngs(direct)}
          pathOptions={{
            color: "#64748B",
            weight: active === "direct" ? 6 : 4,
            dashArray: "8 10",
            opacity: 0.9,
          }}
        />
      ) : null}
      {wellLit ? (
        <Polyline
          positions={toLatLngs(wellLit)}
          pathOptions={{
            color: "#10B981",
            weight: active === "wellLit" || !active ? 6 : 4,
            opacity: 0.95,
          }}
        />
      ) : null}
    </>
  );
}

"use client";

import type { HazardPin } from "@/lib/hazardTypes";
import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

export default function HazardViewport({
  extraPins,
  setPins,
  setZoom,
  setStatus,
}: {
  extraPins: HazardPin[];
  setPins: (pins: HazardPin[] | ((current: HazardPin[]) => HazardPin[])) => void;
  setZoom: (zoom: number) => void;
  setStatus: (status: "loading" | "ready" | "error") => void;
}) {
  const map = useMap();

  async function load() {
    const bounds = map.getBounds();
    setZoom(map.getZoom());
    setStatus("loading");
    try {
      const query = new URLSearchParams({
        west: String(bounds.getWest()),
        south: String(bounds.getSouth()),
        east: String(bounds.getEast()),
        north: String(bounds.getNorth()),
      });
      const response = await fetch(`/api/hazards?${query.toString()}`);
      const payload = (await response.json()) as { pins?: HazardPin[]; error?: string };
      if (!response.ok || !payload.pins) {
        throw new Error(payload.error || "Could not load reports on the map.");
      }
      const byId = new Map(payload.pins.map((pin) => [pin.id, pin]));
      for (const pin of extraPins) byId.set(pin.id, pin);
      setPins(Array.from(byId.values()));
      setStatus("ready");
    } catch {
      setPins((current) => {
        const byId = new Map(current.map((pin) => [pin.id, pin]));
        for (const pin of extraPins) byId.set(pin.id, pin);
        return Array.from(byId.values());
      });
      setStatus("error");
    }
  }

  useMapEvents({
    moveend: () => {
      void load();
    },
    zoomend: () => {
      void load();
    },
  });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (extraPins.length === 0) return;
    setPins((current) => {
      const byId = new Map(current.map((pin) => [pin.id, pin]));
      for (const pin of extraPins) byId.set(pin.id, pin);
      return Array.from(byId.values());
    });
  }, [extraPins, setPins]);

  return null;
}

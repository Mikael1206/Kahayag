"use client";

import type { CalculateResult, LatLng } from "@/lib/calculateRoute";
import type { HazardPin } from "@/lib/hazardTypes";
import { Map } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import HazardReporter from "./HazardReporter";
import MapErrorBoundary from "./MapErrorBoundary";
import RouteComparisonCard from "./RouteComparisonCard";
import SosControl from "./SosControl";

const NightMap = dynamic(() => import("./NightMap"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-[#0F172A] text-[#E2E8F0]"
      role="status"
    >
      Loading map…
    </div>
  ),
});

const DEFAULT_ORIGIN: LatLng = { lat: 14.5862, lng: 121.0565 };
const DEFAULT_DESTINATION: LatLng = { lat: 14.589, lng: 121.059 };

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0F172A] px-6 text-center text-[#E2E8F0]">
      <p>The map could not start. Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#F59E0B] px-5 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
      >
        Retry
      </button>
    </div>
  );
}

export default function MapExperience() {
  const [mapKey, setMapKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<CalculateResult | null>(null);
  const [selected, setSelected] = useState<"wellLit" | "direct">("wellLit");
  const [walking, setWalking] = useState(false);
  const [hazards, setHazards] = useState<HazardPin[]>([]);
  const [reporting, setReporting] = useState(false);

  const active = useMemo(() => {
    if (!walking || !result) return null;
    return selected;
  }, [result, selected, walking]);

  async function calculate() {
    setMapReady(true);
    setWalking(false);
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await fetch("/api/routes/calculate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      const payload = (await response.json()) as CalculateResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Route calculation failed.");
      }
      setResult(payload);
      setSelected("wellLit");
      setStatus("ready");
    } catch (error) {
      setResult(null);
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Route calculation failed."
      );
    }
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        {mapReady ? (
          <MapErrorBoundary
            fallback={(retry) => (
              <ErrorPanel
                onRetry={() => {
                  retry();
                  setMapKey((value) => value + 1);
                }}
              />
            )}
          >
            <NightMap
              key={mapKey}
              wellLit={walking ? result?.wellLit ?? null : null}
              direct={walking ? result?.direct ?? null : null}
              active={active}
              hazards={hazards}
            />
          </MapErrorBoundary>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0F172A] px-6 text-center text-[#E2E8F0]">
            <p>Find a verified well-lit walk. Tiles load when you search.</p>
            <button
              type="button"
              onClick={() => setMapReady(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#F59E0B] px-5 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            >
              <Map aria-hidden className="h-5 w-5" />
              Load map
            </button>
          </div>
        )}
      </div>

      <SosControl fallbackOrigin={origin} />

      <button
        type="button"
        onClick={() => setReporting(true)}
        className="absolute right-3 top-20 z-[1100] inline-flex min-h-12 items-center justify-center rounded-md bg-[#F59E0B] px-4 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
      >
        Report dark spot
      </button>

      {reporting ? (
        <HazardReporter
          fallbackOrigin={origin}
          onClose={() => setReporting(false)}
          onSaved={(pin) => {
            setHazards((current) => {
              const without = current.filter((item) => item.id !== pin.id);
              return [...without, pin];
            });
            setMapReady(true);
            setReporting(false);
          }}
        />
      ) : null}

      <form
        className="absolute bottom-0 left-0 right-0 z-[1100] space-y-2 bg-[#0F172A]/95 px-3 pb-4 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          void calculate();
        }}
      >
        {status === "idle" ? (
          <p className="text-sm text-[#CBD5E1]">
            Enter origin and destination, then compare routes.
          </p>
        ) : null}
        {status === "loading" ? (
          <p role="status" className="text-sm text-[#E2E8F0]">
            Calculating walking routes…
          </p>
        ) : null}
        {status === "error" ? (
          <p role="alert" className="text-sm text-[#F59E0B]">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex min-h-12 flex-col justify-center text-[#E2E8F0]">
            Origin lat
            <input
              className="min-h-12 rounded-md bg-[#1E293B] px-2 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              type="number"
              step="any"
              value={origin.lat}
              onChange={(event) =>
                setOrigin({ ...origin, lat: Number(event.target.value) })
              }
            />
          </label>
          <label className="flex min-h-12 flex-col justify-center text-[#E2E8F0]">
            Origin lng
            <input
              className="min-h-12 rounded-md bg-[#1E293B] px-2 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              type="number"
              step="any"
              value={origin.lng}
              onChange={(event) =>
                setOrigin({ ...origin, lng: Number(event.target.value) })
              }
            />
          </label>
          <label className="flex min-h-12 flex-col justify-center text-[#E2E8F0]">
            Destination lat
            <input
              className="min-h-12 rounded-md bg-[#1E293B] px-2 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              type="number"
              step="any"
              value={destination.lat}
              onChange={(event) =>
                setDestination({
                  ...destination,
                  lat: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="flex min-h-12 flex-col justify-center text-[#E2E8F0]">
            Destination lng
            <input
              className="min-h-12 rounded-md bg-[#1E293B] px-2 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              type="number"
              step="any"
              value={destination.lng}
              onChange={(event) =>
                setDestination({
                  ...destination,
                  lng: Number(event.target.value),
                })
              }
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#10B981] px-4 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] disabled:opacity-60"
        >
          Compare routes
        </button>

        {status === "ready" && result ? (
          <RouteComparisonCard
            result={result}
            selected={selected}
            onSelect={setSelected}
            onStartWalk={() => setWalking(true)}
          />
        ) : null}
      </form>
    </div>
  );
}

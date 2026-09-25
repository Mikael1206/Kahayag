"use client";

import { Map, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import MapErrorBoundary from "./MapErrorBoundary";

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

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0F172A] px-6 text-center text-[#E2E8F0]">
      <p>The map could not start. Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-md bg-[#F59E0B] px-5 text-base font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
      >
        <RefreshCw aria-hidden className="h-5 w-5" />
        Retry
      </button>
    </div>
  );
}

export default function NightMapShell() {
  const [started, setStarted] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  if (!started) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0F172A] px-6 text-center text-[#E2E8F0]">
        <p>Night map is ready. Tiles load after you open it.</p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-md bg-[#F59E0B] px-5 text-base font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
        >
          <Map aria-hidden className="h-5 w-5" />
          Load map
        </button>
      </div>
    );
  }

  return (
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
      <NightMap key={mapKey} />
    </MapErrorBoundary>
  );
}

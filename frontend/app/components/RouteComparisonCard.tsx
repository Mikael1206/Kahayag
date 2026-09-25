"use client";

import type { CalculateResult } from "@/lib/calculateRoute";
import {
  distanceLabel,
  durationDeltaLabel,
  lightingLabel,
  minutesLabel,
} from "@/lib/routeFormat";

export default function RouteComparisonCard({
  result,
  selected,
  onSelect,
  onStartWalk,
}: {
  result: CalculateResult;
  selected: "wellLit" | "direct";
  onSelect: (value: "wellLit" | "direct") => void;
  onStartWalk: () => void;
}) {
  const delta = durationDeltaLabel(
    result.wellLit.durationSeconds,
    result.direct.durationSeconds
  );

  return (
    <section
      className="rounded-t-xl bg-[#1E293B] px-4 pb-5 pt-3 text-[#E2E8F0] shadow-lg"
      aria-label="Route comparison"
    >
      <p className="mb-3 text-sm text-[#CBD5E1]">{delta}</p>
      {result.warning ? (
        <p role="status" className="mb-3 text-sm text-[#F59E0B]">
          {result.warning}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelect("wellLit")}
          className={`min-h-12 rounded-md px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] ${
            selected === "wellLit"
              ? "bg-[#10B981] text-[#0F172A]"
              : "bg-[#0F172A] text-[#E2E8F0]"
          }`}
        >
          <span className="block text-sm font-medium">Verified Well-Lit Route</span>
          <span className="block text-sm">
            {minutesLabel(result.wellLit.durationSeconds)} ·{" "}
            {distanceLabel(result.wellLit.distanceMeters)}
          </span>
          <span className="mt-1 block text-xs">
            {lightingLabel(result.wellLit.lightingCoveragePct)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("direct")}
          className={`min-h-12 rounded-md px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] ${
            selected === "direct"
              ? "bg-[#F59E0B] text-[#0F172A]"
              : "bg-[#0F172A] text-[#E2E8F0]"
          }`}
        >
          <span className="block text-sm font-medium">Direct Route</span>
          <span className="block text-sm">
            {minutesLabel(result.direct.durationSeconds)} ·{" "}
            {distanceLabel(result.direct.distanceMeters)}
          </span>
          <span className="mt-1 block text-xs">
            {lightingLabel(result.direct.lightingCoveragePct)}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onStartWalk}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#F59E0B] px-4 text-base font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E293B]"
      >
        Start walk
      </button>
    </section>
  );
}

"use client";

import type { LatLng } from "@/lib/calculateRoute";
import {
  HAZARD_CATEGORIES,
  type HazardCategory,
  type HazardPin,
} from "@/lib/hazardTypes";
import { useEffect, useState } from "react";

type GpsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; point: LatLng; accuracyMeters?: number }
  | { status: "error"; message: string };

export default function HazardReporter({
  fallbackOrigin,
  onClose,
  onSaved,
}: {
  fallbackOrigin: LatLng;
  onClose: () => void;
  onSaved: (pin: HazardPin) => void;
}) {
  const [gps, setGps] = useState<GpsState>({ status: "idle" });
  const [category, setCategory] = useState<HazardCategory | null>(null);
  const [description, setDescription] = useState("");
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "checking" | "confirm" | "saving" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [neighbor, setNeighbor] = useState<HazardPin | null>(null);

  const point =
    gps.status === "ready" ? gps.point : fallbackOrigin;

  function requestGps() {
    if (!navigator.geolocation) {
      setGps({
        status: "error",
        message: "This browser cannot read GPS. The origin from the route form will be used.",
      });
      return;
    }
    setGps({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          status: "ready",
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracyMeters: position.coords.accuracy,
        });
      },
      () => {
        setGps({
          status: "error",
          message:
            "Location was blocked or timed out. You can still report using the origin on the route form.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    requestGps();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function checkThenSubmit() {
    if (!category) {
      setSubmitStatus("error");
      setErrorMessage("Choose a category.");
      return;
    }
    setSubmitStatus("checking");
    setErrorMessage("");
    try {
      const lookup = new URLSearchParams({
        lat: String(point.lat),
        lng: String(point.lng),
        category,
      });
      const nearby = await fetch(`/api/hazards?${lookup.toString()}`);
      const nearbyPayload = (await nearby.json()) as { pin?: HazardPin; error?: string };
      if (!nearby.ok) {
        throw new Error(nearbyPayload.error || "Could not check nearby reports.");
      }
      if (nearbyPayload.pin) {
        setNeighbor(nearbyPayload.pin);
        setSubmitStatus("confirm");
        return;
      }
      await save();
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not check nearby reports.");
    }
  }

  async function save(confirmId?: string) {
    if (!category) return;
    setSubmitStatus("saving");
    setErrorMessage("");
    try {
      const response = await fetch("/api/hazards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: point.lat,
          lng: point.lng,
          category,
          description: description.trim() || undefined,
          confirmId,
        }),
      });
      const payload = (await response.json()) as { pin?: HazardPin; error?: string };
      if (response.status === 409 && payload.pin && !confirmId) {
        setNeighbor(payload.pin);
        setSubmitStatus("confirm");
        return;
      }
      if (!response.ok || !payload.pin) {
        throw new Error(payload.error || "Could not save the report.");
      }
      onSaved(payload.pin);
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not save the report.");
    }
  }

  return (
    <div
      className="absolute inset-0 z-[1200] flex items-end justify-center bg-[#0F172A]/70 p-3"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dark-spot-title"
        className="w-full max-w-md rounded-t-xl bg-[#1E293B] p-4 text-[#E2E8F0] shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="report-dark-spot-title" className="text-lg font-medium">
          Report dark spot
        </h2>

        {gps.status === "idle" || gps.status === "loading" ? (
          <p role="status" className="mt-2 text-sm text-[#CBD5E1]">
            Reading your location…
          </p>
        ) : null}
        {gps.status === "ready" ? (
          <p className="mt-2 text-sm text-[#CBD5E1]">
            Location ready
            {gps.accuracyMeters && gps.accuracyMeters > 50
              ? `. GPS accuracy is ${Math.round(gps.accuracyMeters)} m — check this is the right street.`
              : "."}
          </p>
        ) : null}
        {gps.status === "error" ? (
          <p role="alert" className="mt-2 text-sm text-[#F59E0B]">
            {gps.message}
          </p>
        ) : null}

        <p className="mt-3 text-sm text-[#CBD5E1]">
          Pin: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </p>

        <fieldset className="mt-3">
          <legend className="mb-2 text-sm">Category</legend>
          <div className="grid grid-cols-2 gap-2">
            {HAZARD_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategory(item.id);
                  setNeighbor(null);
                  setSubmitStatus("idle");
                }}
                className={`min-h-12 rounded-md px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] ${
                  category === item.id
                    ? "bg-[#F59E0B] text-[#0F172A]"
                    : "bg-[#0F172A] text-[#E2E8F0]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-3 block text-sm">
          Optional note
          <input
            className="mt-1 min-h-12 w-full rounded-md bg-[#0F172A] px-2 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={280}
          />
        </label>

        {neighbor ? (
          <p role="status" className="mt-3 text-sm text-[#CBD5E1]">
            A report of this type already exists within 25 meters.
          </p>
        ) : null}
        {submitStatus === "error" ? (
          <p role="alert" className="mt-3 text-sm text-[#F59E0B]">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {neighbor ? (
            <button
              type="button"
              disabled={submitStatus === "saving"}
              onClick={() => void save(neighbor.id)}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#10B981] px-4 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] disabled:opacity-60"
            >
              {submitStatus === "saving" ? "Saving…" : "Confirm Existing Report (+1)"}
            </button>
          ) : (
            <button
              type="button"
              disabled={submitStatus === "checking" || submitStatus === "saving"}
              onClick={() => void checkThenSubmit()}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#10B981] px-4 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] disabled:opacity-60"
            >
              {submitStatus === "checking" || submitStatus === "saving"
                ? "Saving…"
                : "Submit report"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#0F172A] px-4 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

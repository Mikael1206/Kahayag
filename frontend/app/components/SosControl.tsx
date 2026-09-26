"use client";

import type { LatLng } from "@/lib/calculateRoute";
import {
  SOS_CANCEL_MS,
  SOS_HOLD_MS,
  sosSmsBody,
  sosSmsHref,
  startSiren,
  type SirenHandle,
} from "@/lib/sos";
import { useEffect, useRef, useState } from "react";

type Gps =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; point: LatLng }
  | { status: "error"; message: string };

export default function SosControl({ fallbackOrigin }: { fallbackOrigin: LatLng }) {
  const [armed, setArmed] = useState(false);
  const [holding, setHolding] = useState(false);
  const [holdMs, setHoldMs] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [gps, setGps] = useState<Gps>({ status: "idle" });
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [slide, setSlide] = useState(0);
  const [slideStartedAt, setSlideStartedAt] = useState<number | null>(null);

  const holdTimer = useRef<number | null>(null);
  const holdStarted = useRef<number | null>(null);
  const holdTick = useRef<number | null>(null);
  const holdActive = useRef(false);
  const siren = useRef<SirenHandle | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  function clearHoldWatchers() {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    if (holdTick.current !== null) window.clearInterval(holdTick.current);
    holdTimer.current = null;
    holdTick.current = null;
    holdStarted.current = null;
    holdActive.current = false;
    setHolding(false);
    setHoldMs(0);
  }

  function stopAlarm() {
    siren.current?.stop();
    siren.current = null;
    void audioCtx.current?.close();
    audioCtx.current = null;
    setArmed(false);
    setAudioError("");
    setCopyStatus("idle");
    setSlide(0);
    setSlideStartedAt(null);
    setGps({ status: "idle" });
    clearHoldWatchers();
  }

  function requestGps() {
    if (!navigator.geolocation) {
      setGps({
        status: "error",
        message: "This browser cannot read GPS. SMS will not include a map pin.",
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
        });
      },
      () => {
        setGps({
          status: "error",
          message:
            "Location was blocked or timed out. You can still send SMS without a pin, or use the route origin.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  function activate() {
    setArmed(true);
    setAudioError("");
    requestGps();
    const Context =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) {
      setAudioError("This browser cannot play a siren.");
      return;
    }
    try {
      const context = new Context();
      void context.resume();
      audioCtx.current = context;
      siren.current = startSiren(context);
    } catch {
      setAudioError("The siren could not start.");
    }
  }

  function beginHold() {
    if (armed || holdActive.current) return;
    holdActive.current = true;
    setHolding(true);
    holdStarted.current = Date.now();
    holdTick.current = window.setInterval(() => {
      if (holdStarted.current === null) return;
      setHoldMs(Date.now() - holdStarted.current);
    }, 50);
    holdTimer.current = window.setTimeout(() => {
      clearHoldWatchers();
      activate();
    }, SOS_HOLD_MS);
  }

  useEffect(() => {
    return () => {
      clearHoldWatchers();
      siren.current?.stop();
      void audioCtx.current?.close();
    };
  }, []);

  const point =
    gps.status === "ready" ? gps.point : gps.status === "error" ? fallbackOrigin : undefined;
  const useFallback = gps.status === "error";
  const smsLat = point?.lat;
  const smsLng = point?.lng;

  return (
    <>
      <button
        type="button"
        aria-label="Hold 1.5 seconds to start SOS"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          beginHold();
        }}
        onPointerUp={clearHoldWatchers}
        onPointerCancel={clearHoldWatchers}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            if (!holding && !armed) beginHold();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            clearHoldWatchers();
          }
        }}
        className="absolute left-3 top-20 z-[1100] inline-flex min-h-12 min-w-12 items-center justify-center rounded-md bg-[#B91C1C] px-4 font-medium text-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
      >
        {holding ? `Hold… ${Math.min(100, Math.round((holdMs / SOS_HOLD_MS) * 100))}%` : "SOS"}
      </button>

      {armed ? (
        <div
          role="alertdialog"
          aria-labelledby="sos-title"
          className="sos-strobe absolute inset-0 z-[1300] flex flex-col items-center justify-center gap-4 p-4 text-[#0F172A]"
        >
          <h2 id="sos-title" className="text-2xl font-semibold">
            SOS active
          </h2>
          <p className="max-w-md text-center text-base">
            Siren is on. Send a message from your phone app, or slide to cancel.
          </p>
          {audioError ? (
            <p role="alert" className="text-base font-medium">
              {audioError}
            </p>
          ) : null}
          {gps.status === "loading" ? (
            <p role="status" className="text-base">
              Reading location for the SMS link…
            </p>
          ) : null}
          {gps.status === "error" ? (
            <p role="alert" className="max-w-md text-center text-base">
              {gps.message}
            </p>
          ) : null}

          <a
            href={sosSmsHref(smsLat, smsLng)}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#0F172A] px-5 text-base font-medium text-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
          >
            Send SMS Alert
          </a>
          {useFallback ? (
            <p className="text-sm">Using the origin from the route form if GPS is missing.</p>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(sosSmsBody(smsLat, smsLng));
                setCopyStatus("copied");
              } catch {
                setCopyStatus("error");
              }
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#1E293B] px-5 text-base font-medium text-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
          >
            Copy message
          </button>
          {copyStatus === "copied" ? <p role="status">Message copied.</p> : null}
          {copyStatus === "error" ? (
            <p role="alert">Could not copy. Use Send SMS Alert instead.</p>
          ) : null}

          <label className="w-full max-w-md text-base font-medium">
            Cancel Alert — slide and hold for 2 seconds
            <input
              type="range"
              min={0}
              max={100}
              value={slide}
              className="mt-2 h-12 w-full accent-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              onPointerDown={() => setSlideStartedAt(Date.now())}
              onChange={(event) => {
                const next = Number(event.target.value);
                setSlide(next);
                const started = slideStartedAt ?? Date.now();
                if (slideStartedAt === null) setSlideStartedAt(started);
                if (next >= 100 && Date.now() - started >= SOS_CANCEL_MS) {
                  stopAlarm();
                }
              }}
              onPointerUp={() => {
                if (slide < 100 || Date.now() - (slideStartedAt ?? 0) < SOS_CANCEL_MS) {
                  setSlide(0);
                  setSlideStartedAt(null);
                }
              }}
            />
          </label>
        </div>
      ) : null}
    </>
  );
}

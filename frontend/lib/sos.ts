export const SOS_HOLD_MS = 1500;
export const SOS_CANCEL_MS = 2000;

export function osmHelpUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export function sosSmsBody(lat?: number, lng?: number): string {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return "Kahayag SOS. I need help. Location was not available.";
  }
  return `Kahayag SOS. I need help. ${osmHelpUrl(lat, lng)}`;
}

export function sosSmsHref(lat?: number, lng?: number): string {
  return `sms:?body=${encodeURIComponent(sosSmsBody(lat, lng))}`;
}

export type SirenHandle = { stop: () => void };

export function startSiren(context: AudioContext): SirenHandle {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  gain.gain.value = 0.35;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.setValueAtTime(700, context.currentTime);
  oscillator.start();

  let high = false;
  const pulse = window.setInterval(() => {
    high = !high;
    oscillator.frequency.setValueAtTime(high ? 1400 : 700, context.currentTime);
  }, 280);

  return {
    stop() {
      window.clearInterval(pulse);
      try {
        oscillator.stop();
      } catch {
        /* already stopped */
      }
      oscillator.disconnect();
      gain.disconnect();
    },
  };
}

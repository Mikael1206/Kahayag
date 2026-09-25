import NightMapShell from "./components/NightMapShell";

const DISCLAIMER =
  "Notice: Kahayag route recommendations prioritize street lighting and visibility to improve nighttime safety, but cannot guarantee complete absence of crime or road hazards. Always remain vigilant of your surroundings.";

export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0F172A] text-[#E2E8F0]">
      <div className="absolute inset-0" aria-label="Night street map">
        <NightMapShell />
      </div>
      <p
        role="note"
        className="pointer-events-none absolute left-3 right-3 top-3 z-[1000] rounded-md bg-[#1E293B]/95 px-3 py-2 text-sm leading-snug tracking-normal text-[#E2E8F0] shadow-md"
      >
        {DISCLAIMER}
      </p>
    </div>
  );
}

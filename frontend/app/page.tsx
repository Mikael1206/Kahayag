import MapExperience from "./components/MapExperience";

const DISCLAIMER =
  "Notice: Kahayag route recommendations prioritize street lighting and visibility to improve nighttime safety, but cannot guarantee complete absence of crime or road hazards. Always remain vigilant of your surroundings.";

export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0F172A] text-[#E2E8F0]">
      <div className="absolute inset-0" aria-label="Night street map">
        <MapExperience />
      </div>
      <div className="absolute left-3 right-3 top-3 z-[1000] space-y-2">
        <p
          role="note"
          className="pointer-events-none rounded-md bg-[#1E293B]/95 px-3 py-2 text-sm leading-snug tracking-normal text-[#E2E8F0] shadow-md"
        >
          {DISCLAIMER}
        </p>
        <a
          href="/portal"
          className="inline-flex min-h-12 items-center rounded-md bg-[#1E293B] px-3 text-sm text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
        >
          Officials portal
        </a>
      </div>
    </div>
  );
}

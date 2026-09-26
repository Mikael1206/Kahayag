export const HAZARD_CATEGORIES = [
  { id: "busted_light", label: "Busted Light" },
  { id: "unlit_street", label: "No Poles/Pitch Black" },
  { id: "damaged_pole", label: "Damaged Pole/Wiring" },
  { id: "hazard", label: "Safety Concern" },
] as const;

export type HazardCategory = (typeof HAZARD_CATEGORIES)[number]["id"];

export type HazardPin = {
  id: string;
  lat: number;
  lng: number;
  category: HazardCategory;
  status: string;
  confirmCount: number;
  createdAt: string;
};

export const DEDUP_METERS = 25;

const CATEGORY_IDS = new Set(HAZARD_CATEGORIES.map((item) => item.id));

export function isHazardCategory(value: string): value is HazardCategory {
  return CATEGORY_IDS.has(value as HazardCategory);
}

export function categoryLabel(category: string): string {
  return HAZARD_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

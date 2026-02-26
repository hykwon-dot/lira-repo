import {
  INVESTIGATOR_REGION_OPTIONS,
  INVESTIGATOR_SPECIALTY_GROUPS,
  INVESTIGATOR_SPECIALTIES,
  CASE_TYPE_OPTIONS,
} from "@/lib/options";

// 1. Service Area Mapping
const REGION_MAP = new Map<string, string>();
INVESTIGATOR_REGION_OPTIONS.forEach((option) => {
  REGION_MAP.set(option.value, option.label);
});

// 2. Specialty Mapping (flattening the groups)
const SPECIALTY_MAP = new Map<string, string>();
INVESTIGATOR_SPECIALTIES.forEach((option) => {
  SPECIALTY_MAP.set(option.value, option.label);
});
// Also add group items just in case
INVESTIGATOR_SPECIALTY_GROUPS.forEach((group) => {
  group.options.forEach((opt) => {
    SPECIALTY_MAP.set(opt.value, opt.label);
  });
});
// 3. Case Type Mapping
CASE_TYPE_OPTIONS.forEach((option) => {
  if (!SPECIALTY_MAP.has(option.value)) {
    SPECIALTY_MAP.set(option.value, option.label);
  }
});

/**
 * Translates a single code (e.g. "SEOUL", "FIELD_TAIL") to Korean label.
 * Returns the code itself if no match found.
 */
export function translateCode(code: string | null | undefined): string {
  if (!code) return "";
  if (REGION_MAP.has(code)) return REGION_MAP.get(code)!;
  if (SPECIALTY_MAP.has(code)) return SPECIALTY_MAP.get(code)!;
  return code;
}

/**
 * Translates a comma-separated list of codes or a single code.
 * Example: "SEOUL,GYEONGGI" -> "서울, 경기"
 */
export function translateList(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .split(",")
    .map((s) => s.trim())
    .map((code) => translateCode(code))
    .join(", ");
}

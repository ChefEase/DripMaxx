export const BODY_TYPE_OPTIONS = [
  { label: "Slim", value: "slim" },
  { label: "Athletic", value: "athletic" },
  { label: "Average", value: "average" },
  { label: "Broad", value: "broad" },
  { label: "Plus Size", value: "plus_size" },
] as const;

export const GENDER_STYLE_OPTIONS = [
  { label: "Menswear", value: "menswear" },
  { label: "Womenswear", value: "womenswear" },
  { label: "Neutral", value: "neutral" },
] as const;

export type BodyTypeValue = (typeof BODY_TYPE_OPTIONS)[number]["value"];
export type GenderStyleValue = (typeof GENDER_STYLE_OPTIONS)[number]["value"];

const BODY_TYPE_LABELS: Record<BodyTypeValue, string> = Object.fromEntries(
  BODY_TYPE_OPTIONS.map((option) => [option.value, option.label])
) as Record<BodyTypeValue, string>;

const GENDER_STYLE_LABELS: Record<GenderStyleValue, string> = Object.fromEntries(
  GENDER_STYLE_OPTIONS.map((option) => [option.value, option.label])
) as Record<GenderStyleValue, string>;

export const normalizeBodyTypeValue = (value: string | null | undefined): BodyTypeValue | null => {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const match = BODY_TYPE_OPTIONS.find((option) => option.value === key);
  return match?.value ?? null;
};

export const normalizeGenderStyleValue = (
  value: string | null | undefined
): GenderStyleValue | null => {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const match = GENDER_STYLE_OPTIONS.find((option) => option.value === key);
  return match?.value ?? null;
};

export const bodyTypeLabel = (value: string | null | undefined): string => {
  const normalized = normalizeBodyTypeValue(value);
  return normalized ? BODY_TYPE_LABELS[normalized] : value || "n/a";
};

export const genderStyleLabel = (value: string | null | undefined): string => {
  const normalized = normalizeGenderStyleValue(value);
  return normalized ? GENDER_STYLE_LABELS[normalized] : value || "n/a";
};

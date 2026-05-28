export function buildOriginalDescription(
  description1: string,
  description2: string,
): string {
  return `${description1} ${description2}`.replace(/\s+/g, " ").trim();
}

export function normalizeDescription(description: string): string {
  return description.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeVendorForSimilarity(description: string): string {
  return description
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

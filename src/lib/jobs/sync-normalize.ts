/**
 * Pure helpers used by /api/jobs/sync.
 * Kept separate so unit tests can cover mapping without hitting the DB.
 */

export function parseLocation(location: string): {
  city: string;
  country: string;
} {
  if (!location) {
    return { city: "Remote", country: "Remote" };
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts[parts.length - 1],
    };
  }

  return {
    city: location,
    country: location,
  };
}

export function mapJobType(apiType: string): string {
  const type = apiType.toLowerCase();

  if (type.includes("full")) return "full-time";
  if (type.includes("part")) return "part-time";
  if (type.includes("contract")) return "contract";
  if (type.includes("freelance")) return "freelance";
  if (type.includes("intern")) return "internship";

  return "full-time";
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Guess currency from location/country text (not a forex API). */
export function guessCurrency(location: string, country: string): string {
  const text = `${location} ${country}`.toLowerCase();

  if (
    text.includes("germany") ||
    text.includes("france") ||
    text.includes("netherlands") ||
    text.includes("spain") ||
    text.includes("italy") ||
    text.includes("austria") ||
    text.includes("belgium") ||
    text.includes("ireland") ||
    text.includes("euro") ||
    text.includes("berlin") ||
    text.includes("munich") ||
    text.includes("amsterdam") ||
    text.includes("paris")
  ) {
    return "EUR";
  }

  if (
    text.includes("united kingdom") ||
    text.includes("uk") ||
    text.includes("england") ||
    text.includes("london") ||
    text.includes("scotland")
  ) {
    return "GBP";
  }

  if (text.includes("switzerland") || text.includes("zurich")) {
    return "CHF";
  }

  if (
    text.includes("canada") ||
    text.includes("toronto") ||
    text.includes("vancouver")
  ) {
    return "CAD";
  }

  if (
    text.includes("australia") ||
    text.includes("sydney") ||
    text.includes("melbourne")
  ) {
    return "AUD";
  }

  if (
    text.includes("india") ||
    text.includes("bangalore") ||
    text.includes("mumbai")
  ) {
    return "INR";
  }

  if (text.includes("japan") || text.includes("tokyo")) {
    return "JPY";
  }

  if (
    text.includes("united states") ||
    text.includes("usa") ||
    text.includes("new york") ||
    text.includes("san francisco") ||
    text.includes("remote")
  ) {
    return "USD";
  }

  return "USD";
}

/** Infer seniority from title + tags + description snippet. */
export function guessExperience(
  title: string,
  tags: string[] = [],
  description: string = ""
): string {
  const text = `${title} ${tags.join(" ")} ${description}`
    .toLowerCase()
    .slice(0, 2000);

  if (
    text.includes("intern") ||
    text.includes("internship") ||
    text.includes("entry-level") ||
    text.includes("entry level") ||
    text.includes("junior") ||
    text.includes("graduate")
  ) {
    return "entry";
  }

  if (
    text.includes("senior") ||
    text.includes("sr.") ||
    text.includes("staff ") ||
    text.includes("principal") ||
    text.includes("lead ") ||
    text.includes("head of")
  ) {
    return "senior";
  }

  if (
    text.includes("mid-level") ||
    text.includes("mid level") ||
    text.includes("intermediate")
  ) {
    return "mid";
  }

  return "mid";
}

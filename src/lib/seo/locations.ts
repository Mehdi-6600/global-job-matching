/**
 * Curated location SEO registry.
 * Only these slugs can become indexable location pages (no arbitrary thin URLs).
 * Matching is done with case-insensitive contains on Job.location, or remote=true.
 */

export type LocationSeoDef = {
  slug: string;
  name: string;
  /** Strings matched against job.location (OR). Empty if remoteOnly. */
  matchers: string[];
  /** If true, page lists remote jobs (Job.remote = true). */
  remoteOnly?: boolean;
  /** Short intro for H1 section — English, neutral, not keyword-stuffed */
  intro: string;
};

export const LOCATION_SEO: LocationSeoDef[] = [
  {
    slug: "remote",
    name: "Remote",
    matchers: [],
    remoteOnly: true,
    intro:
      "Browse active remote roles listed on Global Job Matching. Filter further on the main jobs board if you need a specific skill or timezone.",
  },
  {
    slug: "germany",
    name: "Germany",
    matchers: ["germany", "deutschland", "berlin", "munich", "hamburg", "frankfurt"],
    intro:
      "Explore open positions linked to Germany on Global Job Matching — including on-site and hybrid roles where employers listed a German location.",
  },
  {
    slug: "berlin",
    name: "Berlin",
    matchers: ["berlin"],
    intro:
      "Jobs that mention Berlin in the location field. Always confirm work mode (on-site, hybrid, or remote) on the job detail page.",
  },
  {
    slug: "united-kingdom",
    name: "United Kingdom",
    matchers: ["united kingdom", "uk", "london", "manchester", "edinburgh"],
    intro:
      "Active listings associated with the United Kingdom. Check each posting for visa or eligibility notes from the employer.",
  },
  {
    slug: "london",
    name: "London",
    matchers: ["london"],
    intro:
      "Roles that reference London as a location. Review salary currency and work arrangement on the full job page.",
  },
  {
    slug: "united-states",
    name: "United States",
    matchers: ["united states", "usa", "u.s.", "new york", "san francisco", "austin", "seattle"],
    intro:
      "Job posts tied to the United States in their location text. Requirements vary widely by state and employer.",
  },
  {
    slug: "canada",
    name: "Canada",
    matchers: ["canada", "toronto", "vancouver", "montreal", "ottawa"],
    intro:
      "Listings connected to Canada. Use the job detail page for seniority, language, and work authorization details.",
  },
  {
    slug: "australia",
    name: "Australia",
    matchers: ["australia", "sydney", "melbourne", "brisbane"],
    intro:
      "Open roles associated with Australia. Confirm sponsorship and remote policy directly on each posting.",
  },
  {
    slug: "netherlands",
    name: "Netherlands",
    matchers: ["netherlands", "holland", "amsterdam", "rotterdam", "utrecht"],
    intro:
      "Jobs mentioning the Netherlands or major Dutch cities. Check language requirements on the full description.",
  },
  {
    slug: "france",
    name: "France",
    matchers: ["france", "paris", "lyon", "marseille"],
    intro:
      "Listings linked to France. Employer language and contract type are specified on each job page when provided.",
  },
  {
    slug: "uae",
    name: "United Arab Emirates",
    matchers: ["uae", "united arab emirates", "dubai", "abu dhabi"],
    intro:
      "Roles associated with the UAE. Contract and sponsorship terms depend on the employer listing.",
  },
  {
    slug: "india",
    name: "India",
    matchers: ["india", "bangalore", "bengaluru", "hyderabad", "mumbai", "delhi", "pune"],
    intro:
      "Active jobs that reference India or major Indian tech hubs in the location field.",
  },
];

export function getLocationDef(slug: string): LocationSeoDef | undefined {
  const s = String(slug || "")
    .toLowerCase()
    .trim();
  return LOCATION_SEO.find((x) => x.slug === s);
}

export function allLocationSlugs(): string[] {
  return LOCATION_SEO.map((x) => x.slug);
}

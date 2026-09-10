import { describe, it, expect } from "vitest";
import {
  parseLocation,
  mapJobType,
  stripHtml,
  generateSlug,
  guessCurrency,
  guessExperience,
} from "./sync-normalize";

describe("parseLocation", () => {
  it("splits city and country", () => {
    expect(parseLocation("Berlin, Germany")).toEqual({
      city: "Berlin",
      country: "Germany",
    });
  });

  it("defaults empty to Remote", () => {
    expect(parseLocation("")).toEqual({
      city: "Remote",
      country: "Remote",
    });
  });
});

describe("mapJobType", () => {
  it("maps common labels", () => {
    expect(mapJobType("Full Time")).toBe("full-time");
    expect(mapJobType("part-time")).toBe("part-time");
    expect(mapJobType("Contract")).toBe("contract");
    expect(mapJobType("unknown")).toBe("full-time");
  });
});

describe("stripHtml", () => {
  it("removes tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
});

describe("generateSlug", () => {
  it("slugifies company names", () => {
    expect(generateSlug("Acme GmbH!")).toBe("acme-gmbh");
  });
});

describe("guessCurrency", () => {
  it("detects EUR and GBP", () => {
    expect(guessCurrency("Berlin", "Germany")).toBe("EUR");
    expect(guessCurrency("London", "UK")).toBe("GBP");
  });
});

describe("guessExperience", () => {
  it("detects seniority keywords", () => {
    expect(guessExperience("Senior Engineer")).toBe("senior");
    expect(guessExperience("Junior Developer")).toBe("entry");
    expect(guessExperience("Software Engineer")).toBe("mid");
  });
});

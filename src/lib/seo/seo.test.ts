import { describe, it, expect } from "vitest";
import {
  stripHtml,
  toSchemaEmploymentType,
  jsonLdScript,
  buildPublicMetadata,
  DEFAULT_OG_PATH,
} from "@/lib/seo/core";
import {
  jobPostingJsonLd,
  breadcrumbJsonLd,
  companyOrganizationJsonLd,
  itemListJsonLd,
  faqPageJsonLd,
} from "@/lib/seo/json-ld";
import { jobBreadcrumbs } from "@/lib/seo/breadcrumbs";

describe("seo core", () => {
  it("stripHtml removes tags and collapses space", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("toSchemaEmploymentType maps common values", () => {
    expect(toSchemaEmploymentType("full-time")).toBe("FULL_TIME");
    expect(toSchemaEmploymentType("Part Time")).toBe("PART_TIME");
    expect(toSchemaEmploymentType("contract")).toBe("CONTRACTOR");
  });

  it("escapes json-ld script", () => {
    expect(jsonLdScript({ a: "<script>" })).toContain("\\u003c");
  });

  it("buildPublicMetadata sets canonical and default OG image", () => {
    const meta = buildPublicMetadata({
      title: "Test",
      description: "Desc",
      path: "/about",
    });
    expect(meta.alternates?.canonical).toBeTruthy();
    expect(meta.openGraph?.images).toBeTruthy();
    expect(DEFAULT_OG_PATH).toBe("/opengraph-image");
  });
});

describe("json-ld builders", () => {
  it("builds job posting without inventing salary", () => {
    const ld = jobPostingJsonLd({
      id: "job1",
      title: "Engineer",
      description: "Build things",
      location: "Berlin",
      remote: false,
      type: "full_time",
      salaryMin: null,
      salaryMax: null,
      currency: "USD",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      deadline: null,
      company: { name: "Acme", logo: null, website: null },
    });
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.baseSalary).toBeUndefined();
    expect(ld.title).toBe("Engineer");
  });

  it("builds breadcrumbs", () => {
    const items = jobBreadcrumbs({
      jobTitle: "Engineer",
      jobId: "j1",
      companyName: "Acme",
      companyId: "c1",
    });
    const ld = breadcrumbJsonLd(items);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(4);
  });

  it("builds organization", () => {
    const ld = companyOrganizationJsonLd({
      id: "c1",
      name: "Acme",
      description: "A company",
      location: "Berlin",
      website: "https://example.com",
      logo: null,
    });
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Acme");
  });

  it("builds itemListJsonLd", () => {
    const ld = itemListJsonLd({
      name: "Jobs",
      path: "/jobs",
      items: [
        { name: "A", path: "/jobs/1" },
        { name: "B", path: "/jobs/2" },
      ],
    });
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.numberOfItems).toBe(2);
  });

  it("builds faqPageJsonLd", () => {
    const ld = faqPageJsonLd([
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
    ]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import {
  stripHtml,
  toSchemaEmploymentType,
  jsonLdScript,
} from "@/lib/seo/core";
import {
  jobPostingJsonLd,
  breadcrumbJsonLd,
  companyOrganizationJsonLd,
} from "@/lib/seo/json-ld";
import { jobBreadcrumbs } from "@/lib/seo/breadcrumbs";

describe("seo core", () => {
  it("strips html", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("maps employment types", () => {
    expect(toSchemaEmploymentType("full-time")).toBe("FULL_TIME");
    expect(toSchemaEmploymentType("Part Time")).toBe("PART_TIME");
    expect(toSchemaEmploymentType("contract")).toBe("CONTRACTOR");
  });

  it("escapes json-ld script", () => {
    expect(jsonLdScript({ a: "<script>" })).toContain("\\u003c");
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
});

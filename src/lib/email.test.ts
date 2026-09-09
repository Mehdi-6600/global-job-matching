import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  buildEmployerEmailHtml,
} from "./email";

describe("escapeHtml", () => {
  it("escapes reserved characters", () => {
    expect(escapeHtml(`a<b>"c"&d`)).toBe("a&lt;b&gt;&quot;c&quot;&amp;d");
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("buildEmployerEmailHtml", () => {
  it("includes applicant, job, and company", () => {
    const html = buildEmployerEmailHtml({
      employerName: "Alex",
      applicantName: "Sam",
      applicantEmail: "sam@example.com",
      jobTitle: "Frontend Developer",
      companyName: "Acme",
      message: "Hello\nWorld",
      jobUrl: "https://example.com/jobs/1",
    });

    expect(html).toContain("Sam");
    expect(html).toContain("sam@example.com");
    expect(html).toContain("Frontend Developer");
    expect(html).toContain("Acme");
    expect(html).toContain("Hello<br/>World");
    expect(html).toContain("https://example.com/jobs/1");
  });

  it("escapes HTML injected into message", () => {
    const html = buildEmployerEmailHtml({
      applicantName: "Sam",
      applicantEmail: "sam@example.com",
      jobTitle: "Role",
      companyName: "Co",
      message: '<script>alert("x")</script>',
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

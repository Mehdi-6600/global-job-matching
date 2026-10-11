import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProcessingStatus } from "./processing-status";

function render(props: Parameters<typeof ProcessingStatus>[0]) {
  return renderToStaticMarkup(createElement(ProcessingStatus, props));
}

describe("ProcessingStatus", () => {
  it("is visually hidden but still mounted while idle", () => {
    const html = render({ state: "idle", title: "Should not show" });
    expect(html).toContain("sr-only");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Should not show");
  });

  it("shows a busy, polite status with a progress track while processing", () => {
    const html = render({ state: "processing", title: "Generating..." });
    expect(html).toContain("Generating...");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("gjm-processing__track");
    expect(html).not.toContain("sr-only");
  });

  it("shows completion without a progress track", () => {
    const html = render({
      state: "success",
      title: "Application submitted",
      description: "Sent.",
    });
    expect(html).toContain("Application submitted");
    expect(html).toContain("Sent.");
    expect(html).toContain('data-state="success"');
    expect(html).not.toContain("gjm-processing__track");
  });

  it("announces errors assertively", () => {
    const html = render({ state: "error", title: "Failed" });
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('data-state="error"');
  });

  it("drops the live role when a nearby control already announces", () => {
    const html = render({
      state: "processing",
      title: "Analyzing...",
      announce: false,
    });
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("aria-live");
    expect(html).toContain("Analyzing...");
  });
});

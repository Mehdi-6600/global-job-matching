import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DynamicButton } from "./dynamic-button";

// Markup-level checks run in the Node test env (no DOM dependency).
// Click guards and focus behavior are verified in a real browser.
function render(props: Parameters<typeof DynamicButton>[0]) {
  return renderToStaticMarkup(createElement(DynamicButton, props));
}

describe("DynamicButton markup", () => {
  it("renders the idle label with the icon and no live announcement", () => {
    const html = render({
      children: "Apply now",
      icon: createElement("svg", { "data-testid": "icon" }),
    });
    expect(html).toContain("Apply now");
    expect(html).toContain('data-status="idle"');
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain('type="button"');
    expect(html).not.toContain("aria-disabled");
    // The live region exists, but is empty while idle.
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"[^>]*><\/span>/);
  });

  it("uses aria-disabled (not disabled) while loading so focus is kept", () => {
    const html = render({
      children: "Apply now",
      status: "loading",
      loadingLabel: "Applying...",
    });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/<button[^>]* disabled=""/);
    expect(html).toContain("Applying...");
    // The loading label is announced politely.
    expect(html).toMatch(/aria-live="polite"[^>]*>Applying\.\.\.<\/span>/);
  });

  it("uses native disabled when the caller disables it", () => {
    const html = render({ children: "Send", disabled: true });
    expect(html).toMatch(/<button[^>]* disabled=""/);
    expect(html).not.toContain("aria-disabled");
  });

  it("announces success and error labels assertively on error", () => {
    const success = render({
      children: "Send",
      status: "success",
      successLabel: "Sent",
    });
    expect(success).toContain('data-status="success"');
    expect(success).toMatch(/aria-live="polite"[^>]*>Sent<\/span>/);

    const error = render({
      children: "Send",
      status: "error",
      errorLabel: "Something went wrong",
    });
    expect(error).toContain('data-status="error"');
    expect(error).toMatch(
      /aria-live="assertive"[^>]*>Something went wrong<\/span>/,
    );
  });

  it("can suppress its announcement when a nearby live region covers it", () => {
    const html = render({
      children: "Generate",
      status: "loading",
      loadingLabel: "Generating...",
      announce: false,
    });
    // The live region is rendered but empty; the visible label is not announced twice.
    expect(html).toMatch(/role="status"[^>]*class="sr-only"><\/span>/);
    expect(html).toContain('data-status="loading"');
  });

  it("mirrors directional icons only when asked", () => {
    const icon = createElement("svg");
    expect(render({ children: "Go", icon, mirrorIconInRtl: true })).toContain(
      'data-mirror="true"',
    );
    expect(render({ children: "Go", icon })).not.toContain("data-mirror");
  });

  it("keeps the secondary variant and size tokens as data attributes", () => {
    const html = render({ children: "Close", variant: "secondary", size: "sm" });
    expect(html).toContain('data-variant="secondary"');
    expect(html).toContain('data-size="sm"');
  });

  it("does not inline a measured width during SSR", () => {
    // The width is measured on the client, so SSR output must not include one.
    const html = render({ children: "Apply now" });
    expect(html).not.toMatch(/<button[^>]* style="[^"]*width/);
  });
});

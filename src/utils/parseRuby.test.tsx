import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { parseRuby } from "./parseRuby";
import { createElement } from "react";

// Helper to render parseRuby output and get the HTML string
function renderToHTML(text: string): string {
  const result = render(createElement("span", null, parseRuby(text)));
  return result.container.querySelector("span")!.innerHTML;
}

describe("parseRuby", () => {
  it("returns plain text unchanged", () => {
    expect(renderToHTML("プリキー！")).toBe("プリキー！");
  });

  it("converts single annotation to ruby element", () => {
    const html = renderToHTML("[漢字]{かんじ}");
    expect(html).toBe(
      "<ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>"
    );
  });

  it("converts multiple annotations in one string", () => {
    const html = renderToHTML("[店内]{てんない}に[響]{ひび}いた");
    expect(html).toContain("<ruby>店内<rp>(</rp><rt>てんない</rt><rp>)</rp></ruby>");
    expect(html).toContain("に");
    expect(html).toContain("<ruby>響<rp>(</rp><rt>ひび</rt><rp>)</rp></ruby>");
    expect(html).toContain("いた");
  });

  it("handles empty string", () => {
    expect(renderToHTML("")).toBe("");
  });

  it("handles text with no kanji (only kana/katakana)", () => {
    expect(renderToHTML("これはテストです")).toBe("これはテストです");
  });

  it("handles annotation at start of string", () => {
    const html = renderToHTML("[何]{なに}コール？");
    expect(html).toContain("<ruby>何<rp>(</rp><rt>なに</rt><rp>)</rp></ruby>");
    expect(html).toContain("コール？");
  });

  it("handles annotation at end of string", () => {
    const html = renderToHTML("これは[何]{なに}");
    expect(html).toContain("これは");
    expect(html).toContain("<ruby>何<rp>(</rp><rt>なに</rt><rp>)</rp></ruby>");
  });

  it("handles adjacent annotations", () => {
    const html = renderToHTML("[店内]{てんない}[限定]{げんてい}");
    expect(html).toContain("<ruby>店内<rp>(</rp><rt>てんない</rt><rp>)</rp></ruby>");
    expect(html).toContain("<ruby>限定<rp>(</rp><rt>げんてい</rt><rp>)</rp></ruby>");
  });
});

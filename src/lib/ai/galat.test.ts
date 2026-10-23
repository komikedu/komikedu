import { describe, expect, it } from "vitest";
import { kuotaHabis } from "./galat";

describe("kuotaHabis", () => {
  it("mengenali galat 429 batas belanja Gemini", () => {
    const e = new Error('{"error":{"code":429,"message":"Your project has exceeded its monthly spending cap.","status":"RESOURCE_EXHAUSTED"}}');
    expect(kuotaHabis(e)).toBe(true);
    expect(kuotaHabis(Object.assign(new Error("x"), { status: 429 }))).toBe(true);
  });

  it("galat lain bukan kuota", () => {
    expect(kuotaHabis(new Error("Model tidak mengembalikan gambar (kemungkinan diblokir moderasi)"))).toBe(false);
    expect(kuotaHabis(null)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { cariMention, saringNama, sisipkanMention } from "./mention";

describe("mention tokoh", () => {
  it("mengenali @ sebelum kursor", () => {
    expect(cariMention("Siti menunjuk @Jo", 17)).toEqual({ awal: 14, query: "Jo" });
    expect(cariMention("@", 1)).toEqual({ awal: 0, query: "" });
    expect(cariMention("Bersama @Bu Ri", 14)).toEqual({ awal: 8, query: "Bu Ri" });
    expect(cariMention("email a@b", 9)).toBeNull();
    expect(cariMention("Siti menunjuk", 13)).toBeNull();
  });

  it("menyaring nama per kata", () => {
    const nama = ["Joko", "Bu Rina", "Pintar"];
    expect(saringNama(nama, "")).toEqual(nama);
    expect(saringNama(nama, "ri")).toEqual(["Bu Rina"]);
    expect(saringNama(nama, "bu r")).toEqual(["Bu Rina"]);
    expect(saringNama(nama, "x")).toEqual([]);
  });

  it("menyisipkan nama tanpa @ dan menaruh kursor setelahnya", () => {
    expect(sisipkanMention("Siti dan @Jo", 9, 12, "Joko")).toEqual({ teks: "Siti dan Joko ", kursor: 14 });
    expect(sisipkanMention("@Jo melihat", 0, 3, "Joko")).toEqual({ teks: "Joko melihat", kursor: 4 });
  });
});

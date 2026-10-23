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

describe("pecahNama", () => {
  it("menandai nama tokoh sebagai kata utuh, apa pun huruf besar-kecilnya", async () => {
    const { pecahNama } = await import("./mention");
    const hasil = pecahNama("joko dan Budi bermain, Jokowi lewat", ["Joko", "Budi"]);
    expect(hasil.filter((p) => p.tokoh).map((p) => p.teks)).toEqual(["joko", "Budi"]);
    expect(hasil.map((p) => p.teks).join("")).toBe("joko dan Budi bermain, Jokowi lewat");
  });

  it("nama yang lebih panjang didahulukan dan karakter khusus aman", async () => {
    const { pecahNama } = await import("./mention");
    expect(pecahNama("Bu Rina menulis", ["Bu", "Bu Rina"]).filter((p) => p.tokoh).map((p) => p.teks)).toEqual(["Bu Rina"]);
    expect(pecahNama("a.b (c)", ["a.b"]).filter((p) => p.tokoh)).toHaveLength(1);
    expect(pecahNama("tanpa tokoh", [])).toEqual([{ teks: "tanpa tokoh", tokoh: false }]);
    expect(pecahNama("", ["Joko"])).toEqual([{ teks: "", tokoh: false }]);
  });
});

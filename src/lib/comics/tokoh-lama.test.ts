import { describe, expect, it } from "vitest";
import { kumpulkanTokohLama } from "./tokoh-lama";

const t = (id: string, nama: string, preset = false) => ({ id, nama, peran: "", deskripsi: "ciri", preset });

describe("kumpulkanTokohLama", () => {
  it("memakai tokoh buatan sendiri, satu per nama, dan melewati komik ini", () => {
    const hasil = kumpulkanTokohLama(
      [
        { id: "a", judul: "A", tokoh_json: [t("1", "Kancil"), t("2", "Bima", true)] },
        { id: "b", judul: "B", tokoh_json: [t("3", "kancil"), t("4", "Buaya")] },
        { id: "ini", judul: "Ini", tokoh_json: [t("5", "Rahasia")] },
        { id: "c", judul: "C", tokoh_json: null },
      ],
      "ini",
    );
    expect(hasil.map((h) => [h.tokoh.nama, h.judulKomik])).toEqual([
      ["Kancil", "A"],
      ["Buaya", "B"],
    ]);
  });
});

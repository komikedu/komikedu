import { describe, expect, it } from "vitest";
import { checkScript } from "./check";
import type { Script } from "./schemas";

const panel = (hasil: number, teks = "Tiga per empat ditambah satu per empat sama dengan satu.") => ({
  urutan: 1,
  adegan: "Guru di depan papan tulis",
  karakter: ["Bu Rina"],
  dialog: [{ karakter: "Bu Rina", jenis: "bicara" as const, teks }],
  hitungan: [{ ekspresi: "3/4 + 1/4", hasilTertulis: hasil }],
});

const script = (p: ReturnType<typeof panel>): Script => ({ halaman: [{ urutan: 1, panel: [p] }] });

describe("checkScript", () => {
  it("lolos jika hitungan benar", () => {
    expect(checkScript(script(panel(1)))).toEqual([]);
  });

  it("menandai hitungan salah", () => {
    const flags = checkScript(script(panel(2)));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ jenis: "hitungan", halaman: 1, panel: 1 });
  });

  it("menandai balon lebih dari 25 kata", () => {
    const panjang = Array(26).fill("kata").join(" ");
    const flags = checkScript(script(panel(1, panjang)));
    expect(flags.map((f) => f.jenis)).toEqual(["panjang-balon"]);
  });
});

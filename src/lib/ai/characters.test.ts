import { describe, expect, it } from "vitest";
import { namaTokoh } from "./tokoh";

describe("namaTokoh", () => {
  it("mengumpulkan nama unik dari karakter panel dan pembicara, tanpa narator", () => {
    expect(
      namaTokoh([
        { karakter: ["Kiki", "Doni"], dialog: [{ karakter: "Narasi" }, { karakter: "Kiki" }] },
        { karakter: [], dialog: [{ karakter: "Bu Rina" }, { karakter: "doni " }] },
      ]),
    ).toEqual(["Kiki", "Doni", "Bu Rina"]);
  });

  it("maksimal 8 tokoh", () => {
    expect(namaTokoh([{ karakter: Array.from({ length: 12 }, (_, i) => `T${i}`) }])).toHaveLength(8);
  });
});

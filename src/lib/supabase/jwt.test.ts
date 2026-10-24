import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifikasiTokenHS256 } from "./jwt";

const RAHASIA = "rahasia-uji-hanya-untuk-tes";
const b64 = (o: object | Buffer) => Buffer.from(Buffer.isBuffer(o) ? o : JSON.stringify(o)).toString("base64url");

function buat(payload: object, { rahasia = RAHASIA, alg = "HS256" }: { rahasia?: string; alg?: string } = {}) {
  const h = b64({ alg, typ: "JWT" });
  const p = b64(payload);
  const tanda = alg === "none" ? "" : b64(createHmac("sha256", rahasia).update(`${h}.${p}`).digest());
  return `${h}.${p}.${tanda}`;
}

const SEKARANG = 1_800_000_000;
const sah = { sub: "6f4e8c02-e6c5-4739-95f9-405c8083cc7c", email: "guru@sekolah.id", role: "authenticated", aud: "authenticated", exp: SEKARANG + 3600 };

describe("verifikasiTokenHS256", () => {
  it("menerima token sah dan mengembalikan klaimnya", async () => {
    expect(await verifikasiTokenHS256(buat(sah), RAHASIA, SEKARANG)).toEqual({ sub: sah.sub, email: "guru@sekolah.id", exp: sah.exp });
  });
  it("menolak tanda tangan dari rahasia lain dan token yang diubah isinya", async () => {
    expect(await verifikasiTokenHS256(buat(sah, { rahasia: "rahasia-lain" }), RAHASIA, SEKARANG)).toBeNull();
    const [h, , t] = buat(sah).split(".");
    expect(await verifikasiTokenHS256(`${h}.${b64({ ...sah, sub: "pengguna-lain" })}.${t}`, RAHASIA, SEKARANG)).toBeNull();
  });
  it("menolak token kedaluwarsa", async () => {
    expect(await verifikasiTokenHS256(buat({ ...sah, exp: SEKARANG - 1 }), RAHASIA, SEKARANG)).toBeNull();
    expect(await verifikasiTokenHS256(buat({ ...sah, exp: undefined }), RAHASIA, SEKARANG)).toBeNull();
  });
  it("menolak algoritma none dan algoritma selain HS256", async () => {
    expect(await verifikasiTokenHS256(buat(sah, { alg: "none" }), RAHASIA, SEKARANG)).toBeNull();
    expect(await verifikasiTokenHS256(buat(sah, { alg: "HS512" }), RAHASIA, SEKARANG)).toBeNull();
  });
  it("menolak kunci anon dan service_role (bukan pengguna terautentikasi) dan token tanpa sub", async () => {
    expect(await verifikasiTokenHS256(buat({ role: "anon", exp: SEKARANG + 100 }), RAHASIA, SEKARANG)).toBeNull();
    expect(await verifikasiTokenHS256(buat({ role: "service_role", exp: SEKARANG + 100 }), RAHASIA, SEKARANG)).toBeNull();
    expect(await verifikasiTokenHS256(buat({ ...sah, sub: undefined }), RAHASIA, SEKARANG)).toBeNull();
  });
  it("menolak masukan rusak tanpa melempar galat", async () => {
    for (const t of ["", "a.b", "a.b.c", "bukan-jwt", "...", `${b64({ alg: "HS256" })}.%%%.xxx`]) expect(await verifikasiTokenHS256(t, RAHASIA, SEKARANG)).toBeNull();
    expect(await verifikasiTokenHS256(buat(sah), "", SEKARANG)).toBeNull();
  });
});

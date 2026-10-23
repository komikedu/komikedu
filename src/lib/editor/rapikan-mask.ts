/**
 * Perapian mask alpha hasil model hapus latar. MODNet sering memberi alpha setengah-transparan di bagian terang
 * (baju putih) atau meninggalkan serpihan (garis balon, ujung meja); di sini mask dibiner, celahnya ditutup,
 * lubang di dalam tokoh diisi, pecahan kecil dibuang, lalu tepinya dihaluskan.
 */

const TERANG = 96; // alpha >= ini dianggap bagian tokoh
const MAKS_LUBANG = 0.15; // lubang tertutup yang lebih kecil dari ini (dari luas tokoh) ikut diisi
const MIN_KOMPONEN = 0.06; // pecahan lebih kecil dari ini (dari komponen terbesar) dibuang

/** Filter maks/min persegi dipisah per sumbu (radius r). `maks` true = dilasi, false = erosi. */
function filterKotak(src: Uint8Array, w: number, h: number, r: number, maks: boolean): Uint8Array {
  const kosong = maks ? 0 : 1;
  const tmp = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) {
      let v = kosong;
      const a = Math.max(0, x - r);
      const b = Math.min(w - 1, x + r);
      for (let k = a; k <= b; k++) {
        if (src[o + k] === (maks ? 1 : 0)) {
          v = maks ? 1 : 0;
          break;
        }
      }
      tmp[o + x] = v;
    }
  }
  const out = new Uint8Array(src.length);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = kosong;
      const a = Math.max(0, y - r);
      const b = Math.min(h - 1, y + r);
      for (let k = a; k <= b; k++) {
        if (tmp[k * w + x] === (maks ? 1 : 0)) {
          v = maks ? 1 : 0;
          break;
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

/** Label komponen terhubung (4-arah) bernilai `nilai`; mengembalikan label per piksel dan luas tiap label (indeks 1..n). */
function komponen(m: Uint8Array, w: number, h: number, nilai: number) {
  const label = new Int32Array(m.length);
  const luas: number[] = [0];
  const antri = new Int32Array(m.length);
  for (let s = 0; s < m.length; s++) {
    if (m[s] !== nilai || label[s]) continue;
    const id = luas.length;
    let kepala = 0;
    let ekor = 0;
    antri[ekor++] = s;
    label[s] = id;
    while (kepala < ekor) {
      const p = antri[kepala++];
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && m[p - 1] === nilai && !label[p - 1]) (label[p - 1] = id), (antri[ekor++] = p - 1);
      if (x < w - 1 && m[p + 1] === nilai && !label[p + 1]) (label[p + 1] = id), (antri[ekor++] = p + 1);
      if (y > 0 && m[p - w] === nilai && !label[p - w]) (label[p - w] = id), (antri[ekor++] = p - w);
      if (y < h - 1 && m[p + w] === nilai && !label[p + w]) (label[p + w] = id), (antri[ekor++] = p + w);
    }
    luas.push(ekor);
  }
  return { label, luas };
}

/** Buram kotak (rata-rata) radius r pada mask 0/255 untuk tepi yang tidak bergerigi. */
function haluskan(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r < 1) return Uint8Array.from(m, (v) => v * 255);
  const tmp = new Float32Array(m.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = Math.max(0, x - r);
      const b = Math.min(w - 1, x + r);
      let jml = 0;
      for (let k = a; k <= b; k++) jml += m[y * w + k];
      tmp[y * w + x] = jml / (b - a + 1);
    }
  }
  const out = new Uint8Array(m.length);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const a = Math.max(0, y - r);
      const b = Math.min(h - 1, y + r);
      let jml = 0;
      for (let k = a; k <= b; k++) jml += tmp[k * w + x];
      out[y * w + x] = Math.round((jml / (b - a + 1)) * 255);
    }
  }
  return out;
}

/** Mask alpha 0..255 (ukuran w x h) -> mask alpha yang sudah dirapikan, dengan tepi halus. */
export function rapikanMask(alpha: ArrayLike<number>, w: number, h: number): Uint8Array {
  const sisi = Math.min(w, h);
  const rTutup = Math.max(1, Math.round(sisi * 0.035));
  const rHalus = Math.max(1, Math.round(sisi * 0.004));

  let m: Uint8Array = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) m[i] = alpha[i] >= TERANG ? 1 : 0;

  // 1. tutup celah kecil (dilasi lalu erosi); piksel di luar gambar diabaikan sehingga erosi tidak memakan tepi gambar
  m = filterKotak(filterKotak(m, w, h, rTutup, true), w, h, rTutup, false);

  // 2. buang pecahan kecil, simpan komponen yang cukup besar
  const fg = komponen(m, w, h, 1);
  const terbesar = Math.max(0, ...fg.luas);
  if (terbesar === 0) return new Uint8Array(alpha.length);
  let luasTokoh = 0;
  for (let i = 1; i < fg.luas.length; i++) if (fg.luas[i] >= terbesar * MIN_KOMPONEN) luasTokoh += fg.luas[i];
  for (let i = 0; i < m.length; i++) m[i] = fg.luas[fg.label[i]] >= terbesar * MIN_KOMPONEN && fg.label[i] ? 1 : 0;

  // 3. isi lubang tertutup yang kecil (bukan latar yang terkurung lengan, itu biasanya luas)
  const bg = komponen(m, w, h, 0);
  const menyentuhTepi = new Set<number>();
  for (let x = 0; x < w; x++) (menyentuhTepi.add(bg.label[x]), menyentuhTepi.add(bg.label[(h - 1) * w + x]));
  for (let y = 0; y < h; y++) (menyentuhTepi.add(bg.label[y * w]), menyentuhTepi.add(bg.label[y * w + w - 1]));
  for (let i = 0; i < m.length; i++) {
    const l = bg.label[i];
    if (l && !menyentuhTepi.has(l) && bg.luas[l] <= luasTokoh * MAKS_LUBANG) m[i] = 1;
  }

  // 4. tepi halus
  return haluskan(m, w, h, rHalus);
}

import { buildPortraitPrompt } from "@/lib/ai/page-prompt";
import { GAYA } from "@/lib/comics/schema";
import type { Tokoh } from "@/lib/comics/tokoh";

export type BentukPrompt = "potret" | "badan";

/**
 * Deskripsi gaya untuk prompt yang ditempel di ChatGPT atau Flow. Layanan itu menolak prompt yang terbaca meniru karya
 * pihak ketiga ("kemiripan dengan konten pihak ketiga"), jadi istilah yang menunjuk genre atau produk media
 * (sitkom, serial animasi, anime, manga, kawaii, game) diganti ciri visualnya saja. Prompt di aplikasi tetap memakai gaya aslinya.
 */
const GAYA_SALIN: Record<string, string> = {
  "kartun-cerah":
    "ilustrasi buku cerita anak yang lembut dan ramah, bentuk tubuh dan kepala membulat dengan proporsi imut, garis tepi tipis berwarna cokelat tua, pewarnaan dua nada dengan bayangan lembut, warna pastel cerah yang hangat, wajah ceria",
  "anime-lembut": "ilustrasi digital yang lembut, mata besar, warna pastel, pencahayaan hangat",
  "buku-cerita": "ilustrasi buku cerita anak dengan cat air, tekstur kertas, warna hangat",
  "kartun-sitkom": "kartun vektor datar 2D, garis tepi hitam tebal dan seragam, warna datar tanpa gradasi, ekspresi lucu yang dilebih-lebihkan, mata bulat dengan pupil kecil, tampilan vektor bersih",
  "chibi-petualangan": "ilustrasi imut berproporsi semi-chibi, mata besar ekspresif, wajah ceria, pewarnaan cel-shaded dengan bayangan 1 sampai 2 nada, warna cerah, garis tepi bersih, latar padang rumput yang rimbun dan penuh warna",
  faceless:
    "ilustrasi vektor datar minimalis, tokoh TANPA WAJAH: kepala berupa bentuk bulat polos tanpa mata, tanpa hidung, tanpa mulut, tanpa alis, tokoh dibedakan lewat rambut, pakaian, aksesori, dan warna kulit, bentuk tubuh sederhana membulat, garis tepi bersih dan tipis, warna datar dengan palet terbatas",
  "komik-hitam-putih": "ilustrasi hitam putih dengan tinta, hanya hitam, putih, dan abu-abu tanpa warna lain, garis tepi tebal dan tegas, kontras tinggi, bayangan abu-abu dengan arsiran titik halus, mata besar ekspresif",
};

/**
 * Prompt untuk membuat potret atau badan penuh tokoh di ChatGPT atau Google Flow (ditempel guru sendiri), memakai gaya
 * gambar yang dipilih di komik ini. Rasio gambar ditambahkan karena layanan itu tidak mengatur ukuran dari prompt, dan
 * tokoh ditegaskan orisinal agar tidak dianggap meniru karakter yang sudah ada.
 */
export function promptTokohSalin(tokoh: Pick<Tokoh, "nama" | "deskripsi">, gayaId: string | null, bentuk: BentukPrompt): string {
  const gaya = GAYA.find((g) => g.id === gayaId) ?? GAYA[0];
  const rasio = bentuk === "badan" ? "3:4 (tegak)" : "1:1 (persegi)";
  return [
    buildPortraitPrompt({ nama: tokoh.nama, deskripsi: tokoh.deskripsi, gaya: GAYA_SALIN[gaya.id] ?? gaya.prompt, bentuk }),
    `Tokoh ini orisinal dan baru, bukan tiruan tokoh, film, atau karya lain yang sudah ada. Rasio gambar ${rasio}.`,
  ].join("\n\n");
}

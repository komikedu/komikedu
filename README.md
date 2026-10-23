# KomikEdu

Platform yang mengubah materi pelajaran (topik atau PDF) menjadi komik edukasi berbahasa Indonesia dalam kurang dari 15 menit. MVP menargetkan guru SD, dimulai dari Matematika.

Alur: materi → outline → naskah (dicek fakta dan hitungan) → gambar per halaman → editor → kuis → publikasi/ekspor PDF.

## Prinsip utama

- Naskah disetujui sebelum kredit gambar dipakai.
- AI hanya menggambar adegan; dialog dan elemen matematika adalah layer yang bisa diedit.
- Hitungan diverifikasi dengan kode (`mathjs`), bukan oleh LLM. Lihat `src/lib/math/verify.ts`.
- Satu gambar per halaman, lalu dipotong per panel, untuk menekan biaya.

## Tech stack

Next.js 15 (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, RLS), Gemini API, react-konva (editor), Cloudflare R2, Mayar (pembayaran), Inngest atau Trigger.dev (job queue).

## Memulai

```bash
npm install
cp .env.example .env.local   # isi kunci Supabase dan Gemini
npm run dev
```

Skema database ada di `supabase/migrations/0001_init.sql`.

### Penyimpanan gambar (Cloudflare R2)

Gambar komik (panel, potret dan badan penuh tokoh, hasil edit AI) disimpan di Cloudflare R2 bila variabel `R2_*` di `.env.local` terisi. Kalau kosong, dipakai bucket `panels` di Supabase, jadi pengembangan lokal tetap jalan tanpa R2. Gambar lama di Supabase tetap tampil setelah beralih.

1. Buat bucket R2, lalu aktifkan akses publik (domain `r2.dev` atau domain sendiri) dan isi `R2_PUBLIC_URL` dengan domain itu.
2. Buat API token R2 dengan izin Object Read & Write untuk bucket itu: isi `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. Di Settings bucket, tambahkan aturan CORS: `AllowedOrigins` berisi alamat situs (mis. `http://localhost:3001`), `AllowedMethods` `GET`, `AllowedHeaders` `*`. Tanpa ini kanvas editor tidak bisa memuat gambar.

## Status

Tahap awal: scaffold proyek dan skema database. Berikutnya: pipeline AI (gate kualitas M2).

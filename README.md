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

## Status

Tahap awal: scaffold proyek dan skema database. Berikutnya: pipeline AI (gate kualitas M2).

# Aturan proyek KomikEdu

Aturan yang berlaku untuk semua pekerjaan di repo ini. Tambahkan di sini bila ada aturan baru dari pemilik proyek.

## Tampilan (UI)

- **Dropdown**: selalu pakai komponen `Dropdown` di `src/components/dropdown.tsx` (panah dari pustaka ikon lucide dengan ruang di kanan), jangan `<select>` polos dengan panah bawaan peramban yang mepet tepi kanan.
- **Pilihan aktif** (kartu atau tombol pilihan): cukup ditandai dengan warna, garis tepi, dan latar. Jangan menambah ikon centang atau lencana di pojok kartu.
- **Pengaturan nyala/mati** di panel: pakai toggle (`Saklar` di `src/app/comics/[id]/editor/saklar.tsx`), bukan checkbox. Checkbox hanya untuk persetujuan (mis. syarat penerbitan).
- **Bagian dalam satu langkah atau panel**: dipisahkan jarak saja, tanpa kotak atau kartu pembungkus, agar terasa lega.
- Teks antarmuka berbahasa Indonesia.

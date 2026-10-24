"use client";

/** Galat paling luar (layout gagal dirender). Tanpa gaya aplikasi karena CSS bisa saja ikut gagal dimuat. */
export default function GalatGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 24, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Aplikasi gagal dimuat</h1>
          <p style={{ color: "#555", fontSize: 14 }}>Ada gangguan di server. Coba muat ulang beberapa saat lagi.</p>
          {error.digest && <p style={{ color: "#777", fontSize: 12 }}>Kode kesalahan: {error.digest}</p>}
          <button type="button" onClick={reset} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}

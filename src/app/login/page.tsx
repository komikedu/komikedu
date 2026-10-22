"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const next = params.get("next") ?? "/dashboard";
  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus("error");
      setMessage("Gagal mengirim tautan. Coba lagi sebentar lagi.");
    } else {
      setStatus("sent");
    }
  }

  async function signInWithGoogle() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setStatus("error");
      setMessage("Gagal masuk dengan Google.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Masuk ke KomikEdu</h1>
        <p className="mt-1 text-sm text-gray-600">Pengguna baru mendapat kredit gratis.</p>
      </div>

      {params.get("error") && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          Login gagal atau tautan sudah kedaluwarsa. Silakan coba lagi.
        </p>
      )}

      <button
        onClick={signInWithGoogle}
        className="rounded border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
      >
        Masuk dengan Google
      </button>

      <div className="text-center text-xs text-gray-500">atau dengan email</div>

      {status === "sent" ? (
        <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">
          Tautan masuk sudah dikirim ke {email}. Buka email kamu dan klik tautannya.
        </p>
      ) : (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@sekolah.sch.id"
            className="rounded border border-gray-300 px-3 py-2"
          />
          <button
            disabled={status === "loading"}
            className="rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {status === "loading" ? "Mengirim..." : "Kirim tautan masuk"}
          </button>
          {status === "error" && (
            <p role="alert" className="text-sm text-red-700">
              {message}
            </p>
          )}
        </form>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

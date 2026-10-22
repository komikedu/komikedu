import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6">
      <h1 className="text-4xl font-bold">KomikEdu</h1>
      <p className="text-gray-600">
        Ubah materi pelajaran menjadi komik edukasi berbahasa Indonesia, tanpa perlu menggambar.
      </p>
      <Link href="/login" className="w-fit rounded bg-black px-5 py-2 font-medium text-white">
        Mulai
      </Link>
    </main>
  );
}

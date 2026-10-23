import { notFound } from "next/navigation";
import { DevTokoh } from "./dev-tokoh";

/** Pratinjau dialog detail tokoh dengan data contoh, tanpa login. Aksi yang memanggil server gagal di sini. Hanya development. */
export default function DevTokohPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevTokoh />;
}

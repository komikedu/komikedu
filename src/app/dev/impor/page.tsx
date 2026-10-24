import { notFound } from "next/navigation";
import { DevImpor } from "./dev-impor";

/** Pratinjau dialog pasang banyak gambar dengan data contoh, tanpa login dan tanpa unggahan nyata. Hanya development. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevImpor />;
}

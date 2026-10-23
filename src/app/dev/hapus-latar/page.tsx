import { notFound } from "next/navigation";
import { UjiHapusLatar } from "./uji";

/** Uji coba mesin hapus latar (BiRefNet lite, MIT) di browser. Hanya development. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UjiHapusLatar />;
}

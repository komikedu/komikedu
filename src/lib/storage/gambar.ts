import "server-only";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pathPanel } from "@/lib/comics/storage-path";

/**
 * Penyimpanan gambar komik (panel, potret tokoh, hasil edit AI). Memakai Cloudflare R2 bila R2_* terisi;
 * kalau tidak, bucket "panels" di Supabase (mis. di komputer lokal tanpa R2). URL gambar disimpan lengkap di
 * database, jadi gambar lama di Supabase tetap tampil setelah beralih ke R2.
 * Kunci objek selalu `<id pengguna>/<id komik>/<nama berkas>`.
 */

type R2 = { client: S3Client; bucket: string; publicUrl: string };
let r2: R2 | null | undefined;

function getR2(): R2 | null {
  if (r2 !== undefined) return r2;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  r2 =
    R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL
      ? {
          client: new S3Client({
            region: "auto",
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
          }),
          bucket: R2_BUCKET,
          publicUrl: R2_PUBLIC_URL.replace(/\/$/, ""),
        }
      : null;
  return r2;
}

/** Nama penyimpanan yang dipakai untuk gambar baru ("r2" atau "supabase"). */
export const penyimpananAktif = () => (getR2() ? "r2" : "supabase");

const encodeKunci = (key: string) => key.split("/").map(encodeURIComponent).join("/");

/** Kunci objek dari URL gambar (R2 atau Supabase); null bila URL bukan dari penyimpanan kita. */
export function kunciDariUrl(url: string): string | null {
  const bucket = getR2();
  if (bucket && url.startsWith(`${bucket.publicUrl}/`)) {
    try {
      const key = decodeURIComponent(url.slice(bucket.publicUrl.length + 1).split("?")[0]);
      return key && !key.includes("..") ? key : null;
    } catch {
      return null;
    }
  }
  return pathPanel(url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
}

/**
 * Kunci objek bila URL benar-benar milik komik ini. Dipakai sebelum mengunduh karena kolom URL
 * (mis. tokoh_json) bisa ditulis klien: jangan pernah mengunduh berkas komik atau pengguna lain.
 */
export function kunciKomik(url: string | null | undefined, userId: string, comicId: string): string | null {
  const key = url ? kunciDariUrl(url) : null;
  return key?.startsWith(`${userId}/${comicId}/`) ? key : null;
}

/** Simpan gambar dan kembalikan URL publiknya. Melempar galat bila gagal. */
export async function simpanGambar(admin: SupabaseClient, key: string, bytes: Uint8Array | Buffer, contentType: string): Promise<string> {
  const bucket = getR2();
  if (bucket) {
    await bucket.client.send(
      new PutObjectCommand({ Bucket: bucket.bucket, Key: key, Body: bytes, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }),
    );
    return `${bucket.publicUrl}/${encodeKunci(key)}`;
  }
  const { error } = await admin.storage.from("panels").upload(key, bytes, { contentType, upsert: true });
  if (error) throw error;
  return admin.storage.from("panels").getPublicUrl(key).data.publicUrl;
}

/** URL publik sebuah kunci objek (tanpa mengunggah apa pun). */
export function urlGambar(admin: SupabaseClient, key: string): string {
  const bucket = getR2();
  return bucket ? `${bucket.publicUrl}/${encodeKunci(key)}` : admin.storage.from("panels").getPublicUrl(key).data.publicUrl;
}

/** Apakah berkas dengan kunci ini sudah ada di penyimpanan aktif. */
export async function adaBerkas(admin: SupabaseClient, key: string): Promise<boolean> {
  const bucket = getR2();
  if (bucket) {
    try {
      await bucket.client.send(new HeadObjectCommand({ Bucket: bucket.bucket, Key: key }));
      return true;
    } catch (e) {
      const nama = (e as { name?: string; $metadata?: { httpStatusCode?: number } });
      if (nama.name === "NotFound" || nama.$metadata?.httpStatusCode === 404) return false;
      throw e;
    }
  }
  const dir = key.slice(0, key.lastIndexOf("/"));
  const nama = key.slice(key.lastIndexOf("/") + 1);
  const { data } = await admin.storage.from("panels").list(dir, { search: nama, limit: 5 });
  return !!data?.some((f) => f.name === nama);
}

/** Unduh gambar dari URL (R2 atau Supabase). Panggil `kunciKomik` dulu untuk memastikan URL milik komik ini. */
export async function ambilGambar(admin: SupabaseClient, url: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  const key = kunciDariUrl(url);
  if (!key) return null;
  const bucket = getR2();
  if (bucket && url.startsWith(`${bucket.publicUrl}/`)) {
    const res = await bucket.client.send(new GetObjectCommand({ Bucket: bucket.bucket, Key: key }));
    if (!res.Body) return null;
    return { data: await res.Body.transformToByteArray(), mimeType: res.ContentType ?? "image/webp" };
  }
  const { data } = await admin.storage.from("panels").download(key);
  return data ? { data: new Uint8Array(await data.arrayBuffer()), mimeType: data.type || "image/webp" } : null;
}

/** Hapus satu gambar; diam-diam bila gagal (berkas yatim tidak merusak komik). */
export async function hapusGambar(admin: SupabaseClient, url: string | null | undefined): Promise<void> {
  const key = url ? kunciDariUrl(url) : null;
  if (!url || !key) return;
  try {
    const bucket = getR2();
    if (bucket && url.startsWith(`${bucket.publicUrl}/`)) await bucket.client.send(new DeleteObjectCommand({ Bucket: bucket.bucket, Key: key }));
    else await admin.storage.from("panels").remove([key]);
  } catch {
    // diabaikan
  }
}

/** Hapus semua gambar satu komik di R2 (bila aktif) dan di Supabase (gambar lama). */
export async function hapusFolderKomik(admin: SupabaseClient, userId: string, comicId: string): Promise<void> {
  const folder = `${userId}/${comicId}`;
  const bucket = getR2();
  const dariR2 = async () => {
    if (!bucket) return;
    let token: string | undefined;
    do {
      const list = await bucket.client.send(new ListObjectsV2Command({ Bucket: bucket.bucket, Prefix: `${folder}/`, ContinuationToken: token }));
      const objek = (list.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
      if (objek.length) await bucket.client.send(new DeleteObjectsCommand({ Bucket: bucket.bucket, Delete: { Objects: objek, Quiet: true } }));
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
  };
  const dariSupabase = async () => {
    const { data } = await admin.storage.from("panels").list(folder, { limit: 1000 });
    const paths = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
    if (paths.length) await admin.storage.from("panels").remove(paths);
  };
  await Promise.allSettled([dariR2(), dariSupabase()]);
}

/**
 * Hapus salinan terbit lama komik (berkas `rilis-*`), kecuali kunci di `pertahankan`. Dipakai setelah menerbitkan ulang
 * (hanya rilis baru yang dipertahankan, termasuk sisa unggahan yang tidak jadi diterbitkan) dan saat komik ditarik
 * (semua dihapus, karena alamat gambar publik tetap bisa dibuka siapa pun yang tahu URL-nya). Gagal tidak melempar galat.
 */
export async function bersihkanRilis(admin: SupabaseClient, userId: string, comicId: string, pertahankan: Set<string>): Promise<void> {
  const folder = `${userId}/${comicId}`;
  const bucket = getR2();
  try {
    let kunci: string[] = [];
    if (bucket) {
      let token: string | undefined;
      do {
        const list = await bucket.client.send(new ListObjectsV2Command({ Bucket: bucket.bucket, Prefix: `${folder}/rilis-`, ContinuationToken: token }));
        kunci.push(...(list.Contents ?? []).flatMap((o) => (o.Key ? [o.Key] : [])));
        token = list.IsTruncated ? list.NextContinuationToken : undefined;
      } while (token);
    } else {
      const { data } = await admin.storage.from("panels").list(folder, { limit: 1000, search: "rilis-" });
      kunci = (data ?? []).filter((f) => f.name.startsWith("rilis-")).map((f) => `${folder}/${f.name}`);
    }
    const hapus = kunci.filter((k) => !pertahankan.has(k));
    if (!hapus.length) return;
    if (bucket) {
      for (let i = 0; i < hapus.length; i += 1000) {
        await bucket.client.send(new DeleteObjectsCommand({ Bucket: bucket.bucket, Delete: { Objects: hapus.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }));
      }
    } else {
      await admin.storage.from("panels").remove(hapus);
    }
  } catch (e) {
    console.error("bersihkanRilis gagal", comicId, e);
  }
}

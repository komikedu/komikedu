/**
 * Kirim form dengan PUT dan laporkan kemajuan unggah (0..1). Memakai XMLHttpRequest karena fetch belum bisa melaporkan
 * kemajuan unggah. Mengembalikan status HTTP dan isi JSON (null bila bukan JSON); melempar galat bila tidak ada koneksi.
 */
export function kirimDenganProgres(url: string, form: FormData, onProgres: (bagian: number) => void): Promise<{ status: number; json: unknown }> {
  return new Promise((selesai, gagal) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && e.total > 0 && onProgres(Math.min(1, e.loaded / e.total));
    xhr.onerror = () => gagal(new Error("jaringan"));
    xhr.onabort = () => gagal(new Error("dibatalkan"));
    xhr.onload = () => {
      let json: unknown = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // bukan JSON
      }
      selesai({ status: xhr.status, json });
    };
    xhr.send(form);
  });
}

import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

const buf = await readFile(process.argv[2]);
const pdf = await getDocumentProxy(new Uint8Array(buf));
const { totalPages, text } = await extractText(pdf, { mergePages: true });
console.log(`halaman: ${totalPages}, karakter: ${text.length}`);
console.log(text.slice(0, 200).replace(/\s+/g, " "));

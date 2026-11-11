import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { parseGscPages, parseGscPeriod, type TrafficIndex } from "./export";

/** Entries of a zip as name → bytes (stored or deflated, which is what Google writes). */
function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a readable zip file");
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    if (!name.endsWith("/") && (method === 0 || method === 8)) out.set(name, method === 8 ? inflateRawSync(data) : data);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** Load a Search Console export: the Pages CSV itself, or the zip Google gives. */
export function loadGscExport(path: string): TrafficIndex {
  let raw: Buffer;
  try {
    raw = readFileSync(path);
  } catch {
    throw new Error(`cannot read the Search Console export ${path}`);
  }
  if (raw.length > 2 && raw[0] === 0x50 && raw[1] === 0x4b) {
    const files = unzip(raw);
    const base = (n: string) => n.split("/").pop()!.toLowerCase();
    const names = [...files.keys()];
    const header = (n: string) => files.get(n)!.toString("utf8").split(/\r?\n/, 1)[0] ?? "";
    const pagesName =
      names.find((n) => /^pages?\.csv$/.test(base(n))) ??
      names.find((n) => base(n).endsWith(".csv") && !/^(filters|filtres)\.csv$/.test(base(n)) && /\b(clicks|clics)\b/i.test(header(n)));
    if (!pagesName) throw new Error("no Pages sheet in the zip: export the Pages tab of the Performance report");
    const filters = names.find((n) => /^(filters|filtres)\.csv$/.test(base(n)));
    return parseGscPages(files.get(pagesName)!.toString("utf8"), filters ? parseGscPeriod(files.get(filters)!.toString("utf8")) : null);
  }
  return parseGscPages(raw.toString("utf8"));
}

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { CONFIG_FILES, parseConfig, type SeptuneConfig } from "./contracts";

/** Cherche septune.yml (ou .septune.yml) dans `dir`, puis dans ses parents : la CI et l'éditeur n'ouvrent pas toujours à la racine. */
export function findConfigFile(dir: string = process.cwd()): string | null {
  let cur = resolve(dir);
  for (;;) {
    for (const name of CONFIG_FILES) {
      const f = join(cur, name);
      if (existsSync(f)) return f;
    }
    const up = dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

/** Lit et valide le fichier ; lève ConfigParseError avec ligne et clé. `null` si aucun fichier n'existe. */
export function loadConfig(opts: { file?: string; dir?: string } = {}): { file: string; config: SeptuneConfig } | null {
  const file = opts.file ?? findConfigFile(opts.dir);
  if (!file) return null;
  if (!existsSync(file)) throw new Error(`${file} not found.`);
  return { file, config: parseConfig(readFileSync(file, "utf8"), file) };
}

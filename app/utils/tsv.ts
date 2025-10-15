import { Pair } from "@/app/types/types";

/** 前後の二重/単一引用符を剥がしてtrim */
function clean(cell: string): string {
  const s = cell.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1).trim();
  }
  return s;
}

/**
 * TSV -> Row[]
 * 期待形式: word<TAB>meaning<TAB>(lang任意)
 * - 空行/空白行は無視
 * - セルは trim / 外側の " ' を除去
 * - タブが複数でもOK（\t+）
 * - 1,2列目(必須)が空なら採用しない
 * - 3列目以降は無視（3列目は lang として採用）
 */
export function parseTsv(tsv: string): Pair[] {
  if (!tsv) return [];
  const out: Pair[] = [];
  const lines = tsv.split(/\r?\n/);

  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;

    const cells = raw.split(/\t+/).map(clean);
    const [w = "", m = "", lang = ""] = cells;

    if (!w || !m) continue;

    out.push({
      word: w,
      meaning: m,
      ...(lang ? { lang } : {}),
    });
  }
  return out;
}

/**
 * Row[] -> TSV
 * 第3列は lang があるときのみ出力
 */
export function toTsv(rows: Array<Pair | { word: string; meaning: string; lang?: string }>): string {
  return (rows ?? [])
    .map(({ word, meaning }) =>
      [word?.trim() ?? "", meaning?.trim() ?? ""]
        .filter((v, i) => v || i < 2) // 1,2列は必須、3列はあれば
        .join("\t")
    )
    .join("\n");
}

/**
 * 既存の Word[] （term/meaning） を TSV にしたい場合のヘルパ
 */
export type Word = { id: number; term: string; meaning: string };
export function wordsToTsv(words: Word[]): string {
  return (words ?? [])
    .map(w => [w.term?.trim() ?? "", w.meaning?.trim() ?? ""].join("\t"))
    .join("\n");
}

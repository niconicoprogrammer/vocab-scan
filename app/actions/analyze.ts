// app/actions/analyze.ts
"use server";
import { Type } from "@google/genai";
import { ai } from "@/app/lib/gemini";
import type { Pair } from "@/app/types/types";

export type State =
  | { ok: false; error: string }
  | { ok: true; data: Pair[] };

// --- 設定（必要なら .env で上書き可） ---
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 8192);
const MAX_PAIRS_PER_IMAGE = Number(process.env.MAX_PAIRS_PER_IMAGE ?? 30);

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      meaning: { type: Type.STRING },
    },
    required: ["word", "meaning"],
  },
} as const;

// --- helpers ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function sanitize(raw: any): Pair[] {
  return Array.isArray(raw)
    ? raw
        .filter((r) => r && typeof r.word === "string" && typeof r.meaning === "string")
        .map((r) => ({ word: r.word.trim(), meaning: r.meaning.trim() }))
    : [];
}

function tryParseArray(text: string): Pair[] {
  try {
    return sanitize(JSON.parse(text));
  } catch {
    const m = text.match(/\[[\s\S]*\]/); // 配列リテラルだけ抜くフォールバック
    if (m) {
      try { return sanitize(JSON.parse(m[0])); } catch {}
    }
    return [];
  }
}

async function fileToInline(file: File) {
  return {
    mimeType: file.type || (file.name.endsWith(".jpg") ? "image/jpeg" : "image/png"),
    base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
  };
}

// --- 本体：最初から1枚ずつ処理 ---
export async function analyzeAction(_prev: State, formData: FormData): Promise<State> {
  const files = formData.getAll("files") as File[];
  if (!files?.length) return { ok: false, error: "画像がありません" } as const;

  const instruction = [
    "From this vocabulary-book image, extract DISTINCT pairs.",
    "- word: English headword (normalize casing; strip punctuation).",
    "- meaning: short Japanese gloss ONLY (no examples, no POS).",
    "Ignore headings, page numbers, section titles, examples, decorations.",
    `Return ONLY JSON matching the schema. Limit to MAX ${MAX_PAIRS_PER_IMAGE} pairs for this image.`,
  ].join("\n");

  const allPairs: Pair[] = [];

  for (const f of files) {
    const img = await fileToInline(f);

    const parts = [
      { text: instruction },
      { inlineData: { mimeType: img.mimeType, data: img.base64 } },
    ];

    const resp = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });

    // 参考ログ
    const finish = resp.candidates?.[0]?.finishReason;
    console.log("[analyze:single] file:", f.name, {
      model: resp.modelVersion,
      finishReason: finish,
      usage: (resp as any).usageMetadata, // promptTokenCount / totalTokenCount など
    });

    const text =
      resp.text ??
      (resp.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p?.text)
        .filter(Boolean)
        .join("");

    if (!text) {
      // その画像はスキップ（全滅したら最後にエラー）
      continue;
    }

    const pairs = tryParseArray(text);
    if (pairs.length) allPairs.push(...pairs);

    // RPM/TPM対策に軽くスロットル
    await sleep(120);
  }

  // 重複除去（wordの小文字キーで）
  const seen = new Set<string>();
  const deduped: Pair[] = [];
  for (const p of allPairs) {
    const key = p.word.trim().toLowerCase();
    if (key && !seen.has(key)) { seen.add(key); deduped.push(p); }
  }

  if (!deduped.length) return { ok: false, error: "抽出結果がありませんでした" } as const;
  return { ok: true, data: deduped } as const;
}

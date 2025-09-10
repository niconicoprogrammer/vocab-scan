// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";
type Pair = { word: string; meaning: string };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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

const sanitize = (raw: any): Pair[] =>
  Array.isArray(raw)
    ? raw
        .filter((r) => r && typeof r.word === "string" && typeof r.meaning === "string")
        .map((r) => ({ word: r.word.trim(), meaning: r.meaning.trim() }))
    : [];

export async function POST(req: Request) {
  try {
    const { images } = (await req.json()) as {
      images: { mimeType: string; base64: string }[];
    };
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ ok: false, error: "no images" }, { status: 400 });
    }

    const parts = [
      {
        text: [
          "From these images of a vocabulary book, extract DISTINCT pairs.",
          "- word: English headword (normalize casing; strip punctuation).",
          "- meaning: short Japanese gloss ONLY (no examples, no POS).",
          "Ignore headings, page numbers, section titles, examples, decorations.",
          "Return ONLY JSON matching the schema.",
        ].join("\n"),
        // text: [
        // "From these images of a vocabulary book, extract DISTINCT pairs.",
        // "- word: English headword (normalize casing; strip punctuation).",
        // "- meaning: copy ALL Japanese translations exactly as printed in the book.",
        // "  Do not paraphrase, summarize, or invent.",
        // "  If there are multiple translations, include them all in one string, separated by '、'.",
        // "Ignore headings, page numbers, section titles, examples, and decorations.",
        // "Return ONLY JSON matching the schema.",
        // ].join("\n"),
      },
      ...images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      })),
    ];

    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      // 安全のため user コンテンツで包む（SDKによっては必須）
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    // --- デバッグ用ログ（サーバ側 console に出る）---
    // finishReason / safety / usage なども確認
    // eslint-disable-next-line no-console
    console.log("[analyze] finishReason:", resp.candidates?.[0]?.finishReason);
    // eslint-disable-next-line no-console
    console.log("[analyze] safetyRatings:", resp.candidates?.[0]?.safetyRatings);

    // --- JSON取り出しのフォールバック ---
    let text =
      resp.text ??
      (resp.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p?.text)
        .filter(Boolean)
        .join("");

    if (!text) {
      // eslint-disable-next-line no-console
      console.error("[analyze] empty response text. raw resp:", JSON.stringify(resp).slice(0, 1000));
      return NextResponse.json({ ok: false, error: "empty response from upstream" }, { status: 502 });
    }

    // JSONが余計な前後文に埋まってるケース対策（[] 抜き出し）
    let data: Pair[] = [];
    try {
      data = sanitize(JSON.parse(text));
    } catch {
      const m = text.match(/\[[\s\S]*\]/); // 最初の配列リテラルを抜く
      if (m) {
        try {
          data = sanitize(JSON.parse(m[0]));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[analyze] JSON.parse failed (from bracket match):", String(e));
        }
      } else {
        // eslint-disable-next-line no-console
        console.error("[analyze] JSON.parse failed. head of text:", text.slice(0, 400));
      }
    }

    if (!data.length) {
      return NextResponse.json({ ok: false, error: "invalid JSON from upstream" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message ?? "internal error";
    const status = /429|rate/i.test(msg) ? 429 : 500;
    // eslint-disable-next-line no-console
    console.error("[analyze] catch:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

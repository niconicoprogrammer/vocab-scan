"use server";

import { createClient } from "@/app/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Pair } from "@/app/types/types";

function parsePayload(v: FormDataEntryValue | null): Pair[] {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => ({
        word: String(r?.word ?? "").trim(),
        meaning: String(r?.meaning ?? "").trim()
      }))
      .filter((r) => r.word && r.meaning);
  } catch {
    return [];
  }
}

export async function replaceWords(_: unknown, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in", count: 0 };

  const bookId = Number(fd.get("book_id"));
  const payload = fd.get("payload");
  if (!bookId) return { ok: false, error: "Invalid book_id", count: 0 };

  const rows = parsePayload(payload);

  // 全削除
  const { error: delErr } = await supabase
    .from("wordbook_entries")
    .delete()
    .eq("wordbook_id", bookId);
  if (delErr) return { ok: false, error: delErr.message, count: 0 };

  // 挿入
  if (rows.length > 0) {
    const now = new Date().toISOString();
    const ins = rows.map((r, i) => ({
      wordbook_id: bookId,
      term: r.word,
      meaning: r.meaning,
      order_index: i,
      created_at: now,
      updated_at: now,
    }));

    const { error: insErr } = await supabase.from("wordbook_entries").insert(ins);
    if (insErr) return { ok: false, error: insErr.message, count: 0 };
  }

  revalidatePath(`/wordbooks/${bookId}`);
  return { ok: true, count: rows.length };
}

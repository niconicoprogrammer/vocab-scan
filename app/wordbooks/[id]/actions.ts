"use server";

import { createClient } from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";

type Row = { word: string; meaning: string; lang?: string | null };

function parsePayload(v: FormDataEntryValue | null): Row[] {
    try {
        const arr = JSON.parse(String(v ?? "[]"));
        if (!Array.isArray(arr)) return [];
        return arr
            .map((r) => ({
                word: String(r?.word ?? "").trim(),
                meaning: String(r?.meaning ?? "").trim(),
            }))
            .filter((r) => r.word && r.meaning);
    } catch {
        return [];
    }
}

export async function replaceWords(_: unknown, fd: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Not signed in";

    const bookId = Number(fd.get("book_id"));
    const payload = fd.get("payload");

    console.log("[replaceWords] raw bookId:", fd.get("book_id"));
    console.log("[replaceWords] raw payload:", payload);

    const rows = parsePayload(payload);
    console.log("[replaceWords] parsed rows:", rows);
    if (!bookId) return "Invalid book_id";

    console.log("[replaceWords] bookId:", bookId);
    console.log("[replaceWords] rows:", rows);

    const del = await supabase
        .from("wordbook_entries")
        .delete()
        .eq("wordbook_id", bookId);
    console.log("[replaceWords] delete result:", del);

    // 新規挿入
    if (rows.length > 0) {
        const now = new Date().toISOString();

        const ins = rows.map((r, i) => ({
            wordbook_id: bookId,
            term: r.word,
            meaning: r.meaning,
            order_index: i, // TSV順に保存
            created_at: now,
            updated_at: now,
        }));

        console.log("[replaceWords] insert payload:", ins);

        const { error } = await supabase.from("wordbook_entries").insert(ins);
        if (error) return error.message;
    }

    revalidatePath(`/wordbooks/${bookId}`);
}

import { notFound, redirect } from "next/navigation";
import { Box, Stack, Typography, Divider, Button } from "@mui/material";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import Client from "@/app/wordbooks/[id]/page_client";
import { BreadcrumbsNavClientOnly } from "@/app/components/breadcrumbs-nav";
import { Word } from "@/app/types/types";

export const dynamic = 'force-dynamic';

export default async function WordbookDetailPage(
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    // ログイン必須（一覧と同じ運用）
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { id } = await params;
    const bookId = Number(id);
    if (!Number.isFinite(bookId)) notFound();

    // 自分の単語帳だけ取得（owner_id で縛る）
    const { data: book, error: bookErr } = await supabase
        .from("wordbooks")
        .select("id, title, created_at, owner_id")
        .eq("id", bookId)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (bookErr || !book) notFound();

    // 紐づく単語を取得
    const { data: rawWords = [], error: wordsErr } = await supabase
        .from("wordbook_entries")
        .select("id, term, meaning")
        .eq("wordbook_id", bookId)
        .order("created_at", { ascending: true });

    const words: Word[] = (rawWords ?? []).map((w) => ({
        id: Number(w.id),
        term: String(w.term ?? ""),
        meaning: String(w.meaning ?? ""),
    }));

    // エラー時もとりあえず空配列で表示（厳密にするなら notFound や Alert に変更）
    if (wordsErr) console.log(wordsErr);

    return (
        <>
            <BreadcrumbsNavClientOnly
                items={[
                    { label: "単語帳一覧", href: "/wordbooks" },
                    { label: book.title }
                ]}
            />
            <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Stack>
                        <Typography variant="h5">{book.title}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            作成日: {new Date(book.created_at).toLocaleString()}
                        </Typography>
                    </Stack>
                    <Button component={Link} href="/wordbooks">一覧へ戻る</Button>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                <Client bookId={book.id} initialWords={words} />
            </Box>
        </>
    );
}

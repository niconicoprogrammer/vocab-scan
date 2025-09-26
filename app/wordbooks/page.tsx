// app/wordbooks/page.tsx
import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
import WordbooksClient from '@/app/wordbooks/WordbooksClient';
import BreadcrumbsNav from "@/app/components/BreadcrumbsNav";

type Book = { id: number; title: string; visibility: 'private'|'public'; created_at: string };

export default async function WordbooksPage() {
  const supabase = await createClient();

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ✅ プロファイルチェックは一旦ナシ → ログインしてれば会員扱い

  // 自分の単語帳だけ取得
  const { data: selectData = [] } = await supabase
    .from('wordbooks')
    .select('id, title, visibility, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

    // ...取得後
    const raw = selectData ?? [];                 // null を配列に
    const books: Book[] = raw.map(b => ({
    id: Number(b.id),
    title: String(b.title),
    visibility: b.visibility === 'public' ? 'public' : 'private',
    created_at: String(b.created_at),
    }));

  return (
    <>
      <BreadcrumbsNav items={[{ label: "単語帳一覧" }]} />
      <WordbooksClient initialBooks={books} />
    </>
  );
}
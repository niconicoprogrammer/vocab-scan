import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';
import Client from '@/app/wordbooks/page_client';
import { BreadcrumbsNavClientOnly } from "@/app/components/breadcrumbs-nav";

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
    const raw = selectData ?? [];
    const books: Book[] = raw.map(b => ({
    id: Number(b.id),
    title: String(b.title),
    visibility: b.visibility === 'public' ? 'public' : 'private',
    created_at: String(b.created_at),
    }));

  return (
    <>
      <BreadcrumbsNavClientOnly items={[{ label: "単語帳一覧" }]} />
      <Client initialBooks={books} />
    </>
  );
}
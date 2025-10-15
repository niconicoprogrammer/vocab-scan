import type { Metadata } from "next";
import "./globals.css";
import AppTheme from "@/app/components/AppTheme";
import { createClient } from "@/app/lib/supabase/server";

export const metadata: Metadata = {
  title: "VocabScan MVP",
  description: "画像から単語＋意味を抽出してTSV出力・読み上げ",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="ja">
      <body>
        <AppTheme initialEmail={user?.email ?? null}>
          {children}
        </AppTheme>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import AppTheme from "@/app/components/AppTheme";

export const metadata: Metadata = {
  title: "VocabScan MVP",
  description: "画像から単語＋意味を抽出してTSV出力・読み上げ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppTheme>
            {children}
        </AppTheme>
      </body>
    </html>
  );
}

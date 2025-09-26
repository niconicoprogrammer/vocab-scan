'use client'

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  AppBar, Toolbar, Typography, Container, CssBaseline, Box,
  ThemeProvider, createTheme, Tabs, Tab, Button
} from "@mui/material";
import { signOut } from '@/app/login/actions'

const theme = createTheme({ palette: { mode: "light" } });

function LinkTab(props: { label: string; href: string; value: string }) {
  const { label, href, value } = props;
  return <Tab component={Link} href={href} label={label} value={value} sx={{ textTransform: "none" }} />;
}

export default function AppTheme({
  children,
  initialEmail,
}: {
  children: React.ReactNode;
  initialEmail: string | null;
}) {
const pathname = usePathname();
const current =
  pathname.startsWith("/reader") ? "/reader" :
  pathname.startsWith("/wordbooks") ? "/wordbooks" :
  pathname === "/" ? "/" :
  false; // ← /login などは何も選択しない

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* ヘッダー */}
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          {/* 左：タイトル */}
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            VocabScan
          </Typography>

          {/* 中央：タブ */}
          <Tabs value={current} textColor="primary" indicatorColor="primary" sx={{ ml: 2 }}>
            <LinkTab label="解析" href="/" value="/" />
            <LinkTab label="読み上げ" href="/reader" value="/reader" />
            <LinkTab label="単語帳" href="/wordbooks" value="/wordbooks" />
          </Tabs>

          {/* 右：スペーサー */}
          <Box sx={{ flex: 1 }} />

          {/* 右：ログイン情報／ログアウト or ログインへ */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {initialEmail ? (
              <>
                <Typography variant="body2" component="span">{initialEmail}</Typography>
                <Button onClick={signOut} variant="outlined" size="small" sx={{ textTransform: "none" }}>
                  ログアウト
                </Button>
              </>
            ) : (
              <Button component={Link} href="/login" variant="contained" size="small" sx={{ textTransform: "none" }}>
                ログイン
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* コンテンツ */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        {children}
      </Container>

      {/* フッター */}
      <Box component="footer" sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
        © {new Date().getFullYear()} VocabScan
      </Box>
    </ThemeProvider>
  );
}

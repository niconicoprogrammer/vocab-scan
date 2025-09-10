"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  CssBaseline,
  Box,
  ThemeProvider,
  createTheme,
  Tabs,
  Tab,
} from "@mui/material";

const theme = createTheme({ palette: { mode: "light" } });

function LinkTab(props: { label: string; href: string; value: string }) {
  const { label, href, value } = props;
  return <Tab component={Link} href={href} label={label} value={value} />;
}

export default function AppTheme({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  // ルートに合わせてタブ選択（/reader 配下なら読み上げをアクティブ）
  const current = pathname.startsWith("/reader") ? "/reader" : "/";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* ヘッダー */}
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 800, mr: 4 }}>
            VocabScan
          </Typography>
          <Tabs value={current} textColor="primary" indicatorColor="primary">
            <LinkTab label="解析" href="/" value="/" />
            <LinkTab label="読み上げ" href="/reader" value="/reader" />
          </Tabs>
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

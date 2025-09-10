"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar, Toolbar, Tabs, Tab, Box, Typography, Container,
} from "@mui/material";

function LinkTab(props: { label: string; href: string; value: string }) {
  const { label, href, value } = props;
  return <Tab component={Link} href={href} label={label} value={value} />;
}

export default function Header() {
  const pathname = usePathname() || "/";
  const current = pathname.startsWith("/reader") ? "/reader" : "/";

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      {/* タイトルバー */}
      <Toolbar sx={{ minHeight: 56 }}>
        <Container maxWidth="md" sx={{ display: "flex", flexDirection: "column" }}>
          <Typography variant="h6" fontWeight={800}>VocabScan</Typography>
          <Typography variant="caption" color="text.secondary">
            画像 → 単語＋意味 → TSV出力 / 読み上げ
          </Typography>
        </Container>
      </Toolbar>

      {/* タブバー */}
      <Box sx={{ borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="md">
          <Tabs value={current} indicatorColor="primary" textColor="primary">
            <LinkTab label="解析" href="/" value="/" />
            <LinkTab label="読み上げ" href="/reader" value="/reader" />
          </Tabs>
        </Container>
      </Box>
    </AppBar>
  );
}

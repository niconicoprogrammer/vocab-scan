"use client";

import { useMemo, useState } from "react";
import {
  Stack, Card, CardHeader, CardContent, TextField, Button, Typography, Grid
} from "@mui/material";
import { useSpeechController } from "@/app/hooks/speech/useSpeechController";
import SpeechPlayer from "@/app/components/speech-player/SpeechPlayer";
import WordsPreview from "@/app/components/words-preview/WordsPreview";
import { parseTsv} from "@/app/utils/tsv";
import { Pair } from "@/app/types/types";

export default function ReaderPage() {
  // ========= UI状態 =========
  const [tsv, setTsv] = useState("");
  const [rows, setRows] = useState<Pair[]>([]);
  const [rate, setRate] = useState(1.0);
  const [gapSec, setGapSec] = useState(0.25);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number>(-1); // 0始まり、-1は未選択
  const loop = true;

  // ========= 派生値 =========
  const total = rows.length;
  const progress = useMemo(() => {
    return (total > 0 && current >= 0) ? ((current + 1) / total) * 100 : 0;
  }, [current, total]);

  // ========= データ処理 =========
  const handleParse = () => {
    const out = parseTsv(tsv); // ← 共通関数を利用
    setRows(out);
    setCurrent(-1);
  };

  const cfg = useMemo(
    () => ({
      rate,
      pitch: 1,
      gapSec,
      LANG: { en: "en-US", ja: "ja-JP" },
      pickVoice: (lang: string) => {
        const voices = window.speechSynthesis.getVoices();
        return voices.find((v) => v.lang === lang) ?? null;
      },
    }),
    [rate, gapSec]
  );

  const ctrl = useSpeechController(
    { rows, current, setCurrent, playing, setPlaying, loop },
    cfg
  );

  // ========= 画面 =========
  return (
    <Stack spacing={3}>
      {/* 見出し／説明 */}
      <Typography variant="h5" fontWeight={800}>
        TSV読み上げ
      </Typography>

      {/* 読み上げ機能カード */}
      <SpeechPlayer
        rows={rows}
        current={current}
        total={total}
        progress={progress}
        playing={playing}
        rate={rate}
        gapSec={gapSec}
        onPlay={ctrl.handlePlay}
        onPause={ctrl.handlePause}
        onStop={ctrl.handleStop}
        onRateChange={setRate}
        onGapSecChange={setGapSec}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <WordsPreview
            rows={rows}
            current={current}
            onRowClick={ctrl.handleRowClick}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="入力" subheader="TSVを貼り付けて編集してください" />
            <CardContent>
              <TextField
                label="TSV（word<TAB>meaning）"
                value={tsv}
                onChange={(e) => setTsv(e.target.value)}
                multiline
                minRows={10}
                fullWidth
                placeholder="apple\tりんご\nenjoy\t楽しむ"
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button variant="contained" onClick={handleParse}>解析</Button>
                <Button variant="text" onClick={() => setTsv("")}>クリア</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

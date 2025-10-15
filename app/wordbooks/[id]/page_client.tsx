"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import {
  Stack, Card, CardHeader, CardContent, TextField, Button, Alert, Grid
} from "@mui/material";
import { replaceWords } from "./actions";
import { useSpeechController } from "@/app/hooks/speech/useSpeechController";
import SpeechPlayer from "@/app/components/speech-player/SpeechPlayer";
import WordsPreview from "@/app/components/words-preview/WordsPreview";
import { parseTsv, wordsToTsv } from "@/app/utils/tsv";
import { Pair, Word } from "@/app/types/types";

export default function Client({
  bookId,
  initialWords,
}: {
  bookId: number;
  initialWords: Word[];
}) {

  // ========= UI状態 =========
  const [tsv, setTsv] = useState<string>(() => wordsToTsv(initialWords));
  const [rows, setRows] = useState<Pair[]>(() => parseTsv(wordsToTsv(initialWords)));
  const [rate, setRate] = useState(1.0);
  const [gapSec, setGapSec] = useState(0.25);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number>(-1);
  const loop = true;
  const [result, saveAction, saving] = useActionState(replaceWords, undefined);

  // ========= 派生値 =========
  const total = rows.length;
  const progress = useMemo(() => {
    return (total > 0 && current >= 0) ? ((current + 1) / total) * 100 : 0;
  }, [current, total]);

  // ========= データ処理 =========
  const handleParse = () => {
    const out = parseTsv(tsv);
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

  // 読み込み直後や initialWords が変わったときもプリセットを同期
  useEffect(() => {
    const preset = wordsToTsv(initialWords);
    setTsv(preset);
    setRows(parseTsv(preset));
  }, [initialWords]);

  return (
    <>
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

      {/* TSV 編集カード */}
      <Card variant="outlined" sx={{ mt: 3, p: 2 }}>
        <CardHeader
          title="TSV 取り込み & 編集"
          subheader="形式: word<TAB>meaning"
        />

        {result?.ok && (
          <Alert severity="success" sx={{ my: 2 }}>
            保存しました（{result.count}件）
          </Alert>
        )}

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3}}>
          <form action={saveAction}>
            <input type="hidden" name="book_id" value={bookId} />
            <input type="hidden" name="payload" value={JSON.stringify(rows)} />
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </form>
          <Button variant="contained" onClick={handleParse}>解析</Button>
          <Button variant="outlined" onClick={() => setTsv("")}>クリア</Button>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardHeader title="プレビュー" subheader={`${rows.length} 件`} />
              <CardContent sx={{ maxHeight: 400, overflow: "auto" }}>
                <WordsPreview rows={rows} current={current} onRowClick={ctrl.handleRowClick} />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
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
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Card>
    </>
  );
}

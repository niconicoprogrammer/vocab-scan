"use client";

import { useEffect, useMemo, useState, useActionState, useRef } from "react";
import {
  Box, Stack, Card, CardHeader, CardContent,
  TextField, Button, Typography, Divider, Chip, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Grid, LinearProgress
} from "@mui/material";
import { replaceWords } from "./actions";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Pause from "@mui/icons-material/Pause";
import Stop from "@mui/icons-material/Stop";

export type Word = {
  id: number;
  term: string;
  meaning: string;
};

type Pair = { word: string; meaning: string };

function toTSV(words: Word[]): string {
  return (words ?? [])
    .map(w => [w.term, w.meaning].join("\t"))
    .join("\n");
}

function parseTSV(tsv: string): Pair[] {
  return tsv
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const [term = "", meaning = ""] = l.split("\t");
      return {
        word: term.trim(),
        meaning: meaning.trim()
      };
    })
    .filter(r => r.word && r.meaning);
}

export default function TsvEditor({
  bookId,
  initialWords,
}: {
  bookId: number;
  initialWords: Word[];
}) {
  console.log("[TsvEditor] props", {
    bookId,
    initialWordsCount: initialWords?.length,
    first: initialWords?.[0],
  });

  // 右側テキストエリア（既存データでプリセット）
  const [tsv, setTsv] = useState<string>(() => toTSV(initialWords));
  // 解析結果（左のプレビュー）
  const [rows, setRows] = useState<Pair[]>(() => parseTSV(toTSV(initialWords)));
  const [saveErr, saveAction, saving] = useActionState(replaceWords, undefined);

  // 読み込み直後や initialWords が変わったときもプリセットを同期
  useEffect(() => {
    const preset = toTSV(initialWords);
    setTsv(preset);
    setRows(parseTSV(preset));
  }, [initialWords]);

  // 件数バッジ
  const counts = useMemo(() => {
    return { total: rows.length };
  }, [rows]);

  // 保存（全削除→全登録）
  const payload = useMemo(
    () => JSON.stringify(rows),
    [rows]
  );

  const handleParse = () => {
    const parsed = parseTSV(tsv);
    setRows(parsed);
  };

  // 読み上げ機能
  const rate = 1;
  const pitch = 1;
  const gap = 1; // 秒
  const loop = true;
  const LANG = { en: "en-US", ja: "ja-JP" } as const;

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number>(-1);

  const timerRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);

  const total = rows.length;
  const progress = useMemo(() => {
    return total > 0 && current >= 0 ? ((current + 1) / total) * 100 : 0;
  }, [current, total]);

  function createUtterance(text: string, lang: string) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = pitch;
    return u;
  }

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelAll = () => {
    stoppingRef.current = true;
    clearTimer();
    window.speechSynthesis.cancel();
  };

  const speakPair = (idx: number) => {
    const pair = rows[idx];
    if (!pair) return;

    const u1 = createUtterance(pair.word, LANG.en);
    const u2 = createUtterance(pair.meaning, LANG.ja);

    u1.onend = () => {
      if (stoppingRef.current) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        window.speechSynthesis.speak(u2);
      }, gap * 1000);
    };

    u2.onend = () => {
      if (stoppingRef.current) return;
      const nextIdx = idx + 1 < total ? idx + 1 : 0;
      if (nextIdx === 0 && !loop) {
        setPlaying(false);
        return;
      }
      setCurrent(nextIdx);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        speakPair(nextIdx);
      }, gap * 1000);
    };

    window.speechSynthesis.speak(u1);
  };

  const handlePlay = () => {
    if (rows.length === 0) return;
    cancelAll();
    const startIdx = current >= 0 ? current : 0;
    setCurrent(startIdx);
    setPlaying(true);
    stoppingRef.current = false;
    timerRef.current = window.setTimeout(() => speakPair(startIdx), 10);
  };

  const handlePause = () => {
    cancelAll();
    setPlaying(false);
  };

  const handleStop = () => {
    cancelAll();
    setPlaying(false);
    setCurrent(-1);
  };
  
  const handleRowClick = (i: number) => {
      setCurrent(i);
      if (playing) {
          cancelAll();
          stoppingRef.current = false;
          timerRef.current = window.setTimeout(() => {
              speakPair(i);
          }, 10);
      }
  };

  return (
    <>
      {/* 読み上げ機能カード */}
      <Card variant="outlined">
        {/* <CardHeader title="読み上げ" /> */}
        <CardContent>
          <Stack spacing={2}>
            {/* ボタン群 */}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handlePlay}
                disabled={rows.length === 0 || playing}
              >
                再生
              </Button>
              <Button
                variant="outlined"
                startIcon={<Pause />}
                onClick={handlePause}
                disabled={!playing}
              >
                一時停止
              </Button>
              <Button
                variant="text"
                startIcon={<Stop />}
                onClick={handleStop}
                disabled={!playing && current < 0}
              >
                停止
              </Button>
            </Stack>

            {/* 進捗表示 */}
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                進捗：{current >= 0 ? current + 1 : 0} / {total}
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary">
                {current >= 0 && rows[current]
                  ? `${rows[current].word} — ${rows[current].meaning}`
                  : "—"}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* TSV 編集カード */}
      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardHeader title="TSV 取り込み & 編集" subheader="形式: word<TAB>meaning<TAB>(lang任意)" />
        <CardContent>
          {saveErr && <Alert severity="error" sx={{ mb: 2 }}>{String(saveErr)}</Alert>}

          <Grid container spacing={3}>
            {/* 左：プレビュー */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined">
                <CardHeader
                  title="プレビュー"
                  action={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={`${counts.total} 件`} size="small" />
                    </Stack>
                  }
                />
                <CardContent>
                  <Box sx={{ maxHeight: 360, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell width={56}>#</TableCell>
                          <TableCell>単語</TableCell>
                          <TableCell>意味</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((r, i) => (
                            <TableRow
                                key={`${r.word}-${i}`}
                                hover
                                selected={i === current}
                                onClick={() => handleRowClick(i)}
                                sx={{ cursor: "pointer" }}
                            >
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>{r.word}</TableCell>
                              <TableCell>{r.meaning}</TableCell>
                          </TableRow>
                        ))}
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                まだありません。右の入力欄から解析してください。
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <form action={saveAction}>
                    <input type="hidden" name="book_id" value={bookId} />
                    <input type="hidden" name="payload" value={payload} />
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={saving || rows.length === 0}
                    >
                      保存（全置き換え）
                    </Button>
                  </form>

                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    保存すると、この単語帳の既存の単語はすべて削除され、上のプレビュー内容に置き換わります。
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 右：TSV 入力 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined">
                <CardHeader
                  title="入力"
                  subheader="TSVを貼り付けるか、書き換えて「解析」→「保存（全置き換え）」"
                />
                <CardContent>
                  <TextField
                    label="TSV（word<TAB>meaning）"
                    value={tsv}
                    onChange={(e) => setTsv(e.target.value)}
                    multiline
                    minRows={10}
                    fullWidth
                    placeholder={"apple\tりんご\nsave\t保存する"}
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button variant="contained" onClick={handleParse}>解析</Button>
                    <Button variant="text" onClick={() => setTsv("")}>クリア</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </>
  );
}

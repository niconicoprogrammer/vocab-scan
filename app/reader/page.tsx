"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box, Stack, Card, CardHeader, CardContent,
    TextField, Button, Typography, Divider,
    Table, TableHead, TableRow, TableCell, TableBody, LinearProgress, Chip, Grid
} from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Pause from "@mui/icons-material/Pause";
import Stop from "@mui/icons-material/Stop";

type Pair = { word: string; meaning: string };

export default function ReaderPage() {
    // ========= 設定（MVPは固定値） =========
    const rate = 1;
    const pitch = 1;
    const LANG = { en: "en-US", ja: "ja-JP" } as const;
    const gap = 1;     // 発話間隔（秒）
    const loop = true; // 末尾後に先頭へ戻るか

    // ========= UI状態 =========
    const [tsv, setTsv] = useState("");
    const [sheetUrl, setSheetUrl] = useState("");
    const [rows, setRows] = useState<Pair[]>([]);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState<number>(-1); // 0始まり、-1は未選択

    // ========= 制御用 ref（再レンダ不要の可変値） =========
    const timerRef = useRef<number | null>(null); // setTimeout の予約ID（常に0/1個）
    const stoppingRef = useRef(false);            // キャンセル要求フラグ

    // ========= 派生値 =========
    const total = rows.length;
    const progress = useMemo(() => {
        return (total > 0 && current >= 0) ? ((current + 1) / total) * 100 : 0;
    }, [current, total]);

    // ========= 副作用（マウント/アンマウント時の枠：現状はクリーンアップ用途のみ） =========
    useEffect(() => {
    }, []);

    // ========= ユーティリティ =========
    /** Utterance を共通設定で生成 */
    function createUtterance(
        text: string,
        lang: string,
        opts?: {
            rate?: number;
            pitch?: number;
            pickVoice?: (lang: string) => SpeechSynthesisVoice | null;
        }
    ): SpeechSynthesisUtterance {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = opts?.rate ?? rate;
        u.pitch = opts?.pitch ?? pitch;
        const v = opts?.pickVoice?.(lang);
        if (v) u.voice = v;
        return u;
    }

    /** 予約中のタイマーをキャンセル（冪等） */
    const clearTimer = () => {
        if (timerRef.current != null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    /** 再生を“即時かつ完全に”中止（UI更新は呼び出し側で） */
    const cancelAll = () => {
        stoppingRef.current = true;
        clearTimer();
        window.speechSynthesis.cancel();
    };

    // ========= データ処理 =========
    /** TSV を rows へ変換（"word<TAB>meaning" のみ採用） */
    const parseTsv = () => {
        const out: Pair[] = [];
        const lines = tsv.split(/\r?\n/);
        for (const [, line] of lines.entries()) {
            if (!line.trim()) continue;
            const [w, m] = line.split("\t");
            if (w && m) out.push({ word: w.trim(), meaning: m.trim() });
        }
        setRows(out);
        setCurrent(-1);
    };

    // ========= コア処理 =========
    /** 指定行 idx を「英(u1) →（gap）→ 日(u2)」で読み上げる */
    const speakPair = (idx: number) => {
        const pair = rows[idx];
        if (!pair) return;

        const firstText = pair.word;
        const secondText = pair.meaning;

        const u1 = createUtterance(firstText, LANG.en);
        const u2 = createUtterance(secondText, LANG.ja);

        // 英（u1）
        u1.onstart = () => { };
        u1.onend = () => {
            if (stoppingRef.current) return;
            clearTimer();
            const delay = Math.max(0, gap * 1000);
            timerRef.current = window.setTimeout(() => {
                window.speechSynthesis.speak(u2);
            }, delay);
        };
        u1.onerror = (e) => { console.log("[u1] error", e) };

        // 日（u2）
        u2.onstart = () => { };
        u2.onend = () => {
            if (stoppingRef.current) return;
            nextFromQueue(idx);
        };
        u2.onerror = (e) => console.log("[u2] error", e);

        try {
            window.speechSynthesis.speak(u1);
        } catch (e) {
            console.log("[speakPair] speak(u1) threw", e);
        }
    };

    /** 次の行へ遷移（末尾では loop に応じて先頭へ or 終了） */
    const nextFromQueue = (idx: number) => {
        if (stoppingRef.current) return;
        const total = rows.length;
        if (total === 0) return;

        const nextIdx = idx + 1 < total ? idx + 1 : 0;

        if (nextIdx === 0 && !loop) {
            setPlaying(false);
            return;
        }

        setCurrent(nextIdx);
        clearTimer();
        const delay = Math.max(0, gap * 1000);
        timerRef.current = window.setTimeout(() => {
            speakPair(nextIdx);
        }, delay);
    };

    // ========= ハンドラ =========
    /** 再生開始（または一時停止からの再スタート） */
    const handlePlay = () => {
        if (rows.length === 0) return;
        cancelAll();
        const startIdx = current >= 0 ? current : 0;
        setCurrent(startIdx);
        setPlaying(true);
        stoppingRef.current = false;
        timerRef.current = window.setTimeout(() => {
            speakPair(startIdx);
        }, 10);
    };

    /** 一時停止（完全停止＋位置保持） */
    const handlePause = () => {
        cancelAll();
        setPlaying(false);
    };

    /** 停止（完全停止＋位置リセット） */
    const handleStop = () => {
        cancelAll();
        setPlaying(false);
        setCurrent(-1);
    };

    /** 行クリック：current を更新。再生中ならその行から即再開 */
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

    // ========= 画面 =========
    return (
        <Stack spacing={3}>
            {/* 見出し／説明 */}
            <Typography variant="h5" fontWeight={800}>
                TSV読み上げ
            </Typography>
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

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardHeader title="プレビュー" action={<Chip label={`${rows.length} 件`} size="small" />} />
                        <CardContent sx={{ p: 0 }}>
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
                                                <TableCell colSpan={3}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                                        まだありません。右の入力欄から解析してください。
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardHeader title="入力" subheader="TSVを貼り付けるか、Googleシート公開CSVのURLを指定" />
                        <CardContent>
                            <TextField
                                label="TSV（word<TAB>meaning）"
                                value={tsv}
                                onChange={(e) => setTsv(e.target.value)}
                                multiline
                                minRows={8}
                                fullWidth
                                placeholder={"apple\tりんご\nsave\t保存する"}
                            />
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Button variant="contained" onClick={parseTsv}>解析</Button>
                                <Button variant="text" onClick={() => setTsv("")}>クリア</Button>
                            </Stack>

                            {/* <Divider sx={{ my: 2 }} />

                            <TextField
                                label="Googleシート公開CSV URL（任意）"
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                fullWidth
                                placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                            />
                            <Typography variant="caption" color="text.secondary">
                                ※ ここでは見た目だけ。取得処理は後で実装。
                            </Typography> */}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Stack>
    );
}

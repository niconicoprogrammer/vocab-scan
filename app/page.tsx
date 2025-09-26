"use client";

import { useCallback, useMemo, useRef, useState, useActionState, startTransition } from "react";
import {
  Typography, Stack, Paper, Button, List, ListItem, ListItemText, Box,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress,
  IconButton, Tooltip, Alert
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import { analyzeAction, type State } from "@/app/actions/analyze";
import { type Pair } from "@/app/types/types";

/**
 * 画像（複数）を選択/ドラッグ&ドロップ → 並び替え → サーバーアクションで解析
 * 解析結果は TSV として表示・コピー・ダウンロードできる。
 *
 * 方針：
 * - ファイル選択は「追加入力」スタイル（何回に分けても積み上げる）
 * - 同名ファイルは重複採用しない（単純な name ベースの重複排除）
 * - 並び替えは HTML5 DnD（リスト項目をドラッグして順序入替）
 * - 解析は Server Action（analyzeAction）へ FormData で画像群を送る
 * - 結果は TSV（word<TAB>meaning の行群）で表示
 */
export default function Home() {
  // ========= ファイルリスト =========
  const [files, setFiles] = useState<File[]>([]);

  // ========= ドロップゾーン（上部 Paper）のドラッグ中可視状態制御 =========
  const [dragIndex, setDragIndex] = useState<number | null>(null); // リスト内ドラッグ元インデックス（項目の視覚強調用）
  const [overIndex, setOverIndex] = useState<number | null>(null); // ドロップ先想定インデックス（項目の視覚強調用）
  const dropRef = useRef<HTMLDivElement>(null);
  const CUSTOM_TYPE = "application/x-reorder";                      // リスト内並び替え用のカスタム MIME
  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const isReorderDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(CUSTOM_TYPE);

  // ドロップゾーンの「いまドラッグが乗っているか」視覚状態（dragenter/leave はネストの都合で多重発火し得るためカウンタ方式）
  const [counter, setCounter] = useState(0);
  const isDragging = counter > 0;

  /**
   * 既存配列に next を「重複名を除外して」結合する。
   * （単純化のため name だけで重複判定。実際のバイト一致での判定は行わない）
   */
  const mergeFiles = (prev: File[], next: File[]) => {
    const names = new Set(prev.map(f => f.name));
    const appended = next.filter(f => !names.has(f.name));
    return [...prev, ...appended];
  };

  /** 「ファイル選択」ボタンからの追加（input[type=file]） */
  const handlePick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const picked = Array.from(e.currentTarget.files ?? []);
    setFiles(prev => mergeFiles(prev, picked));
    // 同じファイルを連続選択できるように value を空に戻す
    e.currentTarget.value = "";
  };

  // ========= ドロップゾーン（画像ファイルのみ採用） =========

  /** DataTransfer.files を受け取り、画像のみ追加 */
  const applyFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter(f => f.type.startsWith("image/"));
    setFiles(prev => mergeFiles(prev, imgs));
  }, []);

  /** 上部ドロップゾーンにドロップされた */
  const onDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setCounter(0); // dragenter/leave の見た目リセット
    applyFiles(e.dataTransfer.files);
  };
  const onDropZoneDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setCounter(c => c + 1);
  };
  const onDropZoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setCounter(c => Math.max(0, c - 1));
  };
  const onDropZoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault(); // ドロップ許可（既定動作を抑止）
  };

  // ========= リスト内並び替え（HTML5 DnD） =========

  /** 項目ドラッグ開始：元インデックスを dataTransfer に埋め込む */
  const handleItemDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(CUSTOM_TYPE, String(index));
  };

  /** 項目上をドラッグで通過：移動先インデックスの視覚強調 */
  const handleItemDragOver = (index: number) => (e: React.DragEvent) => {
    if (!isReorderDrag(e)) return;
    e.preventDefault();
    setOverIndex(index);
    e.dataTransfer.dropEffect = "move";
  };

  /** 項目ドロップ：配列を src→dst へ移動 */
  const handleItemDrop = (index: number) => (e: React.DragEvent) => {
    if (!isReorderDrag(e)) return;
    e.preventDefault();
    const src = Number(e.dataTransfer.getData(CUSTOM_TYPE));
    const dst = index;
    setDragIndex(null);
    setOverIndex(null);
    if (Number.isNaN(src) || src === dst) return;
    setFiles(prev => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(dst, 0, moved);
      return next;
    });
  };

  /** ドラッグ終了：強調状態をクリア */
  const handleItemDragEnd = () => { setDragIndex(null); setOverIndex(null); };

  /** ファイル削除（指定インデックス） */
  const handleRemove = (index: number) => () => { setFiles(prev => prev.filter((_, i) => i !== index)); };

  // ========= 解析ダイアログとサーバーアクション =========

  const [open, setOpen] = useState(false);

  /**
   * Server Action の状態管理。
   * - analyzeAction: 画像を受け取り OCR/解析し、Pair[] を返す想定
   * - state.ok が true なら解析成功、state.data に結果（Pair[]）
   */
  const [state, formAction, pending] = useActionState<State, FormData>(
    analyzeAction,
    { ok: false, error: "" }
  );

  /** 解析結果を TSV 文字列に整形（成功時のみ） */
  const tsv = state.ok ? state.data.map((r: Pair) => `${r.word}\t${r.meaning}`).join("\n") : "";

  /** 解析の実行：files を FormData で Action に送る（結果はダイアログに表示） */
  const handleAnalyze = () => {
    if (files.length === 0) { setOpen(true); return; }
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    setOpen(true);
    // 送信と state 更新は並行（UI のブロッキングを避ける）
    startTransition(() => { formAction(fd); });
  };

  // ========= 画面 =========
  return (
    <Stack spacing={3}>
      {/* 見出し／説明 */}
      <Typography variant="h5" fontWeight={800}>
        画像ファイル選択（複数可 & 並び替え対応）
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        画像を選んで「解析」。結果は TSV としてコピー/保存できます。
      </Typography>

      {/* ドロップゾーン + 選択済みファイル一覧 */}
      <Paper
        ref={dropRef}
        variant="outlined"
        onDrop={onDropZoneDrop}
        onDragOver={onDropZoneDragOver}
        onDragEnter={onDropZoneDragEnter}
        onDragLeave={onDropZoneDragLeave}
        sx={{
          p: 4, textAlign: "center", borderStyle: "dashed",
          borderColor: isDragging ? "primary.main" : "divider",
          boxShadow: isDragging ? (t) => `0 0 0 3px ${t.palette.primary.main}33 inset` : "none",
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          ここに画像ファイルをドラッグ＆ドロップしてください
        </Typography>
        <Typography variant="body2" color="text.secondary">
          または下の「ファイル選択」から追加できます。
        </Typography>

        {/* 選択済みファイル一覧（ドラッグで並び替え） */}
        <List dense sx={{ textAlign: "center", mt: 1 }}>
          {files.map((f, idx) => (
            <ListItem
              key={`${f.name}-${idx}`}
              component="div"
              draggable
              onDragStart={handleItemDragStart(idx)}
              onDragOver={handleItemDragOver(idx)}
              onDrop={handleItemDrop(idx)}
              onDragEnd={handleItemDragEnd}
              secondaryAction={
                <Tooltip title="削除">
                  <IconButton edge="end" onClick={handleRemove(idx)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{
                borderRadius: 1, mb: 0.5, border: "1px solid",
                borderColor: idx === overIndex ? "primary.main" :
                  idx === dragIndex ? "grey.400" : "divider",
                bgcolor: idx === dragIndex ? "action.hover" : "background.paper",
                cursor: "grab",
              }}
            >
              <ListItemText primary={f.name} secondary={`${Math.round(f.size / 1024)} KB`} />
            </ListItem>
          ))}
          {files.length === 0 && (
            <Typography variant="body2" color="text.secondary">まだ選択されていません。</Typography>
          )}
        </List>

        {/* ファイル追加／操作ボタン群 */}
        <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: "center" }}>
          <Box component="label">
            <Button variant="contained" component="span">ファイル選択</Button>
            {/* 同名重複は mergeFiles 側でスキップ */}
            <input hidden type="file" accept="image/*" multiple onChange={handlePick} />
          </Box>

          {files.length > 0 && (
            <>
              <Button variant="contained" onClick={handleAnalyze} disabled={pending}>解析</Button>
              <Button variant="outlined" onClick={() => setFiles([])} disabled={pending}>クリア</Button>
            </>
          )}
        </Stack>
      </Paper>

      {/* TSV 出力ダイアログ（結果表示のみ。画像プレビュー等はなし） */}
      <Dialog open={open} onClose={() => !pending && setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>出力結果（TSV）</DialogTitle>

        <DialogContent dividers sx={{ py: 1.5, px: 2 }}>
          {/* サーバーアクション進行中のインジケータ */}
          {pending && <LinearProgress sx={{ mb: 2 }} />}

          {/* エラー表示（成功時は state.ok=true になる） */}
          {!pending && !state.ok && state.error && (
            <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>
          )}

          {/* TSV 本文 */}
          <Box
            component="pre"
            sx={{
              whiteSpace: "pre-wrap",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              m: 0,
              minHeight: 160,
            }}
          >
            {state.ok && tsv ? tsv : "（まだありません）"}
          </Box>
        </DialogContent>

        <DialogActions>
          {/* クリップボードにコピー */}
          <Tooltip title="TSVをコピー">
            <span>
              <IconButton
                disabled={!tsv || pending || !state.ok}
                onClick={async () => await navigator.clipboard.writeText(tsv)}
              >
                <ContentCopyIcon />
              </IconButton>
            </span>
          </Tooltip>

          {/* TSV をファイル保存（Blob→ObjectURL→a.click） */}
          <Tooltip title="TSVを保存">
            <span>
              <IconButton
                disabled={!tsv || pending || !state.ok}
                onClick={() => {
                  const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `vocab-scan-${new Date().toISOString().slice(0, 10)}.tsv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>

          {/* 閉じる（処理中は閉じられない） */}
          <Button onClick={() => setOpen(false)} disabled={pending}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

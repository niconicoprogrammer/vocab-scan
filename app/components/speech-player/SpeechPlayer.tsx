"use client";

import {
  Stack, Card, CardContent,
  Button, Typography, LinearProgress, Slider
} from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Pause from "@mui/icons-material/Pause";
import Stop from "@mui/icons-material/Stop";
import { Pair } from "@/app/types/types";

export type SpeechPlayerProps = {
  rows: Pair[];
  current: number;
  total: number;
  progress: number;
  playing: boolean;
  rate: number,
  gapSec: number,
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRateChange: (value: number) => void;
  onGapSecChange: (value: number) => void;
};

export default function SpeechPlayer({
  rows,
  current,
  total,
  progress,
  playing,
  rate,
  gapSec,
  onPlay,
  onPause,
  onStop,
  onRateChange,
  onGapSecChange
}: SpeechPlayerProps) {

  const disabledPlay = rows.length === 0 || playing;
  const disabledPause = !playing;
  const disabledStop = !playing;

  const currentLabel =
    current >= 0 && rows[current]
      ? `${rows[current].word} — ${rows[current].meaning}`
      : "—";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          {/* ボタン群 */}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={onPlay}
              disabled={disabledPlay}
            >
              再生
            </Button>
            <Button
              variant="outlined"
              startIcon={<Pause />}
              onClick={onPause}
              disabled={disabledPause}
            >
              一時停止
            </Button>
            <Button
              variant="text"
              startIcon={<Stop />}
              onClick={onStop}
              disabled={disabledStop}
            >
              停止
            </Button>
          </Stack>

          <Stack direction="row" spacing={4} alignItems="center">
            {/* 再生速度 */}
            <Stack spacing={1} flex={1}>
              <Typography variant="body2" color="text.secondary">
                速度: {rate.toFixed(1)}x
              </Typography>
              <Slider
                min={0.5}
                max={2.0}
                step={0.1}
                value={rate}
                onChange={(_, val) => onRateChange(val as number)}
                valueLabelDisplay="auto"
              />
            </Stack>

            {/* 待機時間 */}
            <Stack spacing={1} flex={1}>
              <Typography variant="body2" color="text.secondary">
                間隔: {gapSec.toFixed(2)}s
              </Typography>
              <Slider
                min={0}
                max={2.0}
                step={0.05}
                value={gapSec}
                onChange={(_, val) => onGapSecChange(val as number)}
                valueLabelDisplay="auto"
              />
            </Stack>
          </Stack>

          {/* 進捗表示 */}
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              進捗：{current >= 0 ? current + 1 : 0} / {total}
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              {currentLabel}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

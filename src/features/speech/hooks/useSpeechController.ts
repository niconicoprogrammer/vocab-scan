'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  createSpeechController,
  type Cfg,
  type Pair,
  type TtsController,
} from '@/features/speech/logic/speechController';

export function useSpeechController(
  deps: {
    rows: Pair[];
    current: number;
    setCurrent: (i: number) => void;
    playing: boolean;
    setPlaying: (b: boolean) => void;
    loop: boolean;
  },
  cfg: Cfg,
): TtsController {
  const { rows, current, setCurrent, playing, setPlaying, loop } = deps;
  // ✅ cfg の最新値を保持する ref
  const cfgRef = useRef<Cfg>(cfg);
  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]); // rate/pitch/gapSec/LANG/pickVoice すべて包含

  // 最新値を常に参照できるように ref 経由にする（controllerの再生成を防ぐ）
  const rowsRef = useRef(rows);
  const currentRef = useRef(current);
  const playingRef = useRef(playing);
  const loopRef = useRef(loop);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const ctrl = useMemo(
    () =>
      createSpeechController({
        getRows: () => rowsRef.current,
        getCurrent: () => currentRef.current,
        setCurrent: setCurrent,
        getPlaying: () => playingRef.current,
        setPlaying: setPlaying,
        getLoop: () => loopRef.current,
        getCfg: () => cfgRef.current,
      }),
    [setCurrent, setPlaying],
  );

  // 後片付け
  useEffect(() => ctrl.dispose, [ctrl]);

  return ctrl;
}

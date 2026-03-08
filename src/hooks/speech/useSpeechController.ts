"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createSpeechController,
  type Cfg,
  type Pair,
  type TtsController,
} from "./speechController";

export function useSpeechController(
  deps: {
    rows: Pair[];
    current: number;
    setCurrent: (i: number) => void;
    playing: boolean;
    setPlaying: (b: boolean) => void;
    loop: boolean;
  },
  cfg: Cfg
): TtsController {
  // ✅ cfg の最新値を保持する ref
  const cfgRef = useRef<Cfg>(cfg);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]); // rate/pitch/gapSec/LANG/pickVoice すべて包含

  // 最新値を常に参照できるように ref 経由にする（controllerの再生成を防ぐ）
  const rowsRef = useRef(deps.rows);
  const currentRef = useRef(deps.current);
  const playingRef = useRef(deps.playing);

  useEffect(() => { rowsRef.current = deps.rows; }, [deps.rows]);
  useEffect(() => { currentRef.current = deps.current; }, [deps.current]);
  useEffect(() => { playingRef.current = deps.playing; }, [deps.playing]);

  const ctrl = useMemo(
    () =>
      createSpeechController({
        getRows: () => rowsRef.current,
        getCurrent: () => currentRef.current,
        setCurrent: deps.setCurrent,
        getPlaying: () => playingRef.current,
        setPlaying: deps.setPlaying,
        getLoop: () => deps.loop,
        getCfg: () => cfgRef.current,
      }),
    [deps.setCurrent, deps.setPlaying, deps.loop]
  );

  // 後片付け
  useEffect(() => ctrl.dispose, [ctrl]);

  return ctrl;
}

export type Pair = { word: string; meaning: string };
export type PickVoice = (lang: string) => SpeechSynthesisVoice | null;

export type Cfg = {
  rate: number;             // 読み上げ速度
  pitch: number;            // ピッチ
  gapSec: number;           // 単語間/行間の待機（秒）
  LANG: { en: string; ja: string }; // 言語コード
  pickVoice?: PickVoice;    // 任意: 言語→voice の選択
};

export type Deps = {
  // 状態はDI（Reactに依存しない）
  getRows: () => Pair[];
  getCurrent: () => number;         // -1 = 未選択
  setCurrent: (i: number) => void;
  getPlaying: () => boolean;
  setPlaying: (b: boolean) => void;
  getLoop: () => boolean;
  getCfg: () => Cfg;
  synth?: SpeechSynthesis;          // 省略時は window.speechSynthesis
};

export type TtsController = {
  handlePlay: () => void;
  handlePause: () => void;
  handleStop: () => void;
  handleRowClick: (i: number) => void;

  speakFromIndex: (i: number) => void;
  cancelAll: () => void;
  dispose: () => void;
};

function createUtterance(
  text: string,
  lang: string,
  cfg: Pick<Cfg, "rate" | "pitch"> & { pickVoice?: PickVoice }
): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = cfg.rate;
  u.pitch = cfg.pitch;
  const v = cfg.pickVoice?.(lang);
  if (v) u.voice = v;
  return u;
}

export function createSpeechController(deps: Deps): TtsController {
  const synth = deps.synth ?? (typeof window !== "undefined" ? window.speechSynthesis : undefined);
  let timer: number | null = null;
  let stopping = false;

  const clearTimer = () => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const cancelAll = () => {
    stopping = true;
    clearTimer();
    synth?.cancel();
  };

  const nextFromQueue = (idx: number) => {
    if (stopping) return;
    const total = deps.getRows().length;
    if (total === 0) return;

    const nextIdx = idx + 1 < total ? idx + 1 : 0;
    const loop = deps.getLoop();

    if (nextIdx === 0 && !loop) {
      deps.setPlaying(false);
      return;
    }

    deps.setCurrent(nextIdx);
    clearTimer();

    const { gapSec } = deps.getCfg();
    const delayMs = Math.max(0, gapSec * 1000);
    timer = window.setTimeout(() => speakFromIndex(nextIdx), delayMs);
  };

  const speakPair = (idx: number) => {
    const rows = deps.getRows();
    const pair = rows[idx];
    if (!pair || !synth) return;

    const { LANG, gapSec, rate, pitch, pickVoice } = deps.getCfg();
    const delayMs = Math.max(0, gapSec * 1000);

    const u1 = createUtterance(pair.word, LANG.en, { rate, pitch, pickVoice });
    const u2 = createUtterance(pair.meaning, LANG.ja, { rate, pitch, pickVoice });

    u1.onend = () => {
      if (stopping) return;
      clearTimer();
      timer = window.setTimeout(() => synth.speak(u2), delayMs);
    };
    u1.onerror = (e) => console.log("[u1] error", e);

    u2.onend = () => {
      if (stopping) return;
      nextFromQueue(idx);
    };
    u2.onerror = (e) => console.log("[u2] error", e);

    try {
      synth.speak(u1);
    } catch (e) {
      console.log("[speakPair] speak(u1) threw", e);
    }
  };

  const speakFromIndex = (i: number) => {
    if (!synth) return;
    speakPair(i);
  };

  // ---- ハンドラ（UI/ページに渡す） ----
  const handlePlay = () => {
    const rows = deps.getRows();
    if (!synth || rows.length === 0) return;
    cancelAll();
    const startIdx = deps.getCurrent() >= 0 ? deps.getCurrent() : 0;
    deps.setCurrent(startIdx);
    deps.setPlaying(true);
    stopping = false;
    timer = window.setTimeout(() => speakFromIndex(startIdx), 10);
  };

  const handlePause = () => {
    if (!synth) return;
    // 完全停止＋位置保持
    cancelAll();
    deps.setPlaying(false);
  };

  const handleStop = () => {
    if (!synth) return;
    cancelAll();
    deps.setPlaying(false);
    deps.setCurrent(-1);
  };

  const handleRowClick = (i: number) => {
    deps.setCurrent(i);
    if (deps.getPlaying() && synth) {
      cancelAll();
      stopping = false;
      timer = window.setTimeout(() => speakFromIndex(i), 10);
    }
  };

  const dispose = () => {
    cancelAll();
  };

  return {
    handlePlay,
    handlePause,
    handleStop,
    handleRowClick,
    speakFromIndex,
    cancelAll,
    dispose,
  };
}

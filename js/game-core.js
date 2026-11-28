// ==========================================
// 🎮 ちびゲーム広場 — ゲームロジック中核（DOM 非依存）
// 3ゲームのルール計算だけを集めたモジュール。
// ブラウザでは app.js より先に読み込まれ、Node ではテストから require される。
// ==========================================
"use strict";

const ChibiCore = (() => {
  // ----------------------------------------
  // 🏆 ベストスコア（localStorage）
  // ----------------------------------------
  // 📌 ベスト記録の保存キー（旧実装と同一。既存ユーザーの記録を引き継ぐため変更しない）
  const BEST_KEYS = {
    reactionAvg: "chibigame_best_reaction_avg",
    reaction: "chibigame_best_reaction",
    color: "chibigame_best_color",
    memory: "chibigame_best_memory"
  };
  // 🌙 テーマの保存キー
  const THEME_KEY = "chibigame-theme";

  // 🏆 保存値をベスト記録として解釈する（記録なし・数値でない値は null）
  // ⚠️ NaN を返すと表示が「NaN」になり、比較が常に false で二度と更新できなくなるため、
  // 有限数でない保存値は「記録なし」として扱い、次のプレイで正しい記録に自己回復させる。
  function parseBestValue(raw) {
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // 🏆 新しい記録がベストを更新するかどうかを判定する
  // 反射神経系（平均・1回）は小さいほど良く、それ以外は大きいほど良い。
  function isBetterBest(kind, prev, next) {
    if (prev === null || prev === undefined) return true;
    if (kind === "reactionAvg" || kind === "reaction") return next < prev;
    return next > prev;
  }

  // ----------------------------------------
  // ⚡ 反射神経テスト
  // 赤い「待って…」→ ランダムな待ち時間 → 緑でタップ。全5回の平均とベストを競う。
  // ----------------------------------------
  const REACTION_TOTAL = 5; // 合計回数
  const REACTION_WAIT_MIN = 1200; // 待ち時間の下限（ミリ秒）
  const REACTION_WAIT_SPAN = 3800; // 待ち時間の幅（上限は 1.2+3.8=5.0 秒）

  // ⚡ 緑に変わるまでの待ち時間を求める（1.2〜5.0秒の一様乱数）
  function reactionWaitMs(rng) {
    return REACTION_WAIT_MIN + rng() * REACTION_WAIT_SPAN;
  }

  // ⚡ 記録一覧から 回数・平均（四捨五入）・ベスト（最小）を集計する
  function reactionStats(results) {
    if (!results || results.length === 0) return { count: 0, avg: null, best: null };
    const total = results.reduce((a, b) => a + b, 0);
    return {
      count: results.length,
      avg: Math.round(total / results.length),
      best: Math.min(...results)
    };
  }

  // ----------------------------------------
  // 🎨 色違い当て
  // 60秒間、1マスだけ色の違うマスを当てる。正解 +1点＆難易度UP、ミス -2点。
  // ----------------------------------------
  const COLOR_TIME_LIMIT = 60; // 制限時間（秒）
  const COLOR_SCORE_CORRECT = 1; // 正解の得点
  const COLOR_SCORE_WRONG = -2; // ミスの減点

  // 🎨 正解数から現在のレベルを求める（正解2問ごとに +1、最大10）
  function colorLevel(correctCount) {
    return Math.min(10, 1 + Math.floor(correctCount / 2));
  }
  // 🎨 レベルからグリッドの辺の長さを求める（L1-3:3, L4-6:4, L7-9:5, L10:6）
  function colorGridSize(level) {
    return Math.min(6, 3 + Math.floor((level - 1) / 3));
  }
  // 🎨 レベルから色の違い（明度差 ΔL）を求める（L1:38 → L10:6、小さいほど難しい）
  function colorDelta(level) {
    return Math.max(6, 42 - level * 4);
  }
  // 🎨 得点の増減を求める
  function colorScoreDelta(correct) {
    return correct ? COLOR_SCORE_CORRECT : COLOR_SCORE_WRONG;
  }

  // 🎨 1問分の出題内容を決める
  // 乱数の消費順は 旧実装と同じ（色相→彩度→明度→差の向き→正解マス）。
  function makeColorRound(correctCount, rng) {
    const level = colorLevel(correctCount);
    const size = colorGridSize(level);
    const delta = colorDelta(level);
    const hue = Math.floor(rng() * 360);
    const sat = 55 + Math.floor(rng() * 25); // 55〜79%
    const light = 45 + Math.floor(rng() * 15); // 45〜59%
    // 明度だけを ±Δ ずらした色が正解マス。範囲は 4〜96 に収める
    const diffLight = Math.max(4, Math.min(96, light + (rng() < 0.5 ? -delta : delta)));
    const answerIdx = Math.floor(rng() * size * size);
    return {
      level,
      size,
      delta,
      hue,
      sat,
      light,
      diffLight,
      answerIdx,
      base: `hsl(${hue} ${sat}% ${light}%)`,
      diff: `hsl(${hue} ${sat}% ${diffLight}%)`
    };
  }

  // ----------------------------------------
  // 🔢 数字記憶
  // 数字列を（桁数×0.6+1）秒だけ表示して覚え、隠れたら入力して答える。
  // 正解するごとに桁数+1、間違えたら終了。到達桁数がスコア。
  // ----------------------------------------
  const MEMORY_START_DIGITS = 3; // 開始桁数

  // 🔢 数字の表示時間（ミリ秒）を求める
  function memoryShowMs(digits) {
    return Math.round((digits * 0.6 + 1) * 1000);
  }
  // 🔢 指定桁数の数字列を作る（先頭が 0 になることもある）
  function makeDigitString(digits, rng) {
    let s = "";
    for (let i = 0; i < digits; i++) s += Math.floor(rng() * 10);
    return s;
  }
  // 🔢 入力（前後の空白は無視）が正解と一致するかを判定する
  function judgeMemory(input, answer) {
    return String(input).trim() === answer;
  }

  return {
    BEST_KEYS,
    THEME_KEY,
    parseBestValue,
    isBetterBest,
    REACTION_TOTAL,
    reactionWaitMs,
    reactionStats,
    COLOR_TIME_LIMIT,
    colorLevel,
    colorGridSize,
    colorDelta,
    colorScoreDelta,
    makeColorRound,
    MEMORY_START_DIGITS,
    memoryShowMs,
    makeDigitString,
    judgeMemory
  };
})();

// 🌐 読み込み先に応じて公開する（ブラウザ: グローバル / Node: module.exports）
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChibiCore;
}
if (typeof window !== "undefined") {
  window.ChibiCore = ChibiCore;
}

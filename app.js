"use strict";
// ==========================================
// 🎮 ちびゲーム広場 app.js — 画面と操作の配線
// (1) 反射神経テスト (2) 色違い当て (3) 数字記憶
// ルール計算は js/game-core.js（ChibiCore）に寄せ、ここは DOM だけを扱う。
// ベストスコアは localStorage に保存する。
// ==========================================
const $ = (id) => document.getElementById(id);
const Core = window.ChibiCore;
const SCREENS = ["home", "reaction", "color", "memory"];

// 🖥️ 画面を切り替え、離れた画面のゲームを止める
function showScreen(name) {
  for (const s of SCREENS) {
    $("screen-" + s).classList.toggle("hidden", s !== name);
  }
  // 🛑 画面を離れたら各ゲームを安全に止める
  if (name !== "reaction") reactionReset(false);
  if (name !== "color") colorStop();
  if (name !== "memory") memoryStop();
  if (name === "home") renderBestLines();
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-goto]").forEach((el) => {
  el.addEventListener("click", () => showScreen(el.dataset.goto));
});

// ------------------------------------------
// 🏆 ベストスコア
// ------------------------------------------
// 🏆 ベスト記録を取得する（無ければ null）
function getBest(key) {
  return Core.parseBestValue(localStorage.getItem(key));
}
// 🏆 ベスト記録を保存する
function setBest(key, value) {
  localStorage.setItem(key, String(value));
}
// 🏆 ベスト更新の判定つきで保存する（更新したら true）
function updateBest(kind, value) {
  const key = Core.BEST_KEYS[kind];
  if (!Core.isBetterBest(kind, getBest(key), value)) return false;
  setBest(key, value);
  return true;
}
// 🏆 トップ画面のベスト記録表示を更新する
function renderBestLines() {
  const ra = getBest(Core.BEST_KEYS.reactionAvg);
  const r1 = getBest(Core.BEST_KEYS.reaction);
  const c = getBest(Core.BEST_KEYS.color);
  const m = getBest(Core.BEST_KEYS.memory);
  $("best-reaction-avg").textContent = ra === null ? "―" : `${ra} ms`;
  $("best-reaction").textContent = r1 === null ? "―" : `${r1} ms`;
  $("best-color").textContent = c === null ? "―" : `${c} 点`;
  $("best-memory").textContent = m === null ? "―" : `${m} 桁`;
}

// ==========================================
// ⚡ (1) 反射神経テスト
// 状態: idle → waiting（赤） → go（緑） → 結果表示。5回で平均とベスト
// ==========================================
const rx = {
  state: "idle", // idle | waiting | go | shown | foul | finished
  timerId: null,
  goAt: 0,
  results: []
};

// ⚡ 反射神経テストを初期状態に戻す
function reactionReset(updateUi = true) {
  if (rx.timerId) { clearTimeout(rx.timerId); rx.timerId = null; }
  rx.state = "idle";
  rx.results = [];
  if (updateUi) reactionRender("タップしてスタート", "", "rx-idle");
  $("rx-count").textContent = `0 / ${Core.REACTION_TOTAL}`;
  $("rx-avg").textContent = "―";
  $("rx-best").textContent = "―";
  $("rx-history").textContent = "";
}
// ⚡ 反射神経テストのステージ表示を更新する
function reactionRender(main, sub, cls) {
  const stage = $("rx-stage");
  stage.className = "rx-stage " + cls;
  $("rx-message").textContent = main;
  $("rx-sub").textContent = sub;
}
// ⚡ 反射神経テストの回数・平均・ベスト表示を更新する
function reactionUpdateStats() {
  const stats = Core.reactionStats(rx.results);
  $("rx-count").textContent = `${stats.count} / ${Core.REACTION_TOTAL}`;
  if (stats.count > 0) {
    $("rx-avg").textContent = `${stats.avg} ms`;
    $("rx-best").textContent = `${stats.best} ms`;
    $("rx-history").textContent = "記録: " + rx.results.map((r) => `${r}ms`).join(" / ");
  }
}
// ⚡ 緑になるまで待つ状態にする
function reactionStartWait() {
  rx.state = "waiting";
  reactionRender("待って…", "緑になったらタップ！", "rx-wait");
  rx.timerId = setTimeout(() => {
    rx.state = "go";
    rx.goAt = performance.now();
    reactionRender("タップ！", "", "rx-go");
  }, Core.reactionWaitMs(Math.random));
}
// ⚡ ステージのタップ・キー入力を状態に応じて処理する
function reactionTap() {
  switch (rx.state) {
    case "idle":
    case "shown":
    case "foul":
      if (rx.results.length >= Core.REACTION_TOTAL) reactionReset();
      reactionStartWait();
      break;
    case "waiting":
      // 🚩 フライング（その回は記録せず、やり直し）
      if (rx.timerId) { clearTimeout(rx.timerId); rx.timerId = null; }
      rx.state = "foul";
      reactionRender("フライング！", "緑になるまで待ってね。タップでもう一度", "rx-foul");
      break;
    case "go": {
      const ms = Math.round(performance.now() - rx.goAt);
      rx.results.push(ms);
      reactionUpdateStats();
      if (rx.results.length >= Core.REACTION_TOTAL) {
        rx.state = "finished";
        const stats = Core.reactionStats(rx.results);
        reactionRender("おつかれさま！", `${ms} ms ― 平均 ${stats.avg} ms / ベスト ${stats.best} ms。タップでもう一度`, "rx-done");
        updateBest("reactionAvg", stats.avg);
        updateBest("reaction", stats.best);
      } else {
        rx.state = "shown";
        reactionRender(`${ms} ms`, `あと ${Core.REACTION_TOTAL - rx.results.length} 回。タップで次へ`, "rx-done");
      }
      break;
    }
    case "finished":
      reactionReset();
      reactionStartWait();
      break;
  }
}
$("rx-stage").addEventListener("pointerdown", (e) => { e.preventDefault(); reactionTap(); });
$("rx-stage").addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); reactionTap(); }
});
$("rx-restart").addEventListener("click", () => reactionReset());

// ==========================================
// 🎨 (2) 色違い当て
// 60秒間、正解でスコア+1＆難易度UP、ミスでスコア-2（減点）
// 難易度: グリッド 3×3→6×6、色差 Δ を段階的に小さくする
// ==========================================
const col = {
  playing: false,
  score: 0,
  correctCount: 0,
  timeLeft: Core.COLOR_TIME_LIMIT,
  timerId: null,
  answerIdx: -1,
  locked: false
};

// 🎨 新しい問題を作ってグリッドに並べる
function colorNewRound() {
  const round = Core.makeColorRound(col.correctCount, Math.random);
  col.answerIdx = round.answerIdx;
  col.locked = false;

  const grid = $("col-grid");
  grid.style.gridTemplateColumns = `repeat(${round.size}, 1fr)`;
  grid.innerHTML = "";
  for (let i = 0; i < round.size * round.size; i++) {
    const b = document.createElement("button");
    b.className = "col-cell";
    b.style.background = i === col.answerIdx ? round.diff : round.base;
    b.setAttribute("aria-label", "色マス");
    b.addEventListener("click", () => colorPick(i, b));
    grid.appendChild(b);
  }
  $("col-level").textContent = round.level;
  $("col-message").textContent = "1マスだけ色が違います。どれ？";
}
// 🎨 タップしたマスが正解かどうかを判定する
function colorPick(i, btn) {
  if (!col.playing || col.locked) return;
  if (i === col.answerIdx) {
    col.locked = true;
    col.score += Core.colorScoreDelta(true);
    col.correctCount += 1;
    btn.classList.add("correct-flash");
    $("col-feedback").textContent = "⭕ 正解！ +1点";
    setTimeout(() => { if (col.playing) colorNewRound(); }, 220);
  } else {
    col.score += Core.colorScoreDelta(false);
    btn.classList.add("wrong-flash");
    $("col-feedback").textContent = "❌ ハズレ… -2点";
    setTimeout(() => btn.classList.remove("wrong-flash"), 250);
  }
  $("col-score").textContent = col.score;
}
// 🎨 色違い当てを開始する（60秒）
function colorStart() {
  colorStop();
  col.playing = true;
  col.score = 0;
  col.correctCount = 0;
  col.timeLeft = Core.COLOR_TIME_LIMIT;
  $("col-score").textContent = "0";
  $("col-time").textContent = String(Core.COLOR_TIME_LIMIT);
  $("col-feedback").textContent = "";
  $("col-start").textContent = "やりなおす";
  colorNewRound();
  col.timerId = setInterval(() => {
    col.timeLeft -= 1;
    $("col-time").textContent = col.timeLeft;
    if (col.timeLeft <= 0) colorFinish();
  }, 1000);
}
// 🎨 色違い当てを終了し、ベストを更新する
function colorFinish() {
  colorStop();
  $("col-message").textContent = `終了！ スコア ${col.score} 点（正解 ${col.correctCount} 問）`;
  $("col-feedback").textContent = "もう一度遊ぶには「スタート」を押してね。";
  $("col-start").textContent = "スタート";
  updateBest("color", col.score);
}
// 🎨 色違い当てのタイマーを止める
function colorStop() {
  if (col.timerId) { clearInterval(col.timerId); col.timerId = null; }
  col.playing = false;
}
$("col-start").addEventListener("click", colorStart);

// ==========================================
// 🔢 (3) 数字記憶
// 数字列を（桁数×0.6+1）秒表示 → 隠して入力。正解で桁数+1、
// 不正解で終了。到達桁数（正解した最大桁数）がスコア
// ==========================================
const mem = {
  playing: false,
  digits: Core.MEMORY_START_DIGITS,
  answer: "",
  reached: 0,
  hideTimerId: null
};

// 🔢 数字記憶のタイマーを止める
function memoryStop() {
  if (mem.hideTimerId) { clearTimeout(mem.hideTimerId); mem.hideTimerId = null; }
  mem.playing = false;
}
// 🔢 数字記憶を開始する（3桁から）
function memoryStart() {
  memoryStop();
  mem.playing = true;
  mem.digits = Core.MEMORY_START_DIGITS;
  mem.reached = 0;
  $("mem-reached").textContent = "―";
  $("mem-start").textContent = "やりなおす";
  memoryRound();
}
// 🔢 数字を一定時間表示してから隠す
function memoryRound() {
  mem.answer = Core.makeDigitString(mem.digits, Math.random);
  $("mem-digits").textContent = mem.digits;
  $("mem-display").textContent = mem.answer;
  $("mem-message").textContent = `${mem.digits}桁の数字を覚えて！`;
  $("mem-input-row").classList.add("hidden");
  $("mem-input").value = "";
  mem.hideTimerId = setTimeout(() => {
    $("mem-display").textContent = "＊".repeat(mem.digits);
    $("mem-message").textContent = "覚えた数字を入力して「こたえる」を押してね。";
    $("mem-input-row").classList.remove("hidden");
    $("mem-input").focus();
  }, Core.memoryShowMs(mem.digits));
}
// 🔢 入力した数字が正解かどうかを判定する
function memorySubmit() {
  if (!mem.playing) return;
  const v = $("mem-input").value;
  if (Core.judgeMemory(v, mem.answer)) {
    mem.reached = mem.digits;
    $("mem-reached").textContent = `${mem.reached} 桁`;
    $("mem-display").textContent = "⭕";
    $("mem-message").textContent = `正解！ 次は ${mem.digits + 1} 桁に挑戦。`;
    $("mem-input-row").classList.add("hidden");
    mem.digits += 1;
    mem.hideTimerId = setTimeout(() => { if (mem.playing) memoryRound(); }, 900);
  } else {
    memoryStop();
    $("mem-display").textContent = mem.answer;
    const score = mem.reached;
    $("mem-message").textContent =
      `❌ 残念、正解は ${mem.answer} でした。到達は ${score} 桁${score >= 3 ? "" : "（3桁は未正解）"}。スタートでもう一度！`;
    $("mem-input-row").classList.add("hidden");
    $("mem-start").textContent = "スタート";
    // 到達0桁（1問も正解していない）ときは記録しない
    if (score > 0) updateBest("memory", score);
  }
}
$("mem-start").addEventListener("click", memoryStart);
$("mem-submit").addEventListener("click", memorySubmit);
$("mem-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); memorySubmit(); }
});

// ------------------------------------------
// 🌙 テーマ切り替え（見た目のみ・ゲームには影響しない）
// ------------------------------------------
(function initTheme() {
  var root = document.documentElement;
  if (!root || !root.getAttribute || !root.setAttribute) return;
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "light" ? "☀️" : "🌙";
  }
  var current = root.getAttribute("data-theme");
  if (current !== "light" && current !== "dark") {
    try { current = localStorage.getItem(Core.THEME_KEY); } catch (e) { current = null; }
  }
  apply(current === "light" ? "light" : "dark");
  var btn = document.getElementById("themeToggle");
  if (btn && btn.addEventListener) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem(Core.THEME_KEY, next); } catch (e) { /* 保存できなくても切り替え自体は有効 */ }
    });
  }
})();

// ------------------------------------------
// 🚀 初期化
// ------------------------------------------
reactionReset(false);
renderBestLines();
showScreen("home");

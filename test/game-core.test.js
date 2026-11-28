"use strict";
// ==========================================
// 🧪 ちびゲーム広場 — ロジック中核の単体テスト（node:test、依存なし）
// 実行: npm test
// ==========================================
const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../js/game-core.js");

// 🎲 決定的な乱数（mulberry32）。同じ種からは同じ列が出る
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 🎲 与えた値を順に返す乱数（境界値の確認用）
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// ----------------------------------------
// 🏆 ベストスコアの解釈
// ----------------------------------------
test("parseBestValue: 保存なし・空は null", () => {
  assert.equal(Core.parseBestValue(null), null);
  assert.equal(Core.parseBestValue(undefined), null);
});

test("parseBestValue: 数値文字列はその数値になる", () => {
  assert.equal(Core.parseBestValue("250"), 250);
  assert.equal(Core.parseBestValue("0"), 0);
  assert.equal(Core.parseBestValue("-5"), -5); // 色違いの初回マイナス記録も数値として正しい
  assert.equal(Core.parseBestValue("12.5"), 12.5);
});

test("parseBestValue: 数値でない保存値は null（NaN 対策）", () => {
  assert.equal(Core.parseBestValue("abc"), null);
  assert.equal(Core.parseBestValue("NaN"), null);
  assert.equal(Core.parseBestValue("Infinity"), null);
  assert.equal(Core.parseBestValue("12abc"), null);
});

test("isBetterBest: 記録なしなら常に更新", () => {
  assert.equal(Core.isBetterBest("reaction", null, 300), true);
  assert.equal(Core.isBetterBest("color", null, -2), true);
  assert.equal(Core.isBetterBest("memory", undefined, 3), true);
});

test("isBetterBest: 反射神経系は小さいほど良い", () => {
  assert.equal(Core.isBetterBest("reactionAvg", 250, 240), true);
  assert.equal(Core.isBetterBest("reactionAvg", 250, 250), false);
  assert.equal(Core.isBetterBest("reaction", 200, 210), false);
});

test("isBetterBest: 色違い・数字記憶は大きいほど良い", () => {
  assert.equal(Core.isBetterBest("color", 10, 11), true);
  assert.equal(Core.isBetterBest("color", 10, 10), false);
  assert.equal(Core.isBetterBest("color", -2, 0), true);
  assert.equal(Core.isBetterBest("memory", 5, 4), false);
});

test("BEST_KEYS: 保存キーは旧実装と同一", () => {
  assert.deepEqual(Core.BEST_KEYS, {
    reactionAvg: "chibigame_best_reaction_avg",
    reaction: "chibigame_best_reaction",
    color: "chibigame_best_color",
    memory: "chibigame_best_memory"
  });
  assert.equal(Core.THEME_KEY, "chibigame-theme");
});

// ----------------------------------------
// ⚡ 反射神経テスト
// ----------------------------------------
test("reactionWaitMs: 1.2〜5.0秒の範囲に収まる", () => {
  assert.equal(Core.reactionWaitMs(() => 0), 1200);
  const nearTop = Core.reactionWaitMs(() => 0.999999);
  assert.ok(nearTop >= 1200 && nearTop < 5000, `got ${nearTop}`);
  const rng = seededRng(42);
  for (let i = 0; i < 500; i++) {
    const v = Core.reactionWaitMs(rng);
    assert.ok(v >= 1200 && v < 5000, `got ${v}`);
  }
});

test("reactionStats: 空なら平均・ベストは null", () => {
  assert.deepEqual(Core.reactionStats([]), { count: 0, avg: null, best: null });
});

test("reactionStats: 平均は四捨五入、ベストは最小値", () => {
  assert.deepEqual(Core.reactionStats([200, 300, 250]), { count: 3, avg: 250, best: 200 });
  assert.deepEqual(Core.reactionStats([201, 202]), { count: 2, avg: 202, best: 201 }); // 201.5 → 202
  assert.deepEqual(Core.reactionStats([333]), { count: 1, avg: 333, best: 333 });
});

test("REACTION_TOTAL: 全5回", () => {
  assert.equal(Core.REACTION_TOTAL, 5);
});

// ----------------------------------------
// 🎨 色違い当て
// ----------------------------------------
test("colorLevel: 正解2問ごとに上がり、最大10", () => {
  assert.equal(Core.colorLevel(0), 1);
  assert.equal(Core.colorLevel(1), 1);
  assert.equal(Core.colorLevel(2), 2);
  assert.equal(Core.colorLevel(3), 2);
  assert.equal(Core.colorLevel(17), 9);
  assert.equal(Core.colorLevel(18), 10);
  assert.equal(Core.colorLevel(100), 10);
});

test("colorGridSize: L1-3:3 / L4-6:4 / L7-9:5 / L10:6", () => {
  assert.equal(Core.colorGridSize(1), 3);
  assert.equal(Core.colorGridSize(3), 3);
  assert.equal(Core.colorGridSize(4), 4);
  assert.equal(Core.colorGridSize(6), 4);
  assert.equal(Core.colorGridSize(7), 5);
  assert.equal(Core.colorGridSize(9), 5);
  assert.equal(Core.colorGridSize(10), 6);
});

test("colorDelta: L1:38 から下がり、下限は6", () => {
  assert.equal(Core.colorDelta(1), 38);
  assert.equal(Core.colorDelta(2), 34);
  assert.equal(Core.colorDelta(5), 22);
  assert.equal(Core.colorDelta(9), 6);
  assert.equal(Core.colorDelta(10), 6);
});

test("colorScoreDelta: 正解 +1 / ミス -2", () => {
  assert.equal(Core.colorScoreDelta(true), 1);
  assert.equal(Core.colorScoreDelta(false), -2);
});

test("makeColorRound: レベル・サイズ・正解マスが整合する", () => {
  const rng = seededRng(7);
  for (let correct = 0; correct <= 20; correct++) {
    const r = Core.makeColorRound(correct, rng);
    assert.equal(r.level, Core.colorLevel(correct));
    assert.equal(r.size, Core.colorGridSize(r.level));
    assert.ok(r.answerIdx >= 0 && r.answerIdx < r.size * r.size);
    assert.ok(r.hue >= 0 && r.hue < 360);
    assert.ok(r.sat >= 55 && r.sat <= 79);
    assert.ok(r.light >= 45 && r.light <= 59);
    // 明度の差は Δ ちょうど。ただし 4〜96 のクランプに当たった場合はその分だけ縮む
    if (r.light + r.delta <= 96 && r.light - r.delta >= 4) {
      assert.equal(Math.abs(r.diffLight - r.light), r.delta);
    } else {
      assert.ok(Math.abs(r.diffLight - r.light) < r.delta);
    }
    assert.ok(r.diffLight >= 4 && r.diffLight <= 96);
    assert.notEqual(r.diffLight, r.light);
    assert.notEqual(r.base, r.diff);
    assert.equal(r.base, `hsl(${r.hue} ${r.sat}% ${r.light}%)`);
    assert.equal(r.diff, `hsl(${r.hue} ${r.sat}% ${r.diffLight}%)`);
  }
});

test("makeColorRound: 差の向きは乱数で決まる（0.5未満で暗く、以上で明るく）", () => {
  // hue=0, sat=55, light=45 の次に来る4番目の乱数が向きを決める
  const darker = Core.makeColorRound(0, seqRng([0, 0, 0, 0.25, 0]));
  assert.equal(darker.diffLight, 45 - 38);
  const lighter = Core.makeColorRound(0, seqRng([0, 0, 0, 0.75, 0]));
  assert.equal(lighter.diffLight, 45 + 38);
});

test("COLOR_TIME_LIMIT: 制限時間は60秒", () => {
  assert.equal(Core.COLOR_TIME_LIMIT, 60);
});

// ----------------------------------------
// 🔢 数字記憶
// ----------------------------------------
test("memoryShowMs: 桁数×0.6+1 秒（ミリ秒・四捨五入）", () => {
  assert.equal(Core.memoryShowMs(3), 2800);
  assert.equal(Core.memoryShowMs(4), 3400);
  assert.equal(Core.memoryShowMs(5), 4000);
  assert.equal(Core.memoryShowMs(10), 7000);
});

test("makeDigitString: 指定桁数の数字だけの文字列を作る", () => {
  const rng = seededRng(1234);
  for (const digits of [3, 5, 12]) {
    const s = Core.makeDigitString(digits, rng);
    assert.equal(s.length, digits);
    assert.match(s, /^[0-9]+$/);
  }
});

test("makeDigitString: 乱数が 0 なら先頭も 0 になる（旧実装どおり）", () => {
  assert.equal(Core.makeDigitString(4, () => 0), "0000");
  assert.equal(Core.makeDigitString(3, () => 0.999), "999");
});

test("judgeMemory: 前後の空白を無視して完全一致で判定", () => {
  assert.equal(Core.judgeMemory("123", "123"), true);
  assert.equal(Core.judgeMemory(" 123 ", "123"), true);
  assert.equal(Core.judgeMemory("124", "123"), false);
  assert.equal(Core.judgeMemory("12", "123"), false);
  assert.equal(Core.judgeMemory("", "123"), false);
});

test("MEMORY_START_DIGITS: 開始は3桁", () => {
  assert.equal(Core.MEMORY_START_DIGITS, 3);
});

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;

namespace Chibigame
{
    internal static class Program
    {
        [STAThread]
        // 🚀 アプリのエントリーポイント
        private static void Main()
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new MainForm());
        }
    }

    // 🎨 画面共通の配色（Web版のダークテーマと対応）
    internal static class Palette
    {
        internal static readonly Color Bg = Color.FromArgb(10, 15, 28);
        internal static readonly Color Surface = Color.FromArgb(17, 26, 46);
        internal static readonly Color Panel2 = Color.FromArgb(24, 38, 66);
        internal static readonly Color UiText = Color.FromArgb(236, 241, 248);
        internal static readonly Color Muted = Color.FromArgb(157, 177, 199);
        internal static readonly Color Accent = Color.FromArgb(106, 141, 255);
        internal static readonly Color Border = Color.FromArgb(38, 54, 80);
        internal static readonly Color Bad = Color.FromArgb(255, 107, 107);
        internal static readonly Color StageWait = Color.FromArgb(185, 28, 28);
        internal static readonly Color StageGo = Color.FromArgb(22, 163, 74);

        internal const string UiFont = "Yu Gothic UI";
    }

    internal sealed class MainForm : Form
    {
        private readonly Panel homePanel;
        private readonly ReactionPanel reactionPanel;
        private readonly ColorPanel colorPanel;
        private readonly MemoryPanel memoryPanel;
        private readonly Label bestLine;

        // 🏆 ベストスコア（Web版の localStorage 相当をローカルファイルに保存）
        private readonly Dictionary<string, int?> best = new Dictionary<string, int?>();

        // 🏠 メインフォームを構築する
        public MainForm()
        {
            Text = "ちびゲーム広場 for Windows｜ミニゲーム詰め合わせ";
            ClientSize = new Size(760, 720);
            MinimumSize = new Size(640, 640);
            BackColor = Palette.Bg;
            ForeColor = Palette.UiText;
            Font = new Font(Palette.UiFont, 10F);

            var title = new Label
            {
                Text = "🎮 ちびゲーム広場",
                Font = new Font(Palette.UiFont, 16F, FontStyle.Bold),
                ForeColor = Palette.UiText,
                Location = new Point(16, 12),
                AutoSize = true
            };
            Controls.Add(title);
            var tagline = new Label
            {
                Text = "3つのミニゲームでサクッと遊ぼう",
                ForeColor = Palette.Muted,
                Location = new Point(18, 48),
                AutoSize = true
            };
            Controls.Add(tagline);

            var host = new Panel
            {
                Location = new Point(16, 80),
                Size = new Size(728, 620),
                Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top | AnchorStyles.Bottom
            };
            Controls.Add(host);

            homePanel = BuildHomePanel(host.Size);
            reactionPanel = new ReactionPanel(this);
            colorPanel = new ColorPanel(this);
            memoryPanel = new MemoryPanel(this);
            foreach (var p in new Panel[] { homePanel, reactionPanel, colorPanel, memoryPanel })
            {
                p.Location = new Point(0, 0);
                p.Size = host.Size;
                p.Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top | AnchorStyles.Bottom;
                p.Visible = false;
                host.Controls.Add(p);
            }
            bestLine = (Label)homePanel.Controls["bestLine"]!;
            LoadBest();
            ShowScreen(homePanel);
        }

        // 🖥️ 画面を切り替え、離れた画面のゲームを止める
        internal void ShowScreen(Panel target)
        {
            // 🛑 画面を離れたら各ゲームを安全に止める（Web版 showScreen と同じ）
            if (target != reactionPanel) reactionPanel.StopGame();
            if (target != colorPanel) colorPanel.StopGame();
            if (target != memoryPanel) memoryPanel.StopGame();
            foreach (var p in new Panel[] { homePanel, reactionPanel, colorPanel, memoryPanel })
            {
                p.Visible = p == target;
            }
            if (target == homePanel) RenderBestLines();
        }

        // 🏠 トップ画面（ゲーム選択）を作る
        private Panel BuildHomePanel(Size size)
        {
            var panel = new Panel { Size = size, BackColor = Palette.Bg };
            string[] titles = { "⚡ 反射神経テスト", "🎨 色違い当て", "🔢 数字記憶" };
            string[] descs =
            {
                "「待って…」のあと緑に変わったら、すかさずクリック！ 5回の平均とベストを競います。早押しはフライングです。",
                "マスの中から1つだけ色の違うものをクリック。60秒で何問正解できるか。ミスは減点、正解するほど難しくなります。",
                "一瞬表示される数字を覚えて入力。1問ごとに桁数が増えていきます。何桁まで覚えられるか挑戦！"
            };
            for (int i = 0; i < 3; i++)
            {
                int idx = i;
                var card = new Panel
                {
                    Location = new Point(0, 8 + i * 148),
                    Size = new Size(size.Width - 4, 136),
                    BackColor = Palette.Surface,
                    Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top
                };
                var h = new Label
                {
                    Text = titles[i],
                    Font = new Font(Palette.UiFont, 13F, FontStyle.Bold),
                    ForeColor = Palette.UiText,
                    Location = new Point(16, 12),
                    AutoSize = true
                };
                card.Controls.Add(h);
                var d = new Label
                {
                    Text = descs[i],
                    ForeColor = Palette.Muted,
                    Location = new Point(16, 48),
                    MaximumSize = new Size(size.Width - 180, 0),
                    AutoSize = true
                };
                card.Controls.Add(d);
                var btn = MakePrimaryButton("あそぶ", size.Width - 140, 84, 110);
                btn.Click += (s, e) =>
                {
                    if (idx == 0) ShowScreen(reactionPanel);
                    else if (idx == 1) ShowScreen(colorPanel);
                    else ShowScreen(memoryPanel);
                };
                card.Controls.Add(btn);
                panel.Controls.Add(card);
            }
            var best = new Label
            {
                Name = "bestLine",
                ForeColor = Palette.Muted,
                Location = new Point(2, 460),
                AutoSize = true
            };
            panel.Controls.Add(best);
            return panel;
        }

        // 🏠 トップ画面へ戻る
        internal void GoHome() => ShowScreen(homePanel);

        // 🔘 主要ボタンを作る
        internal static Button MakePrimaryButton(string text, int x, int y, int w)
        {
            var b = new Button
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(w, 36),
                BackColor = Palette.Accent,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font(Palette.UiFont, 10F, FontStyle.Bold)
            };
            b.FlatAppearance.BorderSize = 0;
            return b;
        }

        // 🔘 通常ボタンを作る
        internal static Button MakeButton(string text, int x, int y, int w)
        {
            var b = new Button
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(w, 36),
                BackColor = Palette.Surface,
                ForeColor = Palette.UiText,
                FlatStyle = FlatStyle.Flat
            };
            b.FlatAppearance.BorderColor = Palette.Border;
            return b;
        }

        // 🏷️ 見出しラベルを作る
        internal static Label MakeHeading(string text)
        {
            return new Label
            {
                Text = text,
                Font = new Font(Palette.UiFont, 13F, FontStyle.Bold),
                ForeColor = Palette.UiText,
                Location = new Point(0, 0),
                AutoSize = true
            };
        }

        // 📊 HUD ラベルを作る
        internal static Label MakeHud(string text, int y)
        {
            return new Label
            {
                Text = text,
                ForeColor = Palette.Muted,
                Location = new Point(0, y),
                AutoSize = true
            };
        }

        // ------------------------------------------
        // 💾 ベストスコア保存（%LocalAppData%\Chibigame\best.txt、key=value 形式）
        // ------------------------------------------
        // 💾 ベスト記録ファイルの保存場所を返す
        private string BestFilePath()
        {
            string dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Chibigame");
            Directory.CreateDirectory(dir);
            return Path.Combine(dir, "best.txt");
        }

        // 💾 ベスト記録をファイルから読み込む
        private void LoadBest()
        {
            best["reactionAvg"] = null;
            best["reaction"] = null;
            best["color"] = null;
            best["memory"] = null;
            try
            {
                foreach (var line in File.ReadAllLines(BestFilePath()))
                {
                    var parts = line.Split('=');
                    if (parts.Length != 2) continue;
                    // ⚠️ Web版 parseBestValue と同じく、数値でない保存値は「記録なし」として扱う
                    if (best.ContainsKey(parts[0]) && int.TryParse(parts[1], out int v)) best[parts[0]] = v;
                }
            }
            catch { /* ファイルが無ければ記録なし */ }
        }

        // 💾 ベスト記録を取得する
        internal int? GetBest(string key) => best.TryGetValue(key, out var v) ? v : null;

        // 💾 ベスト記録を保存する
        internal void SetBest(string key, int value)
        {
            best[key] = value;
            try
            {
                File.WriteAllLines(BestFilePath(),
                    best.Select(kv => kv.Key + "=" + (kv.Value?.ToString() ?? "")));
            }
            catch { /* 保存に失敗してもゲームは続行する */ }
        }

        // 💾 トップ画面のベスト記録表示を更新する
        private void RenderBestLines()
        {
            string Fmt(int? v, string unit) => v == null ? "―" : v.Value + " " + unit;
            bestLine.Text =
                $"反射神経 ベスト平均: {Fmt(GetBest("reactionAvg"), "ms")} / ベスト1回: {Fmt(GetBest("reaction"), "ms")}\r\n" +
                $"色違い当て ベストスコア: {Fmt(GetBest("color"), "点")}\r\n" +
                $"数字記憶 ベスト: {Fmt(GetBest("memory"), "桁")}";
        }
    }

    // ==========================================
    // ⚡ (1) 反射神経テスト
    // 状態: idle → waiting（赤） → go（緑） → 結果表示。5回で平均とベスト。
    // 計測は Stopwatch（Web版の performance.now() 相当）。
    // ==========================================
    internal sealed class ReactionPanel : Panel
    {
        private const int Total = 5;
        private readonly MainForm owner;
        private readonly Label hud;
        private readonly Panel stage;
        private readonly Label message;
        private readonly Label sub;
        private readonly Label history;
        private readonly System.Windows.Forms.Timer goTimer = new System.Windows.Forms.Timer();
        private readonly Stopwatch watch = new Stopwatch();
        private readonly Random rnd = new Random();
        private string state = "idle"; // idle | waiting | go | shown | foul | finished
        private readonly List<int> results = new List<int>();

        // ⚡ 反射神経テスト画面を構築する
        public ReactionPanel(MainForm owner)
        {
            this.owner = owner;
            BackColor = Palette.Bg;
            Controls.Add(MainForm.MakeHeading("⚡ 反射神経テスト"));
            hud = MainForm.MakeHud("", 34);
            Controls.Add(hud);

            stage = new Panel
            {
                Location = new Point(0, 70),
                Size = new Size(720, 380),
                Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top,
                BackColor = Palette.Panel2,
                Cursor = Cursors.Hand
            };
            message = new Label
            {
                Text = "タップしてスタート",
                Font = new Font(Palette.UiFont, 22F, FontStyle.Bold),
                ForeColor = Palette.UiText,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Fill
            };
            sub = new Label
            {
                Text = "",
                ForeColor = Palette.UiText,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Bottom,
                Height = 60
            };
            stage.Controls.Add(message);
            stage.Controls.Add(sub);
            stage.MouseDown += (s, e) => Tap();
            message.MouseDown += (s, e) => Tap();
            sub.MouseDown += (s, e) => Tap();
            Controls.Add(stage);

            history = MainForm.MakeHud("", 462);
            Controls.Add(history);
            var restart = MainForm.MakeButton("最初から", 0, 496, 130);
            restart.Click += (s, e) => ResetGame();
            Controls.Add(restart);
            var back = MainForm.MakeButton("← トップへ", 142, 496, 130);
            back.Click += (s, e) => owner.GoHome();
            Controls.Add(back);

            goTimer.Tick += (s, e) =>
            {
                goTimer.Stop();
                state = "go";
                watch.Restart();
                Render("タップ！", "", Palette.StageGo, Color.White);
            };
            ResetGame();
        }

        // ⚡ タイマーと計測を止めて初期状態に戻す（画面を離れるとき用）
        public void StopGame()
        {
            goTimer.Stop();
            watch.Stop();
            state = "idle";
            results.Clear();
        }

        // ⚡ 反射神経テストを初期状態に戻す
        public void ResetGame()
        {
            StopGame();
            Render("タップしてスタート", "", Palette.Panel2, Palette.UiText);
            UpdateStats();
            history.Text = "";
        }

        // ⚡ ステージ表示を更新する
        private void Render(string main, string subText, Color bg, Color fg)
        {
            stage.BackColor = bg;
            message.Text = main;
            message.ForeColor = fg;
            sub.Text = subText;
            sub.ForeColor = fg;
        }

        // ⚡ 回数・平均・ベスト表示を更新する
        private void UpdateStats()
        {
            string avg = results.Count == 0 ? "―" : Math.Round(results.Average()) + " ms";
            string bestText = results.Count == 0 ? "―" : results.Min() + " ms";
            hud.Text = $"回数: {results.Count} / {Total}　平均: {avg}　ベスト: {bestText}";
            if (results.Count > 0)
            {
                history.Text = "記録: " + string.Join(" / ", results.Select(r => r + "ms"));
            }
        }

        // ⚡ 緑になるまで待つ状態にする（待ち時間は 1.2〜5.0 秒）
        private void StartWait()
        {
            state = "waiting";
            Render("待って…", "緑になったらタップ！", Palette.StageWait, Color.White);
            goTimer.Interval = 1200 + rnd.Next(3800);
            goTimer.Start();
        }

        // ⚡ ステージのクリックを状態に応じて処理する
        private void Tap()
        {
            switch (state)
            {
                case "idle":
                case "shown":
                case "foul":
                    if (results.Count >= Total) ResetGame();
                    StartWait();
                    break;
                case "waiting":
                    // 🚩 フライング（その回は記録せず、やり直し）
                    goTimer.Stop();
                    state = "foul";
                    Render("フライング！", "緑になるまで待ってね。タップでもう一度", Palette.Panel2, Palette.Bad);
                    break;
                case "go":
                    {
                        watch.Stop();
                        int ms = (int)Math.Round(watch.Elapsed.TotalMilliseconds);
                        results.Add(ms);
                        UpdateStats();
                        if (results.Count >= Total)
                        {
                            state = "finished";
                            int avg = (int)Math.Round(results.Average());
                            int best = results.Min();
                            Render("おつかれさま！", $"{ms} ms ― 平均 {avg} ms / ベスト {best} ms。タップでもう一度", Palette.Panel2, Palette.UiText);
                            var prevAvg = owner.GetBest("reactionAvg");
                            if (prevAvg == null || avg < prevAvg) owner.SetBest("reactionAvg", avg);
                            var prevBest = owner.GetBest("reaction");
                            if (prevBest == null || best < prevBest) owner.SetBest("reaction", best);
                        }
                        else
                        {
                            state = "shown";
                            Render($"{ms} ms", $"あと {Total - results.Count} 回。タップで次へ", Palette.Panel2, Palette.UiText);
                        }
                        break;
                    }
                case "finished":
                    ResetGame();
                    StartWait();
                    break;
            }
        }
    }

    // ==========================================
    // 🎨 (2) 色違い当て
    // 60秒間、正解でスコア+1＆難易度UP、ミスでスコア-2（減点）。
    // 難易度: グリッド 3×3→6×6、色差 ΔL を段階的に小さくする。
    // ==========================================
    internal sealed class ColorPanel : Panel
    {
        private readonly MainForm owner;
        private readonly Label hud;
        private readonly Label message;
        private readonly TableLayoutPanel grid;
        private readonly Label feedback;
        private readonly Button startBtn;
        private readonly System.Windows.Forms.Timer countTimer = new System.Windows.Forms.Timer { Interval = 1000 };
        private readonly System.Windows.Forms.Timer nextTimer = new System.Windows.Forms.Timer { Interval = 220 };
        private readonly Random rnd = new Random();

        private bool playing;
        private int score;
        private int correctCount;
        private int timeLeft = 60;
        private int answerIdx = -1;
        private bool locked;

        // 🎨 色違い当て画面を構築する
        public ColorPanel(MainForm owner)
        {
            this.owner = owner;
            BackColor = Palette.Bg;
            Controls.Add(MainForm.MakeHeading("🎨 色違い当て"));
            hud = MainForm.MakeHud("残り: 60秒　スコア: 0　レベル: 1", 34);
            Controls.Add(hud);
            message = MainForm.MakeHud("1マスだけ色が違います。タップしてスタート！", 62);
            Controls.Add(message);
            grid = new TableLayoutPanel
            {
                Location = new Point(60, 96),
                Size = new Size(480, 480),
                BackColor = Palette.Bg
            };
            Controls.Add(grid);
            feedback = MainForm.MakeHud("", 584);
            Controls.Add(feedback);
            startBtn = MainForm.MakePrimaryButton("スタート", 560, 96, 130);
            startBtn.Click += (s, e) => StartGame();
            Controls.Add(startBtn);
            var back = MainForm.MakeButton("← トップへ", 560, 144, 130);
            back.Click += (s, e) => owner.GoHome();
            Controls.Add(back);

            countTimer.Tick += (s, e) =>
            {
                timeLeft--;
                UpdateHud();
                if (timeLeft <= 0) Finish();
            };
            nextTimer.Tick += (s, e) =>
            {
                nextTimer.Stop();
                if (playing) NewRound();
            };
        }

        // 🎨 色違い当てのタイマーを止める
        public void StopGame()
        {
            countTimer.Stop();
            nextTimer.Stop();
            playing = false;
        }

        // 🎨 正解数から現在のレベルを求める（正解2問ごとに +1、最大10）
        private int Level() => Math.Min(10, 1 + correctCount / 2);
        // 🎨 レベルからグリッドの辺の長さを求める（L1-3:3, L4-6:4, L7-9:5, L10:6）
        private static int GridSize(int level) => Math.Min(6, 3 + (level - 1) / 3);
        // 🎨 レベルから色の違い（明度の差）を求める（L1:38 → L10:6）
        private static int Delta(int level) => Math.Max(6, 42 - level * 4);

        // 🎨 残り時間・スコア・レベルの表示を更新する
        private void UpdateHud()
        {
            hud.Text = $"残り: {timeLeft}秒　スコア: {score}　レベル: {Level()}";
        }

        // 🎨 色違い当てを開始する（60秒）
        private void StartGame()
        {
            StopGame();
            playing = true;
            score = 0;
            correctCount = 0;
            timeLeft = 60;
            feedback.Text = "";
            startBtn.Text = "やりなおす";
            UpdateHud();
            NewRound();
            countTimer.Start();
        }

        // 🎨 新しい問題を作ってグリッドに並べる
        private void NewRound()
        {
            int level = Level();
            int size = GridSize(level);
            int delta = Delta(level);
            int hue = rnd.Next(360);
            int sat = 55 + rnd.Next(25); // 55〜79%
            int light = 45 + rnd.Next(15); // 45〜59%
            var baseColor = HslToRgb(hue, sat / 100.0, light / 100.0);
            int diffLight = Math.Max(4, Math.Min(96, light + (rnd.Next(2) == 0 ? -delta : delta)));
            var diffColor = HslToRgb(hue, sat / 100.0, diffLight / 100.0);
            answerIdx = rnd.Next(size * size);
            locked = false;

            grid.SuspendLayout();
            grid.Controls.Clear();
            grid.ColumnStyles.Clear();
            grid.RowStyles.Clear();
            grid.ColumnCount = size;
            grid.RowCount = size;
            for (int i = 0; i < size; i++)
            {
                grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f / size));
                grid.RowStyles.Add(new RowStyle(SizeType.Percent, 100f / size));
            }
            for (int i = 0; i < size * size; i++)
            {
                int idx = i;
                var cell = new Button
                {
                    Dock = DockStyle.Fill,
                    Margin = new Padding(3),
                    FlatStyle = FlatStyle.Flat,
                    BackColor = idx == answerIdx ? diffColor : baseColor,
                    Text = ""
                };
                cell.FlatAppearance.BorderSize = 0;
                cell.Click += (s, e) => Pick(idx, cell);
                grid.Controls.Add(cell, i % size, i / size);
            }
            grid.ResumeLayout();
            message.Text = "1マスだけ色が違います。どれ？";
            UpdateHud();
        }

        // 🎨 タップしたマスが正解かどうかを判定する
        private void Pick(int idx, Button cell)
        {
            if (!playing || locked) return;
            if (idx == answerIdx)
            {
                locked = true;
                score += 1;
                correctCount += 1;
                feedback.Text = "⭕ 正解！ +1点";
                nextTimer.Start(); // 220ms 後に次の問題へ
            }
            else
            {
                score -= 2; // ミスで減点
                feedback.Text = "❌ ハズレ… -2点";
                // ハズレたマスを一瞬赤く光らせる（Web版の wrong-flash 相当）
                var orig = cell.BackColor;
                cell.BackColor = Palette.Bad;
                var t = new System.Windows.Forms.Timer { Interval = 250 };
                t.Tick += (s, e) => { t.Stop(); t.Dispose(); cell.BackColor = orig; };
                t.Start();
            }
            UpdateHud();
        }

        // 🎨 色違い当てを終了し、ベストを更新する
        private void Finish()
        {
            StopGame();
            message.Text = $"終了！ スコア {score} 点（正解 {correctCount} 問）";
            feedback.Text = "もう一度遊ぶには「スタート」を押してね。";
            startBtn.Text = "スタート";
            var prev = owner.GetBest("color");
            if (prev == null || score > prev) owner.SetBest("color", score);
        }

        // 🎨 HSL 色を RGB に変換する
        internal static Color HslToRgb(double hDeg, double s, double l)
        {
            double h = ((hDeg % 360) + 360) % 360 / 360.0;
            double c = (1 - Math.Abs(2 * l - 1)) * s;
            double x = c * (1 - Math.Abs(h * 6 % 2 - 1));
            double m = l - c / 2;
            double r, g, b;
            if (h < 1.0 / 6) { r = c; g = x; b = 0; }
            else if (h < 2.0 / 6) { r = x; g = c; b = 0; }
            else if (h < 3.0 / 6) { r = 0; g = c; b = x; }
            else if (h < 4.0 / 6) { r = 0; g = x; b = c; }
            else if (h < 5.0 / 6) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }
            return Color.FromArgb(
                (int)Math.Round((r + m) * 255),
                (int)Math.Round((g + m) * 255),
                (int)Math.Round((b + m) * 255));
        }
    }

    // ==========================================
    // 🔢 (3) 数字記憶
    // 数字列を（桁数×0.6+1）秒表示 → 隠して入力。正解で桁数+1、
    // 不正解で終了。到達桁数（正解した最大桁数）がスコア。
    // ==========================================
    internal sealed class MemoryPanel : Panel
    {
        private readonly MainForm owner;
        private readonly Label hud;
        private readonly Label display;
        private readonly Label message;
        private readonly TextBox input;
        private readonly Button submitBtn;
        private readonly Button startBtn;
        private readonly System.Windows.Forms.Timer phaseTimer = new System.Windows.Forms.Timer();
        private readonly Random rnd = new Random();

        private bool playing;
        private int digits = 3;
        private string answer = "";
        private int reached;
        private bool pendingNext; // true の間は「正解表示→次の問題」待ち

        // 🔢 数字記憶画面を構築する
        public MemoryPanel(MainForm owner)
        {
            this.owner = owner;
            BackColor = Palette.Bg;
            Controls.Add(MainForm.MakeHeading("🔢 数字記憶"));
            hud = MainForm.MakeHud("現在の桁数: 3　到達: ―", 34);
            Controls.Add(hud);

            display = new Label
            {
                Text = "　",
                Font = new Font(Palette.UiFont, 34F, FontStyle.Bold),
                ForeColor = Palette.UiText,
                Location = new Point(0, 90),
                Size = new Size(700, 80),
                TextAlign = ContentAlignment.MiddleCenter
            };
            Controls.Add(display);
            message = MainForm.MakeHud("スタートを押すと数字が表示されます。覚えたら入力してください。", 190);
            Controls.Add(message);

            input = new TextBox
            {
                Location = new Point(170, 230),
                Width = 260,
                BackColor = Palette.Surface,
                ForeColor = Palette.UiText,
                BorderStyle = BorderStyle.FixedSingle,
                Font = new Font(Palette.UiFont, 13F),
                Visible = false
            };
            input.KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.Enter) { e.SuppressKeyPress = true; Submit(); }
            };
            Controls.Add(input);
            submitBtn = MainForm.MakePrimaryButton("こたえる", 442, 226, 120);
            submitBtn.Visible = false;
            submitBtn.Click += (s, e) => Submit();
            Controls.Add(submitBtn);

            startBtn = MainForm.MakePrimaryButton("スタート", 0, 290, 130);
            startBtn.Click += (s, e) => StartGame();
            Controls.Add(startBtn);
            var back = MainForm.MakeButton("← トップへ", 142, 290, 130);
            back.Click += (s, e) => owner.GoHome();
            Controls.Add(back);

            phaseTimer.Tick += (s, e) =>
            {
                phaseTimer.Stop();
                if (!playing) return;
                if (pendingNext)
                {
                    pendingNext = false;
                    Round();
                }
                else
                {
                    // 表示時間が終わったので数字を隠して入力を受け付ける
                    display.Text = new string('＊', digits);
                    message.Text = "覚えた数字を入力して「こたえる」を押してね。";
                    input.Visible = true;
                    submitBtn.Visible = true;
                    input.Focus();
                }
            };
        }

        // 🔢 数字記憶のタイマーを止める
        public void StopGame()
        {
            phaseTimer.Stop();
            playing = false;
            pendingNext = false;
        }

        // 🔢 数字記憶を開始する（3桁から）
        private void StartGame()
        {
            StopGame();
            playing = true;
            digits = 3;
            reached = 0;
            hud.Text = "現在の桁数: 3　到達: ―";
            startBtn.Text = "やりなおす";
            Round();
        }

        // 🔢 数字を一定時間表示してから隠す
        private void Round()
        {
            var chars = new char[digits];
            for (int i = 0; i < digits; i++) chars[i] = (char)('0' + rnd.Next(10));
            answer = new string(chars);
            hud.Text = $"現在の桁数: {digits}　到達: {(reached == 0 ? "―" : reached + " 桁")}";
            display.Text = answer;
            message.Text = $"{digits}桁の数字を覚えて！";
            input.Visible = false;
            submitBtn.Visible = false;
            input.Text = "";
            phaseTimer.Interval = (int)Math.Round((digits * 0.6 + 1) * 1000);
            phaseTimer.Start();
        }

        // 🔢 入力した数字が正解かどうかを判定する
        private void Submit()
        {
            if (!playing) return;
            string v = input.Text.Trim();
            if (v == answer)
            {
                reached = digits;
                hud.Text = $"現在の桁数: {digits}　到達: {reached} 桁";
                display.Text = "⭕";
                message.Text = $"正解！ 次は {digits + 1} 桁に挑戦。";
                input.Visible = false;
                submitBtn.Visible = false;
                digits += 1;
                pendingNext = true;
                phaseTimer.Interval = 900;
                phaseTimer.Start();
            }
            else
            {
                StopGame();
                display.Text = answer;
                int score = reached;
                message.Text = $"❌ 残念、正解は {answer} でした。到達は {score} 桁{(score >= 3 ? "" : "（3桁は未正解）")}。スタートでもう一度！";
                input.Visible = false;
                submitBtn.Visible = false;
                startBtn.Text = "スタート";
                var prev = owner.GetBest("memory");
                if (score > 0 && (prev == null || score > prev)) owner.SetBest("memory", score);
            }
        }
    }
}

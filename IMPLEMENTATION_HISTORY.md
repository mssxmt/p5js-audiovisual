# 実装履歴 - AudioVisual オーディオビジュアライゼーションシステム

## プロジェクト概要

**プロジェクト名**: AudioVisual - 高機能オーディオビジュアライゼーションシステム

**技術スタック**:
- React (Vite)
- p5.js (Instance Mode / WebGL)
- Web Audio API (FFT解析)
- Web MIDI API
- Leva (パラメータ制御)
- TypeScript

**目標**: 自然現象（重力・ブラックホール等）をテーマにした、拡張性の高い3Dジェネラティブ・オーディオビジュアル・システム

---

## 実装されたビジュアルパターン

### 1. BlackHolePattern (Key 1)
- **概要**: 3Dブラックホールの重力シミュレーション
- **特徴**:
  - 万有引力法則 ($F = G \frac{m_1 m_2}{r^2}$) に基づく粒子物理
  - イベントホライゾンへの吸い込み表現
  - Perlinノイズによる空間歪曲
  - 粒子トレイル効果
- **オーディオ反応**:
  - Bass → 重力強度増加（粒子がブラックホールに強く吸い込まれる）
  - Mid → ノイズカオス増加（粒子の動きが予測不可能に）
  - Treble → 粒子速度増加
- **パラメータ**: gravity, noiseIntensity, particleCount, trailAlpha, trailLength
- **ファイル**: `src/patterns/BlackHolePattern.ts`

### 2. GargantuaPattern (Key 2)
- **概要**: インターステラー風ブラックホール
- **特徴**:
  - アクレションディスク（回転プラズマ）
  - フォトンリング（明るい薄い輪）
  - 重力レンズ効果（背面のディスクが歪んで見える）
  - ドップラービーミング（接近側が明るい、遠ざかる側が暗い）
- **オーディオ反応**:
  - Bass → 回転速度、ディスク厚み
  - Mid → カラータンパラチャー（温度変化）
  - Treble → フォトンリング輝度
- **パラメータ**: diskRadius, diskThickness, diskRotationSpeed, rotationX/Y, colorTemperature
- **ファイル**: `src/patterns/GargantuaPattern.ts`

### 3. DataPattern (Key 3)
- **概要**: Ryoji Ikedaスタイルデータビジュアライゼーション
- **特徴**:
  - バーコードストライプ（背景レイヤー）- Bass反応
  - バイナリマトリックス（中間レイヤー）- Mid反応
  - 純粋な白黒美学、幾何学的精度
- **オーディオ反応**:
  - Bass → バーコード輝度、スクロール速度（ベートトリガー）
  - Mid → バイナリグリッド更新頻度
- **パラメータ**: barcodeSpeed, barcodeIntensity, binaryGridSize, bassThreshold
- **ファイル**: `src/patterns/DataPattern.ts`

### 4. ThreeDPattern (Key 4)
- **概要**: 3D粒子システム + 数値データ表示
- **特徴**:
  - 3D粒子フィールド（Bass反応でorbital運動）
  - 7セグメントスタイルの幾何学的数字表示
  - ピーク周波数データを各数字が表示
- **オーディオ反応**:
  - Bass → 粒子orbital運動
  - Mid/Treble → 数字輝度
  - 各数字は独自の周波数範囲（20Hz-20kHzを分割）を持つ
- **パラメータ**: particleCount, particleSpread, numberCount, numberDigits, rotationX/Y
- **ファイル**: `src/patterns/ThreeDPattern.ts`

### 5. FlowFieldPattern (Key 5)
- **概要**: Perlinノイズによるベクトル場ビジュアライゼーション
- **特徴**:
  - 絹のような流体表現
  - 粒子がノイズ生成のフローベクトルに従う
  - オーガニックな水のような動き
  - WEBGLフルスクリーン対応
- **オーディオ反応**:
  - Bass → 速度乗数
  - Mid → ノイズ複雑さ
  - Treble → 色シフト（HSL）
- **パラメータ**: particleCount, noiseScale, timeSpeed, flowStrength, trailFade
- **ファイル**: `src/patterns/FlowFieldPattern.ts`

### 6. WireframeTerrainPattern (Key 6)
- **概要**: 2.5次元ワイヤーフレーム地形
- **特徴**:
  - オーディオリアクティブに構築される地形
  - ワイヤーフレームデザイン
  - カメラ回転・視点変更可能
- **オーディオ反応**:
  - Bass → 地形の高さ
  - Mid → 地形の複雑さ
  - Treble → 色相シフト
- **パラメータ**: gridSize, wireThickness, wireDensity, baseHue, rotationSpeed, etc.
- **ファイル**: `src/patterns/WireframeTerrainPattern.ts`

---

## コアアーキテクチャ

### パターン管理システム
- **BasePattern** 抽象クラスで各ビジュアル表現をカプセル化
- ライフサイクル管理: `setup()` → `update()` → `draw()` → `cleanup()`
- パターン切り替え時の適切なリソースクリーンアップ
- レンダリングオプションのデフォルト設定（クリア背景、トレイル効果等）
- **ファイル**: `src/patterns/BasePattern.ts`

### オーディオ処理 (AudioManager)
- Web Audio API による FFT 解析
- 周波数バンド分割: subBass, bass, lowMid, mid, highMid, treble, brilliance
- 正規化された値（0.0-1.0）を提供
- 入力デバイス選択機能
- ピーク周波数検出（指定範囲内）
- **設定**: fftSize: 2048, smoothingTimeConstant: 0.3, minDecibels: -100, maxDecibels: -30
- **ファイル**: `src/core/AudioManager.ts`

### MIDI サポート (MidiManager/MidiLearnManager)
- MIDI CC番号の動的アサイン
- パラメータごとのMIDI学習機能
- チャネルフィルタリング
- プログラムチェンジ対応
- **ファイル**: `src/core/MidiManager.ts`, `src/core/MidiLearnManager.ts`

### ステート管理 (Store)
- ReactのStateではなく専用Storeクラスでパフォーマンス最適化
- パターン変更時のイベント通知
- **ファイル**: `src/core/Store.ts`

---

## キーボードショートカット

| キー | 機能 |
|------|------|
| H | Leva設定パネルの表示/非表示 |
| Space | パラメータのランダム化 |
| 1-9 | ビジュアルパターンの直接切り替え |

---

## うまくいったこと

### 1. アーキテクチャ設計
- `BasePattern` 抽象クラスによる継承設計が成功
- 各パターンが独立しているため、追加・修正が容易
- React State を使わず、useRef と専用Storeでパフォーマンス確保
- インターフェースベースの設計で拡張性確保

### 2. オーディオ反応性
- FFT 解析による周波数バンド分割が効果的
- Bass/Mid/Treble 各バンドが個別に視覚効果に反映
- オーディオ感度の調整が適切（smoothingTimeConstant: 0.3, dB範囲: -100〜-30）
- ピーク周波数検出による高度な視覚化

### 3. 視覚的美学
- トレイル効果（backgroundAlpha < 1）が美しい光の残像を実現
- 各パターンが異なる美学（物理、データ、幾何学）を持つ
- WebGL モードでの3D表現が成功
- ブラックホール、データビジュアライゼーションなど多様な表現スタイル

### 4. MIDI統合
- MIDI Learn 機能により動的なパラメータ割り当てが可能
- MIDI CC とオーディオが独立して動作

### 5. 拡張性
- 新しいパターン追加が容易（BasePatternを継承するのみ）
- パラメータ管理が統一的（getParamMeta, getParams, setParams）

---

## 失敗したこと/課題

### 1. フォントロード問題 (DataPattern, ThreeDPattern)
- **問題**: WebGLモードで `text()` を使用する際、非同期フォントロードが必要
- **初期アプローチ**: `loadFont()` を使用しようとしたが複雑化
- **解決策**: フォントの代わりに幾何学的図形（7セグメント表示、球体、矩形）を使用
- **学び**: p5.js WebGLモードではフォント扱いが特殊で、同期レンダリングには向かない

### 2. WEBGL座標系
- **問題**: WEBGLモードでは原点がキャンバス中心（2Dモードは左上）
- **初期のバグ**: FlowFieldPatternで画面端のラッピングが不完全
- **解決策**: `-width/2` から `width/2` の範囲で座標計算、prevPosのラッピング検出
- **学び**: 2Dモードとの違いを明確に認識し、変換ロジックが必要

### 3. パーティクルリスポーン
- **問題**: ブラックホールに吸い込まれた粒子のリスポーン位置が偏る
- **解決策**: 球面座標での均一分布（random3Dヘルパー関数）
- **学び**: 3D空間での均一ランダム分布には三角関数が必要

### 4. トレイル描画のパフォーマンス
- **問題**: 粒子のトレイルを個別に描画すると重い
- **解決策**: 履歴配列の長さ制限、アルファ値の最適化
- **学び**: パーティクル数とトレイル長さのバランスが重要

---

## 学んだこと

### 1. p5.js WebGLモードの特性
- 原点が中心座標（0, 0, 0）
- `background()` のアルファ値でトレイル効果を実現
- `clear()` で完全クリア
- 座標系: X(-width/2〜width/2), Y(-height/2〜height/2), Z(奥〜手前)

### 2. オーディオ解析
- FFTサイズ 2048 が適切な解像度（周波数分解能とパフォーマンスのバランス）
- smoothingTimeConstant 0.3 が反応性と滑らかさのバランスに最適
- dB範囲 -100〜-30 が静音環境に適切
- 周波数バンド分割で音楽的な表現が可能

### 3. パーティクルシステム設計
- 各パーティクルが位置、速度、加速度を持つ物理モデル
- トラクタイル（履歴）配列でトレイル表現
- 寿命管理で自然な循環を実現

### 4. TypeScript + p5.js
- 型定義 `@types/p5` が必須
- `import p5 from 'p5'` でモジュール形式
- p5.Vector などの型を活用

### 5. React + p5.js インテグレーション
- Instance Mode を使用して React と統合
- useRef で p5 インスタンスを保持
- React State の更新頻度を下げてパフォーマンス確保

---

## コミット履歴（主要なもの）

```
01ce795 fix: make FlowFieldPattern use full screen in WEBGL mode
c302455 feat: add FlowFieldPattern to keyboard shortcuts (Key 5)
3104d30 feat: add FlowFieldPattern (visualizer #5)
a3c7d42 feat: add peak frequency display to ThreeDPattern
dc6d28b perf: significantly increase audio sensitivity
c0e7cd7 perf: improve audio reactivity sensitivity
eb33687 fix: make BlackHolePattern noise reactive to mid frequencies
a070080 feat: add waveform data support and refactor DataPattern
3434ade feat: add rotationX/rotationY parameters to GargantuaPattern
d53901e feat: add ThreeDPattern with 3D particle system
31cde68 fix: replace text with geometric shapes to avoid font loading
e76bb37 feat: redesign DataPattern with complex flowing visualization
b9aa584 feat: add DataPattern with minimal geometric visualization
```

---

## 今後の拡張アイデア

1. **新規パターン追加**: BasePatternを継承して新しいビジュアル表現を追加
2. **シェーダー導入**: WebGLシェーダーでより高度な視覚効果
3. **動画エクスポート**: p5.jsのsaveCanvas機能で録画
4. **プリセット管理**: パラメータ設定の保存・読み込み
5. **オーディオファイル再生**: マイク入力だけでなくファイル再生にも対応

---

## ファイル構造

```
src/
├── App.tsx                 # メインアプリケーション
├── main.tsx                # エントリーポイント
├── components/
│   ├── P5Wrapper.tsx       # p5.jsラッパー
│   ├── LevaPanel.tsx       # パラメータパネル
│   └── ui/                 # UIコンポーネント群
├── core/
│   ├── Store.ts            # ステート管理
│   ├── AudioManager.ts     # オーディオ処理
│   ├── MidiManager.ts      # MIDI処理
│   └── InputManager.ts     # 入力管理
├── patterns/
│   ├── BasePattern.ts         # 基底クラス
│   ├── BlackHolePattern.ts    # Key 1
│   ├── GargantuaPattern.ts    # Key 2
│   ├── DataPattern.ts         # Key 3
│   ├── ThreeDPattern.ts       # Key 4
│   ├── FlowFieldPattern.ts    # Key 5
│   └── WireframeTerrainPattern.ts # Key 6
└── types/                  # 型定義
```

---

*最終更新: 2026-02-04*

# 導盲 App 原型

這個專案是一個可在瀏覽器中運行的導盲輔助原型，使用 HTML + JavaScript，支援攝影機、物件偵測、語音提示與危險等級判斷。

## 3.0 更新：測距改進（全裝置通用）

- **地面幾何公式**：地面障礙物（護欄、電線桿、電單車、行人等）改用「相機高度 + 俯仰角 + 接地點」計算距離，不再依賴猜測的物件高度。相機高度可在「相機校準」面板設定（預設 1.3 米）。
- **類別高度自動學習**：校準時會記錄該類別的實際高度；偵測地面物件時也會用地面距離反推高度並以指數移動平均（EMA）持續更新，讓半空物件的「高度公式」愈用愈準。
- **深度輔助（Depth Anything V2 Small）**：內建量化 ONNX 深度模型，異步推論（最新幀優先、絕不排隊），半空物件與過渡區用「深度圖 + 高度公式」融合測距；新手機走 WebGPU，舊機（WASM 太慢）自動停用退回公式。深度比例在「拍攝並校準」時一併自動校準。預覽標籤會顯示（深度）。
- **距離分級警報**：靜止近距障礙物也會觸發警報——<1.2m 緊急（震動+高頻音+語音）、<2.5m 中風險、<4m 環境音；快速接近（TTC）與距離過近並聯觸發。
- **距離節奏震動**：障礙物在警示範圍內時，距離愈近震動脈衝愈密（倒車雷達式觸覺提示）。
- **YOLO WebGPU 加速**：WebGPU 優先、WASM 自動後備，新手機偵測 FPS 顯著提升。
- **距離平滑**：同一障礙物的距離輸出做 5 幀中位數平滑，減少抖動。
- **實驗模式**：輸入捲尺實測距離後按「標記真值」，自動計算並記錄估算誤差 %。
- **實驗 CSV 新增欄位**：`DistanceRaw`（平滑前）、`DistanceSource`（`ground`/`height`/`depth`/`實驗標記`）、`GroundTruth`、`ErrorPct`，方便比對誤差。預覽畫面的標籤也會顯示「(地面)/(高度)/(深度)」標示目前使用的測距方法。

## GitHub Pages 部署方式

1. 把這個資料夾上傳到你的 GitHub Repository。
2. 在 GitHub 網站中進入：Settings → Pages。
3. 選擇「GitHub Actions」作為部署來源。
4. 推送到 `main` 分支後，GitHub Pages 會自動部署。
5. 網址會類似：
   `https://<your-username>.github.io/<repo-name>/`

## 本地測試

```bash
python -m http.server 8000
```

然後打開：

```text
http://localhost:8000/
```

這個入口頁會自動跳轉到原型頁面。

## 主要檔案

- `index.html`：GitHub Pages 入口頁
- `first_part.html`：主要原型頁面
- `sw.js`：PWA 離線快取
- `kimi_proxy_server.js`：Kimi AI 輔助辨識的本地代理（可選）
- `.github/workflows/pages.yml`：自動部署設定

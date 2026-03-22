# Blade RPG

一個以武俠敘事、文字互動與 AI 劇情回應為核心的 RPG 遊戲專案。

## 專案介紹

Blade RPG 是一個以武俠世界為背景的文字 RPG 遊戲。
玩家可以透過輸入行動推進劇情，系統會根據目前角色狀態與對話歷史，生成連貫的故事發展與可選行動。

目前專案包含：
- 本機網頁遊戲畫面
- Node.js + Express 伺服器
- `/api/chat` 劇情互動 API
- OpenRouter 模型串接
- 環境變數設定支援
- 繁體中文武俠旁白輸出

## 功能特色

- 武俠風格文字冒險
- 根據玩家狀態生成劇情
- 支援角色數值，例如等級、經驗、血量、銀兩、名望
- 保留最近對話內容，讓劇情更連貫
- 使用繁體中文輸出回應
- 可作為 RPG MVP 原型持續擴充

## 技術架構

- Node.js
- Express
- dotenv
- OpenRouter API
- 前端靜態頁面（由 `public` 目錄提供）

## 安裝與執行

### 1. 下載專案

```bash
git clone https://github.com/lianglovelei-bot/-.git
cd blade-rpg
###2. 安裝依賴
```bash
npm install
###3. 建立環境變數
在專案根目錄建立 .env 檔案，內容例如：
```text
OPENROUTER_API_KEY=你的_OpenRouter_API_Key
OPENROUTER_MODEL=openrouter/free
PORT=3000
###4. 啟動專案
```bash
npm run start
###5. 開啟遊戲
在瀏覽器輸入：
```text
http://localhost:3000
###環境變數說明
OPENROUTER_API_KEY：OpenRouter 的 API 金鑰，未設定時聊天功能不能正常使用。

OPENROUTER_MODEL：要使用的模型名稱，未設定時會使用 openrouter/free。

PORT：伺服器連接埠，未設定時預設為 3000。

API 說明
POST /api/chat
用來接收玩家輸入，並向 AI 取得下一段劇情回應。

Request body 範例
json
{
  "message": "我拔刀戒備，慢慢走近破廟。",
  "state": {
    "level": 1,
    "exp": 0,
    "hp": 100,
    "money": 10,
    "fame": 0
  },
  "history": [
    {
      "role": "user",
      "content": "我走進山道。"
    },
    {
      "role": "assistant",
      "content": "山風穿林而過，前方隱約可見一座破廟。A 探查四周 B 推門入廟 C 原地觀察"
    }
  ]
}
Response 範例
json
{
  "reply": "夜風掠過殘瓦，破廟門前塵沙微揚。你按住刀柄，步步逼近，只覺門縫間似有微光閃動。\n\n廟內忽然傳出一聲低笑：「既然來了，何不入內一敘？」\n\nA 推門而入\nB 退後觀察四周\nC 高聲喝問對方身份"
}
專案目錄
text
blade-rpg/
├─ public/
├─ node_modules/
├─ .env
├─ package.json
├─ package-lock.json
├─ server.js
└─ README.md
開發流程
平時更新專案時，可以使用以下流程：

bash
git add .
git commit -m "更新內容"
git push
開發計劃
 優化戰鬥系統

 增加更多劇情分支

 加入背包與道具系統

 加入任務與地圖事件

 增加存檔與讀檔功能

 優化遊戲介面與回饋效果

常見問題
1. 為什麼 npm run dev 不能用？
因為目前專案只定義了 start script，所以請使用：

bash
npm run start
2. 為什麼聊天功能沒有回應？
請先確認 .env 已設定 OPENROUTER_API_KEY。

3. 本機網址是什麼？
預設是：

text
http://localhost:3000
授權
本專案採用 MIT License。
如果你希望其他人可以更清楚知道如何使用、修改與散布你的程式碼，建議另外在倉庫根目錄加入 LICENSE 檔案。

作者
GitHub：lianglovelei-bot

text

## 建議同步

GitHub 建議 README 清楚說明專案用途、使用方法與開始步驟，而 Markdown 亦支援標題、清單和程式碼區塊，所以你而家這份結構已經適合直接放上去。[3][1]
如果你打算把專案公開分享，最好再補一個獨立的 `LICENSE` 檔案，因為 GitHub 說明公開倉庫若沒有授權，預設仍受版權法保護。[4][5]

## 提交指令

把上面內容貼入 `README.md` 後，直接提交即可。

```powershell
git add README.md
git commit -m "完善 README"
git push

# 里程碑 L/C — 鏈上即時流動性信用狀協議

> 建立在 Sui 區塊鏈的去中心化信用狀（Letter of Credit）系統，讓履約資金在等待期間同步生息，實現「邊履約、邊收益」。

---

## 問題背景

傳統國際貿易信用狀依賴銀行居中背書，手續費高、流程慢，且資金在履約期間完全凍結。中小企業承受巨大的資金成本與時間風險。

**里程碑 L/C** 將完整的 L/C 生命週期搬上鏈，並讓鎖定的資金自動投入 DeFi 收益策略，消除傳統 L/C 的三大痛點：中間方依賴、手續費高昂、資金閒置。

---

## 核心流程

```
買方建立 L/C → 存入資金（自動質押生息）→ 賣方確認出貨（填物流單號）
→ 鑄造 PickupNFT → 倉庫掃 QR 碼驗貨 → 智能合約自動釋放款項
```

| 狀態 | 說明 |
|------|------|
| 已建立 | 買方建立信用狀，等待資金存入 |
| 已資金 | 資金鎖定，開始生息，賣方可出貨 |
| 已出貨 | 賣方確認出貨，NFT 已鑄造 |
| 已完成 | 倉庫驗貨完成，款項釋放給賣方 |
| 賣方違約 | 超過出貨期限，買方可取回資金 |
| 爭議中 | 待管理員仲裁 |
| 已退款 | 買方取回資金 |

---

## 即時流動性金庫（Treasury）

存入的資金不是靜靜地躺著等待，而是：

- **SUI** → 質押進 Haedal 獲得 haSUI，持續累積質押收益
- **USDC** → 存入 Scallop 借貸池獲得 sCoin，持續累積利息

收益分配：**買方 70% / 協議 30%**

Keeper Bot 每 5 分鐘自動 replenish（贖回 yield position → 補充即時流動性），確保金庫隨時能即時支付賣方。

---

## 技術架構

```
contracts/
├── milestone_lc/        # 主合約
│   ├── lc_core.move         # L/C 狀態機（建立/資金/出貨/完成/爭議）
│   ├── pickup_nft.move      # 提貨 NFT（鑄造/QR/驗貨）
│   ├── treasury.move        # 即時流動性金庫（yield 策略）
│   └── protocol_config.move # 協議參數與 AdminCap
├── mock_haedal/         # SUI staking 模擬（haSUI）
├── mock_scallop/        # USDC lending 模擬（sCoin）
└── test_coins/          # 測試用 USDC 代幣

backend/
├── src/services/indexer.ts  # 鏈上事件 Indexer（10s 輪詢）
├── src/bot/keeper.ts        # Keeper Bot（5min replenish）
└── src/routes/              # REST API（/api/lc /api/nft /api/treasury /api/yield）

frontend/
└── src/
    ├── pages/buyer/         # 買方：建立 L/C、資金管理、NFT 錢包
    ├── pages/seller/        # 賣方：訂單列表、出貨確認
    ├── pages/PickupVerify   # 倉庫驗貨
    ├── pages/History        # 交易紀錄（買方+賣方統一視圖）
    └── pages/admin/         # 管理員：金庫健康度、仲裁
```

---

## 已部署合約（Sui Devnet）

| 名稱 | Object ID |
|------|-----------|
| Package | `0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a` |
| Treasury | `0x098c6c269325becec76c2e54db0d3dc63d6ed043aefa02916b1ab4c246cdd412` |
| Protocol Config | `0x9e460320a8fca762d92a6fcce9a0745b2298b4864ef327c67e519b0ca7bfb987` |
| Staking Pool (haSUI) | `0x7788bb2e5e1819ce26600e0b7fcfded08044b6f1f8e20f2ff7869e7978bbdee7` |
| Lending Pool (sCoin) | `0x3b996ae634d0645df1277aaac25a295e79b0358bb7d0d81aceb618df34c42045` |

---

## 本地開發

### 前置需求

- Node.js 18+
- Sui CLI

### 安裝與啟動

```bash
# 後端
cd backend
npm install
cp .env.example .env   # 填入 ADMIN_MNEMONIC（選填，keeper bot 需要）
npm run dev            # 監聽 :3001

# 前端（另開終端機）
cd frontend
npm install
npm run dev            # 監聽 :5173
```

### 環境變數

**`backend/.env`**

```env
PORT=3001
ADMIN_MNEMONIC=word1 word2 ... word12   # 部署者錢包助記詞，keeper bot 需要
```

**`frontend/.env`**

```env
VITE_BACKEND_URL=http://localhost:3001
```

---

## 主要功能

### 買方

- 建立信用狀，指定賣方、金額（SUI / USDC）、出貨期限、提貨期限（天 + 小時，最小 1 小時）
- 存入資金，資金自動投入 yield 策略
- 查看 PickupNFT，顯示 QR Code 供倉庫掃描
- 逾期可取回資金

### 賣方

- 查看所有以自己為賣方的 L/C（含「等待買方付款」階段）
- 填入物流單號確認出貨
- 提出爭議

### 倉庫

- 輸入 NFT ID 或掃描 QR Code 完成提貨驗證
- 驗證成功後鏈上自動釋放款項

### 交易紀錄

- 統一顯示買方 + 賣方的所有 L/C
- 進行中 / 已結束分段，結束可折疊
- 點擊列展開詳情，所有關鍵欄位一鍵複製

### 管理員

- 即時金庫健康度（備付率、haSUI / sCoin 持倉）
- 手動觸發 replenish
- 爭議仲裁（退款給買方 / 支付給賣方）

---

## 網路資訊

- **網路**：Sui Devnet
- **前端**：http://localhost:5173
- **後端**：http://localhost:3001
- **健康檢查**：http://localhost:3001/health

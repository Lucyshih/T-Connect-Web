# 🔔 T-Connect 系統通知郵件發送工具

## 📋 功能說明

這個工具用於向所有 T-Connect 用戶發送系統通知郵件，通知他們聊天通知功能已經恢復。

**郵件內容：**
- 主旨：🔔 系統通知恢復 - 請查看您的聊天訊息
- 內容：說明 8/22-8/29 期間聊天通知功能有問題，建議用戶檢查是否有未讀訊息

## 🚀 使用方法

### 方法 1：使用 Shell 腳本（推薦）

1. **準備認證 token**
   ```bash
   # 您需要一個有效的認證 token
   export AUTH_TOKEN="your_actual_token_here"
   ```

2. **執行腳本**
   ```bash
   ./send-notification-curl.sh
   ```

   或者直接傳入 token：
   ```bash
   ./send-notification-curl.sh "your_actual_token_here"
   ```

### 方法 2：使用 Node.js 腳本

1. **編輯腳本**
   ```bash
   # 編輯 send-system-notification.js
   # 將 YOUR_AUTH_TOKEN_HERE 替換為實際的 token
   ```

2. **執行腳本**
   ```bash
   node send-system-notification.js
   ```

### 方法 3：直接使用 curl

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"action":"send_notification"}' \
  "https://us-central1-travelconnect-4a4df.cloudfunctions.net/sendSystemNotification"
```

## ⚠️ 重要提醒

1. **認證要求**：此函數需要有效的認證 token
2. **批量發送**：會向所有啟用郵件通知的用戶發送郵件
3. **速率限制**：函數會分批處理，每批 10 個用戶，批次間隔 2 秒
4. **一次性使用**：建議只在需要時使用，避免重複發送

## 📊 響應格式

成功響應：
```json
{
  "success": true,
  "message": "系統通知郵件發送完成",
  "totalUsers": 150,
  "emailsSent": 145,
  "emailsFailed": 5,
  "failedEmails": ["user1@example.com", "user2@example.com"],
  "timestamp": "2025-08-29T14:30:00.000Z"
}
```

## 🔧 技術細節

- **函數名稱**：`sendSystemNotification`
- **觸發方式**：HTTP POST 請求
- **認證方式**：Bearer Token
- **郵件服務**：Gmail OAuth2
- **批量處理**：每批 10 個用戶，避免 API 限制

## 📝 郵件模板

郵件包含：
- 綠色標題欄
- 重要通知說明
- 建議行動清單
- 登入按鈕
- 專業的頁腳

## 🚨 故障排除

如果遇到問題：

1. **認證失敗**：檢查 token 是否有效
2. **郵件發送失敗**：檢查 Gmail OAuth2 配置
3. **函數錯誤**：查看 Firebase Functions 日誌

## 📞 支援

如有問題，請檢查：
- Firebase Functions 日誌
- Gmail OAuth2 配置
- 認證 token 有效性

---

**最後更新**：2025-08-29  
**版本**：1.0.0

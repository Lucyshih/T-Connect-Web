# 環境變數設置指南

## 🚨 緊急安全處理

**如果您的 GitHub repo 是公開的，請立即假設敏感資訊已外洩！**

## 📋 環境變數設置

### 1. 本地開發環境 (.env 檔案)

在專案根目錄創建 `.env` 檔案：

```bash
# Gmail OAuth2 配置
GMAIL_CLIENT_ID=YOUR_CLIENT_ID_HERE
GMAIL_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GMAIL_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_HERE
GMAIL_EMAIL=tconnectweb@gmail.com
```

### 2. Firebase Functions 環境變數設置

#### 方法一：使用 Firebase CLI (推薦)

```bash
# 設置環境變數
firebase functions:config:set gmail.client_id="YOUR_CLIENT_ID_HERE"
firebase functions:config:set gmail.client_secret="YOUR_CLIENT_SECRET_HERE"
firebase functions:config:set gmail.refresh_token="YOUR_REFRESH_TOKEN_HERE"
firebase functions:config:set gmail.email="tconnectweb@gmail.com"

# 查看設置的環境變數
firebase functions:config:get

# 部署函數
firebase deploy --only functions
```

#### 方法二：使用 Google Cloud Secret Manager (更安全)

```bash
# 創建 secrets
gcloud secrets create gmail-client-id --data-file=- <<< "YOUR_CLIENT_ID_HERE"
gcloud secrets create gmail-client-secret --data-file=- <<< "YOUR_CLIENT_SECRET_HERE"
gcloud secrets create gmail-refresh-token --data-file=- <<< "YOUR_REFRESH_TOKEN_HERE"
gcloud secrets create gmail-email --data-file=- <<< "tconnectweb@gmail.com"

# 設置函數權限
gcloud secrets add-iam-policy-binding gmail-client-id \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 3. 程式碼修改

在 `functions/index.js` 中，環境變數讀取方式：

```javascript
// 使用 Firebase Functions config
const clientId = functions.config().gmail.client_id;
const clientSecret = functions.config().gmail.client_secret;
const refreshToken = functions.config().gmail.refresh_token;
const fromEmail = functions.config().gmail.email;

// 或使用 process.env (如果設置了環境變數)
const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
const fromEmail = process.env.GMAIL_EMAIL;
```

## 🔒 安全最佳實踐

### 1. .gitignore 設置

確保 `.gitignore` 包含：

```gitignore
# 環境變數檔案
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 敏感配置檔案
config/secrets.json
firebase-config.json
```

### 2. 檢查 GitHub 敏感資訊

```bash
# 檢查 commit 歷史中的敏感資訊
git log --all --full-history -- "**/functions/index.js"

# 使用 git-secrets 掃描
git secrets --scan --recursive

# 檢查是否有硬編碼的敏感資訊
grep -r "YOUR_CLIENT_ID" . --exclude-dir=node_modules
grep -r "YOUR_CLIENT_SECRET" . --exclude-dir=node_modules
```

### 3. 清理 GitHub 歷史 (如果 repo 是公開的)

```bash
# 使用 git filter-repo 移除敏感資訊
git filter-repo --path functions/index.js --invert-paths
git filter-repo --replace-text <(echo "YOUR_CLIENT_ID_HERE==>REDACTED")
git filter-repo --replace-text <(echo "YOUR_CLIENT_SECRET_HERE==>REDACTED")

# 強制推送 (危險操作，會重寫歷史)
git push origin --force --all
```

## ⚠️ 緊急處理步驟

1. **立即撤銷外洩的 token**：
   - 前往 Google Cloud Console
   - 撤銷現有的 refresh token
   - 生成新的 refresh token

2. **更新所有環境**：
   - 更新 Firebase Functions 環境變數
   - 更新本地 .env 檔案
   - 重新部署所有函數

3. **監控異常活動**：
   - 檢查 Gmail API 使用量
   - 監控是否有未授權的郵件發送

## 📞 後續行動

1. 設置環境變數後，重新部署函數
2. 測試聊天通知功能是否正常
3. 定期輪換 refresh token (建議每 6 個月)
4. 考慮使用 Google Cloud Secret Manager 提高安全性

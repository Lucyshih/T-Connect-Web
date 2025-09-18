# 🚀 GitHub 安全部署檢查清單

## ⚠️ 部署前必做檢查

### 1. 安全檢查 ✅
```bash
# 運行安全檢查腳本
./security-check.sh

# 手動檢查敏感資訊
grep -r "658893138453" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "GOCSPX-" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "1//" . --exclude-dir=node_modules --exclude-dir=.git
```

### 2. 環境變數設置 ✅
```bash
# 檢查 Firebase Functions 配置
firebase functions:config:get

# 確認所有必要的環境變數都已設置
# - gmail.client_id
# - gmail.client_secret  
# - gmail.refresh_token
# - gmail.email
```

### 3. 功能測試 ✅
```bash
# 測試聊天通知功能
firebase functions:log --only sendChatNotification

# 測試手動檢查功能
./profile-check.sh tconnect_admin_2025
```

### 4. Git 狀態檢查 ✅
```bash
# 檢查未提交的變更
git status

# 檢查分支狀態
git branch -v

# 檢查遠端狀態
git remote -v
```

## 🚀 安全部署步驟

### 方法一：使用安全部署腳本（推薦）
```bash
./safe-deploy.sh
```

### 方法二：手動部署
```bash
# 1. 添加所有變更
git add .

# 2. 提交變更
git commit -m "Security fix: Remove hardcoded sensitive information and setup environment variables"

# 3. 推送到 GitHub
git push origin main
```

## 🔒 部署後安全檢查

### 1. 檢查 GitHub 上的程式碼
- 確認沒有敏感資訊洩露
- 檢查 `.gitignore` 是否正確設置
- 確認環境變數文檔不包含真實敏感資訊

### 2. 如果 repo 是公開的
- ⚠️ **立即撤銷現有的 OAuth2 refresh token**
- 生成新的 refresh token
- 更新 Firebase Functions 環境變數

### 3. 監控異常活動
- 檢查 Gmail API 使用量
- 監控 Firebase Functions 日誌
- 設置異常活動警報

## 📋 長期安全維護

### 1. 定期檢查
```bash
# 每週運行安全檢查
./security-check.sh

# 每月檢查環境變數
firebase functions:config:get
```

### 2. Token 輪換
- 每 6 個月輪換 refresh token
- 使用不同的 token 用於開發和生產環境
- 考慮使用 Google Cloud Secret Manager

### 3. 程式碼審查
- 在提交前檢查敏感資訊
- 使用 pre-commit hooks
- 定期審查 Git 歷史

## 🆘 緊急處理

如果發現敏感資訊洩露：

1. **立即撤銷所有相關 token**
2. **檢查 API 使用記錄**
3. **清理 Git 歷史**（如果必要）
4. **聯繫 Google Cloud 支援**

## 📞 支援資源

- [Firebase Functions 環境變數設置](https://firebase.google.com/docs/functions/config-env)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)
- [GitHub 安全最佳實踐](https://docs.github.com/en/code-security)

---

**記住**：安全是持續的過程，不是一次性的任務！

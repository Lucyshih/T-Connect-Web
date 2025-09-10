# T-Connect 自動化系統設置說明

## 🎯 已實現的功能

### 1. 自動 Token 刷新機制 ✅
- **功能**：自動刷新 Gmail OAuth2 access token，避免 token 過期問題
- **實現**：在 `sendEmail` 函數中加入了 `getValidAccessToken()` 函數
- **特點**：
  - 提前 5 分鐘自動刷新 token
  - 全域緩存，避免重複刷新
  - 詳細的錯誤日誌記錄

### 2. 監控新用戶註冊 ✅
- **函數**：`monitorUserRegistration`
- **觸發**：當 `profiles` 集合中有新文檔創建時
- **功能**：
  - 記錄新用戶個人檔案建立情況
  - 區分基本個人檔案和完整個人檔案
  - 更新系統統計數據
- **日誌**：在 Firebase Functions 日誌中查看

### 3. 定期檢查個人檔案 ✅
- **函數**：`periodicProfileCheck`
- **觸發**：每天凌晨 2 點自動執行
- **功能**：
  - 檢查所有註冊用戶是否有個人檔案
  - 自動為缺少個人檔案的用戶建立基本個人檔案
  - 詳細的執行日誌記錄

### 4. 手動檢查工具 ✅
- **函數**：`manualProfileCheck`
- **腳本**：`profile-check.sh`
- **使用方法**：
  ```bash
  ./profile-check.sh tconnect_admin_2025
  ```

## 📊 當前狀態

根據最新檢查結果：
- **總用戶數**：56 個
- **有個人檔案的用戶**：57 個（包含 1 個測試檔案）
- **缺少個人檔案的用戶**：0 個
- **系統狀態**：✅ 正常

## 🔧 管理工具

### 1. 個人檔案檢查
```bash
# 手動檢查所有用戶的個人檔案狀況
./profile-check.sh tconnect_admin_2025
```

### 2. 系統通知發送
```bash
# 發送系統通知給所有用戶
./send-notification-curl.sh tconnect_admin_2025
```

### 3. 查看函數日誌
```bash
# 查看聊天通知日誌
firebase functions:log --only sendChatNotification

# 查看定期檢查日誌
firebase functions:log --only periodicProfileCheck

# 查看用戶註冊監控日誌
firebase functions:log --only monitorUserRegistration
```

## 🚀 自動化流程

### 新用戶註冊流程
1. 用戶註冊 → Firebase Auth
2. 前端自動建立基本個人檔案 → Firestore `profiles` 集合
3. `monitorUserRegistration` 觸發 → 記錄註冊統計
4. 如果建立失敗，`periodicProfileCheck` 會自動修復

### 聊天通知流程
1. 用戶發送訊息 → Firestore `chatrooms/{id}/messages` 集合
2. `sendChatNotification` 觸發
3. 自動刷新 Gmail token（如需要）
4. 發送郵件通知給接收者

## 📈 監控指標

### 系統統計數據
- 位置：Firestore `systemStats/userRegistration`
- 包含：
  - `lastRegistration`：最後註冊時間
  - `totalRegistrations`：總註冊數
  - `lastUpdated`：最後更新時間

### 日誌監控
- 所有函數都有詳細的日誌記錄
- 錯誤會自動記錄到 Firebase Functions 日誌
- 可以通過 Firebase Console 查看

## ⚠️ 注意事項

1. **Token 管理**：Gmail refresh token 仍需要手動更新（約每 6 個月）
2. **定期檢查**：系統會每天自動檢查，但建議每週手動執行一次檢查
3. **監控**：建議定期查看 Firebase Functions 日誌，確保系統正常運作

## 🔄 維護建議

1. **每週**：執行 `./profile-check.sh` 檢查個人檔案狀況
2. **每月**：檢查 Firebase Functions 日誌，確保沒有錯誤
3. **每 6 個月**：更新 Gmail refresh token（如需要）

---

**最後更新**：2025-09-10
**狀態**：✅ 所有功能正常運作

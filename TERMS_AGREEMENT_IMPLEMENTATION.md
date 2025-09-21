# T-Connect 使用條款同意功能實現

## 功能概述

本實現為 T-Connect 網站新增了完整的「使用條款同意」功能，確保所有用戶在註冊和登入時都必須同意相關條款才能使用平台服務。

## 實現的功能

### 1. 註冊頁面增強 (`src/pages/auth/Signup.jsx`)

- ✅ 新增必填的「我已閱讀並同意《使用者條款》與《隱私政策》」勾選框
- ✅ 條款與隱私政策提供超連結（`/terms` 和 `/privacy`）
- ✅ 未勾選時無法完成註冊
- ✅ 註冊成功時自動在 Firestore 中記錄同意狀態

### 2. 使用條款頁面 (`src/pages/Terms.jsx`)

- ✅ 完整的使用條款內容展示
- ✅ 響應式設計，支援各種裝置
- ✅ 「同意並繼續」按鈕，點擊後更新 Firestore 並導向首頁
- ✅ 返回首頁按鈕

### 3. 隱私政策頁面 (`src/pages/Privacy.jsx`)

- ✅ 完整的隱私政策內容
- ✅ 現代化的 UI 設計
- ✅ 清晰的資訊分類和展示

### 4. 認證流程增強 (`src/contexts/AuthContext.jsx`)

- ✅ 註冊時自動在 `users/{uid}` 和 `profiles/{uid}` 集合中新增：
  - `agreedToTerms: true`
  - `agreedAt: serverTimestamp()`
- ✅ 支援一般註冊和 Google 登入兩種方式

### 5. 登入後檢查機制 (`src/components/TermsAgreement.jsx`)

- ✅ 用戶登入後自動檢查條款同意狀態
- ✅ 未同意時顯示友好的提示頁面
- ✅ 引導用戶前往條款頁面完成同意流程
- ✅ 已同意時正常顯示應用內容

### 6. 路由保護 (`src/components/PrivateRoute.jsx`)

- ✅ 集成條款同意檢查到所有受保護的路由
- ✅ 確保只有同意條款的用戶才能訪問受保護頁面

### 7. 路由配置 (`src/App.jsx`)

- ✅ 新增 `/terms` 路由（使用條款）
- ✅ 新增 `/privacy` 路由（隱私政策）

## Firestore 資料結構

### users/{uid} 集合
```javascript
{
  email: "user@example.com",
  displayName: "用戶名稱",
  agreedToTerms: true,
  agreedAt: serverTimestamp()
}
```

### profiles/{uid} 集合
```javascript
{
  displayName: "用戶名稱",
  email: "user@example.com",
  emailNotifications: true,
  createdAt: serverTimestamp(),
  isBasicProfile: true,
  nationality: "",
  bio: "",
  photos: [],
  agreedToTerms: true,
  agreedAt: serverTimestamp()
}
```

## 用戶流程

### 新用戶註冊流程
1. 用戶填寫註冊表單
2. 必須勾選「我已閱讀並同意《使用者條款》與《隱私政策》」
3. 點擊註冊按鈕
4. 系統自動在 Firestore 中記錄同意狀態
5. 註冊成功，導向首頁

### 現有用戶登入流程
1. 用戶登入
2. 系統檢查 `agreedToTerms` 狀態
3. 如果未同意：
   - 顯示條款同意提示頁面
   - 引導用戶前往 `/terms` 頁面
   - 用戶閱讀條款並點擊「同意並繼續」
   - 更新 Firestore 中的同意狀態
   - 導向首頁
4. 如果已同意：正常顯示應用內容

## 技術特點

- **響應式設計**：支援桌面和行動裝置
- **用戶友好**：清晰的提示和引導流程
- **資料一致性**：同時更新 `users` 和 `profiles` 集合
- **錯誤處理**：完善的錯誤處理和用戶反饋
- **效能優化**：只在需要時檢查條款狀態
- **安全性**：確保所有受保護頁面都經過條款檢查

## 檔案清單

### 新增檔案
- `src/pages/Terms.jsx` - 使用條款頁面
- `src/pages/Privacy.jsx` - 隱私政策頁面
- `src/components/TermsAgreement.jsx` - 條款同意檢查組件

### 修改檔案
- `src/pages/auth/Signup.jsx` - 新增條款同意勾選框
- `src/contexts/AuthContext.jsx` - 註冊時記錄同意狀態
- `src/components/PrivateRoute.jsx` - 集成條款檢查
- `src/App.jsx` - 新增路由配置

## 測試建議

1. **新用戶註冊測試**
   - 測試未勾選條款時無法註冊
   - 測試勾選條款後成功註冊
   - 驗證 Firestore 中的資料正確性

2. **現有用戶登入測試**
   - 測試未同意條款的用戶被導向條款頁面
   - 測試已同意條款的用戶正常使用
   - 測試條款同意後的狀態更新

3. **UI/UX 測試**
   - 測試各種裝置上的顯示效果
   - 測試連結和按鈕的功能
   - 測試錯誤處理和用戶反饋

## 注意事項

- 所有新註冊的用戶都會自動同意條款
- 現有用戶首次登入時會被要求同意條款
- 條款內容可以根據需要進行修改
- 建議定期檢查和更新條款內容

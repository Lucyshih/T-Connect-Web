# EuroConnect 新功能說明

## 新增功能概述

本次更新新增了兩個重要功能：

1. **自動刪除過期貼文** - 自動清理已過期的貼文
2. **避免重複申請與重複聊天室** - 智能管理聊天室建立，避免重複

---

## 功能 1: 自動刪除過期貼文

### 功能描述
- 自動檢查並刪除 `endDate` 小於當前歐洲時間的過期貼文
- 涵蓋三個集合：`couches`（沙發）、`companions`（旅伴）、`locals`（地陪）
- 支援多種執行方式

### 實現方式

#### 1. Cloud Functions（推薦 - 正式環境）
- **自動執行**：每天歐洲時間凌晨 2:00 自動執行
- **手動觸發**：可透過 HTTP 請求手動觸發
- **位置**：`functions/index.js`

```javascript
// 自動清理函數
exports.cleanupExpiredPosts = onSchedule({
  schedule: "0 2 * * *", // 每天凌晨 2:00 (UTC)
  timeZone: "Europe/London", // 歐洲時間
  retryCount: 3
}, async (event) => { ... });

// 手動觸發函數
exports.cleanupExpiredPostsManual = onRequest(async (request, response) => { ... });
```

#### 2. 前端自動清理（本地開發測試）
- **自動執行**：應用啟動時自動執行一次
- **手動觸發**：可透過管理員頁面手動執行
- **位置**：`src/hooks/useAutoCleanup.js`

```javascript
// 在 App.jsx 中使用
useAutoCleanup({
  enabled: true,
  autoRun: true,
  showConsoleLogs: process.env.NODE_ENV === 'development'
});
```

#### 3. 管理員頁面
- **路徑**：`/admin/cleanup`
- **功能**：手動觸發前端/後端清理
- **位置**：`src/pages/admin/CleanupAdmin.jsx`

### 過期判斷邏輯
- 以歐洲時間為準（Europe/London 時區）
- 檢查 `endDate` 欄位是否存在
- 支援多種日期格式：
  - Firestore Timestamp
  - JavaScript Date
  - ISO 字串
  - Unix 時間戳

---

## 功能 2: 避免重複申請與重複聊天室

### 功能描述
- 防止用戶對同一貼文重複申請
- 避免兩位用戶之間建立多個聊天室
- 智能管理聊天室建立流程

### 實現方式

#### 1. 核心工具函數
- **位置**：`src/utils/chatUtils.js`
- **主要函數**：`smartOpenChatroom()`

#### 2. 檢查邏輯

##### 重複申請檢查
```javascript
export const checkExistingApplication = async (userId, postId, postType) => {
  // 查詢是否已存在聊天室
  const chatroomQuery = query(
    chatroomsCollection,
    where('participants', 'array-contains', userId),
    where('postId', '==', postId)
  );
  
  // 返回檢查結果
  return {
    hasApplied: boolean,
    existingChatroom: Object|null
  };
};
```

##### 重複聊天室檢查
```javascript
export const checkExistingChatroom = async (user1Id, user2Id, postId) => {
  // 查詢兩位用戶之間是否已存在聊天室
  const chatroomQuery = query(
    chatroomsCollection,
    where('participants', 'array-contains', user1Id)
  );
  
  // 檢查是否包含另一位用戶
  // 返回檢查結果
  return {
    exists: boolean,
    chatroom: Object|null
  };
};
```

#### 3. 智能聊天室建立流程

1. **檢查重複申請**
   - 如果已申請過，直接進入現有聊天室

2. **檢查現有聊天室**
   - 如果兩位用戶之間已有聊天室，更新貼文資訊並進入

3. **建立新聊天室**
   - 如果都不存在，建立新的聊天室

#### 4. 整合到現有組件
- **位置**：`src/components/PostDetailDrawer.jsx`
- **替換原有邏輯**：使用 `smartOpenChatroom()` 函數

---

## 使用方法

### 1. 自動清理功能

#### 部署 Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

#### 前端自動清理
- 功能會在應用啟動時自動執行
- 可在管理員頁面手動觸發

#### 管理員頁面
- 訪問 `/admin/cleanup`
- 選擇前端或後端清理方式
- 查看清理結果和詳細資訊

### 2. 智能聊天室功能

#### 自動運作
- 功能已整合到現有的聊天室建立流程
- 用戶無需額外操作，系統自動處理

#### 開發者使用
```javascript
import { smartOpenChatroom } from '../utils/chatUtils';

const result = await smartOpenChatroom(
  postId,           // 貼文ID
  postType,         // 貼文類型
  postOwnerId,      // 貼文發布者ID
  applicantId,      // 申請者ID
  postOwnerProfile, // 貼文發布者資料
  applicantProfile, // 申請者資料
  postData          // 貼文資料
);

if (result.success) {
  // 進入聊天室
  navigate(`/chatroom/${result.chatroomId}`);
}
```

---

## 技術特點

### 1. 安全性
- 使用 Firestore 安全規則保護
- 批量操作使用 `writeBatch` 確保原子性
- 錯誤處理和日誌記錄

### 2. 效能
- 使用 Firestore 索引優化查詢
- 批量刪除減少網路請求
- 延遲執行避免阻塞頁面載入

### 3. 可維護性
- 模組化設計，功能分離
- 詳細的錯誤處理和日誌
- 支援開發和生產環境

### 4. 用戶體驗
- 無縫整合，用戶無感知
- 智能處理，避免重複操作
- 即時反饋和狀態更新

---

## 注意事項

### 1. 資料安全
- 過期貼文會永久刪除，無法恢復
- 建議在執行清理前備份重要資料
- 可在管理員頁面查看將被刪除的貼文

### 2. 時區處理
- 所有時間計算以歐洲時間為準
- 使用 `Europe/London` 時區
- 前端和後端時間同步

### 3. 部署要求
- Cloud Functions 需要部署到 Firebase
- 確保 Firestore 規則允許相關操作
- 測試環境建議使用前端清理功能

---

## 故障排除

### 1. 清理功能不工作
- 檢查 Firestore 規則
- 確認 Cloud Functions 已部署
- 查看瀏覽器控制台錯誤訊息

### 2. 聊天室建立失敗
- 檢查用戶認證狀態
- 確認貼文資料完整性
- 查看網路連接狀態

### 3. 時區問題
- 確認系統時區設定
- 檢查歐洲時間計算邏輯
- 驗證 `endDate` 欄位格式

---

## 未來改進

### 1. 功能增強
- 支援更多貼文類型
- 自定義清理規則
- 清理歷史記錄

### 2. 效能優化
- 增量清理策略
- 快取機制
- 並行處理

### 3. 監控和報告
- 清理統計報告
- 效能監控
- 異常警報

---

## 聯繫支援

如有問題或建議，請聯繫開發團隊或提交 Issue。 
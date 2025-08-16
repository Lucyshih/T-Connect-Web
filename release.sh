#!/bin/bash
# ------------------------------
# 🚀 Firebase Release Script (Vite + Firebase Hosting)
# ------------------------------

set -ex  # 顯示每個執行的命令並在出錯時停止

# ------------------------------
# Step 0: 設定專案 ID
# ------------------------------
FIREBASE_PROJECT="prod"  # 你的正式專案名稱
FIREBASE_HOSTING_URL="https://travelconnect-4a4df.web.app"  # 你的 Firebase Hosting 網址

# ------------------------------
# Step 1: 清理舊的 build 資料夾
# ------------------------------
echo "🔍 Step 1: 清理舊的 build / dist 資料夾..."
rm -rf dist || true

# ------------------------------
# Step 2: 搜尋 console.log
# ------------------------------
echo "🧹 Step 2: 搜尋 console.log..."
grep -r "console.log" src/ || echo "✅ 沒有找到 console.log"

# ------------------------------
# Step 3: 安裝依賴
# ------------------------------
echo "📦 Step 3: 安裝依賴..."
npm install

# ------------------------------
# Step 4: 切換到正式 Firebase 專案
# ------------------------------
echo "⚙️ Step 4: 切換到 Firebase 專案 ${FIREBASE_PROJECT} ..."
firebase use $FIREBASE_PROJECT

# ------------------------------
# Step 5: 備份 Firestore 資料
# ------------------------------
BACKUP_DIR="./firestore-backup-$(date +%Y%m%d%H%M%S)"
echo "💾 Step 5: 備份 Firestore 資料到 $BACKUP_DIR ..."
mkdir -p $BACKUP_DIR

# 嘗試備份 Firestore 資料（如果命令可用）
if firebase firestore:export --help | grep -q "collection-ids"; then
  firebase firestore:export $BACKUP_DIR --collection-ids couches,companions,locals,profiles,chatrooms
  echo "✅ Firestore 備份完成"
else
  echo "⚠️ Firestore 備份命令不可用，跳過備份步驟"
  echo "💡 提示：如果需要備份，可以手動從 Firebase Console 下載資料"
fi


# ------------------------------
# Step 7: 建立 Vite build
# ------------------------------
echo "🏗 Step 7: 建立正式版本 build..."
npm run build

# 確認 dist 資料夾存在
if [ ! -d "dist" ]; then
  echo "❌ 錯誤：dist 資料夾不存在！請確認 Vite build 是否成功"
  exit 1
fi

# ------------------------------
# Step 8: 部署到 Firebase Hosting
# ------------------------------
echo "🚀 Step 8: 部署到 Firebase Hosting..."
firebase deploy --only hosting --project travelconnect-4a4df --public dist


# ------------------------------
# Step 9: 完成
# ------------------------------
echo "🎉 部署完成！"
echo "🔗 你的網站：${FIREBASE_HOSTING_URL}"

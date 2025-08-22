#!/bin/bash

# 創建 public 資料夾
mkdir -p public

# 複製並重命名圖片
cp "Screenshot 2025-08-17 at 1.19.31 PM.png" "public/logo.png"

echo "✅ 圖片設置完成！"
echo "📁 圖片已複製到 public/logo.png"
echo "🌐 現在可以部署到 Firebase Hosting" 
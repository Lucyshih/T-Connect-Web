#!/bin/bash

echo "📁 複製 logo 圖片到 public 資料夾..."

# 複製圖片到 public 資料夾
cp "Screenshot 2025-08-17 at 1.19.31 PM.png" "public/logo.png"

echo "✅ 圖片複製完成！"
echo "📁 圖片位置: public/logo.png"
echo "🚀 現在可以執行 ./release.sh 來部署" 
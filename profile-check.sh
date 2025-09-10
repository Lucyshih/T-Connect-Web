#!/bin/bash

# profile-check.sh
# 個人檔案檢查腳本

echo "🔍 T-Connect 個人檔案檢查工具"
echo "================================"

# 檢查是否提供了認證 token
if [ -z "$1" ]; then
    echo "❌ 錯誤: 請提供認證 token"
    echo ""
    echo "使用方法:"
    echo "  ./profile-check.sh tconnect_admin_2025"
    echo ""
    echo "或者設置環境變數:"
    echo "  export AUTH_TOKEN=tconnect_admin_2025"
    echo "  ./profile-check.sh"
    echo ""
    exit 1
fi

AUTH_TOKEN=${1:-$AUTH_TOKEN}

echo "📊 正在檢查個人檔案狀況..."
echo ""

# 執行手動檢查
echo "🚀 執行手動個人檔案檢查..."
RESPONSE=$(curl -s -X POST "https://us-central1-travelconnect-4a4df.cloudfunctions.net/manualProfileCheck" \
  -H "Content-Type: application/json" \
  -d "{\"authToken\": \"$AUTH_TOKEN\"}")

# 檢查回應
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ 檢查完成！"
    echo ""
    echo "📈 檢查結果:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ 檢查失敗！"
    echo "回應: $RESPONSE"
    exit 1
fi

echo ""
echo "🎉 個人檔案檢查完成！"

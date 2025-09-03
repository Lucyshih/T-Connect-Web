#!/bin/bash

# send-notification-curl.sh
# 使用 curl 觸發系統通知郵件發送的腳本

echo "🚀 T-Connect 系統通知郵件發送工具"
echo "=================================="
echo ""

# 函數 URL
FUNCTION_URL="https://us-central1-travelconnect-4a4df.cloudfunctions.net/sendSystemNotification"

echo "📧 函數 URL: $FUNCTION_URL"
echo ""

# 檢查是否提供了認證 token
if [ -z "$1" ]; then
    echo "❌ 錯誤: 請提供認證 token"
    echo ""
    echo "使用方法:"
    echo "  ./send-notification-curl.sh tconnect_admin_2025"
    echo ""
    echo "或者設置環境變數:"
    echo "  export AUTH_TOKEN=tconnect_admin_2025"
    echo "  ./send-notification-curl.sh"
    echo ""
    exit 1
fi

# 使用參數或環境變數作為認證 token
AUTH_TOKEN=${1:-$AUTH_TOKEN}

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ 錯誤: 認證 token 不能為空"
    exit 1
fi

echo "🔐 使用認證 token: ${AUTH_TOKEN:0:10}..."
echo ""

# 確認發送
echo "⚠️  警告: 此操作將向所有啟用郵件通知的用戶發送系統通知郵件"
echo "郵件內容: 聊天通知功能恢復通知"
echo ""
read -p "確定要發送嗎？(y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo "📤 正在發送系統通知郵件..."
echo ""

# 發送 POST 請求
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{"action":"send_notification"}' \
    "$FUNCTION_URL")

# 分離響應內容和狀態碼
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "📊 響應狀態碼: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ 系統通知郵件發送成功！"
    echo ""
    echo "📧 響應詳情:"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo "❌ 系統通知郵件發送失敗"
    echo ""
    echo "📧 錯誤響應:"
    echo "$RESPONSE_BODY"
fi

echo ""
echo "🎉 完成！"

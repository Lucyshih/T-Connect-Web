#!/bin/bash

# T-Connect 安全檢查腳本
# 用於檢查敏感資訊是否意外洩露到 Git 歷史中

echo "🔍 T-Connect 安全檢查工具"
echo "================================"

# 檢查當前目錄是否有敏感資訊
echo "📋 檢查當前目錄中的敏感資訊..."

# 檢查 Gmail Client ID
if grep -r "658893138453" . --exclude-dir=node_modules --exclude-dir=.git --exclude="security-check.sh" --exclude="safe-deploy.sh" --exclude="DEPLOYMENT_CHECKLIST.md" > /dev/null 2>&1; then
    echo "❌ 發現 Gmail Client ID 在檔案中"
    grep -r "658893138453" . --exclude-dir=node_modules --exclude-dir=.git --exclude="security-check.sh" --exclude="safe-deploy.sh" --exclude="DEPLOYMENT_CHECKLIST.md"
else
    echo "✅ 未發現 Gmail Client ID 在檔案中"
fi

# 檢查 Gmail Client Secret
if grep -r "GOCSPX-" . --exclude-dir=node_modules --exclude-dir=.git --exclude="security-check.sh" --exclude="safe-deploy.sh" --exclude="DEPLOYMENT_CHECKLIST.md" > /dev/null 2>&1; then
    echo "❌ 發現 Gmail Client Secret 在檔案中"
    grep -r "GOCSPX-" . --exclude-dir=node_modules --exclude-dir=.git --exclude="security-check.sh" --exclude="safe-deploy.sh" --exclude="DEPLOYMENT_CHECKLIST.md"
else
    echo "✅ 未發現 Gmail Client Secret 在檔案中"
fi

# 檢查 Refresh Token 模式
if grep -r "1//" . --exclude-dir=node_modules --exclude-dir=.git --exclude="security-check.sh" --exclude="safe-deploy.sh" --exclude="DEPLOYMENT_CHECKLIST.md" > /dev/null 2>&1; then
    echo "⚠️  發現可能的 Refresh Token 模式在檔案中"
    grep -r "1//" . --exclude-dir=node_modules --exclude-dir=.git --exclude="security-check.sh" --exclude="safe-deploy.sh" --exclude="DEPLOYMENT_CHECKLIST.md"
else
    echo "✅ 未發現 Refresh Token 模式在檔案中"
fi

echo ""
echo "📋 檢查 Git 歷史中的敏感資訊..."

# 檢查 Git 歷史
if command -v git >/dev/null 2>&1; then
    # 檢查 commit 歷史中的敏感資訊
    if git log --all --full-history --grep="658893138453" > /dev/null 2>&1; then
        echo "❌ 在 Git commit 訊息中發現 Gmail Client ID"
    else
        echo "✅ Git commit 訊息中未發現 Gmail Client ID"
    fi
    
    # 檢查檔案內容歷史
    if git log --all --full-history -- "**/functions/index.js" | grep -q "658893138453" > /dev/null 2>&1; then
        echo "❌ 在 Git 歷史中發現 Gmail Client ID"
    else
        echo "✅ Git 歷史中未發現 Gmail Client ID"
    fi
else
    echo "⚠️  Git 不可用，無法檢查歷史"
fi

echo ""
echo "📋 檢查環境變數設置..."

# 檢查 Firebase Functions 配置
if command -v firebase >/dev/null 2>&1; then
    echo "🔧 Firebase Functions 配置："
    firebase functions:config:get 2>/dev/null | grep gmail || echo "未設置 Gmail 配置"
else
    echo "⚠️  Firebase CLI 不可用"
fi

echo ""
echo "📋 建議的後續行動："
echo "1. 如果發現敏感資訊，立即從檔案中移除"
echo "2. 如果敏感資訊已提交到 Git，考慮使用 git filter-repo 清理歷史"
echo "3. 如果 repo 是公開的，假設敏感資訊已外洩，立即輪換所有 token"
echo "4. 設置環境變數並重新部署函數"
echo "5. 定期執行此腳本檢查安全性"

echo ""
echo "✅ 安全檢查完成！"

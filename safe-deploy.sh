#!/bin/bash

# T-Connect 安全部署腳本
# 確保在推送到 GitHub 前沒有敏感資訊

echo "🚀 T-Connect 安全部署工具"
echo "================================"

# 1. 運行安全檢查
echo "📋 步驟 1: 運行安全檢查..."
./security-check.sh

if [ $? -ne 0 ]; then
    echo "❌ 安全檢查失敗！請先修復安全問題再部署。"
    exit 1
fi

echo ""
echo "📋 步驟 2: 檢查 Git 狀態..."

# 2. 檢查是否有未提交的變更
if ! git diff --quiet; then
    echo "⚠️  發現未提交的變更，正在添加檔案..."
    
    # 添加所有修改的檔案
    git add .
    
    echo "📝 請輸入 commit 訊息："
    read -p "Commit message: " commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="Security fix: Remove hardcoded sensitive information and setup environment variables"
    fi
    
    git commit -m "$commit_message"
    echo "✅ 變更已提交"
else
    echo "✅ 沒有未提交的變更"
fi

echo ""
echo "📋 步驟 3: 檢查分支狀態..."

# 3. 檢查分支狀態
current_branch=$(git branch --show-current)
echo "當前分支: $current_branch"

# 4. 檢查是否有遠端分支
if git ls-remote --heads origin $current_branch | grep -q $current_branch; then
    echo "✅ 遠端分支 $current_branch 存在"
    
    # 檢查是否需要拉取遠端變更
    git fetch origin
    behind=$(git rev-list --count HEAD..origin/$current_branch)
    ahead=$(git rev-list --count origin/$current_branch..HEAD)
    
    if [ $behind -gt 0 ]; then
        echo "⚠️  遠端有 $behind 個新提交，建議先拉取："
        echo "   git pull origin $current_branch"
        read -p "是否繼續推送？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ 部署取消"
            exit 1
        fi
    fi
    
    if [ $ahead -gt 0 ]; then
        echo "✅ 本地有 $ahead 個新提交待推送"
    fi
else
    echo "⚠️  遠端分支 $current_branch 不存在，將創建新分支"
fi

echo ""
echo "📋 步驟 4: 最終安全檢查..."

# 5. 最後一次檢查敏感資訊
if grep -r "658893138453" . --exclude-dir=node_modules --exclude-dir=.git --exclude="safe-deploy.sh" --exclude="security-check.sh" > /dev/null 2>&1; then
    echo "❌ 仍然發現敏感資訊！請先修復："
    grep -r "658893138453" . --exclude-dir=node_modules --exclude-dir=.git --exclude="safe-deploy.sh" --exclude="security-check.sh"
    exit 1
fi

if grep -r "GOCSPX-" . --exclude-dir=node_modules --exclude-dir=.git --exclude="safe-deploy.sh" --exclude="security-check.sh" > /dev/null 2>&1; then
    echo "❌ 仍然發現敏感資訊！請先修復："
    grep -r "GOCSPX-" . --exclude-dir=node_modules --exclude-dir=.git --exclude="safe-deploy.sh" --exclude="security-check.sh"
    exit 1
fi

echo "✅ 安全檢查通過"

echo ""
echo "📋 步驟 5: 推送到 GitHub..."

# 6. 推送到 GitHub
read -p "確定要推送到 GitHub 嗎？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 正在推送到 GitHub..."
    
    if git push origin $current_branch; then
        echo "✅ 成功推送到 GitHub！"
        echo ""
        echo "📋 後續建議："
        echo "1. 檢查 GitHub 上的程式碼是否正確"
        echo "2. 確認沒有敏感資訊洩露"
        echo "3. 如果 repo 是公開的，考慮撤銷現有的 OAuth2 token"
        echo "4. 定期運行 ./security-check.sh 檢查安全性"
    else
        echo "❌ 推送失敗！請檢查錯誤訊息"
        exit 1
    fi
else
    echo "❌ 部署取消"
    exit 1
fi

echo ""
echo "🎉 安全部署完成！"

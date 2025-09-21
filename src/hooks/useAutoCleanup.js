import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { frontendCleanupExpiredPosts } from '../utils/cleanupUtils';

/**
 * 自動清理過期貼文的 Hook
 * 在應用啟動時自動執行一次清理
 */
export const useAutoCleanup = (options = {}) => {
  const { user } = useAuth();
  const {
    enabled = true,           // 是否啟用自動清理
    onCleanupStart,           // 清理開始時的回調
    onCleanupComplete,        // 清理完成時的回調
    onCleanupError,           // 清理錯誤時的回調
    autoRun = true,           // 是否在 Hook 初始化時自動執行
    interval = null,          // 定時執行間隔（毫秒），null 表示不重複執行
    showConsoleLogs = false   // 是否在控制台顯示詳細日誌
  } = options;

  const runCleanup = useCallback(async () => {
    if (!enabled) {
      if (showConsoleLogs) console.log('自動清理已禁用');
      return;
    }

    try {
      if (onCleanupStart) onCleanupStart();
      if (showConsoleLogs) console.log('開始自動清理過期貼文...');
      
      const result = await frontendCleanupExpiredPosts();
      
      if (showConsoleLogs) {
        console.log('自動清理完成:', result);
      }
      
      if (onCleanupComplete) onCleanupComplete(result);
      
    } catch (error) {
      if (showConsoleLogs) {
        console.error('自動清理失敗:', error);
      }
      
      if (onCleanupError) onCleanupError(error);
    }
  }, [enabled, onCleanupStart, onCleanupComplete, onCleanupError, showConsoleLogs]);

  useEffect(() => {
    if (!autoRun) return;

    // 延遲執行，避免阻塞頁面載入
    const timer = setTimeout(() => {
      runCleanup();
    }, 2000);

    return () => clearTimeout(timer);
  }, [autoRun, runCleanup]);

  useEffect(() => {
    if (!interval) return;

    // 設定定時執行
    const intervalTimer = setInterval(() => {
      runCleanup();
    }, interval);

    return () => clearInterval(intervalTimer);
  }, [interval, runCleanup]);

  // 返回手動執行函數
  return {
    runCleanup,
    isEnabled: enabled
  };
}; 
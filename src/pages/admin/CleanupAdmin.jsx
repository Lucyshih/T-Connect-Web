import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Navbar from '../../components/Navbar';
import { 
  frontendCleanupExpiredPosts, 
  manualCleanupExpiredPosts,
  debugPostStructure
} from '../../utils/cleanupUtils';
import { Trash2, Clock, AlertTriangle, CheckCircle, XCircle, Bug } from 'lucide-react';

export default function CleanupAdmin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [debugResult, setDebugResult] = useState(null);

  // 前端清理（本地開發測試用）
  const handleFrontendCleanup = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const cleanupResult = await frontendCleanupExpiredPosts();
      setResult(cleanupResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 後端清理（需要部署 Cloud Functions）
  const handleBackendCleanup = async () => {
    if (!user) {
      setError('請先登入');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      // 獲取用戶的 ID token
      const token = await user.getIdToken();
      const cleanupResult = await manualCleanupExpiredPosts(token);
      setResult(cleanupResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 調試貼文結構
  const handleDebugPosts = async () => {
    setLoading(true);
    setError('');
    setDebugResult(null);
    
    try {
      console.log('開始調試貼文結構...');
      await debugPostStructure();
      setDebugResult('調試完成，請查看瀏覽器控制台');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className={`mt-6 p-4 rounded-lg border ${
        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center space-x-2 mb-2">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <h3 className={`font-semibold ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.success ? '清理成功' : '清理失敗'}
          </h3>
        </div>
        
        <p className={`text-sm ${
          result.success ? 'text-green-700' : 'text-red-700'
        }`}>
          {result.message}
        </p>
        
        {result.success && (
          <div className="mt-3 text-sm text-green-700">
            <p>處理時間: {result.timestamp}</p>
            <p>處理集合數量: {result.collectionsProcessed}</p>
            {result.totalDeleted !== undefined && (
              <p>刪除貼文數量: {result.totalDeleted}</p>
            )}
            {result.deletedPosts && result.deletedPosts.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">已刪除的貼文:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {result.deletedPosts.map((post, index) => (
                    <li key={index}>
                      {post.title} ({post.type}) - {post.endDate?.toLocaleDateString?.() || '未知日期'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDebugResult = () => {
    if (!debugResult) return null;

    return (
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Bug className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">調試結果</h3>
        </div>
        <p className="text-sm text-blue-700">{debugResult}</p>
        <p className="text-xs text-blue-600 mt-2">
          詳細信息請查看瀏覽器控制台 (F12 → Console)
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 頭部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">管理員工具</h1>
          <p className="text-gray-600 mt-1">清理過期貼文和管理系統</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 警告提示 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-800">注意事項</h3>
          </div>
          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
            <li>• 此功能會永久刪除過期的貼文，請謹慎使用</li>
            <li>• 過期貼文是指 endDate 小於當前歐洲時間的貼文</li>
            <li>• 建議在非尖峰時段執行清理操作</li>
            <li>• 前端清理僅供本地開發測試使用</li>
          </ul>
        </div>

        {/* 調試功能 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Bug className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">調試工具</h2>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">
            檢查貼文結構和 endDate 欄位，幫助診斷清理問題。結果會顯示在瀏覽器控制台中。
          </p>
          
          <button
            onClick={handleDebugPosts}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>調試中...</span>
              </>
            ) : (
              <>
                <Bug className="w-4 h-4" />
                <span>調試貼文結構</span>
              </>
            )}
          </button>
        </div>

        {/* 清理選項 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 前端清理 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Trash2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">前端清理（測試用）</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              直接在瀏覽器中執行清理，適用於本地開發測試。會立即刪除過期貼文。
            </p>
            
            <button
              onClick={handleFrontendCleanup}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>清理中...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>開始前端清理</span>
                </>
              )}
            </button>
          </div>

          {/* 後端清理 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Trash2 className="w-6 h-6 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">後端清理（正式環境）</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              透過 Cloud Functions 執行清理，適用於正式環境。需要部署 Cloud Functions。
            </p>
            
            <button
              onClick={handleBackendCleanup}
              disabled={loading || !user}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>清理中...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>開始後端清理</span>
                </>
              )}
            </button>
            
            {!user && (
              <p className="text-red-500 text-xs mt-2">需要先登入</p>
            )}
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">錯誤</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* 調試結果 */}
        {renderDebugResult()}

        {/* 結果顯示 */}
        {renderResult()}

        {/* 說明 */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">功能說明</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>調試工具：</strong>檢查貼文結構和 endDate 欄位，幫助診斷問題</p>
            <p><strong>自動清理：</strong>Cloud Functions 會每天歐洲時間凌晨 2:00 自動執行清理</p>
            <p><strong>前端清理：</strong>手動觸發，立即在瀏覽器中執行，適用於測試</p>
            <p><strong>後端清理：</strong>手動觸發，透過 Cloud Functions 執行，適用於正式環境</p>
            <p><strong>過期判斷：</strong>以歐洲時間為準，endDate 小於當前時間的貼文會被刪除</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
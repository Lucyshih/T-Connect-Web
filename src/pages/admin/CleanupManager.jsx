import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  manualCleanupExpiredPosts, 
  filterExpiredPosts, 
  isPostExpired, 
  formatEuropeTime 
} from '../../utils/cleanupUtils';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Home,
  Users,
  MapPin
} from 'lucide-react';

const CleanupManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState({
    couches: [],
    companions: [],
    locals: []
  });
  const [expiredPosts, setExpiredPosts] = useState({
    couches: [],
    companions: [],
    locals: []
  });

  // 檢查用戶是否為管理員（這裡可以根據你的需求調整）
  const isAdmin = user && (user.email === 'admin@example.com' || user.uid === 'admin-uid');

  useEffect(() => {
    if (isAdmin) {
      // 這裡可以載入貼文資料來檢查過期狀態
      // 實際使用時，你可能需要從 Firestore 載入資料
      checkExpiredPosts();
    }
  }, [isAdmin]);

  const checkExpiredPosts = () => {
    // 這裡是模擬資料，實際使用時應該從 Firestore 載入
    const mockPosts = {
      couches: [
        { id: '1', title: '倫敦沙發', endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 過期
        { id: '2', title: '巴黎沙發', endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }  // 未過期
      ],
      companions: [
        { id: '3', title: '羅馬旅伴', endDate: new Date(Date.now() - 12 * 60 * 60 * 1000) }, // 過期
        { id: '4', title: '柏林旅伴', endDate: new Date(Date.now() + 48 * 60 * 60 * 1000) }  // 未過期
      ],
      locals: [
        { id: '5', title: '阿姆斯特丹地陪', endDate: new Date(Date.now() - 36 * 60 * 60 * 1000) }, // 過期
        { id: '6', title: '維也納地陪', endDate: new Date(Date.now() + 72 * 60 * 60 * 1000) }  // 未過期
      ]
    };

    setPosts(mockPosts);

    // 過濾過期貼文
    const expired = {
      couches: filterExpiredPosts(mockPosts.couches, 'couch').filter(post => !isPostExpired(post)),
      companions: filterExpiredPosts(mockPosts.companions, 'companion').filter(post => !isPostExpired(post)),
      locals: filterExpiredPosts(mockPosts.locals, 'local').filter(post => !isPostExpired(post))
    };

    setExpiredPosts(expired);
  };

  const handleManualCleanup = async () => {
    if (!user) {
      setError('請先登入');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setCleanupResult(null);

      // 獲取用戶的 ID token
      const token = await user.getIdToken();
      
      const result = await manualCleanupExpiredPosts(token);
      setCleanupResult(result);
      
      // 重新檢查過期貼文
      checkExpiredPosts();
      
    } catch (error) {
      setError('清理失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCollectionIcon = (type) => {
    switch (type) {
      case 'couch': return <Home className="w-4 h-4" />;
      case 'companion': return <Users className="w-4 h-4" />;
      case 'local': return <MapPin className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getCollectionName = (type) => {
    switch (type) {
      case 'couch': return '沙發';
      case 'companion': return '旅伴';
      case 'local': return '地陪';
      default: return '未知';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">存取被拒絕</h2>
          <p className="text-gray-600">您沒有權限存取此頁面</p>
        </div>
      </div>
    );
  }

  const totalExpired = expiredPosts.couches.length + expiredPosts.companions.length + expiredPosts.locals.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">過期貼文管理</h1>
          <p className="text-gray-600">管理並清理已過期的貼文</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">沙發貼文</p>
                <p className="text-2xl font-bold text-gray-900">{posts.couches.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">旅伴貼文</p>
                <p className="text-2xl font-bold text-gray-900">{posts.companions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">地陪貼文</p>
                <p className="text-2xl font-bold text-gray-900">{posts.locals.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">過期貼文</p>
                <p className="text-2xl font-bold text-red-600">{totalExpired}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 手動清理按鈕 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">手動清理過期貼文</h3>
              <p className="text-gray-600">點擊下方按鈕立即清理所有過期貼文</p>
            </div>
            <button
              onClick={handleManualCleanup}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {loading ? '清理中...' : '立即清理'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {cleanupResult && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                {cleanupResult.message}
              </div>
              <div className="mt-2 text-sm">
                處理時間: {cleanupResult.timestamp}
              </div>
            </div>
          )}
        </div>

        {/* 過期貼文列表 */}
        {totalExpired > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">過期貼文列表</h3>
              <p className="text-sm text-gray-600">以下貼文已過期，建議清理</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {Object.entries(expiredPosts).map(([type, posts]) => 
                posts.length > 0 && (
                  <div key={type} className="p-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                      {getCollectionIcon(type)}
                      <span className="ml-2">{getCollectionName(type)} 過期貼文 ({posts.length})</span>
                    </h4>
                    
                    <div className="space-y-3">
                      {posts.map(post => (
                        <div key={post.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center">
                            <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                            <span className="font-medium">{post.title}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-1" />
                            結束時間: {formatEuropeTime(post.endDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* 自動清理說明 */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-medium text-blue-900 mb-3">自動清理說明</h3>
          <div className="text-blue-800 space-y-2">
            <p>• 系統會每天歐洲時間凌晨 2:00 自動清理過期貼文</p>
            <p>• 過期貼文是指 endDate 小於當前歐洲時間的貼文</p>
            <p>• 清理過程會記錄詳細日誌，可在 Firebase Console 查看</p>
            <p>• 建議定期檢查此頁面，確保清理功能正常運作</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanupManager; 
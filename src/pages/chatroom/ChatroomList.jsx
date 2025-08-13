import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import { chatroomsCollection, companionsCollection, couchesCollection, localsCollection, profilesCollection } from '../../firebase';
import { query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { User, RefreshCw, AlertCircle, MessageCircle } from 'lucide-react';

export default function ChatroomList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receivedChatrooms, setReceivedChatrooms] = useState([]);
  const [sentChatrooms, setSentChatrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 獲取聊天室列表
  const fetchChatrooms = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('開始獲取聊天室列表...');
      const startTime = Date.now();
      
      // 查詢所有包含當前用戶的聊天室
      const chatroomsQuery = query(chatroomsCollection, where('participants', 'array-contains', user.uid));
      const chatroomsSnapshot = await getDocs(chatroomsQuery);
      
      console.log(`找到 ${chatroomsSnapshot.size} 個聊天室，耗時: ${Date.now() - startTime}ms`);
      
      if (chatroomsSnapshot.empty) {
        setReceivedChatrooms([]);
        setSentChatrooms([]);
        setLoading(false);
        return;
      }
      
      // 收集所有需要驗證的貼文ID，按類型分組
      const postIdsByType = {
        couch: [],
        companion: [],
        local: []
      };
      
      const chatrooms = chatroomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 分類貼文ID
      chatrooms.forEach(chatroom => {
        if (chatroom.postId && chatroom.postType && postIdsByType[chatroom.postType]) {
          postIdsByType[chatroom.postType].push(chatroom.postId);
        }
      });
      
      console.log(`需要驗證的貼文: 沙發=${postIdsByType.couch.length}, 旅伴=${postIdsByType.companion.length}, 地陪=${postIdsByType.local.length}`);
      
      // 批量查詢所有貼文，使用 Promise.all 並行處理
      const postQueryStartTime = Date.now();
      const [couchPosts, companionPosts, localPosts] = await Promise.all([
        // 批量查詢沙發貼文
        postIdsByType.couch.length > 0 
          ? getDocs(query(couchesCollection, where('__name__', 'in', postIdsByType.couch)))
          : Promise.resolve({ docs: [] }),
        
        // 批量查詢旅伴貼文
        postIdsByType.companion.length > 0 
          ? getDocs(query(companionsCollection, where('__name__', 'in', postIdsByType.companion)))
          : Promise.resolve({ docs: [] }),
        
        // 批量查詢地陪貼文
        postIdsByType.local.length > 0 
          ? getDocs(query(localsCollection, where('__name__', 'in', postIdsByType.local)))
          : Promise.resolve({ docs: [] })
      ]);
      
      console.log(`批量查詢完成，耗時: ${Date.now() - postQueryStartTime}ms`);
      
      // 創建貼文查找映射
      const postMap = new Map();
      
      // 處理沙發貼文
      couchPosts.docs.forEach(doc => {
        postMap.set(doc.id, { type: 'couch', data: doc.data() });
      });
      
      // 處理旅伴貼文
      companionPosts.docs.forEach(doc => {
        postMap.set(doc.id, { type: 'companion', data: doc.data() });
      });
      
      // 處理地陪貼文
      localPosts.docs.forEach(doc => {
        postMap.set(doc.id, { type: 'local', data: doc.data() });
      });
      
      console.log(`批量查詢完成，找到 ${postMap.size} 個有效貼文`);
      
      // 過濾和更新聊天室
      const validChatrooms = chatrooms.filter(chatroom => {
        if (!chatroom.postId || !chatroom.postType) {
          console.log(`聊天室 ${chatroom.id} 缺少 postId 或 postType，跳過`);
          return false;
        }
        
        const postInfo = postMap.get(chatroom.postId);
        if (!postInfo) {
          console.log(`聊天室 ${chatroom.id} 對應的貼文不存在，跳過`);
          return false;
        }
        
        // 更新聊天室信息
        const postData = postInfo.data;
        chatroom.postTitle = postData.title || postData.destination || postData.location || '無標題';
        
        return true;
      });
      
      console.log(`有效聊天室數量: ${validChatrooms.length}`);
      
      // 分類聊天室
      const received = validChatrooms.filter(room => room.postOwnerId === user.uid);
      const sent = validChatrooms.filter(room => room.applicantId === user.uid);
      
      setReceivedChatrooms(received);
      setSentChatrooms(sent);
      
      const totalTime = Date.now() - startTime;
      console.log(`聊天室列表載入完成，總耗時: ${totalTime}ms`);
      console.log(`收到的聊天室: ${received.length}, 發送的聊天室: ${sent.length}`);
      
    } catch (error) {
      console.error('載入聊天室失敗:', error);
      setError('載入聊天室失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 手動刷新聊天室列表
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChatrooms();
    setRefreshing(false);
  };

  // 清理無效的聊天室（對應貼文已被刪除的聊天室）
  const handleCleanupInvalidChatrooms = async () => {
    try {
      setRefreshing(true);
      console.log('開始清理無效聊天室...');
      
      // 重新獲取聊天室列表，這次會自動過濾掉無效的
      await fetchChatrooms();
      
      console.log('無效聊天室清理完成');
    } catch (error) {
      console.error('清理無效聊天室時發生錯誤:', error);
      setError('清理無效聊天室失敗: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchChatrooms();
  }, [user, navigate]);

  // 頁面焦點監聽 - 當用戶從其他頁面返回時自動刷新
  useEffect(() => {
    const handleFocus = () => {
      // 只有在聊天室列表為空或距離上次刷新超過1分鐘時才自動刷新
      const lastRefreshTime = localStorage.getItem('chatroomLastRefresh');
      const now = Date.now();
      const shouldRefresh = !lastRefreshTime || 
                           (now - parseInt(lastRefreshTime)) > 60000 || // 1分鐘
                           (receivedChatrooms.length === 0 && sentChatrooms.length === 0);
      
      if (shouldRefresh) {
        console.log('頁面重新獲得焦點，自動刷新聊天室列表');
        localStorage.setItem('chatroomLastRefresh', now.toString());
        fetchChatrooms();
      } else {
        console.log('頁面重新獲得焦點，但距離上次刷新時間較短，跳過自動刷新');
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, receivedChatrooms.length, sentChatrooms.length]);

  // 定期刷新聊天室列表（每10分鐘，而不是5分鐘）
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      console.log('定期刷新聊天室列表');
      localStorage.setItem('chatroomLastRefresh', Date.now().toString());
      fetchChatrooms();
    }, 10 * 60 * 1000); // 10分鐘
    
    return () => clearInterval(interval);
  }, [user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderChatroomCard = (chatroom, isReceived = true) => {
    const lastMessage = chatroom.lastMessage;
    // 決定對方 userId
    const profileUserId = isReceived ? chatroom.applicantId : chatroom.postOwnerId;
    return (
      <div 
        key={chatroom.id}
        onClick={() => navigate(`/chatroom/${chatroom.id}`)}
        className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
      >
        <div className="flex items-start space-x-3">
          {/* 用戶頭像 */}
          <div
            className="flex-shrink-0 cursor-pointer group"
            onClick={e => {
              e.stopPropagation();
              navigate(`/profile/${profileUserId}`);
            }}
          >
            {isReceived ? (
              chatroom.applicantAvatar ? (
                <img src={chatroom.applicantAvatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 group-hover:border-blue-500" />
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )
            ) : (
              chatroom.postOwnerAvatar ? (
                <img src={chatroom.postOwnerAvatar} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )
            )}
          </div>
          {/* 聊天室資訊 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {isReceived ? chatroom.applicantName || '匿名用戶' : chatroom.postOwnerName || '匿名用戶'}
              </h3>
              {lastMessage && (
                <span className="text-xs text-gray-500">
                  {formatTime(lastMessage.timestamp)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1 truncate">
              {chatroom.postTitle || '無標題'}
            </p>
            {/* 貼文狀態指示器 */}
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {chatroom.postType === 'couch' ? '沙發' : 
                 chatroom.postType === 'companion' ? '旅伴' : 
                 chatroom.postType === 'local' ? '地陪' : '未知'}
              </span>
              {chatroom.postId && (
                <span className="text-xs text-gray-500">
                  ID: {chatroom.postId.substring(0, 8)}...
                </span>
              )}
            </div>
            {lastMessage ? (
              <p className="text-sm text-gray-500 truncate">
                {lastMessage.text}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                尚無訊息
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 頭部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">聊天室</h1>
            <div className="flex space-x-3">
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">載入中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左欄：我收到的申請聊天室 */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">我收到的申請</h2>
                <span className="text-sm text-gray-500">({receivedChatrooms.length})</span>
              </div>
              
              {receivedChatrooms.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                  尚無申請者
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedChatrooms.map(chatroom => renderChatroomCard(chatroom, true))}
                </div>
              )}
            </div>

            {/* 右欄：我送出的申請聊天室 */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">我送出的申請</h2>
                <span className="text-sm text-gray-500">({sentChatrooms.length})</span>
              </div>
              
              {sentChatrooms.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                  尚無申請記錄
                </div>
              ) : (
                <div className="space-y-3">
                  {sentChatrooms.map(chatroom => renderChatroomCard(chatroom, false))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
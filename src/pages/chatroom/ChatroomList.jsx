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
      
      // 查詢所有包含當前用戶的聊天室
      const chatroomsQuery = query(chatroomsCollection, where('participants', 'array-contains', user.uid));
      const chatroomsSnapshot = await getDocs(chatroomsQuery);
      
      console.log(`找到 ${chatroomsSnapshot.size} 個聊天室`);
      
      const chatrooms = [];
      
      // 驗證每個聊天室對應的貼文是否仍然存在
      for (const docSnapshot of chatroomsSnapshot.docs) {
        const chatroom = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        
        try {
          // 檢查對應的貼文是否仍然存在
          let postExists = false;
          let postData = null;
          
          if (chatroom.postType === 'couch') {
            const postDoc = await getDoc(doc(couchesCollection, chatroom.postId));
            postExists = postDoc.exists();
            postData = postDoc.exists() ? postDoc.data() : null;
          } else if (chatroom.postType === 'companion') {
            const postDoc = await getDoc(doc(companionsCollection, chatroom.postId));
            postExists = postDoc.exists();
            postData = postDoc.exists() ? postDoc.data() : null;
          } else if (chatroom.postType === 'local') {
            const postDoc = await getDoc(doc(localsCollection, chatroom.postId));
            postExists = postDoc.exists();
            postData = postDoc.exists() ? postDoc.data() : null;
          }
          
          if (postExists && postData) {
            // 更新聊天室信息，確保貼文標題是最新的
            chatroom.postTitle = postData.title || postData.destination || postData.location || '無標題';
            chatrooms.push(chatroom);
            console.log(`聊天室 ${chatroom.id} 對應的貼文存在:`, chatroom.postTitle);
          } else {
            console.log(`聊天室 ${chatroom.id} 對應的貼文不存在，跳過`);
            // 這裡可以選擇自動刪除無效的聊天室
            // 但為了安全起見，我們先只是過濾掉
          }
        } catch (postCheckError) {
          console.error(`檢查聊天室 ${chatroom.id} 對應貼文時發生錯誤:`, postCheckError);
          // 如果檢查失敗，為了安全起見，我們保留這個聊天室
          chatrooms.push(chatroom);
        }
      }
      
      console.log(`有效聊天室數量: ${chatrooms.length}`);
      
      // 分類聊天室
      const received = chatrooms.filter(room => room.postOwnerId === user.uid);
      const sent = chatrooms.filter(room => room.applicantId === user.uid);
      
      setReceivedChatrooms(received);
      setSentChatrooms(sent);
      
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
      console.log('頁面重新獲得焦點，自動刷新聊天室列表');
      fetchChatrooms();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // 定期刷新聊天室列表（每5分鐘）
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      console.log('定期刷新聊天室列表');
      fetchChatrooms();
    }, 5 * 60 * 1000); // 5分鐘
    
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
              <button
                onClick={handleCleanupInvalidChatrooms}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="清理對應貼文已被刪除的聊天室"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{refreshing ? '處理中...' : '清理無效'}</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? '刷新中...' : '刷新'}</span>
              </button>
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
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { chatroomsCollection, companionsCollection, couchesCollection, localsCollection, profilesCollection } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { MessageCircle, User, MapPin, Calendar, Users } from 'lucide-react';

export default function ChatroomList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receivedChatrooms, setReceivedChatrooms] = useState([]);
  const [sentChatrooms, setSentChatrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchChatrooms = async () => {
      try {
        setLoading(true);
        
        // 獲取所有聊天室
        const chatroomsQuery = query(chatroomsCollection, where('participants', 'array-contains', user.uid));
        const chatroomsSnapshot = await getDocs(chatroomsQuery);
        const chatrooms = chatroomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 分類聊天室
        const received = [];
        const sent = [];

        for (const chatroom of chatrooms) {
          try {
            // 獲取貼文資料
            const postData = await getPostData(chatroom.postId);
            if (!postData) continue;

            // 獲取申請者/發布者資料
            const otherParticipantId = chatroom.participants.find(id => id !== user.uid);
            const otherUserData = await getUserData(otherParticipantId);

            const chatroomWithDetails = {
              ...chatroom,
              postData,
              otherUserData,
              lastMessage: await getLastMessage(chatroom.id)
            };

            // 判斷是否為我發布的貼文（我收到的申請）
            if (postData.userId === user.uid) {
              received.push(chatroomWithDetails);
            } else {
              sent.push(chatroomWithDetails);
            }
          } catch (error) {
            console.error('獲取聊天室詳細資料失敗:', error);
          }
        }

        setReceivedChatrooms(received);
        setSentChatrooms(sent);
      } catch (error) {
        setError('載入聊天室失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchChatrooms();
  }, [user, navigate]);

  const getPostData = async (postId) => {
    if (!postId) return null;
    
    try {
      // 嘗試從不同集合查詢貼文
      const collections = [companionsCollection, couchesCollection, localsCollection];
      for (const col of collections) {
        const postDoc = await getDoc(doc(col, postId));
        if (postDoc.exists()) {
          return { id: postDoc.id, ...postDoc.data() };
        }
      }
      return null;
    } catch (error) {
      console.error('獲取貼文資料失敗:', error);
      return null;
    }
  };

  const getUserData = async (userId) => {
    if (!userId) return null;
    
    try {
      const userDoc = await getDoc(doc(profilesCollection, userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('獲取用戶資料失敗:', error);
      return null;
    }
  };

  const getLastMessage = async (chatroomId) => {
    try {
      const messagesRef = collection(doc(chatroomsCollection, chatroomId), 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data();
      }
      return null;
    } catch (error) {
      console.error('獲取最後訊息失敗:', error);
      return null;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderChatroomCard = (chatroom, isReceived = true) => {
    const { postData, otherUserData, lastMessage } = chatroom;
    
    return (
      <div 
        key={chatroom.id}
        onClick={() => navigate(`/chatroom/${chatroom.id}`)}
        className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
      >
        <div className="flex items-start space-x-3">
          {/* 用戶頭像 */}
          <div className="flex-shrink-0">
            {otherUserData?.photos?.[0] ? (
              <img 
                src={otherUserData.photos[0]} 
                alt="avatar" 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
          </div>

          {/* 聊天室資訊 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {isReceived ? otherUserData?.displayName || '匿名用戶' : postData?.userName || '匿名用戶'}
              </h3>
              {lastMessage && (
                <span className="text-xs text-gray-500">
                  {formatTime(lastMessage.timestamp)}
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-1 truncate">
              {postData?.title || '無標題'}
            </p>
            
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頭部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">聊天室</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左欄：我收到的申請聊天室 */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">我收到的申請</h2>
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
      </div>
    </div>
  );
} 
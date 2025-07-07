import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Navbar from '../../components/Navbar';
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
        // 只查 chatrooms 集合
        const chatroomsQuery = query(chatroomsCollection, where('participants', 'array-contains', user.uid));
        const chatroomsSnapshot = await getDocs(chatroomsQuery);
        const chatrooms = chatroomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // 分類聊天室
        const received = chatrooms.filter(room => room.postOwnerId === user.uid);
        const sent = chatrooms.filter(room => room.applicantId === user.uid);
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
      <Navbar />
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
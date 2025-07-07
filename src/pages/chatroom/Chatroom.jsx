import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Navbar from '../../components/Navbar';
import { chatroomsCollection, serverTimestamp, companionsCollection, couchesCollection, localsCollection } from '../../firebase';
import { doc, collection, addDoc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';
import { Send, ArrowLeft, User, MapPin, Calendar, Users, Compass } from 'lucide-react';

export default function Chatroom() {
  const { chatroomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatroom, setChatroom] = useState(null);
  const [postData, setPostData] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user || !chatroomId) {
      navigate('/');
      return;
    }

    // 獲取聊天室資料
    const fetchChatroom = async () => {
      try {
        const chatroomDoc = await getDoc(doc(chatroomsCollection, chatroomId));
        if (!chatroomDoc.exists()) {
          setError('聊天室不存在');
          return;
        }
        const chatroomData = chatroomDoc.data();
        
        // 檢查用戶是否為聊天室參與者
        if (!chatroomData.participants.includes(user.uid)) {
          setError('您沒有權限進入此聊天室');
          return;
        }
        
        setChatroom(chatroomData);
        
        // 獲取貼文資料
        if (chatroomData.postId) {
          await fetchPostData(chatroomData.postId);
        }
      } catch (error) {
        setError('載入聊天室失敗');
      }
    };

    fetchChatroom();
  }, [chatroomId, user, navigate]);

  const fetchPostData = async (postId) => {
    try {
      // 嘗試從不同集合查詢貼文
      const collections = [companionsCollection, couchesCollection, localsCollection];
      for (const col of collections) {
        const postDoc = await getDoc(doc(col, postId));
        if (postDoc.exists()) {
          setPostData({ id: postDoc.id, ...postDoc.data() });
          break;
        }
      }
    } catch (error) {
      console.error('獲取貼文資料失敗:', error);
    }
  };

  useEffect(() => {
    if (!chatroomId) return;

    // 監聽訊息
    const messagesRef = collection(doc(chatroomsCollection, chatroomId), 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = [];
      snapshot.forEach((doc) => {
        messageList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMessages(messageList);
      setLoading(false);
    }, (error) => {
      console.error('監聽訊息失敗:', error);
      setError('載入訊息失敗');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatroomId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const messagesRef = collection(doc(chatroomsCollection, chatroomId), 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      setError('發送訊息失敗');
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

  const renderPostInfo = () => {
    if (!postData) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h3 className="font-semibold text-lg mb-3">貼文資訊</h3>
        <div className="space-y-3">
          {postData.title && (
            <div>
              <h4 className="font-medium text-gray-700">{postData.title}</h4>
            </div>
          )}
          
          {postData.destinations && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {postData.destinations.map(dest => dest.name).join('、')}
              </span>
            </div>
          )}
          
          {postData.location && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{postData.location}</span>
            </div>
          )}
          
          {postData.city && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{postData.city}</span>
            </div>
          )}
          
          {postData.startDate && postData.endDate && (
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {new Date(postData.startDate.seconds * 1000).toLocaleDateString()} - 
                {new Date(postData.endDate.seconds * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {postData.companionCount && (
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">需要 {postData.companionCount} 人</span>
            </div>
          )}
          
          {postData.maxGuests && (
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">可接待 {postData.maxGuests} 人</span>
            </div>
          )}
          
          {postData.price && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-green-600">€{postData.price}</span>
            </div>
          )}
          
          {postData.description && (
            <div>
              <p className="text-sm text-gray-600 line-clamp-3">{postData.description}</p>
            </div>
          )}
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* 側邊欄 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* 頭部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/chatrooms')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-semibold">聊天室</h1>
              <p className="text-xs text-gray-500">ID: {chatroomId}</p>
            </div>
          </div>
        </div>
        
        {/* 貼文資訊 */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderPostInfo()}
        </div>
      </div>

      {/* 主要聊天區域 */}
      <div className="flex-1 flex flex-col">
        {/* 訊息區域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === user.uid;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-xs opacity-75">
                        {isOwnMessage ? '您' : '對方'}
                      </span>
                    </div>
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 輸入區域 */}
        <div className="bg-white border-t">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="輸入訊息..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!user}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !user}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>發送</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 
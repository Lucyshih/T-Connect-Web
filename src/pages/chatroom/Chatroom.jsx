import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import { chatroomsCollection, serverTimestamp, companionsCollection, couchesCollection, localsCollection } from '../../firebase';
import { doc, collection, addDoc, onSnapshot, query, orderBy, getDoc, updateDoc } from 'firebase/firestore';
import { Send, ArrowLeft, User, MapPin, Calendar, Users, Compass, ChevronDown, ChevronUp, Menu, X } from 'lucide-react';

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
  const [postInfoExpanded, setPostInfoExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
          const postData = { id: postDoc.id, ...postDoc.data() };
          // 根據集合名稱確定貼文類型
          if (col === companionsCollection) {
            postData.postType = 'companion';
          } else if (col === couchesCollection) {
            postData.postType = 'couch';
          } else if (col === localsCollection) {
            postData.postType = 'local';
          }
          setPostData(postData);
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
      const msg = {
        senderId: user.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      };
      await addDoc(messagesRef, msg);
      // 同步更新 chatroom 文件的 lastMessage
      await updateDoc(doc(chatroomsCollection, chatroomId), {
        lastMessage: {
          ...msg,
          timestamp: serverTimestamp(),
        }
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

  const renderPostInfo = (isMobile = false) => {
    if (!postData) return null;

    // 根據貼文類型確定標籤
    const getPostTypeLabel = () => {
      switch (postData.postType) {
        case 'companion':
          return '旅伴';
        case 'couch':
          return '沙發';
        case 'local':
          return '地陪';
        default:
          return '貼文';
      }
    };

    const getPostTypeColor = () => {
      switch (postData.postType) {
        case 'companion':
          return 'bg-green-100 text-green-800';
        case 'couch':
          return 'bg-blue-100 text-blue-800';
        case 'local':
          return 'bg-purple-100 text-purple-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const postInfoContent = (
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
            <p className="text-sm text-gray-600">
              {postData.description}
            </p>
          </div>
        )}
      </div>
    );

    if (isMobile) {
      return (
        <div className="bg-white border-b border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPostTypeColor()}`}>
                  {getPostTypeLabel()}
                </span>
                <h3 className="font-semibold text-lg">貼文資訊</h3>
              </div>
              <button
                onClick={() => setPostInfoExpanded(!postInfoExpanded)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {postInfoExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
            {postInfoExpanded && postInfoContent}
          </div>
          {/* 申請者資料按鈕 */}
          {chatroom && chatroom.applicantId && (
            <div className="px-4 pb-4">
              <button
                className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
                onClick={() => navigate(`/profile/${chatroom.applicantId}`)}
              >
                查看申請者資料
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center space-x-3 mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPostTypeColor()}`}>
            {getPostTypeLabel()}
          </span>
          <h3 className="font-semibold text-lg">貼文資訊</h3>
        </div>
        {postInfoContent}
        {/* 申請者資料按鈕 */}
        {chatroom && chatroom.applicantId && (
          <button
            className="mt-6 w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
            onClick={() => navigate(`/profile/${chatroom.applicantId}`)}
          >
            查看申請者資料
          </button>
        )}
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
      {/* Navbar */}
      <Navbar />
      
      {/* 手機版布局 */}
      <div className="md:hidden flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* 手機版頭部 */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/chatrooms')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-lg">聊天室</h1>
                <p className="text-xs text-gray-500">ID: {chatroomId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 手機版貼文資訊（可展開收起） */}
        {renderPostInfo(true)}

        {/* 手機版聊天區域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 訊息區域 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.senderId === user.uid;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
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
                      <p className="text-sm break-words">{message.text}</p>
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
          <div className="bg-white border-t px-4 py-3">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="輸入訊息..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={!user}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !user}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">發送</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 桌面版布局 */}
      <div className="hidden md:flex" style={{ height: 'calc(100vh - 64px)' }}>
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
            {renderPostInfo(false)}
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
    </div>
  );
} 
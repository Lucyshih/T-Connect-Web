import React from 'react';
import { X, User, Mail, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { chatroomsCollection, serverTimestamp, profilesCollection } from '../firebase';
import { addDoc, doc as firestoreDoc, updateDoc, getDoc } from 'firebase/firestore';

const PostDetailDrawer = ({ isOpen, onClose, post, type }) => {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  if (!isOpen) return null;

  const renderPostContent = () => {
    switch (type) {
      case 'companion':
        return (
          <>
            <h2 className="text-xl font-bold mb-4">{post.title}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">目的地</h3>
                <p>{post.destinations?.map(dest => dest.name).join('、')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">日期</h3>
                <p>
                  {new Date(post.startDate.seconds * 1000).toLocaleDateString()} - 
                  {new Date(post.endDate.seconds * 1000).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">需要旅伴人數</h3>
                <p>{post.companionsNeeded} 人</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">描述</h3>
                <p className="whitespace-pre-wrap">{post.description}</p>
              </div>
            </div>
          </>
        );
      case 'couch':
        return (
          <>
            <h2 className="text-xl font-bold mb-4">{post.title}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">位置</h3>
                <p>{post.location}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">可接待時間</h3>
                <div className="space-y-2">
                  {post.selectedRanges?.map((range, index) => (
                    <p key={index}>
                      {new Date(range.start.seconds * 1000).toLocaleDateString()} - 
                      {new Date(range.end.seconds * 1000).toLocaleDateString()}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">可接待人數</h3>
                <p>{post.maxGuests} 人</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">描述</h3>
                <p className="whitespace-pre-wrap">{post.description}</p>
              </div>
            </div>
          </>
        );
      case 'local':
        return (
          <>
            <h2 className="text-xl font-bold mb-4">{post.title}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">服務城市</h3>
                <p>{post.city}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">可服務時間</h3>
                <p>
                  {new Date(post.startDate.seconds * 1000).toLocaleDateString()} - 
                  {new Date(post.endDate.seconds * 1000).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">語言</h3>
                <p>{post.languages?.join('、')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">服務項目</h3>
                <p>{post.services?.join('、')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">價格</h3>
                <p>€{post.price}/小時</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">描述</h3>
                <p className="whitespace-pre-wrap">{post.description}</p>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderUserProfile = () => {
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-4">發布者資料</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gray-500" />
            <span>{post.userName || '匿名用戶'}</span>
          </div>
          {post.userEmail && (
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-gray-500" />
              <span>{post.userEmail}</span>
            </div>
          )}
          {post.userLocation && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-500" />
              <span>{post.userLocation}</span>
            </div>
          )}
          {post.userBio && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">關於我</h4>
              <p className="text-gray-600 whitespace-pre-wrap">{post.userBio}</p>
            </div>
          )}
          {post.userLanguages && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">語言能力</h4>
              <div className="flex flex-wrap gap-2">
                {post.userLanguages.map((lang, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
          {post.userInterests && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">興趣愛好</h4>
              <div className="flex flex-wrap gap-2">
                {post.userInterests.map((interest, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 開啟聊天室邏輯
  const handleOpenChatroom = async () => {
    if (!user) {
      setError('請先登入才能開啟聊天室');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 取得貼文發布者資料
      const postOwnerId = post.userId;
      const postOwnerProfileDoc = await getDoc(firestoreDoc(profilesCollection, postOwnerId));
      const postOwnerProfile = postOwnerProfileDoc.exists() ? postOwnerProfileDoc.data() : {};
      // 取得申請者資料
      const applicantProfileDoc = await getDoc(firestoreDoc(profilesCollection, user.uid));
      const applicantProfile = applicantProfileDoc.exists() ? applicantProfileDoc.data() : {};
      // 建立聊天房，冗餘寫入必要資訊
      const chatroomData = {
        participants: [postOwnerId, user.uid],
        postId: post.id || post.postId || '',
        postTitle: post.title || '',
        postOwnerId,
        postOwnerName: postOwnerProfile.displayName || '',
        postOwnerAvatar: postOwnerProfile.photos?.[0] || '',
        applicantId: user.uid,
        applicantName: applicantProfile.displayName || user.displayName || '',
        applicantAvatar: applicantProfile.photos?.[0] || user.photoURL || '',
        lastMessage: null,
        createdAt: serverTimestamp(),
      };
      const chatroomRef = await addDoc(chatroomsCollection, chatroomData);
      const chatroomId = chatroomRef.id;
      // 更新聊天房，加入 chatroomId
      await updateDoc(chatroomRef, { chatroomId });
      setSuccess('聊天室已建立！');
      setTimeout(() => {
        setSuccess('');
        onClose();
        window.location.href = `/chatroom/${chatroomId}`;
      }, 1000);
    } catch (e) {
      setError('建立聊天室失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 抽屜面板 */}
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md">
          <div className="h-full flex flex-col bg-white shadow-xl">
            {/* 頭部 */}
            <div className="px-4 py-6 bg-gray-50 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {type === 'companion' ? '旅伴詳情' : 
                   type === 'couch' ? '沙發詳情' : 
                   '地陪詳情'}
                </h2>
                <button
                  type="button"
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={onClose}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* 內容區域 */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-6 sm:px-6">
                {renderPostContent()}
                {renderUserProfile()}
              </div>
            </div>

            {/* 底部 */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
              {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
              {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
              <button
                type="button"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                onClick={handleOpenChatroom}
                disabled={loading || !!success}
              >
                {loading ? '建立中...' : '開啟聊天室'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailDrawer; 
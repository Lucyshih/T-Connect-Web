import React, { useState } from 'react';
import { X, MapPin, Calendar, Users, Compass, Euro, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { profilesCollection, chatroomsCollection, serverTimestamp } from '../firebase';
import { getDoc, doc as firestoreDoc, addDoc, updateDoc } from 'firebase/firestore';
import { smartOpenChatroom } from '../utils/chatUtils';
import { useNavigate } from 'react-router-dom';

const PostDetailDrawer = ({ isOpen, onClose, post, type }) => {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [previewState, setPreviewState] = React.useState({ photos: [], currentIndex: 0, isOpen: false });
  const [publisherProfile, setPublisherProfile] = React.useState(null);
  const [publisherLoading, setPublisherLoading] = React.useState(true);
  const navigate = useNavigate();

  console.log('PostDetailDrawer props:', { isOpen, post, type });

  // 獲取發布者的最新資料
  const fetchPublisherProfile = React.useCallback(async () => {
    if (!post?.userId) return;
    
    try {
      setPublisherLoading(true);
      const profileDoc = await getDoc(firestoreDoc(profilesCollection, post.userId));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        setPublisherProfile(profileData);
        console.log('獲取到發布者最新資料:', profileData);
      } else {
        console.log('發布者資料不存在');
        setPublisherProfile(null);
      }
    } catch (error) {
      console.error('獲取發布者資料失敗:', error);
      setPublisherProfile(null);
    } finally {
      setPublisherLoading(false);
    }
  }, [post?.userId]);

  // 當貼文或用戶ID改變時，重新獲取發布者資料
  React.useEffect(() => {
    if (isOpen && post?.userId) {
      fetchPublisherProfile();
    }
  }, [isOpen, post?.userId, fetchPublisherProfile]);

  // 照片預覽導航功能
  const goToPreviousPhoto = () => {
    setPreviewState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex === 0 ? prev.photos.length - 1 : prev.currentIndex - 1
    }));
  };

  const goToNextPhoto = () => {
    setPreviewState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex === prev.photos.length - 1 ? 0 : prev.currentIndex + 1
    }));
  };

  // 鍵盤事件處理
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!previewState.isOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPreviousPhoto();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextPhoto();
          break;
        case 'Escape':
          e.preventDefault();
          setPreviewState(prev => ({ ...prev, isOpen: false }));
          break;
      }
    };

    if (previewState.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 禁止背景滾動
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 恢復背景滾動
      document.body.style.overflow = 'unset';
    };
  }, [previewState.isOpen]);

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
                <p>{post.companionCount} 人</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">描述</h3>
                <p className="whitespace-pre-wrap">{post.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">預算範圍（€）</h3>
                <p className="whitespace-pre-wrap">{post.budget}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">初步行程規劃</h3>
                <p className="whitespace-pre-wrap">{post.itinerary}</p>
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
                <p>{post.capacity} 人</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">每晚價格 (€)</h3>
                <p>{post.pricePerNight} €</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">描述</h3>
                <p className="whitespace-pre-wrap">{post.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">設施</h3>
                <p className="whitespace-pre-wrap">{post.facilities?.join('、')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">照片</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {post.photos?.map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img 
                        src={photo} 
                        alt={`預覽${index + 1}`} 
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => setPreviewState({ photos: post.photos, currentIndex: index, isOpen: true })}
                      />
                    </div>
                  ))}
                </div>
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
                <h3 className="font-semibold text-gray-700">服務項目</h3>
                <p>{post.services?.join('、')}</p>
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
    const userId = post.userId;
    
    // 優先使用最新的發布者資料，如果沒有則使用貼文中的資料作為備用
    const userName = publisherProfile?.displayName || post.userName || '匿名用戶';
    const userAvatar = publisherProfile?.photos?.[0] || post.userAvatar || post.userphoto || post.userProfilePhoto || '';
    
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">發布者資料</h3>
          <button
            onClick={fetchPublisherProfile}
            disabled={publisherLoading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            title="刷新發布者資料"
          >
            <RefreshCw className={`w-4 h-4 ${publisherLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {publisherLoading ? (
          <div className="flex items-center space-x-3 p-2">
            <div className="w-12 h-12 bg-gray-300 rounded-full animate-pulse" />
            <div className="h-4 bg-gray-300 rounded animate-pulse w-24" />
          </div>
        ) : (
          <div
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
            onClick={() => navigate(`/profile/${userId}`)}
          >
            {userAvatar ? (
              <img src={userAvatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border" />
            ) : (
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <span className="text-lg font-semibold text-blue-700 hover:underline">{userName}</span>
          </div>
        )}
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
      
      // 使用智能聊天室功能
      const result = await smartOpenChatroom(
        post.id || post.postId || '',
        type, // 'couch', 'companion', 'local'
        postOwnerId,
        user.uid,
        postOwnerProfile,
        applicantProfile,
        post
      );
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          setSuccess('');
          onClose();
          window.location.href = `/chatroom/${result.chatroomId}`;
        }, 1000);
      } else {
        setError(result.message);
      }
      
    } catch (error) {
      console.error('開啟聊天室失敗:', error);
      setError('開啟聊天室失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] overflow-hidden">
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

      {/* 照片預覽 Lightbox */}
      {previewState.isOpen && (
        <div className="fixed inset-0 z-[21000] bg-black bg-opacity-90 flex items-center justify-center" onClick={() => setPreviewState(prev => ({ ...prev, isOpen: false }))}>
          {/* 左箭頭按鈕 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousPhoto();
            }}
            className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-40 rounded-full p-2 md:p-3 hover:bg-opacity-70 transition-all duration-200 z-10"
            title="上一張照片 (←)"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 右箭頭按鈕 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNextPhoto();
            }}
            className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-40 rounded-full p-2 md:p-3 hover:bg-opacity-70 transition-all duration-200 z-10"
            title="下一張照片 (→)"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 照片計數顯示 */}
          <div className="absolute top-4 md:top-8 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-40 px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium z-10">
            {previewState.currentIndex + 1} / {previewState.photos.length}
          </div>

          {/* 關閉按鈕 */}
          <button
            className="absolute top-4 md:top-8 right-4 md:right-8 text-white bg-black bg-opacity-40 rounded-full p-1.5 md:p-2 hover:bg-opacity-70 transition-all duration-200 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewState(prev => ({ ...prev, isOpen: false }));
            }}
            title="關閉預覽 (ESC)"
          >
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          {/* 主照片容器 - 支援點擊導航 */}
          <div className="relative flex-1 flex items-center justify-center mx-4">
            {/* 左側點擊區域 - 上一張 */}
            <div 
              className="absolute left-0 top-0 w-1/3 h-full cursor-pointer z-5"
              onClick={(e) => {
                e.stopPropagation();
                goToPreviousPhoto();
              }}
            />
            
            {/* 右側點擊區域 - 下一張 */}
            <div 
              className="absolute right-0 top-0 w-1/3 h-full cursor-pointer z-5"
              onClick={(e) => {
                e.stopPropagation();
                goToNextPhoto();
              }}
            />

            {/* 主照片 */}
            <img
              src={previewState.photos[previewState.currentIndex]}
              alt={`照片 ${previewState.currentIndex + 1}`}
              className="max-w-full max-h-[70vh] md:max-h-[80vh] rounded-lg shadow-lg border-2 md:border-4 border-white object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* 底部操作提示 - 在小屏幕上隱藏 */}
          <div className="hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-40 px-4 py-2 rounded-full">
            使用 ← → 鍵或點擊箭頭切換照片，按 ESC 關閉
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetailDrawer; 
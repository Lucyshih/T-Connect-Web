import React, { useState } from 'react';
import { X, MapPin, Calendar, Users, Compass, Euro, RefreshCw, Share2, Copy, Check, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { profilesCollection, chatroomsCollection, serverTimestamp } from '../firebase';
import { getDoc, doc as firestoreDoc, addDoc, updateDoc } from 'firebase/firestore';
import { smartOpenChatroom } from '../utils/chatUtils';
import { addComment, subscribeToComments, getCommentCount } from '../utils/commentUtils';
import { useNavigate } from 'react-router-dom';

const PostDetailDrawer = ({ isOpen, onClose, post, type }) => {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [previewState, setPreviewState] = React.useState({ photos: [], currentIndex: 0, isOpen: false });
  const [publisherProfile, setPublisherProfile] = React.useState(null);
  const [publisherLoading, setPublisherLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [commentCount, setCommentCount] = React.useState(0);
  const [commentsExpanded, setCommentsExpanded] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');
  const [commentLoading, setCommentLoading] = React.useState(false);
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

  // 監聽評論更新
  React.useEffect(() => {
    if (!isOpen || !post?.id || (type !== 'couch' && type !== 'local')) {
      return;
    }

    const unsubscribe = subscribeToComments(post.id, (updatedComments) => {
      setComments(updatedComments);
      setCommentCount(updatedComments.length);
    });

    return () => unsubscribe();
  }, [isOpen, post?.id, type]);

  // 提交新評論
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim() || commentLoading) return;

    setCommentLoading(true);
    setError('');

    try {
      const result = await addComment(post.id, user.uid, newComment);
      if (result.success) {
        setNewComment('');
        setSuccess('評論新增成功');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('提交評論失敗:', error);
      setError('提交評論失敗，請稍後再試');
    } finally {
      setCommentLoading(false);
    }
  };

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

  // 渲染評論區域
  const renderComments = () => {
    if (type !== 'couch' && type !== 'local') {
      return null;
    }

    const latestComment = comments[comments.length - 1];

    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        {/* 評論標題和統計 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <h3 className="text-lg font-semibold">留言</h3>
            {commentCount > 0 && (
              <span className="text-sm text-gray-500">💬 {commentCount} 則留言</span>
            )}
          </div>
          {commentCount > 0 && (
            <button
              onClick={() => setCommentsExpanded(!commentsExpanded)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm self-start sm:self-auto"
            >
              <span>{commentsExpanded ? '收起留言' : '展開留言'}</span>
              {commentsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* 最新評論預覽 */}
        {!commentsExpanded && latestComment && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-3">
              {latestComment.userAvatar ? (
                <img 
                  src={latestComment.userAvatar} 
                  alt="avatar" 
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 truncate">{latestComment.userName}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(latestComment.createdAt.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>{latestComment.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* 展開的評論列表 */}
        {commentsExpanded && (
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">目前還沒有留言，快來發表第一則吧！</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    {comment.userAvatar ? (
                      <img 
                        src={comment.userAvatar} 
                        alt="avatar" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 truncate">{comment.userName}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(comment.createdAt.seconds * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 新增評論表單 */}
        {user && (
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="分享你的想法..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={3}
                maxLength={500}
                disabled={commentLoading}
              />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 space-y-2 sm:space-y-0">
                <span className="text-xs text-gray-500">{newComment.length}/500</span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || commentLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {commentLoading ? '發送中...' : '發送'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 未登入提示 */}
        {!user && (
          <div className="text-center py-4 text-gray-500 text-sm">
            請先登入才能發表留言
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

  const handleShare = async () => {
    if (!post) return;
    
    // 創建一個特殊的分享URL，包含drawer參數
    const url = `${window.location.origin}/?drawer=post&type=${type}&id=${post.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || `${type === 'companion' ? '旅伴' : type === 'couch' ? '沙發' : '地陪'}貼文`,
          text: post.description || '查看這個有趣的貼文',
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('分享失敗:', err);
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
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="分享貼文"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Share2 className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* 內容區域 */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-6 sm:px-6">
                {renderPostContent()}
                {renderUserProfile()}
                {renderComments()}
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
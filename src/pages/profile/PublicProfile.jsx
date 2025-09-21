import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { profilesCollection } from '../../firebase';
import { getDoc, doc } from 'firebase/firestore';
import { User, Mail, Globe, Camera, X, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  addUserReview, 
  subscribeToUserReviews, 
  getUserReviewStats, 
  hasUserReviewed 
} from '../../utils/reviewUtils';

export default function PublicProfile() {
  const { user } = useAuth();
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewState, setPreviewState] = useState({ photos: [], currentIndex: 0, isOpen: false });
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ totalReviews: 0 });
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      const userDoc = await getDoc(doc(profilesCollection, userId));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
      setLoading(false);
    };
    fetchUserData();
  }, [userId]);

  // 監聽評價更新
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserReviews(userId, (updatedReviews) => {
      setReviews(updatedReviews);
    });

    return () => unsubscribe();
  }, [userId]);

  // 獲取評價統計
  useEffect(() => {
    if (!userId) return;

    const fetchReviewStats = async () => {
      const stats = await getUserReviewStats(userId);
      setReviewStats(stats);
    };

    fetchReviewStats();
  }, [userId, reviews]);

  // 檢查當前用戶是否已評價
  useEffect(() => {
    if (!user || !userId || user.uid === userId) return;

    const checkReviewStatus = async () => {
      const reviewed = await hasUserReviewed(userId, user.uid);
      setHasReviewed(reviewed);
    };

    checkReviewStatus();
  }, [user, userId]);

  // 提交新評價
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user || !newReview.trim() || reviewLoading) return;

    setReviewLoading(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      const result = await addUserReview(userId, user.uid, newReview);
      if (result.success) {
        setNewReview('');
        setReviewSuccess('評價新增成功');
        setHasReviewed(true);
        setTimeout(() => setReviewSuccess(''), 3000);
      } else {
        setReviewError(result.message);
      }
    } catch (error) {
      console.error('提交評價失敗:', error);
      setReviewError('提交評價失敗，請稍後再試');
    } finally {
      setReviewLoading(false);
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
  useEffect(() => {
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

  // 渲染評價區塊
  const renderReviews = () => {
    const latestReview = reviews[0]; // 最新的評價

    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        {/* 評價標題和統計 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <h3 className="text-lg font-semibold">此用戶的評價</h3>
            {reviewStats.totalReviews > 0 && (
              <span className="text-sm text-gray-500">💬 {reviewStats.totalReviews} 則評價</span>
            )}
          </div>
          {reviewStats.totalReviews > 0 && (
            <button
              onClick={() => setReviewsExpanded(!reviewsExpanded)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm self-start sm:self-auto"
            >
              <span>{reviewsExpanded ? '收起評價' : '展開評價'}</span>
              {reviewsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* 最新評價預覽 */}
        {!reviewsExpanded && latestReview && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-3">
              {latestReview.reviewerAvatar ? (
                <img 
                  src={latestReview.reviewerAvatar} 
                  alt="avatar" 
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 truncate">{latestReview.reviewerName}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(latestReview.createdAt.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>{latestReview.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* 展開的評價列表 */}
        {reviewsExpanded && (
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">目前還沒有評價，快來發表第一則吧！</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    {review.reviewerAvatar ? (
                      <img 
                        src={review.reviewerAvatar} 
                        alt="avatar" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 truncate">{review.reviewerName}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(review.createdAt.seconds * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{review.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 新增評價表單 */}
        {user && user.uid !== userId && !hasReviewed && (
          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div>
              <textarea
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
                placeholder="分享你對這位用戶的評價..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={3}
                maxLength={500}
                disabled={reviewLoading}
              />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 space-y-2 sm:space-y-0">
                <span className="text-xs text-gray-500">{newReview.length}/500</span>
                <button
                  type="submit"
                  disabled={!newReview.trim() || reviewLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {reviewLoading ? '發送中...' : '發送'}
                </button>
              </div>
            </div>
            {reviewError && (
              <div className="text-red-500 text-sm">{reviewError}</div>
            )}
            {reviewSuccess && (
              <div className="text-green-600 text-sm">{reviewSuccess}</div>
            )}
          </form>
        )}

        {/* 已評價提示 */}
        {user && user.uid !== userId && hasReviewed && (
          <div className="text-center py-4 text-gray-500 text-sm">
            你已經為這位用戶評價過了
          </div>
        )}

        {/* 未登入提示 */}
        {!user && (
          <div className="text-center py-4 text-gray-500 text-sm">
            請先登入才能發表評價
          </div>
        )}

        {/* 自己評價自己提示 */}
        {user && user.uid === userId && (
          <div className="text-center py-4 text-gray-500 text-sm">
            無法評價自己
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96 text-gray-500">載入中...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96 text-gray-500">找不到用戶資料</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8 mt-8">
        <div className="flex items-center space-x-6 mb-6">
          {userData.photos?.[0] ? (
            <img src={userData.photos[0]} alt="avatar" className="w-20 h-20 rounded-full object-cover border" />
          ) : (
            <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-500" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{userData.displayName || '匿名用戶'}</h2>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">FB個人檔案連結</h3>
          {userData.nationality ? (
            <a 
              href={userData.nationality}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors duration-200"
            >
              {userData.nationality}
            </a>
          ) : (
            <p className="text-gray-700">尚無FB個人檔案連結</p>
          )}
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">自我介紹</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{userData.bio || '尚未填寫自我介紹'}</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">生活照片</h3>
          <div className="grid grid-cols-3 gap-4">
            {userData.photos?.length > 0 ? (
              userData.photos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square">
                  <img
                    src={photo}
                    alt={`生活照片${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewState({ photos: userData.photos, currentIndex: idx, isOpen: true })}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-3 text-gray-400 flex flex-col items-center justify-center py-8">
                <Camera className="w-8 h-8 mb-2" />
                <span>尚未上傳生活照片</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 評價區塊 */}
        {renderReviews()}
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
} 
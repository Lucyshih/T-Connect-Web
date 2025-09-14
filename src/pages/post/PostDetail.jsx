import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Copy, Check, User, MapPin, Calendar, Clock, Home, Users, MessageCircle, MessageSquare } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function PostDetail() {
  const { postId, postType } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const postRef = doc(db, `${postType}Posts`, postId);
        const postSnap = await getDoc(postRef);
        
        if (postSnap.exists()) {
          setPost({ id: postSnap.id, ...postSnap.data() });
        } else {
          setError('貼文不存在');
        }
      } catch (err) {
        console.error('獲取貼文失敗:', err);
        setError('獲取貼文失敗');
      } finally {
        setLoading(false);
      }
    };

    if (postId && postType) {
      fetchPost();
    }
  }, [postId, postType]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post?.title || 'T-Connect 貼文',
          text: post?.description || '查看這個有趣的貼文',
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

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('zh-TW');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'couch': return '🏠';
      case 'companion': return '👥';
      case 'local': return '📍';
      default: return '📝';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'couch': return '沙發住宿';
      case 'companion': return '尋找旅伴';
      case 'local': return '地陪服務';
      default: return '貼文';
    }
  };

  const renderPostContent = () => {
    if (!post) return null;

    switch (postType) {
      case 'companion':
        return (
          <>
            <h1 className="text-2xl font-bold mb-6">{post.title}</h1>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">目的地</h3>
                <p className="text-gray-900">{post.destinations?.map(dest => dest.name).join('、')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">日期</h3>
                <p className="text-gray-900">
                  {formatDate(post.startDate)} - {formatDate(post.endDate)}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">需要旅伴人數</h3>
                <p className="text-gray-900">{post.companionCount} 人</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">描述</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{post.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">預算範圍（€）</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{post.budget}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">初步行程規劃</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{post.itinerary}</p>
              </div>
            </div>
          </>
        );
      case 'couch':
        return (
          <>
            <h1 className="text-2xl font-bold mb-6">{post.title}</h1>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">可接待時間</h3>
                <div className="space-y-2">
                  {post.selectedRanges?.map((range, index) => (
                    <p key={index} className="text-gray-900">
                      {formatDate(range.start)} - {formatDate(range.end)}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">可接待人數</h3>
                <p className="text-gray-900">{post.capacity} 人</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">每晚價格 (€)</h3>
                <p className="text-gray-900">{post.pricePerNight} €</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">描述</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{post.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">設施</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{post.facilities?.join('、')}</p>
              </div>
              {post.photos && post.photos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">照片</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {post.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square">
                        <img 
                          src={photo} 
                          alt={`預覽${index + 1}`} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        );
      case 'local':
        return (
          <>
            <h1 className="text-2xl font-bold mb-6">{post.title}</h1>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">服務城市</h3>
                <p className="text-gray-900">{post.city}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">可服務時間</h3>
                <p className="text-gray-900">
                  {formatDate(post.startDate)} - {formatDate(post.endDate)}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">服務項目</h3>
                <p className="text-gray-900">{post.services?.join('、')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">描述</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{post.description}</p>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">貼文不存在</h1>
          <p className="text-gray-600 mb-6">這個貼文可能已被刪除或不存在</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頭部導航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <span className="text-2xl">{getTypeIcon(postType)}</span>
              <span className="text-sm text-gray-500">{getTypeLabel(postType)}</span>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>已複製</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>分享</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderPostContent()}
          
          {/* 貼文資訊 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>
                  {postType === 'couch' ? post.location : 
                   postType === 'companion' ? post.destinations?.map(dest => dest.name).join('、') :
                   postType === 'local' ? post.city : ''}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>發布於 {formatDate(post.createdAt || post.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

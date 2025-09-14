import React, { useState } from 'react';
import { X, User, MapPin, Calendar, Clock, Share2, Copy, Check } from 'lucide-react';
import PostDetailDrawer from './PostDetailDrawer';

const PostsListDrawer = ({ 
  isOpen, 
  onClose, 
  posts, 
  type, 
  location, 
  count,
  onPostClick 
}) => {
  const [copiedPostId, setCopiedPostId] = useState(null);

  if (!isOpen) return null;

  const getTypeLabel = (type) => {
    switch (type) {
      case 'couch':
        return '沙發貼文';
      case 'companion':
        return '旅伴貼文';
      case 'local':
        return '地陪貼文';
      default:
        return '貼文';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'couch':
        return '🏠';
      case 'companion':
        return '👥';
      case 'local':
        return '🎯';
      default:
        return '📝';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('zh-TW');
  };

  const handlePostClick = (post) => {
    console.log('點擊貼文:', post);
    console.log('貼文類型:', type);
    
    // 使用回調函數通知父組件
    if (onPostClick) {
      onPostClick({ ...post, type });
    }
  };

  const handleShare = async (post, event) => {
    event.stopPropagation(); // 防止觸發貼文點擊
    
    // 創建一個特殊的分享URL，包含drawer參數
    const url = `${window.location.origin}/?drawer=post&type=${type}&id=${post.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || `${location} ${getTypeLabel(type)}`,
          text: post.description || '查看這個有趣的貼文',
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2000);
      }
    } catch (err) {
      console.error('分享失敗:', err);
    }
  };

  const renderPostCard = (post) => {
    const getPostTitle = () => {
      if (post.title) return post.title;
      
      switch (type) {
        case 'couch':
          return `${post.location} 沙發住宿`;
        case 'companion':
          return `尋找旅伴 - ${post.destinations?.map(dest => dest.name).join('、')}`;
        case 'local':
          return `${post.city} 地陪服務`;
        default:
          return '貼文';
      }
    };

    const getPostDescription = () => {
      if (post.description) {
        return post.description.length > 100 
          ? post.description.substring(0, 100) + '...' 
          : post.description;
      }
      return '';
    };

    const getPostLocation = () => {
      switch (type) {
        case 'couch':
          return post.location;
        case 'companion':
          return post.destinations?.map(dest => dest.name).join('、');
        case 'local':
          return post.city;
        default:
          return '';
      }
    };

    const getPostDate = () => {
      switch (type) {
        case 'couch':
          return post.selectedRanges?.[0] 
            ? `${formatDate(post.selectedRanges[0].start)} - ${formatDate(post.selectedRanges[0].end)}`
            : '';
        case 'companion':
          return post.startDate && post.endDate
            ? `${formatDate(post.startDate)} - ${formatDate(post.endDate)}`
            : '';
        case 'local':
          return post.startDate && post.endDate
            ? `${formatDate(post.startDate)} - ${formatDate(post.endDate)}`
            : '';
        default:
          return '';
      }
    };

    return (
      <div 
        key={post.id}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
        onClick={() => handlePostClick(post)}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
              {getTypeIcon(type)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
              {getPostTitle()}
            </h3>
            
            {getPostDescription() && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {getPostDescription()}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {getPostLocation() && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{getPostLocation()}</span>
                </div>
              )}
              
              {getPostDate() && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{getPostDate()}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDate(post.createdAt || post.timestamp)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 flex items-center space-x-2">
            <button
              onClick={(e) => handleShare(post, e)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="分享貼文"
            >
              {copiedPostId === post.id ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]" onClick={onClose}></div>
      
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-[10000] transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getTypeIcon(type)}</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {location} 的 {count} 則{getTypeLabel(type)}
                </h2>
                <p className="text-sm text-gray-500">
                  共 {posts.length} 則貼文
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {posts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <p className="text-gray-500">目前沒有{getTypeLabel(type)}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(renderPostCard)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PostsListDrawer; 
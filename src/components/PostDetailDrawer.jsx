import React from 'react';
import { X } from 'lucide-react';

const PostDetailDrawer = ({ isOpen, onClose, post, type }) => {
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
              </div>
            </div>

            {/* 底部 */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
              <button
                type="button"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={onClose}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailDrawer; 
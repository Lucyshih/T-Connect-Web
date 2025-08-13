import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { profilesCollection } from '../../firebase';
import { getDoc, doc } from 'firebase/firestore';
import { User, Mail, Globe, Camera, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function PublicProfile() {
  const { user } = useAuth();
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewState, setPreviewState] = useState({ photos: [], currentIndex: 0, isOpen: false });
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
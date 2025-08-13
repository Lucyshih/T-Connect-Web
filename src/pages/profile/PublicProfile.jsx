import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { profilesCollection } from '../../firebase';
import { getDoc, doc } from 'firebase/firestore';
import { User, Mail, Globe, Camera, X } from 'lucide-react';

export default function PublicProfile() {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);

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

  // 鍵盤 ESC 鍵關閉照片預覽
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImg) {
        setPreviewImg(null);
      }
    };

    if (previewImg) {
      document.addEventListener('keydown', handleKeyDown);
      // 禁止背景滾動
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 恢復背景滾動
      document.body.style.overflow = 'unset';
    };
  }, [previewImg]);

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
                    onClick={() => setPreviewImg(photo)}
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
      {previewImg && (
        <div className="fixed inset-0 z-[21000] bg-black bg-opacity-80 flex items-center justify-center" onClick={() => setPreviewImg(null)}>
          <img
            src={previewImg}
            alt="放大預覽"
            className="max-w-full max-h-[80vh] rounded-lg shadow-lg border-4 border-white object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-8 right-8 text-white bg-black bg-opacity-40 rounded-full p-2 hover:bg-opacity-70 transition-all duration-200"
            onClick={() => setPreviewImg(null)}
            title="關閉預覽 (ESC)"
          >
            <X className="w-8 h-8" />
          </button>
          {/* 點擊提示 */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-40 px-3 py-1 rounded-full">
            點擊任意位置或按 ESC 鍵關閉
          </div>
        </div>
      )}
    </div>
  );
} 
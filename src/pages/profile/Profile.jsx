import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { couchesCollection, companionsCollection, localsCollection, profilesCollection, storage, db } from '../../firebase';
import { query, where, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Mail, Phone, Globe, Edit2, Trash2, LogOut, Camera, Compass } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [userPosts, setUserPosts] = useState({
    couches: [],
    companions: [],
    locals: []
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // 獲取用戶資料
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(profilesCollection, user.uid));
        if (userDoc.exists()) {
          const existingData = userDoc.data();
          // 優先使用 Firebase Auth 中的 displayName，如果 profilesCollection 中沒有或為空
          const displayName = user.displayName || existingData.displayName || '';
          const updatedData = {
            ...existingData,
            displayName: displayName
          };
          
          // 如果 displayName 有更新，同步到 profilesCollection
          if (displayName !== existingData.displayName) {
            await updateDoc(doc(profilesCollection, user.uid), {
              displayName: displayName
            });
          }
          
          setUserData(updatedData);
        } else {
          // 如果用戶資料不存在，創建一個新的
          const newUserData = {
            displayName: user.displayName || '',
            email: user.email,
            nationality: '',
            bio: '',
            photos: [],
            createdAt: serverTimestamp()
          };
          await setDoc(doc(profilesCollection, user.uid), newUserData);
          setUserData(newUserData);
        }
      } catch (error) {
        console.error('獲取用戶資料失敗:', error);
      }
    };

    // 獲取用戶發布的內容
    const fetchUserPosts = async () => {
      try {
        // 獲取沙發貼文
        const couchQuery = query(couchesCollection, where('userId', '==', user.uid));
        const couchSnapshot = await getDocs(couchQuery);
        const couchPosts = couchSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 獲取旅伴貼文
        const companionQuery = query(companionsCollection, where('userId', '==', user.uid));
        const companionSnapshot = await getDocs(companionQuery);
        const companionPosts = companionSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 獲取地陪貼文
        const localQuery = query(localsCollection, where('userId', '==', user.uid));
        const localSnapshot = await getDocs(localQuery);
        const localPosts = localSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setUserPosts({
          couches: couchPosts,
          companions: companionPosts,
          locals: localPosts
        });
      } catch (error) {
        console.error('獲取用戶貼文失敗:', error);
      }
    };

    fetchUserData();
    fetchUserPosts();
  }, [user, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(profilesCollection, user.uid), {
        ...userData,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      console.error('更新用戶資料失敗:', error);
    }
  };

  const handleDeletePost = async (collection, postId) => {
    try {
      await deleteDoc(doc(db, collection, postId));
      // 更新狀態
      setUserPosts(prev => ({
        ...prev,
        [collection]: prev[collection].filter(post => post.id !== postId)
      }));
    } catch (error) {
      console.error('刪除貼文失敗:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      // 創建存儲引用
      const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      
      // 上傳文件
      await uploadBytes(storageRef, file);
      
      // 獲取下載 URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // 更新用戶資料
      const newPhotos = [...(userData?.photos || []), downloadURL];
      await updateDoc(doc(profilesCollection, user.uid), {
        photos: newPhotos,
        updatedAt: serverTimestamp()
      });
      
      setUserData(prev => ({
        ...prev,
        photos: newPhotos
      }));
    } catch (error) {
      console.error('上傳照片失敗:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (index) => {
    try {
      const newPhotos = [...userData.photos];
      newPhotos.splice(index, 1);
      
      await updateDoc(doc(profilesCollection, user.uid), {
        photos: newPhotos,
        updatedAt: serverTimestamp()
      });
      
      setUserData(prev => ({
        ...prev,
        photos: newPhotos
      }));
    } catch (error) {
      console.error('刪除照片失敗:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4">
        {/* 公開資料區域 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">個人資料</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Edit2 className="w-5 h-5" />
                <span>編輯資料</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdateProfile}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  儲存
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <User className="w-5 h-5 text-gray-500" />
              {isEditing ? (
                <input
                  type="text"
                  value={userData?.displayName || ''}
                  onChange={(e) => setUserData({ ...userData, displayName: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                  placeholder="姓名"
                />
              ) : (
                <span className="text-gray-700">{userData?.displayName || '未設定'}</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Mail className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">{user.email}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Globe className="w-5 h-5 text-gray-500" />
              {isEditing ? (
                <input
                  type="text"
                  value={userData?.nationality || ''}
                  onChange={(e) => setUserData({ ...userData, nationality: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                  placeholder="FB個人檔案連結"
                />
              ) : (
                <span className="text-gray-700">{userData?.nationality || '未設定'}</span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">自我介紹</h3>
            {isEditing ? (
              <textarea
                value={userData?.bio || ''}
                onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows="4"
                placeholder="請輸入自我介紹"
              />
            ) : (
              <p className="text-gray-700">{userData?.bio || '尚未填寫自我介紹'}</p>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">生活照片</h3>
            <div className="grid grid-cols-3 gap-4">
              {userData?.photos?.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`生活照片 ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {isEditing && (
                    <button
                      onClick={() => handleDeletePhoto(index)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center h-32">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex flex-col items-center space-y-2"
                  >
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {uploading ? '上傳中...' : '上傳照片'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 私人管理區域 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-4">我的貼文</h2>

          {/* 沙發貼文 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">我的沙發貼文</h3>
              {userPosts.locals.length === 0 ? (
                <p className="text-gray-500">尚未發布任何貼文</p>
              ) : (
                <div className="space-y-4">
                  {userPosts.couches.map(couch => (
                    <div key={couch.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{couch.title}</h4>
                          <p className="text-gray-600">{couch.location}</p>
                          <p className="text-sm font-medium text-blue-600">
                            €{couch.pricePerNight}/晚
                          </p>
                          <div className="mt-2">
                            <h4 className="text-sm font-medium">可提供住宿的日期：</h4>
                            {couch.selectedRanges && couch.selectedRanges.length > 0 ? (
                              couch.selectedRanges.map((range, index) => (
                                <div key={index} className="text-sm text-gray-600">
                                  {new Date(range.start.seconds * 1000).toLocaleDateString()} - {new Date(range.end.seconds * 1000).toLocaleDateString()}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">尚未設定日期</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                              <button
                                onClick={() => navigate(`/couch/${couch.id}/edit`)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeletePost('couchs', couch.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>

          {/* 旅伴貼文 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">我的旅伴貼文</h3>
            {userPosts.companions.length === 0 ? (
              <p className="text-gray-500">尚未發布任何貼文</p>
            ) : (
              <div className="space-y-4">
                {userPosts.companions.map(companion => (
                  <div key={companion.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{companion.title}</h4>
                        <p className="text-gray-600">
                          目的地：{companion.destinations?.map(dest => dest.name).join('、')}
                        </p>
                        {companion.startDate && companion.endDate ? (
                          <p className="text-sm text-gray-600">
                            {new Date(companion.startDate.seconds * 1000).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })} - 
                            {new Date(companion.endDate.seconds * 1000).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">未設定日期</p>
                        )}
                        <p className="text-sm">需要 {companion.companionCount} 位旅伴</p>
                      </div>
                      <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/companion/${companion.id}/edit`)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeletePost('companions', companion.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 地陪貼文 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">我的地陪貼文</h3>
            {userPosts.locals.length === 0 ? (
              <p className="text-gray-500">尚未發布任何貼文</p>
            ) : (
              <div className="space-y-4">
                {userPosts.locals.map(local => (
                  <div key={local.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{local.title}</h4>
                        <p className="text-gray-600">{local.city}</p>
                        {local.startDate && local.endDate ? (
                          <p className="text-sm text-gray-600">
                            {new Date(local.startDate.seconds * 1000).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })} - 
                            {new Date(local.endDate.seconds * 1000).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">未設定日期</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/local/${local.id}/edit`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost('locals', local.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 登出按鈕 */}
          <button
            onClick={handleLogout}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <LogOut className="w-5 h-5" />
            <span>登出</span>
          </button>
        </div>
      </div>
    </div>
  );
} 
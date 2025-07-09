import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Navbar from '../../components/Navbar';
import { localsCollection } from '../../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { MapPin, Calendar, Users, Compass, Star, Globe, Plus, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

const LocalRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(!!id);
  const [formData, setFormData] = useState({
    title: '',
    city: '',
    services: [],
    description: '',
    startDate: '',
    endDate: '',
    coordinates: { lat: 0, lng: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && id) {
      const fetchLocalData = async () => {
        try {
          const localDoc = await getDoc(doc(localsCollection, id));
          if (localDoc.exists()) {
            const data= localDoc.data();
            let startDate = '';
            let endDate = '';
            if (data.startDate) {
              if (typeof data.startDate === 'string') {
                startDate = data.startDate;
              } else if (data.startDate.toDate) {
                const d = data.startDate.toDate();
                startDate = d.toISOString().slice(0, 10);
              } else if (data.startDate instanceof Date) {
                startDate = data.startDate.toISOString().slice(0, 10);
              }
            }
            if (data.endDate) {
              if (typeof data.endDate === 'string') {
                endDate = data.endDate;
              } else if (data.endDate.toDate) {
                const d = data.endDate.toDate();
                endDate = d.toISOString().slice(0, 10);
              } else if (data.endDate instanceof Date) {
                endDate = data.endDate.toISOString().slice(0, 10);
              }
            }
            setFormData({
              ...data,
              startDate,
              endDate
            });
          }
        } catch (error) {
          console.error('獲取地陪資料失敗:', error);
        }
      };
      fetchLocalData();
    }
  }, [id, isEditing]);

  // 添加服務項目
  const addService = () => {
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, '']
    }));
  };

  // 更新服務
  const updateService = (index, value) => {
    const newServices = [...formData.services];
    newServices[index] = value;
    setFormData(prev => ({
      ...prev,
      services: newServices
    }));
  };

  // 刪除服務
  const removeService = (index) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  // 地理編碼函數
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('地理編碼錯誤:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('請先登入');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 獲取地理編碼
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.city)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const coordinates = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };

        // 將日期轉換為 Firestore Timestamp
        const startDate = Timestamp.fromDate(new Date(formData.startDate));
        const endDate = Timestamp.fromDate(new Date(formData.endDate));

        const localData = {
          ...formData,
          coordinates,
          userId: user.uid,
          userName: user.displayName || '匿名用戶',
          startDate,
          endDate,
          updatedAt: serverTimestamp()
        };

        if (isEditing && id) {
          // 如果是編輯模式，更新現有貼文
          await updateDoc(doc(localsCollection, id), localData);
          alert('地陪貼文更新成功！');
        } else {
          // 如果是新增模式，創建新貼文
          localData.createdAt = serverTimestamp();
          await addDoc(localsCollection, localData);
          alert('地陪貼文發布成功！');
        }
        
        navigate('/profile');
      } else {
        setError('無法獲取城市座標，請檢查城市名稱是否正確');
      }
    } catch (error) {
      console.error('Error saving local post:', error);
      setError('發布失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto mt-8 p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-2xl font-bold mb-6">成為地陪</h1>

            {/* 城市 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                服務城市
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  placeholder="例如：巴黎"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({...prev, city: e.target.value}))}
                  required
                />
              </div>
            </div>

            {/* 服務項目 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                提供的服務項目
              </label>
              <div className="space-y-3">
                {formData.services.map((service, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Star className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        placeholder={`服務項目 ${index + 1}`}
                        value={service}
                        onChange={(e) => updateService(index, e.target.value)}
                        required
                      />
                    </div>
                    {formData.services.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeService(index);
                        }}
                        className="p-2 text-gray-500 hover:text-red-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    addService();
                  }}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加服務項目</span>
                </button>
              </div>
            </div>

            {/* 可服務時間 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日期
                </label>
                <div className="relative">
                  <Calendar className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, startDate: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  結束日期
                </label>
                <div className="relative">
                  <Calendar className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                        endDate: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自我介紹
              </label>
              <textarea
                className="w-full px-4 py-2 border rounded-lg h-32"
                placeholder="請描述您的背景..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            {/* 按鈕 */}
            <div className="flex justify-end space-x-4">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/');
                }}
                className="px-6 py-2 border rounded-lg"
              >
                取消
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                disabled={loading}
              >
                {loading ? '提交中...' : '提交'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LocalRegistration; 
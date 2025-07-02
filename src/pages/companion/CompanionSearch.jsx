import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { MapPin, Calendar, Users, Compass, Home, Route, Plus, X } from 'lucide-react';
import { companionsCollection } from '../../firebase.js';
import { addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import L from 'leaflet';

const CompanionSearch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(!!id);
  const [formData, setFormData] = useState({
    destinations: [''], // 可以添加多個目的地
    startDate: '',
    endDate: '',
    companionCount: 1,
    description: '',
    budget: '', // 預算範圍
    itinerary: [''] // 行程規劃，可以添加多天
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    if (isEditing && id) {
      const fetchCompanionData = async () => {
        try {
          const companionDoc = await getDoc(doc(companionsCollection, id));
          if (companionDoc.exists()) {
            const data = companionDoc.data();
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
            if (data.destinations) {
              setDestinations(data.destinations);
            }
          }
        } catch (error) {
          console.error('獲取旅伴資料失敗:', error);
        }
      };
      fetchCompanionData();
    }
  }, [id, isEditing]);

  // 更新目的地
  const updateDestination = (index, value) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.map((dest, i) => 
        i === index ? { name: value, coordinates: dest.coordinates || null } : dest
      )
    }));
  };

  // 添加目的地輸入框
  const addDestination = () => {
    setFormData(prev => ({
      ...prev,
      destinations: [...prev.destinations, { name: '', coordinates: null }]
    }));
  };

  // 刪除目的地
  const removeDestination = (index) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.filter((_, i) => i !== index)
    }));
  };

  // 添加行程日程
  const addItineraryDay = () => {
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, '']
    }));
  };

  // 更新行程
  const updateItinerary = (index, value) => {
    const newItinerary = [...formData.itinerary];
    newItinerary[index] = value;
    setFormData(prev => ({
      ...prev,
      itinerary: newItinerary
    }));
  };

  // 刪除行程
  const removeItineraryDay = (index) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== index)
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
    console.log('開始提交表單');
    
    try {
      setLoading(true);
      setError('');

      // 檢查用戶是否已登錄
      if (!user) {
        console.log('用戶未登錄');
        setError('請先登錄後再發布貼文');
        setLoading(false);
        return;
      }
      console.log('用戶已登錄:', user.uid);

      // 檢查是否至少選擇一個目的地
      if (formData.destinations.length === 0 || !formData.destinations[0].name) {
        console.log('未選擇目的地');
        setError('請至少選擇一個目的地');
        setLoading(false);
        return;
      }
      console.log('已選擇目的地:', formData.destinations);

      // 檢查日期是否有效
      if (!formData.startDate || !formData.endDate) {
        console.log('未選擇日期');
        setError('請選擇旅行日期');
        setLoading(false);
        return;
      }

      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate >= endDate) {
        console.log('日期無效');
        setError('結束日期必須晚於開始日期');
        setLoading(false);
        return;
      }
      console.log('日期有效:', formData.startDate, '至', formData.endDate);

      // 獲取每個目的地的地理座標
      console.log('開始獲取目的地座標');
      const destinationsWithCoordinates = await Promise.all(
        formData.destinations.map(async (destination) => {
          const coordinates = await geocodeAddress(destination.name);
          console.log('目的地座標:', destination.name, coordinates);
          return {
            name: destination.name,
            coordinates: coordinates || { lat: 0, lng: 0 }
          };
        })
      );
      console.log('所有目的地座標獲取完成');

      const companionData = {
        ...formData,
        destinations: destinationsWithCoordinates,
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        status: 'active',
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate)
      };

      console.log('準備保存的數據:', companionData);

      if (isEditing) {
        console.log('正在更新現有貼文:', id);
        try {
          await updateDoc(doc(companionsCollection, id), {
            ...companionData,
            updatedAt: serverTimestamp()
          });
          console.log('更新成功');
        } catch (updateError) {
          console.error('更新失敗:', updateError);
          throw updateError;
        }
      } else {
        console.log('正在創建新貼文');
        try {
          const docRef = doc(companionsCollection);
          await setDoc(docRef, companionData);
          console.log('創建成功');
        } catch (createError) {
          console.error('創建失敗:', createError);
          throw createError;
        }
      }

      console.log('導航到個人檔案頁面');
      navigate('/profile');
    } catch (error) {
      console.error('保存旅伴資料失敗:', error);
      setError(`保存失敗: ${error.message}`);
    } finally {
      console.log('設置 loading 狀態為 false');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <Compass className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold">TravelConnect</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto mt-8 p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-2xl font-bold mb-6">尋找旅伴</h1>

            {/* 目的地 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目的地
              </label>
              <div className="flex flex-col space-y-2">
                {formData.destinations.map((destination, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={destination.name || ''}
                      onChange={(e) => updateDestination(index, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder={`目的地 ${index + 1}`}
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeDestination(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDestination}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  添加目的地
                </button>
              </div>
            </div>

            {/* 日期選擇 */}
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
                    onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
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
                    onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 旅伴人數 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                尋找旅伴人數
              </label>
              <div className="relative">
                <Users className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  value={formData.companionCount}
                  onChange={(e) => setFormData(prev => ({...prev, companionCount: parseInt(e.target.value)}))}
                  required
                />
              </div>
            </div>

            {/* 預算範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                預算範圍（€）
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="例如：1000-2000"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({...prev, budget: e.target.value}))}
              />
            </div>

            {/* 行程規劃 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                初步行程規劃
              </label>
              <div className="space-y-3">
                {formData.itinerary.map((day, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Route className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">第 {index + 1} 天</span>
                      </div>
                      <textarea
                        className="w-full px-4 py-2 border rounded-lg"
                        rows="2"
                        placeholder={`第 ${index + 1} 天的行程安排...`}
                        value={day}
                        onChange={(e) => updateItinerary(index, e.target.value)}
                      />
                    </div>
                    {formData.itinerary.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeItineraryDay(index);
                        }}
                        className="p-2 text-gray-500 hover:text-red-500 mt-8"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    addItineraryDay();
                  }}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加行程</span>
                </button>
              </div>
            </div>

            {/* 補充說明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                補充說明
              </label>
              <textarea
                className="w-full px-4 py-2 border rounded-lg h-32"
                placeholder="補充說明你的旅遊偏好、期待的旅伴特質等..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                required
              />
            </div>

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
              >
                發布
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanionSearch; 

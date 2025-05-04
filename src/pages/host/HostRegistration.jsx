import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Upload, Plus, X, Home, Compass } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { couchesCollection } from '../../firebase';
import { addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const Calendar = () => {
    const [selectedRanges, setSelectedRanges] = useState([]);
    const [currentSelection, setCurrentSelection] = useState({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);
  
    // 生成日曆數據
    const generateCalendarDays = (year, month) => {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const days = [];
      
      // 填充月初空白天數
      for (let i = 0; i < firstDay.getDay(); i++) {
        days.push(null);
      }
      
      // 填充實際天數
      for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
      }
      
      return days;
    };
  
    const isDateInRange = (date) => {
      if (!date) return false;
      
      // 檢查是否在已選擇的區間內
      const isInSelectedRanges = selectedRanges.some(range => {
        return date >= range.start && date <= range.end;
      });
  
      // 檢查是否在當前選擇的區間內
      const isInCurrentSelection = currentSelection.start && currentSelection.end &&
        date >= currentSelection.start && date <= currentSelection.end;
  
      return isInSelectedRanges || isInCurrentSelection;
    };
  
    const handleDateClick = (date, e) => {
      e.preventDefault(); // 阻止事件冒泡
      if (!date) return;
  
      if (!isSelecting) {
        // 開始新的選擇
        setCurrentSelection({ start: date, end: date });
        setIsSelecting(true);
      } else {
        // 完成選擇
        if (date >= currentSelection.start) {
          setSelectedRanges(prev => [...prev, { start: currentSelection.start, end: date }]);
        } else {
          setSelectedRanges(prev => [...prev, { start: date, end: currentSelection.start }]);
        }
        setCurrentSelection({ start: null, end: null });
        setIsSelecting(false);
      }
    };
  
    const removeRange = (index) => {
      setSelectedRanges(prev => prev.filter((_, i) => i !== index));
    };
  
    // 獲取當前月份數據
    const now = new Date();
    const currentMonth = generateCalendarDays(now.getFullYear(), now.getMonth());
    const nextMonth = generateCalendarDays(now.getFullYear(), now.getMonth() + 1);
  
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 當前月份 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">
              {now.getFullYear()}年{now.getMonth() + 1}月
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              {currentMonth.map((date, index) => (
                <button
                  key={index}
                  onClick={(e) => handleDateClick(date, e)}
                  className={`
                    aspect-square p-2 rounded-lg text-sm
                    ${!date ? 'invisible' : ''}
                    ${isDateInRange(date) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}
                  `}
                  disabled={!date || date < now}
                >
                  {date?.getDate()}
                </button>
              ))}
            </div>
          </div>
  
          {/* 下個月 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">
              {now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()}年
              {now.getMonth() === 11 ? 1 : now.getMonth() + 2}月
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              {nextMonth.map((date, index) => (
                <button
                  key={index}
                  onClick={(e) => handleDateClick(date, e)}
                  className={`
                    aspect-square p-2 rounded-lg text-sm
                    ${!date ? 'invisible' : ''}
                    ${isDateInRange(date) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}
                  `}
                  disabled={!date}
                >
                  {date?.getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>
  
        {/* 已選擇的時間區間 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">已選擇的時間區間：</h4>
          {selectedRanges.map((range, index) => (
            <div 
              key={index}
              className="flex items-center justify-between bg-blue-50 px-4 py-2 rounded-lg"
            >
              <span>
                {range.start.toLocaleDateString()} - {range.end.toLocaleDateString()}
              </span>
              <button
                onClick={() => removeRange(index)}
                className="text-gray-500 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  

const HostRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(!!id);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
    capacity: 1,
    pricePerNight: 0,
    startDate: '',
    endDate: '',
    facilities: [],
    coordinates: { lat: 0, lng: 0 }
  });
  const [selectedRanges, setSelectedRanges] = useState([]);
  const facilities = [
    "WiFi", "廚房", "洗衣機", "陽台", "獨立衛浴", "冷氣"
  ];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && id) {
      const fetchCouchData = async () => {
        try {
          const couchDoc = await getDoc(doc(couchesCollection, id));
          if (couchDoc.exists()) {
            setFormData(couchDoc.data());
          }
        } catch (error) {
          console.error('獲取沙發資料失敗:', error);
        }
      };
      fetchCouchData();
    }
  }, [id, isEditing]);

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
    try {
      setLoading(true);
      setError('');

      // 獲取城市的地理座標
      const coordinates = await geocodeAddress(formData.location);
      if (!coordinates) {
        setError('無法找到該城市的座標，請確認城市名稱是否正確');
        return;
      }

      const couchData = {
        ...formData,
        coordinates,
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        status: 'active'
      };

      if (isEditing) {
        await updateDoc(doc(couchesCollection, id), {
          ...couchData,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(doc(couchesCollection), couchData);
      }
      navigate('/profile');
    } catch (error) {
      console.error('保存沙發資料失敗:', error);
      setError('保存失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Math.random().toString(36),
      url: URL.createObjectURL(file),
      file
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const toggleFacility = (facility) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
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
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">註冊沙發資訊</h1>

          {/* 基本資訊 */}
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                標題
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                地點
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                rows="4"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  可容納人數
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  每晚價格 (€)
                </label>
                <input
                  type="number"
                  value={formData.pricePerNight}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricePerNight: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>

          {/* 設施選擇 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              設施
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {facilities.map(facility => (
                <label key={facility} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.facilities.includes(facility)}
                    onChange={() => toggleFacility(facility)}
                    className="rounded text-blue-600"
                  />
                  <span>{facility}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 照片上傳區域 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上傳住宿照片
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map(img => (
                <div key={img.id} className="relative aspect-square">
                  <img 
                    src={img.url} 
                    alt="預覽" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500 mt-2">上傳照片</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* 日期選擇 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              可提供住宿的日期
            </label>
            <Calendar selectedRanges={selectedRanges} setSelectedRanges={setSelectedRanges} />
          </div>

          {/* 提交按鈕 */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            提交
          </button>
        </form>
      </div>
    </div>
  );
};

export default HostRegistration;



      
      
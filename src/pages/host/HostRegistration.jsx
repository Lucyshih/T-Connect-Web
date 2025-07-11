import React, { useState, useEffect, useRef} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Upload, Plus, X, Home, Compass,Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Navbar from '../../components/Navbar';
import { couchesCollection } from '../../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

const Calendar = ({ selectedRanges, setSelectedRanges }) => {
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
    capacity: 1,
    pricePerNight: 0,
    startDate: '',
    endDate: '',
    facilities: [],
    photos: [],
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
            const data = couchDoc.data();
            setFormData(data);
            if (data.selectedRanges) {
              // 將 Firestore 的時間戳轉換為 Date 對象
              const convertedRanges = data.selectedRanges.map(range => ({
                start: new Date(range.start.seconds * 1000),
                end: new Date(range.end.seconds * 1000)
              }));
              setSelectedRanges(convertedRanges);
            }
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
  // 上傳沙發照片
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      // 創建存儲引用
      const storage = getStorage();
      const storageRef = ref(storage, `HostRegistration/${user.uid}/${Date.now()}_${file.name}`);
      
      // 上傳文件
      await uploadBytes(storageRef, file);
      
      // 獲取下載 URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // 只更新本地狀態，不更新 Firestore
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), downloadURL]
      }));

    } catch (error) {
      console.error('上傳照片失敗:', error);
      setError('上傳照片失敗，請稍後再試');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (index) => {
    try {
      const newPhotos = [...formData.photos];
      newPhotos.splice(index, 1);
      
      // 只更新本地狀態，不更新 Firestore
      setFormData(prev => ({
        ...prev,
        photos: newPhotos
      }));
    } catch (error) {
      console.error('刪除照片失敗:', error);
      setError('刪除照片失敗，請稍後再試');
    }
  };

  const toggleFacility = (facility) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('開始提交表單');
    
    try {
      setLoading(true);
      setError('');
      console.log('表單數據:', formData);
      console.log('選擇的日期區間:', selectedRanges);

      // 檢查用戶是否已登錄
      if (!user) {
        console.log('用戶未登錄');
        setError('請先登錄後再發布貼文');
        setLoading(false);
        return;
      }
      console.log('用戶已登錄:', user.uid);

      // 獲取城市的地理座標
      console.log('開始獲取城市座標:', formData.location);
      const coordinates = await geocodeAddress(formData.location);
      if (!coordinates) {
        console.log('無法獲取城市座標');
        setError('無法找到該城市的座標，請確認城市名稱是否正確');
        setLoading(false);
        return;
      }
      console.log('獲取到城市座標:', coordinates);

      // 檢查是否有選擇日期區間
      if (selectedRanges.length === 0) {
        console.log('未選擇日期區間');
        setError('請至少選擇一個日期區間');
        setLoading(false);
        return;
      }
      console.log('已選擇日期區間數量:', selectedRanges.length);

      // 將 Date 對象轉換為 Firestore 時間戳
      const couchData = {
        ...formData,
        coordinates,
        selectedRanges: selectedRanges.map(range => ({
          start: Timestamp.fromDate(range.start),
          end: Timestamp.fromDate(range.end)
        })),
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        status: 'active'
      };

      console.log('準備保存的數據:', couchData);

      if (isEditing) {
        console.log('正在更新現有貼文:', id);
        try {
          await updateDoc(doc(couchesCollection, id), {
            ...couchData,
            updatedAt: serverTimestamp()
          });
          console.log('更新成功');
          alert('沙發貼文更新成功！');
        } catch (updateError) {
          console.error('更新失敗:', updateError);
          throw updateError;
        }
      } else {
        console.log('正在創建新貼文');
        try {
          const docRef = doc(couchesCollection);
          await setDoc(docRef, couchData);
          console.log('創建成功');
          alert('沙發貼文發布成功！');
        } catch (createError) {
          console.error('創建失敗:', createError);
          throw createError;
        }
      }

      console.log('導航到個人檔案頁面');
      navigate('/profile');
    } catch (error) {
      console.error('保存沙發資料失敗:', error);
      console.error('錯誤詳情:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // 根據錯誤類型顯示不同的錯誤信息
      if (error.code === 'permission-denied') {
        setError('權限不足，請確認您是否已登錄');
      } else if (error.code === 'unauthenticated') {
        setError('請先登錄後再發布貼文');
      } else {
        setError(`保存失敗: ${error.message}`);
      }
    } finally {
      console.log('設置 loading 狀態為 false');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
       <Navbar />

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
                placeholder="請輸入英文地址，例如：Paris, France"
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
              上傳住宿照片 (最多 5 張 | 僅接受jpg/png/jpeg格式)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.photos?.map((photoUrl, index) => (
                <div key={index} className="relative aspect-square">
                  <img 
                    src={photoUrl} 
                    alt="預覽" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(index)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
              {(!formData.photos || formData.photos.length < 5) && (
                <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500">
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">
                      {uploading ? '上傳中...' : '上傳照片'}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 日期選擇 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              可提供住宿的日期
            </label>
            <Calendar 
              selectedRanges={selectedRanges} 
              setSelectedRanges={setSelectedRanges} 
            />
          </div>

          {/* 提交按鈕 */}
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
  );
};

export default HostRegistration;



      
      
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import { couchesCollection } from '../../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Calendar, Users, Compass, Star, Globe, Plus, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { geocodeAddress } from '../../utils/geocoding';
import AddressInputGuide from '../../components/AddressInputGuide';

const DateRangeSelector = ({ selectedRanges, setSelectedRanges }) => {
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

  // 月份狀態管理
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // 切換到上一個月
  const goToPreviousMonth = () => {
    setStartMonth(prev => {
      let newYear = prev.year;
      let newMonth = prev.month - 1;
      
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }
      
      return { year: newYear, month: newMonth };
    });
  };

  // 切換到下一個月
  const goToNextMonth = () => {
    setStartMonth(prev => {
      let newYear = prev.year;
      let newMonth = prev.month + 1;
      
      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      
      return { year: newYear, month: newMonth };
    });
  };

  // 切換到當前月份
  const goToCurrentMonth = () => {
    const now = new Date();
    setStartMonth({ year: now.getFullYear(), month: now.getMonth() });
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

  // 獲取當前顯示的月份數據
  const leftMonth = generateCalendarDays(startMonth.year, startMonth.month);
  const rightMonth = generateCalendarDays(startMonth.year, startMonth.month + 1);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 月份名稱映射
  const getMonthName = (month) => {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return monthNames[month];
  };

  return (
    <div className="space-y-4">
      {/* 月份導航控制 */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>上一月</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={goToCurrentMonth}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            回到本月
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <span>下一月</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左邊月份 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4 text-center">
            {startMonth.year}年{getMonthName(startMonth.month)}
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            {leftMonth.map((date, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => handleDateClick(date, e)}
                className={`
                  aspect-square p-2 rounded-lg text-sm
                  ${!date ? 'invisible' : ''}
                  ${isDateInRange(date) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}
                `}
                disabled={!date || date < new Date()}
              >
                {date?.getDate()}
              </button>
            ))}
          </div>
        </div>

        {/* 右邊月份 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4 text-center">
            {startMonth.month === 11 ? startMonth.year + 1 : startMonth.year}年{getMonthName((startMonth.month + 1) % 12)}
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            {rightMonth.map((date, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => handleDateClick(date, e)}
                className={`
                  aspect-square p-2 rounded-lg text-sm
                  ${!date ? 'invisible' : ''}
                  ${isDateInRange(date) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}
                `}
                disabled={!date || date < new Date()}
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
              type="button"
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
  const [deletedPhotos, setDeletedPhotos] = useState([]); // 追蹤已刪除的照片
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

  // 組件卸載時清理未保存的已刪除照片
  useEffect(() => {
    return () => {
      // 如果組件卸載時還有未保存的已刪除照片，嘗試清理
      if (deletedPhotos.length > 0 && !loading) {
        console.log('組件卸載，清理未保存的已刪除照片:', deletedPhotos.length, '張');
        cleanupDeletedPhotos(deletedPhotos);
      }
    };
  }, [deletedPhotos, loading]);

  // 使用工具函數的地理編碼
  const geocodeAddressLocal = geocodeAddress;
  // 生成唯一文件名的函數
  const generateUniqueFileName = (originalFileName) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = originalFileName.split('.').pop();
    const fileNameWithoutExtension = originalFileName.replace(`.${fileExtension}`, '');
    
    // 在編輯模式下，添加額外的唯一標識符
    const editIdentifier = isEditing ? `_edit_${id || 'new'}` : '';
    
    return `${timestamp}_${randomString}${editIdentifier}_${fileNameWithoutExtension}.${fileExtension}`;
  };

  // 上傳沙發照片
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // 生成唯一的文件名
      const uniqueFileName = generateUniqueFileName(file.name);
      
      // 創建存儲引用
      const storage = getStorage();
      const storageRef = ref(storage, `HostRegistration/${user.uid}/${uniqueFileName}`);
      
      // 上傳文件
      await uploadBytes(storageRef, file);
      
      // 獲取下載 URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // 只更新本地狀態，不更新 Firestore
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), downloadURL]
      }));

      console.log('照片上傳成功:', uniqueFileName);
      
      // 清空文件輸入，允許重新選擇相同文件
      if (e.target) {
        e.target.value = '';
      }
    } catch (error) {
      console.error('上傳照片失敗:', error);
      setError('上傳照片失敗，請稍後再試');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (index) => {
    try {
      const photoUrl = formData.photos[index];
      
      // 如果是編輯模式，只追蹤已刪除的照片，不立即刪除文件
      if (isEditing && photoUrl) {
        setDeletedPhotos(prev => [...prev, photoUrl]);
        console.log('📝 編輯模式：已追蹤待刪除的照片，將在提交時清理');
      } else {
        // 非編輯模式：立即從 Firebase Storage 中刪除文件
        if (photoUrl && photoUrl.includes('firebase')) {
          try {
            // 從 Firebase Storage URL 中正確提取文件路徑
            const url = new URL(photoUrl);
            const pathMatch = url.pathname.match(/\/o\/(.+)/);
            
            if (pathMatch) {
              const decodedPath = decodeURIComponent(pathMatch[1]);
              const storage = getStorage();
              const photoRef = ref(storage, decodedPath);
              
              await deleteObject(photoRef);
              console.log('✅ 照片已從 Firebase Storage 中刪除:', decodedPath);
            } else {
              console.warn('⚠️ 無法從 URL 中提取文件路徑:', photoUrl);
            }
          } catch (deleteError) {
            if (deleteError.code === 'storage/object-not-found') {
              console.log('ℹ️ 文件已不存在，可能已被刪除:', photoUrl);
            } else {
              console.error('❌ 從 Firebase Storage 刪除照片失敗:', deleteError);
            }
            // 即使刪除失敗，也繼續從本地狀態中移除
          }
        }
      }
      
      // 更新本地狀態
      const newPhotos = [...formData.photos];
      newPhotos.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        photos: newPhotos
      }));
      
      console.log('✅ 照片已從本地狀態中移除');
    } catch (error) {
      console.error('❌ 刪除照片失敗:', error);
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
      const coordinates = await geocodeAddressLocal(formData.location);
      if (!coordinates) {
        console.log('無法獲取城市座標');
        setError('無法獲取該城市的座標，請檢查城市名稱是否正確');
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
          
          // 清理已刪除的照片
          if (deletedPhotos.length > 0) {
            await cleanupDeletedPhotos(deletedPhotos);
            
            // 清空已刪除照片列表
            setDeletedPhotos([]);
          }
          
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

  // 清理已刪除照片的函數
  const cleanupDeletedPhotos = async (photoUrls) => {
    if (photoUrls.length === 0) return;
    
    console.log('開始清理已刪除的照片:', photoUrls.length, '張');
    const storage = getStorage();
    
    // 使用 Set 去重，避免重複刪除同一個文件
    const uniquePhotoUrls = [...new Set(photoUrls)];
    console.log('去重後的照片數量:', uniquePhotoUrls.length, '張');
    
    for (const photoUrl of uniquePhotoUrls) {
      if (photoUrl && photoUrl.includes('firebase')) {
        try {
          // 從 Firebase Storage URL 中正確提取文件路徑
          const url = new URL(photoUrl);
          const pathMatch = url.pathname.match(/\/o\/(.+)/);
          
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1]);
            console.log('嘗試刪除文件:', decodedPath);
            
            const photoRef = ref(storage, decodedPath);
            await deleteObject(photoRef);
            console.log('✅ 已成功清理照片:', decodedPath);
          } else {
            console.warn('⚠️ 無法從 URL 中提取文件路徑:', photoUrl);
          }
        } catch (cleanupError) {
          if (cleanupError.code === 'storage/object-not-found') {
            console.log('ℹ️ 文件已不存在，跳過清理:', photoUrl);
          } else if (cleanupError.code === 'storage/unauthorized') {
            console.warn('⚠️ 無權限刪除文件:', photoUrl);
          } else {
            console.error('❌ 清理照片失敗:', photoUrl, cleanupError);
          }
          // 如果清理失敗，記錄錯誤但不中斷流程
        }
      } else {
        console.log('ℹ️ 跳過非 Firebase Storage URL:', photoUrl);
      }
    }
    
    console.log('🎉 照片清理完成');
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

            {/* 城市 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                地址
              </label>
              
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  placeholder="請輸入英文地址，例如：Paris, France"
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  required
                />
              </div>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
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
                    <Plus className="w-6 h-6 text-gray-400" />
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
            <DateRangeSelector 
              selectedRanges={selectedRanges} 
              setSelectedRanges={setSelectedRanges} 
            />
          </div>

          {/* 錯誤訊息顯示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

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



      
      
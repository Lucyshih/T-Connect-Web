import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Users, Calendar, Home, Compass, UserCheck, MessageCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SearchBar from '../../components/SearchBar';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import { couchesCollection, companionsCollection, localsCollection } from '../../firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import L from 'leaflet';
import { Icon } from 'leaflet';
import PostDetailDrawer from '../../components/PostDetailDrawer';
import PostsListDrawer from '../../components/PostsListDrawer';
import LocationPostListDrawer from '../../components/LocationPostListDrawer';


// 創建聚合圖標的函數
const createClusterIcon = (type, count) => {
  const colors = {
    couch: '#3B82F6', // 藍色
    companion: '#10B981', // 綠色
    local: '#8B5CF6' // 紫色
  };
  
  const icons = {
    couch: '🏠',
    companion: '👥',
    local: '🎯'
  };

  return L.divIcon({
    html: `
      <div style="
        background-color: ${colors[type]};
        color: white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <div style="text-align: center;">
          <div style="font-size: 12px;">${icons[type]}</div>
          <div style="font-size: 10px;">${count}</div>
        </div>
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// 創建統一聚合圖標的函數（用於「全部」圖層）
const createUnifiedClusterIcon = (count) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #FBBF24 ;
        color: white;
        border-radius: 50%;
        width: 45px;
        height: 45px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      ">
        <div style="text-align: center;">
          <div style="font-size: 14px;">📍</div>
          <div style="font-size: 12px; margin-top: 2px;">${count}</div>
        </div>
      </div>
    `,
    className: 'unified-cluster-icon',
    iconSize: [45, 45],
    iconAnchor: [22, 22]
  });
};

export default function ExchangePlatform() {
  const navigate = useNavigate();
  const { user, termsAgreed, termsChecked, checkTermsAgreement } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [termsLoading, setTermsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [couches, setCouches] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [locals, setLocals] = useState([]);
  const [clusteredData, setClusteredData] = useState({});
  const [filterParams, setFilterParams] = useState({
    city: '',
    startDate: '',
    endDate: ''
  });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // 新增 PostsListDrawer 相關狀態
  const [isPostsListDrawerOpen, setIsPostsListDrawerOpen] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  // 新增：從 PostsListDrawer 開啟的 PostDetailDrawer 狀態
  const [isDetailDrawerFromListOpen, setIsDetailDrawerFromListOpen] = useState(false);
  const [selectedPostFromList, setSelectedPostFromList] = useState(null);
  
  // 新增：LocationPostListDrawer 相關狀態
  const [isLocationPostListDrawerOpen, setIsLocationPostListDrawerOpen] = useState(false);
  const [selectedLocationPosts, setSelectedLocationPosts] = useState([]);
  const [selectedLocationName, setSelectedLocationName] = useState('');

  // 聚合貼文函數
  const clusterPosts = (couches, companions, locals) => {
    const clusters = {};

    // 處理沙發貼文
    couches.forEach(couch => {
      if (couch.coordinates?.lat && couch.coordinates?.lng) {
        const roundedLat = Math.round(couch.coordinates.lat * 10) / 10;
        const roundedLng = Math.round(couch.coordinates.lng * 10) / 10;
        const gridKey = `${roundedLat},${roundedLng}`;
        
        if (!clusters[gridKey]) {
          clusters[gridKey] = {
            position: [roundedLat, roundedLng],
            couches: [],
            companions: [],
            locals: [],
            // 新增：統一聚合資料
            location: couch.location || '未知地點',
            coords: { lat: roundedLat, lng: roundedLng },
            posts: []
          };
        }
        clusters[gridKey].couches.push(couch);
        clusters[gridKey].posts.push({ ...couch, type: 'couch' });
      }
    });

    // 處理旅伴貼文
    companions.forEach(companion => {
      // 遍歷所有目的地，為每個目的地創建一個聚合點
      companion.destinations?.forEach(destination => {
        if (destination?.coordinates?.lat && destination?.coordinates?.lng) {
          const roundedLat = Math.round(destination.coordinates.lat * 10) / 10;
          const roundedLng = Math.round(destination.coordinates.lng * 10) / 10;
          const gridKey = `${roundedLat},${roundedLng}`;
          
          if (!clusters[gridKey]) {
            clusters[gridKey] = {
              position: [roundedLat, roundedLng],
              couches: [],
              companions: [],
              locals: [],
              // 新增：統一聚合資料
              location: destination.name || '未知地點',
              coords: { lat: roundedLat, lng: roundedLng },
              posts: []
            };
          }
          clusters[gridKey].companions.push(companion);
          clusters[gridKey].posts.push({ ...companion, type: 'companion' });
        }
      });
    });

    // 處理地陪貼文
    locals.forEach(local => {
      if (local.coordinates?.lat && local.coordinates?.lng) {
        const roundedLat = Math.round(local.coordinates.lat * 10) / 10;
        const roundedLng = Math.round(local.coordinates.lng * 10) / 10;
        const gridKey = `${roundedLat},${roundedLng}`;
        
        if (!clusters[gridKey]) {
          clusters[gridKey] = {
            position: [roundedLat, roundedLng],
            couches: [],
            companions: [],
            locals: [],
            // 新增：統一聚合資料
            location: local.city || '未知地點',
            coords: { lat: roundedLat, lng: roundedLng },
            posts: []
          };
        }
        clusters[gridKey].locals.push(local);
        clusters[gridKey].posts.push({ ...local, type: 'local' });
      }
    });

    // 對每個聚合點的去重處理（避免同一個貼文重複顯示）
    Object.values(clusters).forEach(cluster => {
      // 使用 Map 來去重，以貼文 ID 為 key
      const uniquePostsMap = new Map();
      cluster.posts.forEach(post => {
        uniquePostsMap.set(post.id, post);
      });
      cluster.posts = Array.from(uniquePostsMap.values());
    });

    return clusters;
  };

  // 過濾貼文
  const filterPosts = (posts) => {
    // 如果沒有搜索條件，顯示所有貼文
    if (!isSearching || (!filterParams.city && !filterParams.startDate && !filterParams.endDate)) {
      return posts;
    }

    return posts.filter(post => {
      // 檢查城市是否匹配
      let cityMatch = true;
      if (filterParams.city) {
        const searchCity = filterParams.city.toLowerCase();
        // 根據貼文類型判斷
        if (post.selectedRanges) {
          // 沙發貼文
          cityMatch = post.location?.toLowerCase().includes(searchCity);
        } else if (post.destinations) {
          // 旅伴貼文
          cityMatch = post.destinations.some(dest => 
            dest.name.toLowerCase().includes(searchCity)
          );
        } else {
          // 地陪貼文
          cityMatch = post.city?.toLowerCase().includes(searchCity);
        }
      }

      // 檢查日期是否匹配
      let dateMatch = true;
      if (filterParams.startDate && filterParams.endDate) {
        const searchStart = new Date(filterParams.startDate);
        const searchEnd = new Date(filterParams.endDate);

        // 根據貼文類型進行不同的日期處理
        if (post.selectedRanges) {
          // 沙發貼文
          dateMatch = post.selectedRanges.some(range => {
            const rangeStart = new Date(range.start.seconds * 1000);
            const rangeEnd = new Date(range.end.seconds * 1000);
            return (
              (searchStart >= rangeStart && searchStart <= rangeEnd) || // 搜索開始日期在區間內
              (searchEnd >= rangeStart && searchEnd <= rangeEnd) || // 搜索結束日期在區間內
              (searchStart <= rangeStart && searchEnd >= rangeEnd) // 搜索區間完全包含貼文區間
            );
          });
        } else if (post.startDate && post.endDate) {
          // 旅伴和地陪貼文
          const postStart = new Date(post.startDate.seconds * 1000);
          const postEnd = new Date(post.endDate.seconds * 1000);
          dateMatch = (
            (postStart <= searchEnd && postEnd >= searchStart) || // 貼文日期範圍與搜索日期範圍有重疊
            (searchStart <= postEnd && searchEnd >= postStart)    // 搜索日期範圍與貼文日期範圍有重疊
          );
        }
      }

      return cityMatch && dateMatch;
    });
  };

  // 獲取所有貼文並聚合
  useEffect(() => {
    const unsubscribeCouches = onSnapshot(couchesCollection, (snapshot) => {
      setCouches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeCompanions = onSnapshot(companionsCollection, (snapshot) => {
      setCompanions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeLocals = onSnapshot(localsCollection, (snapshot) => {
      setLocals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeCouches();
      unsubscribeCompanions();
      unsubscribeLocals();
    };
  }, []);

  // 處理分享連結參數
  useEffect(() => {
    const drawer = searchParams.get('drawer');
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (drawer === 'post' && type && id) {
      console.log('檢測到分享連結參數:', { drawer, type, id });
      
      // 根據類型查找貼文
      let targetPost = null;
      
      if (type === 'couch') {
        targetPost = couches.find(post => post.id === id);
      } else if (type === 'companion') {
        targetPost = companions.find(post => post.id === id);
      } else if (type === 'local') {
        targetPost = locals.find(post => post.id === id);
      }

      if (targetPost) {
        console.log('找到分享的貼文:', targetPost);
        setSelectedPost({ ...targetPost, type });
        setIsDrawerOpen(true);
        
        // 清除URL參數，避免重複觸發
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('drawer');
        newSearchParams.delete('type');
        newSearchParams.delete('id');
        setSearchParams(newSearchParams);
      } else {
        console.log('未找到分享的貼文，可能還在載入中');
      }
    }
  }, [searchParams, couches, companions, locals]);

  // 當貼文資料更新時重新聚合
  useEffect(() => {
    const filteredCouches = filterPosts(couches);
    const filteredCompanions = filterPosts(companions);
    const filteredLocals = filterPosts(locals);
    
    const clusters = clusterPosts(filteredCouches, filteredCompanions, filteredLocals);
    setClusteredData(clusters);
  }, [couches, companions, locals, filterParams, isSearching]);

  // 處理搜索
  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    console.log('搜索參數:', filterParams);
  };

  // 處理清除搜索
  const handleClearSearch = () => {
    setFilterParams({ city: '', startDate: '', endDate: '' });
    setIsSearching(false);
  };

  // 新增：取得地點名稱的函數
  const getLocationName = (cluster, type) => {
    // 這裡可以根據經緯度反查地點名稱，或者使用貼文中的地點資訊
    // 暫時使用第一個貼文的地點資訊
    let locationName = '';
    
    switch (type) {
      case 'couch':
        if (cluster.couches.length > 0) {
          locationName = cluster.couches[0].location || '未知地點';
        }
        break;
      case 'companion':
        if (cluster.companions.length > 0) {
          const destinations = cluster.companions[0].destinations;
          if (destinations && destinations.length > 0) {
            locationName = destinations[0].name || '未知地點';
          }
        }
        break;
      case 'local':
        if (cluster.locals.length > 0) {
          locationName = cluster.locals[0].city || '未知地點';
        }
        break;
    }
    
    return locationName;
  };

  // 修改：處理點擊聚合圖標
  const handleClusterClick = (posts, type, cluster) => {
    // 先關閉 PostDetailDrawer（如果已開啟）
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      setSelectedPost(null);
    }
    
    // 然後開啟 PostsListDrawer
    setSelectedPosts(posts);
    setSelectedType(type); // 設置為對應的類型（couch、companion、local）
    setSelectedLocation(getLocationName(cluster, type));
    setIsPostsListDrawerOpen(true);
  };

  // 新增：處理點擊「全部」聚合圖標
  const handleUnifiedClusterClick = (cluster) => {
    // 先關閉 PostDetailDrawer（如果已開啟）
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      setSelectedPost(null);
    }

    // 然後開啟 LocationPostListDrawer
    setSelectedLocationPosts(cluster.posts);
    setSelectedLocationName(cluster.location);
    setSelectedType('all'); // 設置為 'all' 表示從 LocationPostListDrawer 開啟
    setIsLocationPostListDrawerOpen(true);
  };

  // 保留原有的單一貼文點擊處理（用於 PostDetailDrawer）
  const handleMarkerClick = (post, type) => {
    setSelectedPost({ ...post, type });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPost(null);
  };

  // 新增：關閉 PostsListDrawer
  const handleClosePostsListDrawer = () => {
    setIsPostsListDrawerOpen(false);
    setSelectedPosts([]);
    setSelectedLocation('');
    setSelectedType('');
  };

  // 新增：處理從 PostsListDrawer 中點擊貼文
  const handlePostClickFromList = (post) => {
    console.log('從 PostsListDrawer 點擊貼文:', post);
    setSelectedPostFromList(post);
    setIsDetailDrawerFromListOpen(true);
    // 不要關閉 PostsListDrawer，讓它保持開啟狀態
    // handleClosePostsListDrawer();
    // 確保 selectedType 保持為對應的類型（couch、companion、local）
  };

  // 新增：關閉從列表開啟的 PostDetailDrawer
  const handleCloseDetailDrawerFromList = () => {
    setIsDetailDrawerFromListOpen(false);
    setSelectedPostFromList(null);
    
    // 重新開啟對應的列表 Drawer
    if (selectedType === 'all') {
      // 如果是從 LocationPostListDrawer 開啟的，重新開啟它
      setIsLocationPostListDrawerOpen(true);
    } else {
      // 如果是從 PostsListDrawer 開啟的，重新開啟它
      setIsPostsListDrawerOpen(true);
    }
  };

  // 新增：關閉 LocationPostListDrawer
  const handleCloseLocationPostListDrawer = () => {
    setIsLocationPostListDrawerOpen(false);
    setSelectedLocationPosts([]);
    setSelectedLocationName('');
  };

  // 新增：處理從 LocationPostListDrawer 中點擊貼文
  const handlePostClickFromLocation = (post) => {
    console.log('從 LocationPostListDrawer 點擊貼文:', post);
    setSelectedPostFromList(post);
    setIsDetailDrawerFromListOpen(true);
    // 不要關閉 LocationPostListDrawer，讓它保持開啟狀態
    // handleCloseLocationPostListDrawer();
    // 確保 selectedType 保持為 'all'
    setSelectedType('all');
  };

  // 處理用戶同意條款
  const handleAgreeToTerms = async () => {
    if (!user) return;

    try {
      setTermsLoading(true);
      
      // 更新 profiles 集合
      await setDoc(doc(collection(couchesCollection.firestore, 'profiles'), user.uid), {
        agreedToTerms: true,
        agreedAt: serverTimestamp()
      }, { merge: true });

      // 更新 users 集合
      await setDoc(doc(collection(couchesCollection.firestore, 'users'), user.uid), {
        agreedToTerms: true,
        agreedAt: serverTimestamp()
      }, { merge: true });

      // 重新檢查條款狀態以更新 AuthContext
      await checkTermsAgreement(user.uid);
      
      console.log('✅ 用戶已同意使用條款');
    } catch (error) {
      console.error('❌ 更新條款同意狀態失敗:', error);
    } finally {
      setTermsLoading(false);
    }
  };

  // 條款同意檢查邏輯
  if (user && termsChecked && termsAgreed === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">需要同意使用條款</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">重要提醒</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 請仔細閱讀使用條款與隱私政策內容</li>
                <li>• 了解平台的使用規則與資料處理方式</li>
                <li>• 確認您同意相關條款後再繼續使用</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/terms')}
                  className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <span>📋</span>
                  <span>查看使用條款與隱私政策</span>
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* 導航欄 */}
      <Navbar />

      {/* 主要內容區 */}
      <div className="max-w-7xl mx-auto p-4">
        {/* 搜索欄 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                城市或國家（英文）
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="只能輸入一個單字  例如：Paris"
                value={filterParams.city}
                onChange={(e) => setFilterParams(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={filterParams.startDate}
                onChange={(e) => setFilterParams(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                結束日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={filterParams.endDate}
                onChange={(e) => setFilterParams(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                搜索
              </button>
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                清除
              </button>
            </div>
          </form>
        </div>

        {/* 過濾按鈕 */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'all' ? 'bg-yellow-400 text-white' : 'bg-white text-gray-600'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveFilter('couch')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'couch' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            沙發
          </button>
          <button
            onClick={() => setActiveFilter('companion')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'companion' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            旅伴
          </button>
          <button
            onClick={() => setActiveFilter('local')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'local' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            地陪
          </button>
        </div>

        {/* 地圖 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: '600px' }}>
          <MapContainer
            center={[48.8566, 2.3522]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* 渲染聚合的 markers */}
            {Object.entries(clusteredData).map(([gridKey, cluster]) => {
              const markers = [];
              
              if (activeFilter === 'all') {
                // 「全部」圖層：顯示統一聚合圖標
                const totalPosts = cluster.posts.length;
                if (totalPosts > 0) {
                  markers.push(
                    <Marker
                      key={`${gridKey}-unified`}
                      position={[cluster.position[0], cluster.position[1]]}
                      icon={createUnifiedClusterIcon(totalPosts)}
                      eventHandlers={{
                        click: () => handleUnifiedClusterClick(cluster)
                      }}
                    >
                    </Marker>
                  );
                }
              } else {
                // 其他圖層：顯示分類聚合圖標
                // 沙發聚合
                if (cluster.couches.length > 0 && activeFilter === 'couch') {
                  markers.push(
                    <Marker
                      key={`${gridKey}-couch`}
                      position={[cluster.position[0],cluster.position[1]]}
                      icon={createClusterIcon('couch', cluster.couches.length)}
                      eventHandlers={{
                        click: () => handleClusterClick(cluster.couches, 'couch', cluster)
                      }}
                    >
                    </Marker>
                  );
                }

                // 旅伴聚合
                if (cluster.companions.length > 0 && activeFilter === 'companion') {
                  markers.push(
                    <Marker
                      key={`${gridKey}-companion`}
                      position={[cluster.position[0], cluster.position[1]]}
                      icon={createClusterIcon('companion', cluster.companions.length)}
                      eventHandlers={{
                        click: () => handleClusterClick(cluster.companions, 'companion', cluster)
                      }}
                    >
                    </Marker>
                  );
                }

                // 地陪聚合
                if (cluster.locals.length > 0 && activeFilter === 'local') {
                  markers.push(
                    <Marker
                      key={`${gridKey}-local`}
                      position={[cluster.position[0], cluster.position[1]]}
                      icon={createClusterIcon('local', cluster.locals.length)}
                      eventHandlers={{
                        click: () => handleClusterClick(cluster.locals, 'local', cluster)
                      }}
                    >
                    </Marker>
                  );
                }
              }

              return markers;
            })}
          </MapContainer>
        </div>
      </div>

      {/* 添加 PostDetailDrawer 組件 */}
      <PostDetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        post={selectedPost}
        type={selectedPost?.type}
      />

      {/* 添加從 PostsListDrawer 開啟的 PostDetailDrawer 組件 */}
      <PostDetailDrawer
        isOpen={isDetailDrawerFromListOpen}
        onClose={handleCloseDetailDrawerFromList}
        post={selectedPostFromList}
        type={selectedPostFromList?.type}
      />

      {/* 添加 PostsListDrawer 組件 */}
      <PostsListDrawer
        isOpen={isPostsListDrawerOpen}
        onClose={handleClosePostsListDrawer}
        posts={selectedPosts}
        location={selectedLocation}
        type={selectedType}
        count={selectedPosts.length}
        onPostClick={handlePostClickFromList}
      />

      {/* 添加 LocationPostListDrawer 組件 */}
      <LocationPostListDrawer
        isOpen={isLocationPostListDrawerOpen}
        onClose={handleCloseLocationPostListDrawer}
        posts={selectedLocationPosts}
        location={selectedLocationName}
        onPostClick={handlePostClickFromLocation}
      />
    </div>
  );
}
  
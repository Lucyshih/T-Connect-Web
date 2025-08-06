import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { MapPin, Users, Calendar, Home, Compass, UserCheck, MessageCircle } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import { couchesCollection, companionsCollection, localsCollection } from '../../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import L from 'leaflet';
import { Icon } from 'leaflet';
import PostDetailDrawer from '../../components/PostDetailDrawer';
import PostsListDrawer from '../../components/PostsListDrawer';

// 修復 Leaflet 圖標問題
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 創建自定義沙發圖標
const couchIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

// 創建自定義找旅伴圖標
const companionIcon = L.icon({
  iconUrl: 'my-project/public/gps.png',
  iconSize: [35, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

// 創建自定義找地陪圖標
const localIcon = L.icon({
  iconUrl: 'my-project/public/pin-point.png',
  iconSize: [35, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

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

export default function ExchangePlatform() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [couches, setCouches] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [locals, setLocals] = useState([]);
  const [clusteredData, setClusteredData] = useState({});
  const [searchParams, setSearchParams] = useState({
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

  // 聚合貼文函數
  const clusterPosts = (couches, companions, locals) => {
    const clusters = {};

    // 處理沙發貼文
    couches.forEach(couch => {
      if (couch.coordinates?.lat && couch.coordinates?.lng) {
        const roundedLat = Math.round(couch.coordinates.lat * 2) / 2;
        const roundedLng = Math.round(couch.coordinates.lng * 2) / 2;
        const gridKey = `${roundedLat},${roundedLng}`;
        
        if (!clusters[gridKey]) {
          clusters[gridKey] = {
            position: [roundedLat, roundedLng],
            couches: [],
            companions: [],
            locals: []
          };
        }
        clusters[gridKey].couches.push(couch);
      }
    });

    // 處理旅伴貼文
    companions.forEach(companion => {
      const firstDestination = companion.destinations?.[0];
      if (firstDestination?.coordinates?.lat && firstDestination?.coordinates?.lng) {
        const roundedLat = Math.round(firstDestination.coordinates.lat * 2) / 2;
        const roundedLng = Math.round(firstDestination.coordinates.lng * 2) / 2;
        const gridKey = `${roundedLat},${roundedLng}`;
        
        if (!clusters[gridKey]) {
          clusters[gridKey] = {
            position: [roundedLat, roundedLng],
            couches: [],
            companions: [],
            locals: []
          };
        }
        clusters[gridKey].companions.push(companion);
      }
    });

    // 處理地陪貼文
    locals.forEach(local => {
      if (local.coordinates?.lat && local.coordinates?.lng) {
        const roundedLat = Math.round(local.coordinates.lat * 2) / 2;
        const roundedLng = Math.round(local.coordinates.lng * 2) / 2;
        const gridKey = `${roundedLat},${roundedLng}`;
        
        if (!clusters[gridKey]) {
          clusters[gridKey] = {
            position: [roundedLat, roundedLng],
            couches: [],
            companions: [],
            locals: []
          };
        }
        clusters[gridKey].locals.push(local);
      }
    });

    return clusters;
  };

  // 過濾貼文
  const filterPosts = (posts) => {
    // 如果沒有搜索條件，顯示所有貼文
    if (!isSearching || (!searchParams.city && !searchParams.startDate && !searchParams.endDate)) {
      return posts;
    }

    return posts.filter(post => {
      // 檢查城市是否匹配
      let cityMatch = true;
      if (searchParams.city) {
        const searchCity = searchParams.city.toLowerCase();
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
      if (searchParams.startDate && searchParams.endDate) {
        const searchStart = new Date(searchParams.startDate);
        const searchEnd = new Date(searchParams.endDate);

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

  // 當貼文資料更新時重新聚合
  useEffect(() => {
    const filteredCouches = filterPosts(couches);
    const filteredCompanions = filterPosts(companions);
    const filteredLocals = filterPosts(locals);
    
    const clusters = clusterPosts(filteredCouches, filteredCompanions, filteredLocals);
    setClusteredData(clusters);
  }, [couches, companions, locals, searchParams, isSearching]);

  // 處理搜索
  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    console.log('搜索參數:', searchParams);
  };

  // 處理清除搜索
  const handleClearSearch = () => {
    setSearchParams({ city: '', startDate: '', endDate: '' });
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
    setSelectedType(type);
    setSelectedLocation(getLocationName(cluster, type));
    setIsPostsListDrawerOpen(true);
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
    // 關閉 PostsListDrawer
    handleClosePostsListDrawer();
  };

  // 新增：關閉從列表開啟的 PostDetailDrawer
  const handleCloseDetailDrawerFromList = () => {
    setIsDetailDrawerFromListOpen(false);
    setSelectedPostFromList(null);
  };

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
                value={searchParams.city}
                onChange={(e) => setSearchParams(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={searchParams.startDate}
                onChange={(e) => setSearchParams(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                結束日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={searchParams.endDate}
                onChange={(e) => setSearchParams(prev => ({ ...prev, endDate: e.target.value }))}
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
              activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveFilter('couch')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'couch' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-gray-600'
            }`}
          >
            沙發
          </button>
          <button
            onClick={() => setActiveFilter('companion')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'companion' ? 'bg-green-600 text-white' : 'bg-green-200 text-gray-600'
            }`}
          >
            旅伴
          </button>
          <button
            onClick={() => setActiveFilter('local')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'local' ? 'bg-purple-600 text-white' : 'bg-purple-200 text-gray-600'
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
              
              // 沙發聚合
              if (cluster.couches.length > 0 && (activeFilter === 'all' || activeFilter === 'couch')) {
                markers.push(
                  <Marker
                    key={`${gridKey}-couch`}
                    position={[cluster.position[0] - 0.05, cluster.position[1] - 0.05]}
                    icon={createClusterIcon('couch', cluster.couches.length)}
                    eventHandlers={{
                      click: () => handleClusterClick(cluster.couches, 'couch', cluster)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">沙發貼文 ({cluster.couches.length} 則)</h3>
                        {cluster.couches.slice(0, 3).map(couch => (
                          <div key={couch.id} className="mb-2 p-2 bg-gray-50 rounded">
                            <p className="font-semibold">{couch.title}</p>
                            <p className="text-sm text-gray-600">{couch.location}</p>
                            <button
                              onClick={() => handleMarkerClick(couch, 'couch')}
                              className="mt-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              查看詳情
                            </button>
                          </div>
                        ))}
                        {cluster.couches.length > 3 && (
                          <p className="text-sm text-gray-500">還有 {cluster.couches.length - 3} 則貼文...</p>
                        )}
                        <button
                          onClick={() => handleClusterClick(cluster.couches, 'couch', cluster)}
                          className="mt-2 w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          查看全部 {cluster.couches.length} 則貼文
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              }

              // 旅伴聚合
              if (cluster.companions.length > 0 && (activeFilter === 'all' || activeFilter === 'companion')) {
                markers.push(
                  <Marker
                    key={`${gridKey}-companion`}
                    position={[cluster.position[0] + 0.05, cluster.position[1] - 0.05]}
                    icon={createClusterIcon('companion', cluster.companions.length)}
                    eventHandlers={{
                      click: () => handleClusterClick(cluster.companions, 'companion', cluster)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">旅伴貼文 ({cluster.companions.length} 則)</h3>
                        {cluster.companions.slice(0, 3).map(companion => (
                          <div key={companion.id} className="mb-2 p-2 bg-gray-50 rounded">
                            <p className="font-semibold">{companion.title}</p>
                            <p className="text-sm text-gray-600">
                              目的地：{companion.destinations?.map(dest => dest.name).join('、')}
                            </p>
                            <button
                              onClick={() => handleMarkerClick(companion, 'companion')}
                              className="mt-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              查看詳情
                            </button>
                          </div>
                        ))}
                        {cluster.companions.length > 3 && (
                          <p className="text-sm text-gray-500">還有 {cluster.companions.length - 3} 則貼文...</p>
                        )}
                        <button
                          onClick={() => handleClusterClick(cluster.companions, 'companion', cluster)}
                          className="mt-2 w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          查看全部 {cluster.companions.length} 則貼文
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              }

              // 地陪聚合
              if (cluster.locals.length > 0 && (activeFilter === 'all' || activeFilter === 'local')) {
                markers.push(
                  <Marker
                    key={`${gridKey}-local`}
                    position={[cluster.position[0], cluster.position[1] + 0.05]}
                    icon={createClusterIcon('local', cluster.locals.length)}
                    eventHandlers={{
                      click: () => handleClusterClick(cluster.locals, 'local', cluster)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">地陪貼文 ({cluster.locals.length} 則)</h3>
                        {cluster.locals.slice(0, 3).map(local => (
                          <div key={local.id} className="mb-2 p-2 bg-gray-50 rounded">
                            <p className="font-semibold">{local.title}</p>
                            <p className="text-sm text-gray-600">服務城市：{local.city}</p>
                            <button
                              onClick={() => handleMarkerClick(local, 'local')}
                              className="mt-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                            >
                              查看詳情
                            </button>
                          </div>
                        ))}
                        {cluster.locals.length > 3 && (
                          <p className="text-sm text-gray-500">還有 {cluster.locals.length - 3} 則貼文...</p>
                        )}
                        <button
                          onClick={() => handleClusterClick(cluster.locals, 'local', cluster)}
                          className="mt-2 w-full px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                        >
                          查看全部 {cluster.locals.length} 則貼文
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
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
    </div>
  );
}
  
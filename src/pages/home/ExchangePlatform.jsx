import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { MapPin, Users, Calendar, Home, Compass, UserCheck } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { couchesCollection, companionsCollection, localsCollection } from '../../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import L from 'leaflet';
import { Icon } from 'leaflet';

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

export default function ExchangePlatform() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [couches, setCouches] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [locals, setLocals] = useState([]);
  const [searchParams, setSearchParams] = useState({
    city: '',
    startDate: '',
    endDate: ''
  });

  // 過濾貼文
  const filterPosts = (posts) => {
    return posts.filter(post => {
      // 如果沒有搜索條件，顯示所有貼文
      if (!searchParams.city && !searchParams.startDate && !searchParams.endDate) {
        return true;
      }

      // 檢查城市
      const cityMatch = !searchParams.city || 
        (post.location?.toLowerCase().includes(searchParams.city.toLowerCase()) ||
         (post.destinations && post.destinations.some(dest => 
           dest.toLowerCase().includes(searchParams.city.toLowerCase())
         )) ||
         post.city?.toLowerCase().includes(searchParams.city.toLowerCase()));

      // 檢查日期
      const startDate = searchParams.startDate ? new Date(searchParams.startDate) : null;
      const endDate = searchParams.endDate ? new Date(searchParams.endDate) : null;
      
      const dateMatch = !startDate || !endDate || (
        (post.startDate && new Date(post.startDate) >= startDate) &&
        (post.endDate && new Date(post.endDate) <= endDate)
      );

      return cityMatch && dateMatch;
    });
  };

  // 獲取所有貼文
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

  // 處理搜索
  const handleSearch = (e) => {
    e.preventDefault();
    // 搜索邏輯已經在 filterPosts 中實現
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 導航欄 */}
      <nav className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <Compass className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold">TravelConnect</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  個人檔案
                </button>
                <button
                  onClick={() => navigate('/host')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  提供住宿
                </button>
                <button
                  onClick={() => navigate('/companion')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  尋找旅伴
                </button>
                <button
                  onClick={() => navigate('/local')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  成為地陪
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-blue-600"
              >
                登入
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 主要內容區 */}
      <div className="max-w-7xl mx-auto p-4">
        {/* 搜索欄 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                城市
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="輸入城市名稱"
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
                onClick={() => setSearchParams({ city: '', startDate: '', endDate: '' })}
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
              activeFilter === 'couch' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            沙發
          </button>
          <button
            onClick={() => setActiveFilter('companion')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'companion' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            旅伴
          </button>
          <button
            onClick={() => setActiveFilter('local')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'local' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
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
            {activeFilter === 'all' || activeFilter === 'couch' ? (
              filterPosts(couches).map(couch => (
                <Marker
                  key={couch.id}
                  position={couch.coordinates ? [couch.coordinates.lat, couch.coordinates.lng] : [0, 0]}
                  icon={couchIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{couch.title}</h3>
                      <p className="text-sm text-gray-600">{couch.location}</p>
                      <p className="text-sm">{couch.description}</p>
                      <p className="text-sm font-medium text-blue-600">
                        €{couch.pricePerNight}/晚
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))
            ) : null}
            {activeFilter === 'all' || activeFilter === 'companion' ? (
              filterPosts(companions).map(companion => (
                <Marker
                  key={companion.id}
                  position={companion.coordinates ? [companion.coordinates.lat, companion.coordinates.lng] : [0, 0]}
                  icon={companionIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{companion.title}</h3>
                      <p className="text-sm text-gray-600">{companion.destinations}</p>
                      <p className="text-sm">
                        {new Date(companion.startDate).toLocaleDateString()} - 
                        {new Date(companion.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm">需要 {companion.requiredPeople} 人</p>
                    </div>
                  </Popup>
                </Marker>
              ))
            ) : null}
            {activeFilter === 'all' || activeFilter === 'local' ? (
              filterPosts(locals).map(local => (
                <Marker
                  key={local.id}
                  position={local.coordinates ? [local.coordinates.lat, local.coordinates.lng] : [0, 0]}
                  icon={localIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{local.title}</h3>
                      <p className="text-sm text-gray-600">{local.city}</p>
                      <p className="text-sm">{local.description}</p>
                    </div>
                  </Popup>
                </Marker>
              ))
            ) : null}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
  
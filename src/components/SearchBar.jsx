import React from 'react';
import { MapPin, Calendar, Home, Users, UserCheck } from 'lucide-react';

const SearchBar = ({ searchParams, setSearchParams, mapLayers, toggleLayer }) => {
  const handleSearch = (e) => {
    e.preventDefault();
    // TODO: 實現搜索邏輯
    console.log('Searching with params:', searchParams);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">目的地</label>
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="輸入城市名稱"
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchParams.location}
                onChange={(e) => setSearchParams(prev => ({...prev, location: e.target.value}))}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">開始日期</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchParams.startDate}
                onChange={(e) => setSearchParams(prev => ({...prev, startDate: e.target.value}))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">結束日期</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchParams.endDate}
                onChange={(e) => setSearchParams(prev => ({...prev, endDate: e.target.value}))}
              />
            </div>
          </div>
        </div>

        {/* 圖層選擇器 */}
        <div className="mt-4 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              type="button"
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                mapLayers.couch ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
              }`}
              onClick={() => toggleLayer('couch')}
            >
              <Home className="w-4 h-4" />
              <span>沙發</span>
            </button>
            <button 
              type="button"
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                mapLayers.companion ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
              }`}
              onClick={() => toggleLayer('companion')}
            >
              <Users className="w-4 h-4" />
              <span>旅伴</span>
            </button>
            <button 
              type="button"
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                mapLayers.local ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
              }`}
              onClick={() => toggleLayer('local')}
            >
              <UserCheck className="w-4 h-4" />
              <span>地陪</span>
            </button>
          </div>
          
          <button 
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4 md:mt-0"
          >
            搜索
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar; 
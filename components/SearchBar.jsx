import React from 'react';
import { MapPin, Calendar } from 'lucide-react';

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
          {/* ... existing code ... */}
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
          
          {/* ... existing date inputs ... */}
        </div>

        {/* 圖層選擇器 */}
        <div className="mt-4 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* ... existing layer toggle buttons ... */}
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
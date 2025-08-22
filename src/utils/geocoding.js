// 改進的地理編碼函數
// 解決同名城市的地理編碼問題，優先選擇正確的國家

export const geocodeAddress = async (address) => {
  try {
    // 首先嘗試精確搜索（包含國家名稱）
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&addressdetails=1`
    );
    let data = await response.json();
    
    if (data && data.length > 0) {
      // 如果有多個結果，嘗試找到最匹配的
      let bestMatch = data[0];
      
      // 如果地址包含國家信息，優先選擇匹配的國家
      if (address.toLowerCase().includes('netherlands') || address.toLowerCase().includes('holland')) {
        const netherlandsMatch = data.find(result => 
          result.address?.country?.toLowerCase().includes('netherlands') ||
          result.address?.country?.toLowerCase().includes('holland')
        );
        if (netherlandsMatch) {
          bestMatch = netherlandsMatch;
        }
      } else if (address.toLowerCase().includes('france')) {
        const franceMatch = data.find(result => 
          result.address?.country?.toLowerCase().includes('france')
        );
        if (franceMatch) {
          bestMatch = franceMatch;
        }
      } else if (address.toLowerCase().includes('italy')) {
        const italyMatch = data.find(result => 
          result.address?.country?.toLowerCase().includes('italy')
        );
        if (italyMatch) {
          bestMatch = italyMatch;
        }
      } else if (address.toLowerCase().includes('spain')) {
        const spainMatch = data.find(result => 
          result.address?.country?.toLowerCase().includes('spain')
        );
        if (spainMatch) {
          bestMatch = spainMatch;
        }
      } else if (address.toLowerCase().includes('germany')) {
        const germanyMatch = data.find(result => 
          result.address?.country?.toLowerCase().includes('germany')
        );
        if (germanyMatch) {
          bestMatch = germanyMatch;
        }
      } else if (address.toLowerCase().includes('uk') || address.toLowerCase().includes('united kingdom')) {
        const ukMatch = data.find(result => 
          result.address?.country?.toLowerCase().includes('united kingdom') ||
          result.address?.country?.toLowerCase().includes('great britain')
        );
        if (ukMatch) {
          bestMatch = ukMatch;
        }
      } else if (address.toLowerCase().includes('usa') || address.toLowerCase().includes('united states')) {
        const usaMatch = data.find(result => 
          result.address?.country?.toLowerCase().includes('united states') ||
          result.address?.country?.toLowerCase().includes('usa')
        );
        if (usaMatch) {
          bestMatch = usaMatch;
        }
      }
      
      // 如果沒有找到國家匹配，但有明確的城市和國家信息，嘗試更精確的搜索
      if (bestMatch === data[0] && address.includes(',')) {
        const parts = address.split(',').map(part => part.trim());
        if (parts.length >= 2) {
          const city = parts[0];
          const country = parts[parts.length - 1];
          
          // 嘗試更精確的搜索
          const preciseResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&limit=1`
          );
          const preciseData = await preciseResponse.json();
          
          if (preciseData && preciseData.length > 0) {
            bestMatch = preciseData[0];
          }
        }
      }
      
      console.log('選擇的地理編碼結果:', bestMatch);
      return {
        lat: parseFloat(bestMatch.lat),
        lng: parseFloat(bestMatch.lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('地理編碼錯誤:', error);
    return null;
  }
};

// 獲取地址的詳細信息
export const getAddressDetails = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data[0].address;
    }
    
    return null;
  } catch (error) {
    console.error('獲取地址詳情錯誤:', error);
    return null;
  }
}; 
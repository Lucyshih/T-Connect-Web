import React, { useState } from 'react';
import { Info, MapPin, AlertCircle } from 'lucide-react';

const AddressInputGuide = ({ type = 'destination' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getTitle = () => {
    switch (type) {
      case 'destination':
        return '目的地地址輸入指南';
      case 'city':
        return '城市地址輸入指南';
      case 'location':
        return '位置地址輸入指南';
      default:
        return '地址輸入指南';
    }
  };

  const examples = [
    {
      correct: 'Amsterdam, Netherlands',
      incorrect: 'Amsterdam',
      explanation: '包含國家名稱，避免與美國的 Amsterdam 混淆'
    },
  ];

  const tips = [
    '始終包含國家名稱，格式：城市名, 國家名',
    '使用英文名稱，避免使用當地語言',
    '如果城市名稱常見，建議加上省份或州名',
    '例如：Amsterdam, North Holland, Netherlands'
  ];

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        <Info className="w-4 h-4" />
        <span>{getTitle()}</span>
      </button>

      {isOpen && (
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2 mb-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">為什麼需要包含國家名稱？</h4>
              <p className="text-blue-700 text-sm">
                許多城市名稱在不同國家都存在，例如 Amsterdam 在荷蘭和美國都有。
                包含國家名稱可以確保您的地點顯示在正確的位置。
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h5 className="font-semibold text-blue-800 mb-2">正確的輸入方式：</h5>
            <div className="space-y-2">
              {examples.map((example, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 font-medium">{example.correct}</span>
                  </div>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600">{example.explanation}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h5 className="font-semibold text-blue-800 mb-2">輸入技巧：</h5>
            <ul className="list-disc list-inside text-blue-700 text-sm space-y-1">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-yellow-800 text-sm">
                <strong>注意：</strong> 如果您的地址輸入不正確，貼文可能會顯示在錯誤的位置。
                請仔細檢查地址格式，確保包含正確的國家名稱。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressInputGuide; 
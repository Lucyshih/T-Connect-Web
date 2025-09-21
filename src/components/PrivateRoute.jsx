import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TermsAgreement from './TermsAgreement';

export default function PrivateRoute({ children }) {
  const { user, termsAgreed, termsChecked } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // 如果條款狀態尚未檢查，顯示載入畫面
  if (!termsChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">檢查使用條款狀態中...</p>
        </div>
      </div>
    );
  }
  
  // 如果用戶未同意條款，顯示條款同意頁面
  if (termsAgreed === false) {
    return <TermsAgreement>{children}</TermsAgreement>;
  }
  
  // 如果用戶已同意條款，直接顯示內容
  return children;
} 
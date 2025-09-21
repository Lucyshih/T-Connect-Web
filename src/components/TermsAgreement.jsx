import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, doc, setDoc, serverTimestamp } from '../firebase';
import { AlertCircle } from 'lucide-react';

const TermsAgreement = ({ children }) => {
  const { user, termsAgreed, termsChecked, checkTermsAgreement } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 如果正在載入，顯示載入畫面
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
    // 處理用戶同意條款
    const handleAgreeToTerms = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // 更新 profiles 集合
        await setDoc(doc(db, 'profiles', user.uid), {
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        }, { merge: true });

        // 更新 users 集合
        await setDoc(doc(db, 'users', user.uid), {
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        }, { merge: true });

        // 重新檢查條款狀態以更新 AuthContext
        await checkTermsAgreement(user.uid);
        
        console.log('✅ 用戶已同意使用條款');
      } catch (error) {
        console.error('❌ 更新條款同意狀態失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">需要同意使用條款</h2>
            <p className="text-gray-600">
              為了繼續使用 T-Connect，請先閱讀並同意我們的使用條款與隱私政策。
            </p>
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
              <div className="flex justify-center">
                <button
                  onClick={handleAgreeToTerms}
                  disabled={loading}
                  className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>✅</span>
                  <span>{loading ? '處理中...' : '同意並繼續'}</span>
                </button>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                返回首頁
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              請先閱讀使用條款與隱私政策，閱讀完畢後請點擊「同意並繼續」按鈕完成同意流程。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 如果用戶已同意條款，顯示原本的內容
  return children;
};

export default TermsAgreement;
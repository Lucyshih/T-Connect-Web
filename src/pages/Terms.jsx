import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, doc, updateDoc, serverTimestamp, setDoc } from '../firebase';

const Terms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkTermsAgreement } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // 檢查是否為查看模式（從註冊頁面連結過來）
  const isViewOnly = new URLSearchParams(location.search).get('view') === 'true';

  const handleAgree = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      
      // 先嘗試更新 profiles 集合（主要集合）
      try {
        await updateDoc(doc(db, 'profiles', user.uid), {
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        });
        console.log('✅ Profiles 集合更新成功');
      } catch (profileError) {
        console.log('Profiles 集合更新失敗，嘗試創建新文檔');
        // 如果 profiles 文檔不存在，創建一個新的
        await setDoc(doc(db, 'profiles', user.uid), {
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          emailNotifications: true,
          createdAt: serverTimestamp(),
          isBasicProfile: true,
          nationality: '',
          bio: '',
          photos: [],
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        });
        console.log('✅ Profiles 集合創建成功');
      }
      
      // 然後嘗試更新 users 集合
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        });
        console.log('✅ Users 集合更新成功');
      } catch (userError) {
        console.log('Users 集合更新失敗，嘗試創建新文檔');
        // 如果 users 文檔不存在，創建一個新的
        await setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        });
        console.log('✅ Users 集合創建成功');
      }
      
      // 重新檢查條款狀態以更新 AuthContext
      await checkTermsAgreement(user.uid);
      
      navigate('/');
    } catch (error) {
      console.error('更新條款同意狀態失敗:', error);
      alert('更新失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <Compass className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold">T-Connect</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">T-Connect 使用者條款與隱私政策</h1>
          
          <div className="prose max-w-none text-gray-700 leading-relaxed">
            <p className="mb-6">
              歡迎使用 T-Connect！本使用者條款（以下簡稱「本條款」）旨在規範您使用 T-Connect 平台（以下簡稱「本平台」）的行為。請仔細閱讀本條款。您一旦使用本平台，即表示您已閱讀、理解並同意遵守本條款的所有內容。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. 平台性質</h2>
            <p className="mb-6">
              T-Connect 僅作為一個「資訊交流與配對平台」。我們並非旅館、旅行社或任何形式的住宿或旅遊服務仲介，亦不參與、保證或對您與其他使用者之間的任何互動（包括但不限於住宿安排、旅伴邀約、地陪活動、行程規劃等）的安全性、品質或合法性負有任何責任。所有互動均由使用者自行決定，並由使用者自行承擔所有相關風險。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. 使用者義務</h2>
            <p className="mb-6">
              您同意並承諾僅在本平台發佈真實、準確且不具誤導性的資訊。您不得利用本平台進行任何詐騙、廣告推銷、歧視、騷擾、誹謗、侵犯他人權益或任何違法、不道德的行為。T-Connect 保留權利，得自行判斷並移除任何不當內容，或暫停、終止您的帳號使用權。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. 安全提醒</h2>
            <p className="mb-4">
              使用本平台存在潛在風險。我們強烈建議您在與其他使用者進行任何線下互動前，務必充分了解對方，並保持高度警覺。建議您採取以下預防措施：
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>盡量選擇在公共場合進行首次見面。</li>
              <li>告知您的親友您的行程安排與會面對象。</li>
              <li>事先透過平台進行充分的線上溝通，確認彼此的期待與意圖。</li>
            </ul>
            <p className="mb-6">
              儘管本平台致力於提供透明的資訊，但我們無法保證每一位使用者的行為均符合預期或法律規定。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. 責任限制</h2>
            <p className="mb-6">
              對於您與其他使用者之間因使用本平台而產生的任何爭議、糾紛、損害、損失或事故，T-Connect 概不負責。所有使用者之間的互動及其後果，均由相關使用者自行承擔全部責任。T-Connect 僅提供技術服務與平台功能，無法保證您在本平台上獲取的資訊絕對正確、完整或安全。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. 隱私與帳號</h2>
            <p className="mb-6">
              您有責任妥善保管您的帳號資訊，包括但不限於使用者名稱和密碼，並不得將您的帳號轉讓、出租或與任何第三方共用。為提供本平台服務，我們將蒐集必要資訊，例如您提供的聯絡資料、發佈的內容等，以確保服務的順暢運作。我們承諾不會將您的個人資料出售給任何第三方。有關我們如何處理您的個人資料的詳細資訊，請參閱我們的「隱私權政策」。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. 智慧財產</h2>
            <p className="mb-6">
              您在本平台上發佈的任何內容（包括文字、圖片、影音等）的所有權仍歸屬於您。然而，您同意授予 T-Connect 在本平台服務範圍內，為推廣、展示或營運本平台之目的，使用、複製、修改、散佈您所發佈內容的非專屬、全球性、免權利金授權。本平台的整體設計、標誌（Logo）、程式碼、介面以及所有相關技術和內容，均為 T-Connect 的專有財產，未經 T-Connect 事先書面同意，您不得以任何方式使用、複製或散佈。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. 條款修改</h2>
            <p className="mb-6">
              T-Connect 保留隨時修改、更新或補充本條款的權利。任何修改將在本平台網站上公告。若您在條款修改後繼續使用本平台，即表示您已閱讀、理解並同意接受修改後的條款。建議您定期查閱本條款以了解最新內容。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. 爭議解決</h2>
            <p className="mb-12">
              本條款的解釋、適用與爭議，均依據中華民國（台灣）法律為準據法。若因本條款或您使用本平台而產生任何爭議，雙方應首先嘗試透過協商方式友好解決。若協商無法達成一致，則任何一方均可將爭議提交至台灣具管轄權之法院進行訴訟解決。
            </p>

            {/* 隱私政策部分 */}
            <div className="border-t-2 border-gray-200 pt-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">隱私政策</h2>
                <p className="text-gray-600">最後更新：2025年1月</p>
              </div>
              
              <p className="mb-6">
                在 T-Connect，我們非常重視您的隱私權。本隱私政策說明我們如何收集、使用、儲存和保護您的個人資訊。
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">資訊收集</h3>
                  <p className="text-blue-800 text-sm">
                    我們收集您主動提供的資訊，如電子郵件、顯示名稱、個人檔案資訊等，以提供更好的服務體驗。
                  </p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">資訊保護</h3>
                  <p className="text-green-800 text-sm">
                    我們採用業界標準的安全措施來保護您的個人資訊，包括加密傳輸和安全儲存。
                  </p>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">資料使用</h3>
                  <p className="text-purple-800 text-sm">
                    您的資訊僅用於提供平台服務、改善用戶體驗，以及必要的系統運作需求。
                  </p>
                </div>
                
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">您的權利</h3>
                  <p className="text-orange-800 text-sm">
                    您可以隨時查看、修改或刪除您的個人資訊，也可以選擇退出某些服務。
                  </p>
                </div>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">我們收集的資訊</h3>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li><strong>帳號資訊：</strong>電子郵件地址、顯示名稱、密碼（加密儲存）</li>
                <li><strong>個人檔案：</strong>您選擇分享的個人資訊，如FB個人檔案連結、自我介紹、照片等</li>
                <li><strong>使用資料：</strong>您與平台的互動記錄、偏好設定等</li>
                <li><strong>技術資訊：</strong>IP地址、瀏覽器類型、裝置資訊等基本技術資料</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">資訊使用目的</h3>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>提供和維護平台服務</li>
                <li>處理您的註冊和登入請求</li>
                <li>改善用戶體驗和服務品質</li>
                <li>發送重要的服務通知和更新</li>
                <li>確保平台安全和防止濫用</li>
                <li>遵守法律義務和監管要求</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">資訊分享與揭露</h3>
              <p className="mb-4">
                我們承諾不會出售、出租或交易您的個人資訊給第三方。我們只在以下情況下分享您的資訊：
              </p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>獲得您的明確同意</li>
                <li>法律要求或法院命令</li>
                <li>保護我們的權利、財產或安全</li>
                <li>與可信賴的服務提供商合作（在嚴格保密協議下）</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">資料安全</h3>
              <p className="mb-6">
                我們採用多層安全措施來保護您的個人資訊，包括：
              </p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>SSL/TLS 加密傳輸</li>
                <li>安全的資料庫儲存</li>
                <li>定期安全審計和更新</li>
                <li>限制員工存取權限</li>
                <li>監控異常活動</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">您的權利</h3>
              <p className="mb-4">根據相關法律，您享有以下權利：</p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li><strong>存取權：</strong>查看我們持有的您的個人資訊</li>
                <li><strong>更正權：</strong>要求更正不正確或不完整的資訊</li>
                <li><strong>刪除權：</strong>要求刪除您的個人資訊</li>
                <li><strong>限制處理權：</strong>限制我們處理您的個人資訊</li>
                <li><strong>資料可攜權：</strong>以結構化格式獲取您的資料</li>
                <li><strong>反對權：</strong>反對我們處理您的個人資訊</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Cookie 和追蹤技術</h3>
              <p className="mb-6">
                我們使用 Cookie 和類似技術來改善您的使用體驗、記住您的偏好設定，以及分析網站流量。您可以通過瀏覽器設定來管理 Cookie 偏好。
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">政策更新</h3>
              <p className="mb-6">
                我們可能會不時更新本隱私政策。重大變更將通過電子郵件或平台通知告知您。建議您定期查看本政策以了解最新內容。
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">聯絡我們</h3>
              <p className="mb-6">
                如果您對本隱私政策有任何疑問或需要行使您的權利，請通過以下方式聯絡我們：
              </p>
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <p className="text-gray-700">
                  <strong>電子郵件：</strong>tconnectweb@gmail.com<br/>
                  <strong>地址：</strong>台灣台北市<br/>
                  <strong>回應時間：</strong>我們將在收到您的請求後 30 天內回覆
                </p>
              </div>
            </div>
          </div>

          {/* Agree Button - 只在非查看模式下顯示 */}
          {!isViewOnly && (
            <div className="border-t pt-8 mt-8">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleAgree}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>處理中...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>同意並繼續</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* 查看模式下的返回按鈕 */}
          {isViewOnly && (
            <div className="border-t pt-8 mt-8">
              <div className="flex items-center justify-center">
                <button
                  onClick={() => window.close()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  關閉視窗
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terms;

// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

// 建立 Context
const AuthContext = createContext();

// 提供一個 hook 方便取得 Auth Context 的內容
function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// AuthProvider 元件，包裝在應用程式最外層
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(null); // 條款同意狀態
  const [termsChecked, setTermsChecked] = useState(false); // 是否已檢查過條款狀態

  // 檢查條款同意狀態的函數
  const checkTermsAgreement = async (userId) => {
    if (!userId) {
      setTermsAgreed(null);
      setTermsChecked(true);
      return;
    }

    try {
      const { db, doc, getDoc } = await import('../firebase');
      
      // 先檢查 profiles 集合（主要集合）
      const profileDoc = await getDoc(doc(db, 'profiles', userId));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        setTermsAgreed(profileData.agreedToTerms === true);
        setTermsChecked(true);
        return;
      }

      // 如果 profiles 集合沒有資料，檢查 users 集合
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setTermsAgreed(userData.agreedToTerms === true);
      } else {
        // 如果兩個集合都沒有資料，預設為未同意
        setTermsAgreed(false);
      }
    } catch (error) {
      console.error('檢查條款同意狀態失敗:', error);
      // 發生錯誤時，預設為未同意
      setTermsAgreed(false);
    } finally {
      setTermsChecked(true);
    }
  };

  // 監聽用戶登入狀態變化
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setUser(user);
      setLoading(false);
      
      // 如果用戶登入，檢查條款同意狀態
      if (user) {
        await checkTermsAgreement(user.uid);
      } else {
        // 用戶登出，重置條款狀態
        setTermsAgreed(null);
        setTermsChecked(false);
      }
    });
    return unsubscribe;
  }, []);

  // 註冊用戶
  const signup = async (email, password, displayName) => {
    try {
      // 創建用戶帳號
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 更新用戶的 displayName
      if (displayName && displayName.trim()) {
        await updateProfile(user, {
          displayName: displayName.trim()
        });
      }
      
      // 自動建立基本個人檔案
      try {
        const { db, doc, setDoc, serverTimestamp } = await import('../firebase');
        
        const basicProfile = {
          displayName: displayName?.trim() || email.split('@')[0],
          email: email,
          emailNotifications: true, // 預設啟用郵件通知
          createdAt: serverTimestamp(),
          isBasicProfile: true, // 標記為基本個人檔案
          nationality: '',
          bio: '',
          photos: [],
          agreedToTerms: true, // 註冊時已同意條款
          agreedAt: serverTimestamp() // 同意時間
        };
        
        await setDoc(doc(db, 'profiles', user.uid), basicProfile);
        
        // 同時在 users 集合中建立基本資料
        const userData = {
          displayName: displayName?.trim() || email.split('@')[0],
          email: email,
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', user.uid), userData);
        
        console.log('✅ 自動建立基本個人檔案成功');
      } catch (profileError) {
        console.error('❌ 自動建立個人檔案失敗:', profileError);
        // 記錄詳細錯誤信息以便調試
        console.error('用戶 UID:', user.uid);
        console.error('用戶 Email:', email);
        console.error('錯誤詳情:', profileError.message);
        // 不影響註冊流程，但記錄錯誤
      }
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  // 登入用戶
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google 登入
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // 檢查是否為新用戶，如果是則建立基本個人檔案
      if (result._tokenResponse?.isNewUser) {
        try {
          const { db, doc, setDoc, serverTimestamp } = await import('../firebase');
          
          const basicProfile = {
            displayName: result.user.displayName || result.user.email.split('@')[0],
            email: result.user.email,
            emailNotifications: true, // 預設啟用郵件通知
            createdAt: serverTimestamp(),
            isBasicProfile: true, // 標記為基本個人檔案
            nationality: '',
            bio: '',
            photos: [],
            agreedToTerms: true, // Google 登入時已同意條款
            agreedAt: serverTimestamp() // 同意時間
          };
          
        await setDoc(doc(db, 'profiles', result.user.uid), basicProfile);
        
        // 同時在 users 集合中建立基本資料
        const userData = {
          displayName: result.user.displayName || result.user.email.split('@')[0],
          email: result.user.email,
          agreedToTerms: true,
          agreedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', result.user.uid), userData);
        
        console.log('✅ Google 登入用戶自動建立基本個人檔案成功');
      } catch (profileError) {
        console.error('❌ Google 登入用戶自動建立個人檔案失敗:', profileError);
        // 記錄詳細錯誤信息以便調試
        console.error('用戶 UID:', result.user.uid);
        console.error('用戶 Email:', result.user.email);
        console.error('錯誤詳情:', profileError.message);
      }
      } else {
        // 現有用戶登入，檢查條款狀態
        await checkTermsAgreement(result.user.uid);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  // 重設密碼
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // 登出用戶
  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    logout,
    error,
    setError,
    setUser,
    termsAgreed,
    termsChecked,
    checkTermsAgreement
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 等待 onAuthStateChanged 完成初次驗證 */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 導出 useAuth hook
export { useAuth };

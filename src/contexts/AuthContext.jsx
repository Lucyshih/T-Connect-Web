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
export function useAuth() {
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

  // 監聽用戶登入狀態變化
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      setLoading(false);
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
        const { getFirestore, doc, setDoc, serverTimestamp } = await import('../firebase');
        const db = getFirestore();
        
        const basicProfile = {
          displayName: displayName?.trim() || email.split('@')[0],
          email: email,
          emailNotifications: true, // 預設啟用郵件通知
          createdAt: serverTimestamp(),
          isBasicProfile: true, // 標記為基本個人檔案
          nationality: '',
          bio: '',
          photos: []
        };
        
        await setDoc(doc(db, 'profiles', user.uid), basicProfile);
        console.log('✅ 自動建立基本個人檔案成功');
      } catch (profileError) {
        console.warn('⚠️ 自動建立個人檔案失敗，但不影響註冊:', profileError);
        // 不影響註冊流程，只是記錄警告
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
          const { getFirestore, doc, setDoc, serverTimestamp } = await import('../firebase');
          const db = getFirestore();
          
          const basicProfile = {
            displayName: result.user.displayName || result.user.email.split('@')[0],
            email: result.user.email,
            emailNotifications: true, // 預設啟用郵件通知
            createdAt: serverTimestamp(),
            isBasicProfile: true, // 標記為基本個人檔案
            nationality: '',
            bio: '',
            photos: []
          };
          
          await setDoc(doc(db, 'profiles', result.user.uid), basicProfile);
          console.log('✅ Google 登入用戶自動建立基本個人檔案成功');
        } catch (profileError) {
          console.warn('⚠️ Google 登入用戶自動建立個人檔案失敗:', profileError);
        }
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
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 等待 onAuthStateChanged 完成初次驗證 */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 導出 AuthContext 供其他文件使用
export { AuthContext };

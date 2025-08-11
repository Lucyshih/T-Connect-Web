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
  sendPasswordResetEmail
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
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // 登入用戶
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google 登入
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
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

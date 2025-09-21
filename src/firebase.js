// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, serverTimestamp, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// 從 Firebase Console 取得你的設定資訊，貼到這裡：
const firebaseConfig = {
    apiKey: "AIzaSyCHN_XPL0DsUoytT60ty-h_QORSC6BNzYk",
    authDomain: "travelconnect-4a4df.firebaseapp.com",
    projectId: "travelconnect-4a4df",
    storageBucket: "travelconnect-4a4df.firebasestorage.app",
    messagingSenderId: "945079172871",
    appId: "1:945079172871:web:6805b3af671cfbf1b20fa2",
    measurementId: "G-RPKSLVRL1T"
  };

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化服務
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// 添加沙發集合引用
export const couchesCollection = collection(db, 'couches');
export const companionsCollection = collection(db, 'companions');
export const localsCollection = collection(db, 'locals');
export const profilesCollection = collection(db, 'profiles');
export const chatroomsCollection = collection(db, 'chatrooms');
export const commentsCollection = collection(db, 'comments');
export const userReviewsCollection = collection(db, 'userReviews');

export { auth, db, storage, serverTimestamp, doc, updateDoc, setDoc, getDoc };
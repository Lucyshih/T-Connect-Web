// 測試 Firebase 連接和集合
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHN_XPL0DsUoytT60ty-h_QORSC6BNzYk",
  authDomain: "travelconnect-4a4df.firebaseapp.com",
  projectId: "travelconnect-4a4df",
  storageBucket: "travelconnect-4a4df.firebasestorage.app",
  messagingSenderId: "945079172871",
  appId: "1:945079172871:web:6805b3af671cfbf1b20fa2",
  measurementId: "G-RPKSLVRL1T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebase() {
  console.log('開始測試 Firebase 連接...');
  
  try {
    // 測試各個集合
    const collections = ['couches', 'companions', 'locals'];
    
    for (const collectionName of collections) {
      console.log(`\n測試集合: ${collectionName}`);
      
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        console.log(`✅ ${collectionName} 集合存在，包含 ${snapshot.docs.length} 個文檔`);
        
        if (snapshot.docs.length > 0) {
          const firstDoc = snapshot.docs[0];
          console.log(`   第一個文檔 ID: ${firstDoc.id}`);
          console.log(`   第一個文檔數據:`, firstDoc.data());
          
          // 測試通過 ID 獲取文檔
          const docRef = doc(db, collectionName, firstDoc.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log(`   ✅ 通過 ID 獲取文檔成功`);
          } else {
            console.log(`   ❌ 通過 ID 獲取文檔失敗`);
          }
        }
      } catch (error) {
        console.error(`❌ ${collectionName} 集合測試失敗:`, error);
      }
    }
    
  } catch (error) {
    console.error('Firebase 連接測試失敗:', error);
  }
}

// 如果是在 Node.js 環境中運行
if (typeof window === 'undefined') {
  testFirebase().then(() => {
    console.log('\n測試完成');
    process.exit(0);
  }).catch(error => {
    console.error('測試失敗:', error);
    process.exit(1);
  });
} else {
  // 如果是在瀏覽器環境中運行
  window.testFirebase = testFirebase;
  console.log('Firebase 測試函數已載入，請在控制台運行 testFirebase()');
}

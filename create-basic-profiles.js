// create-basic-profiles.js
// 為所有註冊用戶建立基本個人檔案的腳本

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// 初始化 Firebase Admin
initializeApp();

const auth = getAuth();
const db = getFirestore();

async function createBasicProfiles() {
  try {
    console.log('🚀 開始為所有註冊用戶建立基本個人檔案...');
    
    // 獲取所有註冊用戶
    const listUsersResult = await auth.listUsers();
    const allUsers = listUsersResult.users;
    
    console.log(`📊 找到 ${allUsers.length} 個註冊用戶`);
    
    // 獲取現有的個人檔案
    const profilesSnapshot = await db.collection('profiles').get();
    const existingProfiles = new Set();
    profilesSnapshot.forEach(doc => {
      existingProfiles.add(doc.id);
    });
    
    console.log(`📋 現有個人檔案: ${existingProfiles.size} 個`);
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 為每個用戶建立基本個人檔案
    for (const user of allUsers) {
      try {
        if (existingProfiles.has(user.uid)) {
          console.log(`⏭️  跳過用戶 ${user.email}: 已有個人檔案`);
          skippedCount++;
          continue;
        }
        
        // 建立基本個人檔案
        const basicProfile = {
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          emailNotifications: true, // 預設啟用郵件通知
          createdAt: new Date(),
          isBasicProfile: true, // 標記為基本個人檔案
          // 其他基本欄位
          nationality: '',
          bio: '',
          photos: []
        };
        
        await db.collection('profiles').doc(user.uid).set(basicProfile);
        
        console.log(`✅ 為用戶 ${user.email} 建立基本個人檔案`);
        createdCount++;
        
        // 避免過於頻繁的寫入
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ 為用戶 ${user.email} 建立個人檔案失敗:`, error);
        errorCount++;
      }
    }
    
    console.log('\n🎉 完成！統計結果:');
    console.log(`📊 總註冊用戶: ${allUsers.length}`);
    console.log(`✅ 新建個人檔案: ${createdCount}`);
    console.log(`⏭️  跳過已有檔案: ${skippedCount}`);
    console.log(`❌ 建立失敗: ${errorCount}`);
    console.log(`📋 總個人檔案: ${existingProfiles.size + createdCount}`);
    
    if (createdCount > 0) {
      console.log('\n💡 現在您可以重新執行系統通知郵件發送，所有用戶都能收到郵件！');
    }
    
  } catch (error) {
    console.error('❌ 腳本執行失敗:', error);
  }
}

// 執行腳本
createBasicProfiles();

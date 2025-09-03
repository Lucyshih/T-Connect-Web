// check-users.js
// 檢查 Firestore 中的用戶數據和郵件通知狀態

const admin = require('firebase-admin');

// 初始化 Firebase Admin
const serviceAccount = require('./firebaseConfig.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUsers() {
  try {
    console.log('🔍 開始檢查用戶數據...\n');
    
    // 獲取所有用戶資料
    const usersSnapshot = await db.collection('profiles').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ 沒有找到任何用戶');
      return;
    }
    
    console.log(`📊 總計找到 ${usersSnapshot.size} 個用戶\n`);
    
    const userStats = {
      total: 0,
      withEmail: 0,
      withoutEmail: 0,
      notificationsEnabled: 0,
      notificationsDisabled: 0,
      emailNotificationsUndefined: 0,
      canReceiveNotifications: 0
    };
    
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const user = { id: doc.id, ...userData };
      users.push(user);
      
      userStats.total++;
      
      if (user.email) {
        userStats.withEmail++;
      } else {
        userStats.withoutEmail++;
      }
      
      if (user.emailNotifications === true) {
        userStats.notificationsEnabled++;
      } else if (user.emailNotifications === false) {
        userStats.notificationsDisabled++;
      } else {
        userStats.emailNotificationsUndefined++;
      }
      
      // 檢查是否可以接收通知
      if (user.email && user.emailNotifications !== false) {
        userStats.canReceiveNotifications++;
      }
    });
    
    // 顯示統計信息
    console.log('📈 用戶統計:');
    console.log(`   總用戶數: ${userStats.total}`);
    console.log(`   有郵箱: ${userStats.withEmail}`);
    console.log(`   無郵箱: ${userStats.withoutEmail}`);
    console.log(`   通知已啟用: ${userStats.notificationsEnabled}`);
    console.log(`   通知已禁用: ${userStats.notificationsDisabled}`);
    console.log(`   通知狀態未定義: ${userStats.emailNotificationsUndefined}`);
    console.log(`   可以接收通知: ${userStats.canReceiveNotifications}\n`);
    
    // 顯示詳細用戶信息
    console.log('👥 詳細用戶信息:');
    users.forEach((user, index) => {
      const status = user.email && user.emailNotifications !== false ? '✅' : '❌';
      const emailStatus = user.email ? `📧 ${user.email}` : '❌ 無郵箱';
      const notificationStatus = user.emailNotifications === true ? '🔔 已啟用' : 
                                user.emailNotifications === false ? '🔕 已禁用' : '❓ 未定義';
      
      console.log(`${index + 1}. ${status} ${user.displayName || user.name || '未設置名稱'} (${user.id})`);
      console.log(`   ${emailStatus} | ${notificationStatus}`);
      console.log('');
    });
    
    // 分析差異
    const difference = userStats.total - userStats.canReceiveNotifications;
    if (difference > 0) {
      console.log(`⚠️  分析結果:`);
      console.log(`   總用戶數: ${userStats.total}`);
      console.log(`   可以接收通知: ${userStats.canReceiveNotifications}`);
      console.log(`   無法接收通知: ${difference}`);
      console.log(`\n   無法接收通知的原因:`);
      
      if (userStats.withoutEmail > 0) {
        console.log(`   - ${userStats.withoutEmail} 個用戶沒有郵箱地址`);
      }
      if (userStats.notificationsDisabled > 0) {
        console.log(`   - ${userStats.notificationsDisabled} 個用戶已禁用郵件通知`);
      }
      if (userStats.emailNotificationsUndefined > 0) {
        console.log(`   - ${userStats.emailNotificationsUndefined} 個用戶的通知狀態未定義`);
      }
    }
    
    console.log('\n🎯 建議:');
    if (userStats.withoutEmail > 0) {
      console.log(`   - 檢查 ${userStats.withoutEmail} 個無郵箱用戶，確保他們有有效的郵箱地址`);
    }
    if (userStats.notificationsDisabled > 0) {
      console.log(`   - 檢查 ${userStats.notificationsDisabled} 個已禁用通知的用戶，確認是否要重新啟用`);
    }
    if (userStats.emailNotificationsUndefined > 0) {
      console.log(`   - 為 ${userStats.emailNotificationsUndefined} 個通知狀態未定義的用戶設置默認值`);
    }
    
  } catch (error) {
    console.error('❌ 檢查用戶時發生錯誤:', error);
  } finally {
    process.exit(0);
  }
}

// 執行檢查
checkUsers();

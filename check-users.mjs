// check-users.mjs
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const auth = getAuth();
const db = getFirestore();

async function checkUsers() {
  try {
    console.log('🔍 檢查用戶和個人檔案狀況...');
    
    // 取得所有 Firebase Auth 用戶
    const listUsersResult = await auth.listUsers();
    const allUsers = listUsersResult.users;
    console.log(`📊 總共有 ${allUsers.length} 個註冊用戶`);
    
    // 取得所有個人檔案
    const profilesSnapshot = await db.collection('profiles').get();
    const existingProfiles = new Set();
    profilesSnapshot.forEach(doc => {
      existingProfiles.add(doc.id);
    });
    console.log(`📊 總共有 ${existingProfiles.size} 個個人檔案`);
    
    // 找出沒有個人檔案的用戶
    const usersWithoutProfiles = [];
    for (const user of allUsers) {
      if (!existingProfiles.has(user.uid)) {
        usersWithoutProfiles.push({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.metadata.creationTime
        });
      }
    }
    
    console.log(`❌ 有 ${usersWithoutProfiles.length} 個用戶沒有個人檔案:`);
    usersWithoutProfiles.forEach(user => {
      console.log(`  - ${user.email} (${user.displayName || '無顯示名稱'}) - 註冊時間: ${user.createdAt}`);
    });
    
    // 找出有個人檔案但沒有對應 Auth 用戶的（可能是測試數據）
    const profilesWithoutUsers = [];
    for (const profileId of existingProfiles) {
      const userExists = allUsers.some(user => user.uid === profileId);
      if (!userExists) {
        const profileDoc = await db.collection('profiles').doc(profileId).get();
        if (profileDoc.exists) {
          const profileData = profileDoc.data();
          profilesWithoutUsers.push({
            uid: profileId,
            email: profileData.email,
            displayName: profileData.displayName
          });
        }
      }
    }
    
    console.log(`⚠️ 有 ${profilesWithoutUsers.length} 個個人檔案沒有對應的 Auth 用戶:`);
    profilesWithoutUsers.forEach(profile => {
      console.log(`  - ${profile.email} (${profile.displayName || '無顯示名稱'})`);
    });
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error);
  }
}

checkUsers();

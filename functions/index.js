/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const {google} = require("googleapis");
const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");

// 初始化 Firebase Admin
initializeApp();

// 獲取 Firestore 實例
const db = getFirestore();

// 獲取 Auth 實例
const auth = getAuth();

/**
 * 清理過期貼文的 Cloud Function
 * 每天歐洲時間凌晨 2:00 執行
 */
exports.cleanupExpiredPosts = onSchedule({
  schedule: "0 2 * * *", // 每天凌晨 2:00 (UTC)
  timeZone: "Europe/London", // 歐洲時間
  retryCount: 3
}, async (event) => {
  try {
    logger.info("開始清理過期貼文...");
    
    const now = new Date();
    const europeTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
    logger.info(`當前歐洲時間: ${europeTime.toISOString()}`);
    
    // 要清理的集合列表
    const collections = [
      { name: "couches", type: "沙發" },
      { name: "companions", type: "旅伴" },
      { name: "locals", type: "地陪" }
    ];
    
    let totalDeleted = 0;
    
    for (const collection of collections) {
      try {
        logger.info(`開始清理 ${collection.type} 貼文...`);
        
        let snapshot;
        
        if (collection.name === "couches") {
          // 沙發貼文：檢查 selectedRanges 中所有區間的最晚結束日期
          const allDocs = await db.collection(collection.name).get();
          const expiredDocs = [];
          
          allDocs.forEach(doc => {
            const post = doc.data();
            if (post.selectedRanges && Array.isArray(post.selectedRanges) && post.selectedRanges.length > 0) {
              // 找到所有區間中最晚的結束日期
              let latestEndDate = null;
              post.selectedRanges.forEach(range => {
                if (range && range.end) {
                  const endDate = range.end.toDate();
                  if (!latestEndDate || endDate > latestEndDate) {
                    latestEndDate = endDate;
                  }
                }
              });
              
              // 如果最晚的結束日期已過期，則標記為過期
              if (latestEndDate && latestEndDate < europeTime) {
                expiredDocs.push(doc);
              }
            }
          });
          
          // 創建一個模擬的 snapshot
          snapshot = {
            empty: expiredDocs.length === 0,
            forEach: (callback) => expiredDocs.forEach(callback)
          };
        } else {
          // 旅伴和地陪貼文：使用 endDate 查詢
          snapshot = await db.collection(collection.name)
            .where("endDate", "<", europeTime)
            .get();
        }
        
        if (snapshot.empty) {
          logger.info(`${collection.type} 集合中沒有過期貼文`);
          continue;
        }
        
        // 批量刪除過期貼文
        const batch = db.batch();
        const expiredPosts = [];
        const postIdsToDelete = [];
        
        snapshot.forEach(doc => {
          const post = doc.data();
          expiredPosts.push({
            id: doc.id,
            title: post.title || post.destination || "未命名",
            endDate: post.endDate?.toDate?.() || post.endDate
          });
          
          // 收集貼文ID，用於後續刪除聊天室
          postIdsToDelete.push(doc.id);
          
          batch.delete(doc.ref);
        });
        
        // 執行批量刪除貼文
        await batch.commit();
        
        logger.info(`成功刪除 ${expiredPosts.length} 個過期的 ${collection.type} 貼文:`, expiredPosts);
        
        // 刪除對應的聊天室
        try {
          logger.info(`開始刪除 ${expiredPosts.length} 個貼文對應的聊天室...`);
          let totalChatroomsDeleted = 0;
          
          for (const postId of postIdsToDelete) {
            // 查詢與此貼文相關的聊天室
            const chatroomSnapshot = await db.collection('chatrooms')
              .where('postId', '==', postId)
              .get();
            
            if (!chatroomSnapshot.empty) {
              logger.info(`貼文 ${postId} 有 ${chatroomSnapshot.size} 個相關聊天室，開始刪除...`);
              
              // 批量刪除聊天室
              const chatroomBatch = db.batch();
              chatroomSnapshot.forEach(doc => {
                chatroomBatch.delete(doc.ref);
              });
              
              await chatroomBatch.commit();
              totalChatroomsDeleted += chatroomSnapshot.size;
              logger.info(`貼文 ${postId} 的聊天室刪除成功`);
            }
          }
          
          logger.info(`成功刪除 ${totalChatroomsDeleted} 個相關聊天室`);
        } catch (chatroomError) {
          logger.error(`刪除聊天室時發生錯誤:`, chatroomError);
          // 即使聊天室刪除失敗，也不影響貼文刪除的結果
        }
        
        totalDeleted += expiredPosts.length;
        
      } catch (error) {
        logger.error(`清理 ${collection.type} 集合時發生錯誤:`, error);
        // 繼續處理下一個集合
      }
    }
    
    logger.info(`清理完成！總共刪除了 ${totalDeleted} 個過期貼文`);
    
    // 返回成功訊息
    return {
      success: true,
      message: `成功清理 ${totalDeleted} 個過期貼文`,
      timestamp: europeTime.toISOString(),
      collectionsProcessed: collections.length
    };
    
  } catch (error) {
    logger.error("清理過期貼文時發生嚴重錯誤:", error);
    throw error;
  }
});

/**
 * HTTP 觸發的清理函數（用於手動測試）
 */
exports.cleanupExpiredPostsManual = onRequest(async (request, response) => {
  try {
    // 檢查是否為 POST 請求
    if (request.method !== "POST") {
      response.status(405).send("只允許 POST 請求");
      return;
    }
    
    // 檢查認證（這裡可以加入你的認證邏輯）
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      response.status(401).send("需要認證");
      return;
    }
    
    // 執行清理邏輯
    const result = await exports.cleanupExpiredPosts();
    
    response.status(200).json({
      success: true,
      message: "手動清理完成",
      result: result
    });
    
  } catch (error) {
    logger.error("手動清理時發生錯誤:", error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 測試函數
 */
exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

/**
 * 定期檢查個人檔案函數
 * 每天檢查並修復缺少個人檔案的用戶
 */
exports.periodicProfileCheck = onSchedule({
  schedule: "0 2 * * *", // 每天凌晨 2 點執行
  timeZone: "Asia/Taipei",
  memory: "256MiB",
  timeoutSeconds: 300
}, async (event) => {
  try {
    logger.info("開始定期檢查個人檔案...");
    
    // 獲取所有註冊用戶
    const listUsersResult = await auth.listUsers();
    const allUsers = listUsersResult.users;
    
    // 獲取現有的個人檔案
    const profilesSnapshot = await db.collection('profiles').get();
    const existingProfiles = new Set();
    profilesSnapshot.forEach(doc => {
      existingProfiles.add(doc.id);
    });
    
    let createdCount = 0;
    let errorCount = 0;
    
    // 為缺少個人檔案的用戶建立基本個人檔案
    for (const user of allUsers) {
      try {
        if (existingProfiles.has(user.uid)) {
          continue; // 已有個人檔案，跳過
        }
        
        // 建立基本個人檔案
        const basicProfile = {
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          emailNotifications: true,
          createdAt: new Date(),
          isBasicProfile: true,
          nationality: '',
          bio: '',
          photos: []
        };
        
        await db.collection('profiles').doc(user.uid).set(basicProfile);
        logger.info(`為用戶 ${user.email} 建立基本個人檔案`);
        createdCount++;
        
        // 避免過於頻繁的寫入
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error(`為用戶 ${user.email} 建立個人檔案失敗:`, error);
        errorCount++;
      }
    }
    
    logger.info(`定期檢查完成！新建: ${createdCount}, 失敗: ${errorCount}`);
    
  } catch (error) {
    logger.error("定期檢查個人檔案失敗:", error);
  }
});

/**
 * 手動觸發定期檢查函數
 * 可以手動執行個人檔案檢查
 */
exports.manualProfileCheck = onRequest(async (request, response) => {
  try {
    // 檢查是否為 POST 請求
    if (request.method !== "POST") {
      response.status(405).send("只允許 POST 請求");
      return;
    }
    
    // 檢查認證
    const { authToken } = request.body;
    if (!authToken || authToken !== "tconnect_admin_2025") {
      response.status(401).send("需要認證");
      return;
    }
    
    logger.info("開始手動檢查個人檔案...");
    
    // 獲取所有註冊用戶
    const listUsersResult = await auth.listUsers();
    const allUsers = listUsersResult.users;
    
    // 獲取現有的個人檔案
    const profilesSnapshot = await db.collection('profiles').get();
    const existingProfiles = new Set();
    profilesSnapshot.forEach(doc => {
      existingProfiles.add(doc.id);
    });
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 為缺少個人檔案的用戶建立基本個人檔案
    for (const user of allUsers) {
      try {
        if (existingProfiles.has(user.uid)) {
          skippedCount++;
          continue;
        }
        
        // 建立基本個人檔案
        const basicProfile = {
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          emailNotifications: true,
          createdAt: new Date(),
          isBasicProfile: true,
          nationality: '',
          bio: '',
          photos: []
        };
        
        await db.collection('profiles').doc(user.uid).set(basicProfile);
        logger.info(`為用戶 ${user.email} 建立基本個人檔案`);
        createdCount++;
        
        // 避免過於頻繁的寫入
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error(`為用戶 ${user.email} 建立個人檔案失敗:`, error);
        errorCount++;
      }
    }
    
    logger.info(`手動檢查完成！新建: ${createdCount}, 跳過: ${skippedCount}, 失敗: ${errorCount}`);
    
    response.status(200).json({
      success: true,
      message: "個人檔案檢查完成",
      totalUsers: allUsers.length,
      createdProfiles: createdCount,
      skippedProfiles: skippedCount,
      failedProfiles: errorCount,
      totalProfiles: existingProfiles.size + createdCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error("手動檢查個人檔案失敗:", error);
    response.status(500).json({
      success: false,
      message: "檢查失敗",
      error: error.message
    });
  }
});

/**
 * 創建基本個人檔案函數
 * 為所有註冊用戶建立基本的個人檔案
 */
exports.createBasicProfiles = onRequest(async (request, response) => {
  try {
    // 檢查是否為 POST 請求
    if (request.method !== "POST") {
      response.status(405).send("只允許 POST 請求");
      return;
    }
    
    // 檢查認證
    const { authToken } = request.body;
    if (!authToken || authToken !== "tconnect_admin_2025") {
      response.status(401).send("需要認證");
      return;
    }
    
    logger.info("開始為所有註冊用戶建立基本個人檔案...");
    
    // 獲取所有註冊用戶
    const listUsersResult = await auth.listUsers();
    const allUsers = listUsersResult.users;
    
    logger.info(`找到 ${allUsers.length} 個註冊用戶`);
    
    // 獲取現有的個人檔案
    const profilesSnapshot = await db.collection('profiles').get();
    const existingProfiles = new Set();
    profilesSnapshot.forEach(doc => {
      existingProfiles.add(doc.id);
    });
    
    logger.info(`現有個人檔案: ${existingProfiles.size} 個`);
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 為每個用戶建立基本個人檔案
    for (const user of allUsers) {
      try {
        if (existingProfiles.has(user.uid)) {
          logger.info(`跳過用戶 ${user.email}: 已有個人檔案`);
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
          nationality: '',
          bio: '',
          photos: []
        };
        
        await db.collection('profiles').doc(user.uid).set(basicProfile);
        
        logger.info(`為用戶 ${user.email} 建立基本個人檔案`);
        createdCount++;
        
        // 避免過於頻繁的寫入
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error(`為用戶 ${user.email} 建立個人檔案失敗:`, error);
        errorCount++;
      }
    }
    
    logger.info(`完成！新建: ${createdCount}, 跳過: ${skippedCount}, 失敗: ${errorCount}`);
    
    response.status(200).json({
      success: true,
      message: "基本個人檔案創建完成",
      totalUsers: allUsers.length,
      createdProfiles: createdCount,
      skippedProfiles: skippedCount,
      failedProfiles: errorCount,
      totalProfiles: existingProfiles.size + createdCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error("創建基本個人檔案時發生錯誤:", error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 一次性系統通知函數
 * 向所有用戶發送聊天通知功能恢復的郵件
 */
exports.sendSystemNotification = onRequest({
  secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_EMAIL"]
}, async (request, response) => {
  try {
    // 檢查是否為 POST 請求
    if (request.method !== "POST") {
      response.status(405).send("只允許 POST 請求");
      return;
    }
    
    // 檢查認證（這裡可以加入你的認證邏輯）
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      response.status(401).send("需要認證");
      return;
    }
    
    logger.info("開始發送系統通知郵件...");
    
    // 獲取所有註冊用戶資料（從 profiles 集合，因為這是存儲用戶資料的地方）
    const profilesSnapshot = await db.collection("profiles").get();
    
    if (profilesSnapshot.empty) {
      logger.info("沒有找到任何用戶資料");
      response.status(200).json({
        success: true,
        message: "沒有找到任何用戶資料",
        emailsSent: 0
      });
      return;
    }
    
    logger.info(`找到 ${profilesSnapshot.size} 個用戶資料`);
    
    let emailsSent = 0;
    let emailsFailed = 0;
    const failedEmails = [];
    
    // 批量處理用戶
    const batchSize = 10; // 每批處理10個用戶
    const users = [];
    profilesSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({ 
        id: doc.id, 
        ...userData
      });
    });
    
    logger.info(`開始處理 ${users.length} 個用戶，分批發送郵件...`);
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      // 並行發送郵件
      const promises = batch.map(async (user) => {
        try {
          // 檢查用戶是否有郵箱
          if (!user.email) {
            logger.info(`跳過用戶 ${user.id}: 無郵箱`);
            return { success: false, reason: "no_email", userId: user.id };
          }
          
          // 檢查是否禁用通知（預設啟用通知）
          if (user.emailNotifications === false) {
            logger.info(`跳過用戶 ${user.id}: 已禁用通知`);
            return { success: false, reason: "notifications_disabled", userId: user.id };
          }
          
          // 發送系統通知郵件
          const userName = user.displayName || user.name || "T-Connect 用戶";
          await sendSystemEmail(user.email, userName);
          
          logger.info(`成功發送系統通知郵件給用戶 ${user.id}: ${user.email}`);
          return { success: true, userId: user.id, email: user.email };
          
        } catch (error) {
          logger.error(`發送郵件給用戶 ${user.id} 失敗:`, error);
          return { success: false, reason: "send_failed", userId: user.id, email: user.email, error: error.message };
        }
      });
      
      // 等待當前批次完成
      const results = await Promise.all(promises);
      
      // 統計結果
      results.forEach(result => {
        if (result.success) {
          emailsSent++;
        } else {
          emailsFailed++;
          if (result.email) {
            failedEmails.push(result.email);
          }
        }
      });
      
      // 批次間隔，避免過於頻繁的 API 調用
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
      }
      
      logger.info(`批次 ${Math.floor(i / batchSize) + 1} 完成，已發送: ${emailsSent}, 失敗: ${emailsFailed}`);
    }
    
    logger.info(`系統通知郵件發送完成！總計: 成功 ${emailsSent} 封, 失敗 ${emailsFailed} 封`);
    
    response.status(200).json({
      success: true,
      message: "系統通知郵件發送完成",
      totalUsers: users.length,
      emailsSent: emailsSent,
      emailsFailed: emailsFailed,
      failedEmails: failedEmails,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error("發送系統通知時發生錯誤:", error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 監控用戶註冊函數
 * 當新用戶註冊時，確保建立個人檔案並記錄
 */
exports.monitorUserRegistration = onDocumentCreated({
  document: "profiles/{userId}",
  memory: "256MiB",
  timeoutSeconds: 60
}, async (event) => {
  try {
    const snap = event.data;
    if (!snap) {
      logger.info("No data associated with the event");
      return;
    }

    const userId = event.params.userId;
    const profileData = snap.data();
    
    logger.info(`新用戶個人檔案建立: ${profileData.email} (${userId})`);
    
    // 檢查是否為基本個人檔案
    if (profileData.isBasicProfile) {
      logger.info(`✅ 基本個人檔案建立成功: ${profileData.email}`);
    } else {
      logger.info(`📝 完整個人檔案建立: ${profileData.email}`);
    }
    
    // 記錄用戶註冊統計
    const statsRef = db.collection('systemStats').doc('userRegistration');
    await statsRef.set({
      lastRegistration: new Date(),
      totalRegistrations: admin.firestore.FieldValue.increment(1),
      lastUpdated: new Date()
    }, { merge: true });
    
  } catch (error) {
    logger.error("監控用戶註冊失敗:", error);
  }
});

/**
 * 聊天通知函數
 * 當 Firestore 中的訊息被新增時觸發
 */
exports.sendChatNotification = onDocumentCreated({
  document: "chatrooms/{chatroomId}/messages/{messageId}",
  memory: "256MiB",
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 10,
  secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_EMAIL"]
}, async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.info("No data associated with the event");
      return;
    }

    const messageData = snap.data();
    const messageId = event.params.messageId;
    const chatroomId = event.params.chatroomId;

    logger.info("New message detected:", messageId, "in chatroom:", chatroomId);

    try {
      const senderId = messageData.senderId;
      const messageContent = messageData.text;

      logger.info("Message details:", {senderId, messageContent});

      if (!senderId) {
        logger.info("Missing senderId");
        return;
      }

      const chatroomDoc = await db
        .collection("chatrooms")
        .doc(chatroomId)
        .get();

      if (!chatroomDoc.exists) {
        logger.info("Chatroom not found:", chatroomId);
        return;
      }

      const chatroomData = chatroomDoc.data();
      const participants = chatroomData.participants || [];

      const receiverId = participants.find(
        (participantId) => participantId !== senderId,
      );

      if (!receiverId) {
        logger.info("No receiver found in chatroom:", chatroomId);
        return;
      }

      logger.info("Receiver ID:", receiverId);

      // 先嘗試從 profiles 集合獲取用戶資料
      let userDoc = await db.collection("profiles").doc(receiverId).get();
      let userData = null;
      
      if (userDoc.exists) {
        userData = userDoc.data();
        logger.info("User profile found:", receiverId);
      } else {
        // 如果沒有個人檔案，嘗試從 users 集合獲取基本資料
        logger.info("No profile found for user, checking users collection:", receiverId);
        userDoc = await db.collection("users").doc(receiverId).get();
        
        if (userDoc.exists) {
          userData = userDoc.data();
          logger.info("User basic info found:", receiverId);
        } else {
          logger.info("User not found in both collections:", receiverId);
          return;
        }
      }

      const receiverEmail = userData.email;

      // 檢查是否禁用通知（如果沒有個人檔案，預設啟用通知）
      if (userData.emailNotifications === false) {
        logger.info("User disabled email notifications:", receiverId);
        return;
      }

      if (!receiverEmail) {
        logger.info("No email found for user:", receiverId);
        return;
      }

      const lastEmailSent = userData.lastEmailSent;
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      if (lastEmailSent && lastEmailSent.toDate && lastEmailSent.toDate() > fiveMinutesAgo) {
        logger.info("Email already sent recently for user:", receiverId);
        return;
      }

      let senderName = "匿名用戶";
      if (senderId) {
        // 先嘗試從 profiles 集合獲取發送者資料
        let senderDoc = await db.collection("profiles").doc(senderId).get();
        
        if (senderDoc.exists) {
          const senderData = senderDoc.data();
          senderName = senderData.displayName ||
            senderData.name ||
            "匿名用戶";
        } else {
          // 如果沒有個人檔案，嘗試從 users 集合獲取基本資料
          senderDoc = await db.collection("users").doc(senderId).get();
          
          if (senderDoc.exists) {
            const senderData = senderDoc.data();
            senderName = senderData.displayName ||
              senderData.name ||
              senderData.firstName ||
              senderData.lastName ||
              "匿名用戶";
          }
        }
      }

      await sendEmail(receiverEmail, senderName, messageContent);

      // 更新 lastEmailSent，優先更新 profiles 集合，如果沒有則更新 users 集合
      try {
        await db
          .collection("profiles")
          .doc(receiverId)
          .update({
            lastEmailSent: now,
          });
        logger.info("Updated lastEmailSent in profiles collection for user:", receiverId);
      } catch (error) {
        // 如果 profiles 集合更新失敗，嘗試更新 users 集合
        logger.info("Failed to update profiles, trying users collection for user:", receiverId);
        try {
          await db
            .collection("users")
            .doc(receiverId)
            .update({
              lastEmailSent: now,
            });
          logger.info("Updated lastEmailSent in users collection for user:", receiverId);
        } catch (updateError) {
          logger.warn("Failed to update lastEmailSent in both collections for user:", receiverId, updateError);
        }
      }

      logger.info("Email notification sent successfully to:", receiverEmail);
    } catch (error) {
      logger.error("Error sending email notification:", error);
    }
  },
);

/**
 * 發送系統通知郵件的輔助函數
 */
async function sendSystemEmail(to, userName) {
  try {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    
    const fromEmail = process.env.GMAIL_EMAIL || "tconnectweb@gmail.com";

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Gmail configuration missing. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables.");
    }

    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground",
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: fromEmail,
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: `"T-Connect 系統通知" <${fromEmail}>`,
      to: to,
      subject: `🔔 系統通知恢復 - 請查看您的聊天訊息`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: #34a853; 
              color: white; 
              padding: 20px; 
              border-radius: 8px 8px 0 0; 
              text-align: center;
            }
            .content { 
              background: #f9f9f9; 
              padding: 20px; 
              border-radius: 0 0 8px 8px; 
            }
            .notice { 
              background: #fff3cd; 
              border: 1px solid #ffeaa7; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 15px 0; 
            }
            .button { 
              display: inline-block; 
              background: #34a853; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 15px 0; 
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔔 T-Connect 系統通知</h2>
            </div>
            <div class="content">
              <p>親愛的 ${userName}，</p>
              
              <div class="notice">
                <h3>📢 重要通知：聊天通知功能已恢復</h3>
                <p><strong>由於 9/3 當天聊天室通知功能有錯誤，部分聊天通知可能沒有送達。</strong></p>
                <p>請登入 T-Connect 查看是否有未讀訊息。</p>
              </div>
              
              <p>我們已經修復了聊天通知系統，現在所有新訊息都會正常發送郵件通知。</p>
              
              <p>為確保您不會錯過任何重要訊息，建議您：</p>
              <ul>
                <li>立即登入 T-Connect 檢查聊天室</li>
                <li>查看是否有未讀訊息</li>
                <li>確認您的郵件通知設置是否正確</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="https://travelconnect-4a4df.web.app/" class="button">
                  🔍 立即查看聊天室
                </a>
              </div>
              
              <div class="footer">
                <p><strong>感謝您對 T-Connect 的支持！</strong></p>
                <p>如果您有任何問題，請聯繫我們的客服團隊。</p>
                <p>這是系統自動發送的郵件，請勿直接回覆。</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🔔 T-Connect 系統通知

親愛的 ${userName}，

📢 重要通知：聊天通知功能已恢復

由於 9/3 當天聊天室通知功能有錯誤，部分聊天通知可能沒有送達。
請登入 T-Connect 查看是否有未讀訊息。

我們已經修復了聊天通知系統，現在所有新訊息都會正常發送郵件通知。

為確保您不會錯過任何重要訊息，建議您：
- 立即登入 T-Connect 檢查聊天室
- 查看是否有未讀訊息
- 確認您的郵件通知設置是否正確

立即查看：https://travelconnect-4a4df.web.app/

---
感謝您對 T-Connect 的支持！
如果您有任何問題，請聯繫我們的客服團隊。
這是系統自動發送的郵件，請勿直接回覆。
      `.trim(),
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info("系統通知郵件發送成功:", result.messageId);

    return result;
  } catch (error) {
    logger.error("發送系統通知郵件失敗:", error);
    throw error;
  }
}

// 全域變數存儲 OAuth2 客戶端和 token 信息
let oauth2Client = null;
let currentAccessToken = null;
let tokenExpiryTime = null;

// 初始化 OAuth2 客戶端
function initializeOAuth2Client() {
  if (!oauth2Client) {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Gmail OAuth2 configuration missing. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables.");
    }
    
    oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
  }
  return oauth2Client;
}

// 獲取有效的 access token（自動刷新）
async function getValidAccessToken() {
  try {
    const client = initializeOAuth2Client();
    
    // 如果沒有 token 或 token 即將過期（提前 5 分鐘刷新）
    if (!currentAccessToken || !tokenExpiryTime || Date.now() >= (tokenExpiryTime - 5 * 60 * 1000)) {
      logger.info("正在刷新 Gmail OAuth2 token...");
      
      const { credentials } = await client.refreshAccessToken();
      currentAccessToken = credentials.access_token;
      tokenExpiryTime = credentials.expiry_date;
      
      logger.info("Gmail OAuth2 token 刷新成功");
    }
    
    return currentAccessToken;
  } catch (error) {
    logger.error("刷新 Gmail OAuth2 token 失敗:", error);
    throw error;
  }
}

/**
 * 發送聊天通知郵件的輔助函數
 */
async function sendEmail(to, senderName, messageContent) {
  try {
    const fromEmail = process.env.GMAIL_EMAIL || "tconnectweb@gmail.com";

    if (!fromEmail) {
      throw new Error("Gmail email configuration missing.");
    }

    const accessToken = await getValidAccessToken();
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Gmail configuration missing. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: fromEmail,
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        accessToken: accessToken,
      },
    });

    const truncatedContent = messageContent && messageContent.length > 100 ?
      messageContent.substring(0, 100) + "..." :
      messageContent || "(無內容)";

    const mailOptions = {
      from: `"T-Connect 通知" <${fromEmail}>`,
      to: to,
      subject: `💬 新訊息來自 ${senderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: #4285f4; 
              color: white; 
              padding: 20px; 
              border-radius: 8px 8px 0 0; 
            }
            .content { 
              background: #f9f9f9; 
              padding: 20px; 
              border-radius: 0 0 8px 8px; 
            }
            .message { 
              background: white; 
              padding: 15px; 
              border-left: 4px solid #4285f4; 
              margin: 15px 0; 
            }
            .button { 
              display: inline-block; 
              background: #4285f4; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 15px 0; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>T-Connect - 新訊息通知</h2>
            </div>
            <div class="content">
              <p>你好！</p>
              <p>你在 T-Connect 聊天室收到一則新訊息：</p>
              
              <div class="message">
                <p><strong>來自:</strong> ${senderName}</p>
                <p><strong>內容:</strong> ${truncatedContent}</p>
              </div>
              
              <p>請登入查看完整對話內容。</p>
              
              <a href="https://travelconnect-4a4df.web.app/" class="button">
                查看訊息
              </a>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <p style="font-size: 12px; color: #666;">
                如果你不想接收郵件通知，可以在個人設置中關閉此功能。<br>
                這是自動發送的郵件，請勿直接回覆。
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
T-Connect - 新訊息通知

你收到一則新訊息：
來自: ${senderName}
內容: ${truncatedContent}

請登入 T-Connect 查看完整對話。

---
這是自動發送的郵件，請勿直接回覆。
      `.trim(),
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info("Email sent successfully:", result.messageId);

    return result;
  } catch (error) {
    logger.error("Error in sendEmail function:", error);
    throw error;
  }
}

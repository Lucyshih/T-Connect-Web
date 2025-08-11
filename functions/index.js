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
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

// 初始化 Firebase Admin
initializeApp();

// 獲取 Firestore 實例
const db = getFirestore();

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
        
        // 查詢所有 endDate 小於當前時間的貼文
        const snapshot = await db.collection(collection.name)
          .where("endDate", "<", europeTime)
          .get();
        
        if (snapshot.empty) {
          logger.info(`${collection.type} 集合中沒有過期貼文`);
          continue;
        }
        
        // 批量刪除過期貼文
        const batch = db.batch();
        const expiredPosts = [];
        
        snapshot.forEach(doc => {
          const post = doc.data();
          expiredPosts.push({
            id: doc.id,
            title: post.title || post.destination || "未命名",
            endDate: post.endDate?.toDate?.() || post.endDate
          });
          
          batch.delete(doc.ref);
        });
        
        // 執行批量刪除
        await batch.commit();
        
        logger.info(`成功刪除 ${expiredPosts.length} 個過期的 ${collection.type} 貼文:`, expiredPosts);
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

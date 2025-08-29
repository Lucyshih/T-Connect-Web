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
const {google} = require("googleapis");
const nodemailer = require("nodemailer");
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
        
        let snapshot;
        
        if (collection.name === "couches") {
          // 沙發貼文：檢查 selectedRanges 中的最後一個 end 日期
          const allDocs = await db.collection(collection.name).get();
          const expiredDocs = [];
          
          allDocs.forEach(doc => {
            const post = doc.data();
            if (post.selectedRanges && Array.isArray(post.selectedRanges) && post.selectedRanges.length > 0) {
              const lastRange = post.selectedRanges[post.selectedRanges.length - 1];
              if (lastRange && lastRange.end) {
                const endDate = lastRange.end.toDate();
                if (endDate < europeTime) {
                  expiredDocs.push(doc);
                }
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
 * 聊天通知函數
 * 當 Firestore 中的訊息被新增時觸發
 */
exports.sendChatNotification = onDocumentCreated(
  "chatrooms/{chatroomId}/messages/{messageId}",
  async (event) => {
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

      const userDoc = await db
        .collection("profiles")
        .doc(receiverId)
        .get();

      if (!userDoc.exists) {
        logger.info("Receiver user not found:", receiverId);
        return;
      }

      const userData = userDoc.data();
      const receiverEmail = userData.email;

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
        const senderDoc = await db
          .collection("profiles")
          .doc(senderId)
          .get();

        if (senderDoc.exists) {
          const senderData = senderDoc.data();
          senderName = senderData.displayName ||
            senderData.name ||
            "匿名用戶";
        }
      }

      await sendEmail(receiverEmail, senderName, messageContent);

      await db
        .collection("profiles")
        .doc(receiverId)
        .update({
          lastEmailSent: now,
        });

      logger.info("Email notification sent successfully to:", receiverEmail);
    } catch (error) {
      logger.error("Error sending email notification:", error);
    }
  },
);

/**
 * 發送郵件的輔助函數
 */
async function sendEmail(to, senderName, messageContent) {
  try {
    const clientId = process.env.GMAIL_CLIENT_ID || "658893138453-f5tid88k6dhatull8ae7br5u46agvkk1.apps.googleusercontent.com";
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || "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";
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN || "1//0eCL26XsD7W-dCgYIARAAGA4SNwF-L9Irp9Y2lYXRp1Uupvd6tmT32eRaAaoeoUAiWgQAQEVd79uq_pL-gN0pLLXKyleL8ezJtNY";
    const fromEmail = process.env.GMAIL_EMAIL || "tconnectweb@gmail.com";

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Gmail configuration missing. Please set environment variables.");
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
        accessToken: accessToken.token,
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

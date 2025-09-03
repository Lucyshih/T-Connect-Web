const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {google} = require("googleapis");
const nodemailer = require("nodemailer");

// 初始化 Firebase Admin
initializeApp();
const db = getFirestore();

// 設定 Gmail OAuth2
const OAuth2 = google.auth.OAuth2;

// 當 Firestore 中的訊息被新增時觸發
exports.sendChatNotification = onDocumentCreated(
  "chatrooms/{chatroomId}/messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return;
    }

    const messageData = snap.data();
    const messageId = event.params.messageId;
    const chatroomId = event.params.chatroomId;

    console.log("New message detected:", messageId, "in chatroom:", chatroomId);

    try {
      const senderId = messageData.senderId;
      const messageContent = messageData.text;

      console.log("Message details:", {senderId, messageContent});

      if (!senderId) {
        console.log("Missing senderId");
        return;
      }

      const chatroomDoc = await db
        .collection("chatrooms")
        .doc(chatroomId)
        .get();

      if (!chatroomDoc.exists) {
        console.log("Chatroom not found:", chatroomId);
        return;
      }

      const chatroomData = chatroomDoc.data();
      const participants = chatroomData.participants || [];

      const receiverId = participants.find(
        (participantId) => participantId !== senderId,
      );

      if (!receiverId) {
        console.log("No receiver found in chatroom:", chatroomId);
        return;
      }

      console.log("Receiver ID:", receiverId);

      const userDoc = await db
        .collection("profiles")
        .doc(receiverId)
        .get();

      if (!userDoc.exists) {
        console.log("Receiver user not found:", receiverId);
        return;
      }

      const userData = userDoc.data();
      const receiverEmail = userData.email;

      if (userData.emailNotifications === false) {
        console.log("User disabled email notifications:", receiverId);
        return;
      }

      if (!receiverEmail) {
        console.log("No email found for user:", receiverId);
        return;
      }

      const lastEmailSent = userData.lastEmailSent;
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      if (lastEmailSent && lastEmailSent.toDate && lastEmailSent.toDate() > fiveMinutesAgo) {
        console.log("Email already sent recently for user:", receiverId);
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

      console.log("Email notification sent successfully to:", receiverEmail);
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  },
);

async function sendEmail(to, senderName, messageContent) {
  try {
    const clientId = process.env.GMAIL_CLIENT_ID || "658893138453-f5tid88k6dhatull8ae7br5u46agvkk1.apps.googleusercontent.com";
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || "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";
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN || "1//0eCL26XsD7W-dCgYIARAAGA4SNwF-L9Irp9Y2lYXRp1Uupvd6tmT32eRaAaoeoUAiWgQAQEVd79uq_pL-gN0pLLXKyleL8ezJtNY";
    const fromEmail = process.env.GMAIL_EMAIL || "tconnectweb@gmail.com";

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Gmail configuration missing. Please set environment variables.");
    }

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
    console.log("Email sent successfully:", result.messageId);

    return result;
  } catch (error) {
    console.error("Error in sendEmail function:", error);
    throw error;
  }
}

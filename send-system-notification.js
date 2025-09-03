// send-system-notification.js
// 觸發系統通知郵件發送的測試腳本

const https = require('https');

// 函數 URL
const functionUrl = 'https://us-central1-travelconnect-4a4df.cloudfunctions.net/sendSystemNotification';

// 認證 token（您需要提供一個有效的 token）
const authToken = 'tconnect_admin_2025'; // 請替換為實際的認證 token

// 發送 POST 請求
function sendSystemNotification() {
  const postData = JSON.stringify({
    action: 'send_notification'
  });

  const options = {
    hostname: 'us-central1-travelconnect-4a4df.cloudfunctions.net',
    port: 443,
    path: '/sendSystemNotification',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${authToken}`
    }
  };

  const req = https.request(options, (res) => {
    console.log(`狀態碼: ${res.statusCode}`);
    console.log(`響應頭: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('響應內容:', JSON.stringify(response, null, 2));
        
        if (response.success) {
          console.log('✅ 系統通知郵件發送成功！');
          console.log(`📧 總計發送: ${response.emailsSent} 封`);
          console.log(`❌ 發送失敗: ${response.emailsFailed} 封`);
          if (response.failedEmails && response.failedEmails.length > 0) {
            console.log('失敗的郵箱:', response.failedEmails);
          }
        } else {
          console.log('❌ 系統通知郵件發送失敗:', response.error);
        }
      } catch (e) {
        console.log('原始響應:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('請求錯誤:', e);
  });

  req.write(postData);
  req.end();
}

// 執行函數
console.log('🚀 開始發送系統通知郵件...');
console.log('⚠️  請確保您已經設置了正確的認證 token');
console.log('');

if (authToken === 'YOUR_AUTH_TOKEN_HERE') {
  console.log('❌ 請先設置認證 token！');
  console.log('請將腳本中的 YOUR_AUTH_TOKEN_HERE 替換為實際的認證 token');
} else {
  sendSystemNotification();
}

console.log('');
console.log('📝 使用說明:');
console.log('1. 將 YOUR_AUTH_TOKEN_HERE 替換為有效的認證 token');
console.log('2. 運行腳本: node send-system-notification.js');
console.log('3. 腳本會向所有啟用郵件通知的用戶發送系統通知');
console.log('');
console.log('🔒 安全提醒: 此函數需要認證，請確保 token 的安全性');

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// 驗證用戶令牌
router.post('/verify-token', async (req, res) => {
  try {
    console.log('Received token request:', req.body);
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: '未提供令牌' });
    }

    // 檢查是否為測試環境的 JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded JWT:', decoded);
      return res.json({ 
        token,
        user: decoded 
      });
    } catch (jwtError) {
      console.log('JWT verification failed, trying Firebase:', jwtError);
      
      // 如果不是有效的 JWT，嘗試驗證 Firebase token
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Firebase decoded token:', decodedToken);
        
        const jwtToken = jwt.sign(
          { 
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name
          }, 
          process.env.JWT_SECRET
        );
        
        return res.json({ token: jwtToken });
      } catch (firebaseError) {
        console.error('Firebase verification failed:', firebaseError);
        return res.status(401).json({ 
          error: '無效的令牌',
          details: firebaseError.message 
        });
      }
    }
  } catch (error) {
    console.error('Auth route error:', error);
    res.status(500).json({ 
      error: '驗證過程發生錯誤',
      details: error.message 
    });
  }
});

module.exports = router; 
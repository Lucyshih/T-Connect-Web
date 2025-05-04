const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '請提供驗證令牌' });
    }

    try {
      // 使用與生成 token 時相同的密鑰進行驗證
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 模擬用戶數據（測試環境）
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.displayName
      };
      
      req.token = token;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ error: '無效的令牌' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: '驗證過程發生錯誤' });
  }
};

// 檢查資源所有權
const checkOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const collection = req.baseUrl.split('/')[2]; // 獲取集合名稱，如 'posts'
    
    const doc = await admin.firestore().collection(collection).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: '資源不存在' });
    }
    
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: '沒有權限執行此操作' });
    }
    
    req.document = doc;
    next();
  } catch (error) {
    res.status(500).json({ error: '驗證所有權時發生錯誤' });
  }
};

module.exports = { auth, checkOwnership }; 
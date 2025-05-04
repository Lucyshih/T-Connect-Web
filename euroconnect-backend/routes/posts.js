const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { auth, checkOwnership } = require('../middleware/authMiddleware');

const db = admin.firestore();

// 獲取所有貼文（公開）
router.get('/', async (req, res) => {
  try {
    const postsSnapshot = await db.collection('posts')
      .orderBy('createdAt', 'desc')
      .get();
    
    const posts = [];
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      // 如果用戶未登入，只返回基本信息
      posts.push({
        id: doc.id,
        type: data.type,
        location: data.location,
        createdAt: data.createdAt
      });
    });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: '獲取貼文失敗' });
  }
});

// 獲取貼文詳情（需要驗證才能看到完整信息）
router.get('/:id', auth, async (req, res) => {
  try {
    const postDoc = await db.collection('posts').doc(req.params.id).get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ error: '貼文不存在' });
    }
    
    const data = postDoc.data();
    res.json({
      id: postDoc.id,
      ...data,
      // 只有作者才能看到某些敏感信息
      contactInfo: data.userId === req.user.uid ? data.contactInfo : undefined
    });
  } catch (error) {
    res.status(500).json({ error: '獲取貼文失敗' });
  }
});

// 創建新貼文（需要驗證）
router.post('/', auth, async (req, res) => {
  try {
    const { type, location, description, contactInfo } = req.body;
    
    // 驗證必要欄位
    if (!type || !location || !description) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    const newPost = {
      type,
      location,
      description,
      contactInfo,
      userId: req.user.uid,
      userEmail: req.user.email,
      userName: req.user.displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('posts').add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });
  } catch (error) {
    res.status(500).json({ error: '創建貼文失敗' });
  }
});

// 更新貼文（需要驗證和所有權檢查）
router.put('/:id', auth, checkOwnership, async (req, res) => {
  try {
    const { type, location, description, contactInfo } = req.body;
    const updates = {
      ...(type && { type }),
      ...(location && { location }),
      ...(description && { description }),
      ...(contactInfo && { contactInfo }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('posts').doc(req.params.id).update(updates);
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新貼文失敗' });
  }
});

// 刪除貼文（需要驗證和所有權檢查）
router.delete('/:id', auth, checkOwnership, async (req, res) => {
  try {
    await db.collection('posts').doc(req.params.id).delete();
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除貼文失敗' });
  }
});

// 按類型獲取貼文
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const postsSnapshot = await db.collection('posts')
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .get();
      
    const posts = [];
    postsSnapshot.forEach(doc => {
      posts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: '獲取貼文失敗' });
  }
});

module.exports = router; 
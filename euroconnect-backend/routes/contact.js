const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { auth } = require('../middleware/authMiddleware');

const db = admin.firestore();

// 發送聯絡請求
router.post('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '請提供聯絡訊息' });
    }
    
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: '貼文不存在' });
    }
    
    // 檢查是否已經發送過請求
    const existingContact = await db.collection('contacts')
      .where('postId', '==', postId)
      .where('fromUserId', '==', req.user.uid)
      .get();
      
    if (!existingContact.empty) {
      return res.status(400).json({ error: '已經發送過聯絡請求' });
    }
    
    const contact = {
      postId,
      fromUserId: req.user.uid,
      fromUserEmail: req.user.email,
      fromUserName: req.user.displayName,
      toUserId: postDoc.data().userId,
      toUserEmail: postDoc.data().userEmail,
      toUserName: postDoc.data().userName,
      message,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('contacts').add(contact);
    res.status(201).json({ id: docRef.id, ...contact });
  } catch (error) {
    res.status(500).json({ error: '發送聯絡請求失敗' });
  }
});

// 獲取收到的聯絡請求
router.get('/my-contacts', auth, async (req, res) => {
  try {
    console.log('Fetching contacts for user:', req.user.uid);
    
    // 暫時移除 orderBy
    const contactsSnapshot = await db.collection('contacts')
      .where('toUserId', '==', req.user.uid)
      .get();
    
    const contacts = [];
    contactsSnapshot.forEach(doc => {
      contacts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 在內存中進行排序
    contacts.sort((a, b) => {
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
    
    console.log('Processed contacts:', contacts);
    res.json(contacts);
  } catch (error) {
    console.error('Detailed error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: '獲取聯絡請求失敗',
      details: error.message 
    });
  }
});

// 獲取發送的聯絡請求
router.get('/sent/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const contactsSnapshot = await db.collection('contacts')
      .where('postId', '==', postId)
      .where('fromUserId', '==', req.user.uid)
      .get();
      
    if (contactsSnapshot.empty) {
      return res.status(404).json({ error: '未找到相關聯絡請求' });
    }
    
    const contacts = [];
    contactsSnapshot.forEach(doc => {
      contacts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: '獲取聯絡請求失敗' });
  }
});

// 更新聯絡請求狀態
router.patch('/:contactId/status', auth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { status } = req.body;
    
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '無效的狀態' });
    }
    
    const contactDoc = await db.collection('contacts').doc(contactId).get();
    if (!contactDoc.exists) {
      return res.status(404).json({ error: '聯絡請求不存在' });
    }
    
    if (contactDoc.data().toUserId !== req.user.uid) {
      return res.status(403).json({ error: '沒有權限更新此請求' });
    }
    
    await db.collection('contacts').doc(contactId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新聯絡請求失敗' });
  }
});

module.exports = router; 
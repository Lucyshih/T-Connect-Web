// src/utils/commentUtils.js
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  getDocs, 
  limit, 
  onSnapshot,
  doc as firestoreDoc,
  getDoc
} from 'firebase/firestore';
import { commentsCollection, profilesCollection } from '../firebase';

/**
 * 新增評論
 * @param {string} postId - 貼文 ID
 * @param {string} userId - 用戶 ID
 * @param {string} content - 評論內容
 * @returns {Promise<Object>} 新增結果
 */
export const addComment = async (postId, userId, content) => {
  try {
    const commentData = {
      postId,
      userId,
      content: content.trim(),
      createdAt: new Date()
    };

    const docRef = await addDoc(commentsCollection, commentData);
    return {
      success: true,
      commentId: docRef.id,
      message: '評論新增成功'
    };
  } catch (error) {
    console.error('新增評論失敗:', error);
    return {
      success: false,
      message: '新增評論失敗，請稍後再試'
    };
  }
};

/**
 * 獲取貼文的所有評論
 * @param {string} postId - 貼文 ID
 * @returns {Promise<Array>} 評論列表
 */
export const getComments = async (postId) => {
  try {
    const q = query(commentsCollection);
    const querySnapshot = await getDocs(q);
    const comments = [];
    
    for (const doc of querySnapshot.docs) {
      const commentData = doc.data();
      if (commentData.postId === postId) {
        const userDoc = await getDoc(firestoreDoc(profilesCollection, commentData.userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        comments.push({
          id: doc.id,
          ...commentData,
          userName: userData?.displayName || '匿名用戶',
          userAvatar: userData?.photos?.[0] || null
        });
      }
    }
    
    // 在客戶端排序
    return comments.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
  } catch (error) {
    console.error('獲取評論失敗:', error);
    return [];
  }
};

/**
 * 獲取貼文的最新一則評論
 * @param {string} postId - 貼文 ID
 * @returns {Promise<Object|null>} 最新評論
 */
export const getLatestComment = async (postId) => {
  try {
    const q = query(commentsCollection);
    const querySnapshot = await getDocs(q);
    
    // 在客戶端找到最新的評論
    let latestComment = null;
    let latestTime = 0;
    
    for (const doc of querySnapshot.docs) {
      const commentData = doc.data();
      if (commentData.postId === postId && commentData.createdAt.seconds > latestTime) {
        latestTime = commentData.createdAt.seconds;
        latestComment = { id: doc.id, ...commentData };
      }
    }
    
    if (!latestComment) {
      return null;
    }
    
    const userDoc = await getDoc(firestoreDoc(profilesCollection, latestComment.userId));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    return {
      ...latestComment,
      userName: userData?.displayName || '匿名用戶',
      userAvatar: userData?.photos?.[0] || null
    };
  } catch (error) {
    console.error('獲取最新評論失敗:', error);
    return null;
  }
};

/**
 * 獲取貼文的評論總數
 * @param {string} postId - 貼文 ID
 * @returns {Promise<number>} 評論總數
 */
export const getCommentCount = async (postId) => {
  try {
    const q = query(commentsCollection);
    const querySnapshot = await getDocs(q);
    
    let count = 0;
    for (const doc of querySnapshot.docs) {
      const commentData = doc.data();
      if (commentData.postId === postId) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    console.error('獲取評論總數失敗:', error);
    return 0;
  }
};

/**
 * 監聽貼文評論的即時更新
 * @param {string} postId - 貼文 ID
 * @param {Function} callback - 回調函式
 * @returns {Function} 取消監聽函式
 */
export const subscribeToComments = (postId, callback) => {
  // 使用基本的查詢，避免索引問題
  const q = query(commentsCollection);
  
  return onSnapshot(q, async (querySnapshot) => {
    try {
      const comments = [];
      
      // 過濾出屬於當前貼文的評論
      for (const doc of querySnapshot.docs) {
        const commentData = doc.data();
        if (commentData.postId === postId) {
          const userDoc = await getDoc(firestoreDoc(profilesCollection, commentData.userId));
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          comments.push({
            id: doc.id,
            ...commentData,
            userName: userData?.displayName || '匿名用戶',
            userAvatar: userData?.photos?.[0] || null
          });
        }
      }
      
      // 在客戶端排序
      const sortedComments = comments.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
      callback(sortedComments);
    } catch (error) {
      console.error('處理評論數據失敗:', error);
      callback([]);
    }
  }, (error) => {
    console.error('監聽評論失敗:', error);
    callback([]);
  });
};

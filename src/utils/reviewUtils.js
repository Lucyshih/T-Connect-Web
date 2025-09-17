// src/utils/reviewUtils.js
import { 
  collection, 
  query, 
  addDoc, 
  getDocs, 
  onSnapshot,
  doc as firestoreDoc,
  getDoc
} from 'firebase/firestore';
import { userReviewsCollection, profilesCollection } from '../firebase';

/**
 * 新增用戶評價
 * @param {string} targetUserId - 被評價的用戶 ID
 * @param {string} reviewerId - 評價者用戶 ID
 * @param {string} content - 評價內容
 * @returns {Promise<Object>} 新增結果
 */
export const addUserReview = async (targetUserId, reviewerId, content) => {
  try {
    const reviewData = {
      targetUserId,
      reviewerId,
      content: content.trim(),
      createdAt: new Date()
    };

    const docRef = await addDoc(userReviewsCollection, reviewData);
    return {
      success: true,
      reviewId: docRef.id,
      message: '評價新增成功'
    };
  } catch (error) {
    console.error('新增評價失敗:', error);
    return {
      success: false,
      message: '新增評價失敗，請稍後再試'
    };
  }
};

/**
 * 獲取用戶的所有評價
 * @param {string} targetUserId - 被評價的用戶 ID
 * @returns {Promise<Array>} 評價列表
 */
export const getUserReviews = async (targetUserId) => {
  try {
    const q = query(userReviewsCollection);
    const querySnapshot = await getDocs(q);
    const reviews = [];
    
    for (const doc of querySnapshot.docs) {
      const reviewData = doc.data();
      if (reviewData.targetUserId === targetUserId) {
        const reviewerDoc = await getDoc(firestoreDoc(profilesCollection, reviewData.reviewerId));
        const reviewerData = reviewerDoc.exists() ? reviewerDoc.data() : null;
        
        reviews.push({
          id: doc.id,
          ...reviewData,
          reviewerName: reviewerData?.displayName || '匿名用戶',
          reviewerAvatar: reviewerData?.photos?.[0] || null
        });
      }
    }
    
    // 按時間排序，最新的在前
    return reviews.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  } catch (error) {
    console.error('獲取評價失敗:', error);
    return [];
  }
};

/**
 * 獲取用戶評價統計
 * @param {string} targetUserId - 被評價的用戶 ID
 * @returns {Promise<Object>} 評價統計
 */
export const getUserReviewStats = async (targetUserId) => {
  try {
    const q = query(userReviewsCollection);
    const querySnapshot = await getDocs(q);
    
    let totalReviews = 0;
    
    for (const doc of querySnapshot.docs) {
      const reviewData = doc.data();
      if (reviewData.targetUserId === targetUserId) {
        totalReviews++;
      }
    }
    
    return {
      totalReviews
    };
  } catch (error) {
    console.error('獲取評價統計失敗:', error);
    return {
      totalReviews: 0
    };
  }
};

/**
 * 監聽用戶評價的即時更新
 * @param {string} targetUserId - 被評價的用戶 ID
 * @param {Function} callback - 回調函式
 * @returns {Function} 取消監聽函式
 */
export const subscribeToUserReviews = (targetUserId, callback) => {
  const q = query(userReviewsCollection);
  
  return onSnapshot(q, async (querySnapshot) => {
    try {
      const reviews = [];
      
      for (const doc of querySnapshot.docs) {
        const reviewData = doc.data();
        if (reviewData.targetUserId === targetUserId) {
          const reviewerDoc = await getDoc(firestoreDoc(profilesCollection, reviewData.reviewerId));
          const reviewerData = reviewerDoc.exists() ? reviewerDoc.data() : null;
          
          reviews.push({
            id: doc.id,
            ...reviewData,
            reviewerName: reviewerData?.displayName || '匿名用戶',
            reviewerAvatar: reviewerData?.photos?.[0] || null
          });
        }
      }
      
      // 按時間排序，最新的在前
      const sortedReviews = reviews.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      callback(sortedReviews);
    } catch (error) {
      console.error('處理評價數據失敗:', error);
      callback([]);
    }
  }, (error) => {
    console.error('監聽評價失敗:', error);
    callback([]);
  });
};

/**
 * 檢查用戶是否已經評價過目標用戶
 * @param {string} targetUserId - 被評價的用戶 ID
 * @param {string} reviewerId - 評價者用戶 ID
 * @returns {Promise<boolean>} 是否已評價
 */
export const hasUserReviewed = async (targetUserId, reviewerId) => {
  try {
    const q = query(userReviewsCollection);
    const querySnapshot = await getDocs(q);
    
    for (const doc of querySnapshot.docs) {
      const reviewData = doc.data();
      if (reviewData.targetUserId === targetUserId && reviewData.reviewerId === reviewerId) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('檢查評價狀態失敗:', error);
    return false;
  }
};

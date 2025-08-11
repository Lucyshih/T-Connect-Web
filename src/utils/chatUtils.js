/**
 * 聊天室相關工具函數
 * 避免重複申請和重複聊天室
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  chatroomsCollection, 
  couchesCollection, 
  companionsCollection, 
  localsCollection 
} from '../firebase';

/**
 * 檢查用戶是否已經對某篇貼文申請過
 * @param {string} userId - 申請者用戶ID
 * @param {string} postId - 貼文ID
 * @param {string} postType - 貼文類型 ('couch', 'companion', 'local')
 * @returns {Promise<Object>} 檢查結果 {hasApplied: boolean, existingChatroom: Object|null}
 */
export const checkExistingApplication = async (userId, postId, postType) => {
  try {
    // 查詢是否已存在聊天室
    const chatroomQuery = query(
      chatroomsCollection,
      where('participants', 'array-contains', userId),
      where('postId', '==', postId)
    );
    
    const chatroomSnapshot = await getDocs(chatroomQuery);
    
    if (!chatroomSnapshot.empty) {
      // 找到現有聊天室
      const existingChatroom = {
        id: chatroomSnapshot.docs[0].id,
        ...chatroomSnapshot.docs[0].data()
      };
      
      return {
        hasApplied: true,
        existingChatroom: existingChatroom
      };
    }
    
    return {
      hasApplied: false,
      existingChatroom: null
    };
    
  } catch (error) {
    console.error('檢查重複申請時發生錯誤:', error);
    throw new Error('檢查重複申請失敗');
  }
};

/**
 * 檢查兩位用戶之間是否已存在聊天室
 * @param {string} user1Id - 用戶1 ID
 * @param {string} user2Id - 用戶2 ID
 * @returns {Promise<Object>} 檢查結果 {exists: boolean, chatroom: Object|null}
 */
export const checkExistingChatroom = async (user1Id, user2Id) => {
  try {
    // 查詢是否已存在聊天室（兩位用戶都是參與者）
    const chatroomQuery = query(
      chatroomsCollection,
      where('participants', 'array-contains', user1Id)
    );
    
    const chatroomSnapshot = await getDocs(chatroomQuery);
    
    if (!chatroomSnapshot.empty) {
      // 檢查是否有包含另一位用戶的聊天室
      for (const doc of chatroomSnapshot.docs) {
        const chatroomData = doc.data();
        if (chatroomData.participants.includes(user2Id)) {
          return {
            exists: true,
            chatroom: {
              id: doc.id,
              ...chatroomData
            }
          };
        }
      }
    }
    
    return {
      exists: false,
      chatroom: null
    };
    
  } catch (error) {
    console.error('檢查現有聊天室時發生錯誤:', error);
    throw new Error('檢查現有聊天室失敗');
  }
};

/**
 * 建立聊天室（避免重複）
 * @param {Object} chatroomData - 聊天室資料
 * @returns {Promise<Object>} 建立的聊天室 {id: string, data: Object}
 */
export const createChatroom = async (chatroomData) => {
  try {
    // 先檢查是否已存在聊天室
    const existingCheck = await checkExistingChatroom(
      chatroomData.participants[0], 
      chatroomData.participants[1]
    );
    
    if (existingCheck.exists) {
      // 如果已存在，返回現有聊天室
      return {
        id: existingCheck.chatroom.id,
        data: existingCheck.chatroom,
        isExisting: true
      };
    }
    
    // 如果不存在，建立新的聊天室
    const chatroomRef = await addDoc(chatroomsCollection, {
      ...chatroomData,
      createdAt: serverTimestamp()
    });
    
    // 更新聊天室，加入 chatroomId
    await updateDoc(chatroomRef, { 
      chatroomId: chatroomRef.id 
    });
    
    return {
      id: chatroomRef.id,
      data: { ...chatroomData, chatroomId: chatroomRef.id },
      isExisting: false
    };
    
  } catch (error) {
    console.error('建立聊天室時發生錯誤:', error);
    throw new Error('建立聊天室失敗');
  }
};

/**
 * 智能開啟聊天室（主要函數）
 * @param {string} postId - 貼文ID
 * @param {string} postType - 貼文類型
 * @param {string} postOwnerId - 貼文發布者ID
 * @param {string} applicantId - 申請者ID
 * @param {Object} postOwnerProfile - 貼文發布者資料
 * @param {Object} applicantProfile - 申請者資料
 * @param {Object} postData - 貼文資料
 * @returns {Promise<Object>} 結果 {success: boolean, chatroomId: string, message: string, isExisting: boolean}
 */
export const smartOpenChatroom = async (
  postId, 
  postType, 
  postOwnerId, 
  applicantId, 
  postOwnerProfile, 
  applicantProfile, 
  postData
) => {
  try {
    // 1. 檢查是否已經申請過
    const applicationCheck = await checkExistingApplication(applicantId, postId, postType);
    
    if (applicationCheck.hasApplied) {
      // 如果已經申請過，直接返回現有聊天室
      return {
        success: true,
        chatroomId: applicationCheck.existingChatroom.id,
        message: '您已經申請過此貼文，正在進入現有聊天室',
        isExisting: true
      };
    }
    
    // 2. 檢查是否已存在聊天室
    const chatroomCheck = await checkExistingChatroom(postOwnerId, applicantId);
    
    if (chatroomCheck.exists) {
      // 如果已存在聊天室，更新貼文ID並返回
      await updateDoc(doc(chatroomsCollection, chatroomCheck.chatroom.id), {
        postId: postId,
        postTitle: postData.title || postData.destination || '無標題',
        postType: postType
      });
      
      return {
        success: true,
        chatroomId: chatroomCheck.chatroom.id,
        message: '找到現有聊天室，正在進入',
        isExisting: true
      };
    }
    
    // 3. 建立新的聊天室
    const chatroomData = {
      participants: [postOwnerId, applicantId],
      postId: postId,
      postTitle: postData.title || postData.destination || '無標題',
      postType: postType,
      postOwnerId,
      postOwnerName: postOwnerProfile.displayName || '',
      postOwnerAvatar: postOwnerProfile.photos?.[0] || '',
      applicantId,
      applicantName: applicantProfile.displayName || '',
      applicantAvatar: applicantProfile.photos?.[0] || '',
      lastMessage: null,
      createdAt: serverTimestamp()
    };
    
    const newChatroom = await createChatroom(chatroomData);
    
    return {
      success: true,
      chatroomId: newChatroom.id,
      message: '聊天室已建立！',
      isExisting: false
    };
    
  } catch (error) {
    console.error('智能開啟聊天室時發生錯誤:', error);
    return {
      success: false,
      chatroomId: null,
      message: '開啟聊天室失敗，請稍後再試',
      error: error.message
    };
  }
}; 
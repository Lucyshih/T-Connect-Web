/**
 * 清理過期貼文的前端工具函數
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc,
  getFirestore 
} from 'firebase/firestore';
import { 
  couchesCollection, 
  companionsCollection, 
  localsCollection,
  db
} from '../firebase';

/**
 * 手動觸發清理過期貼文
 * @param {string} authToken - 用戶認證 token
 * @returns {Promise<Object>} 清理結果
 */
export const manualCleanupExpiredPosts = async (authToken) => {
  try {
    // 這裡需要你的 Cloud Functions 的 URL
    // 部署後會得到類似：https://us-central1-travelconnect-4a4df.cloudfunctions.net/cleanupExpiredPostsManual
    const functionUrl = `https://us-central1-travelconnect-4a4df.cloudfunctions.net/cleanupExpiredPostsManual`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('手動清理失敗:', error);
    throw error;
  }
};

/**
 * 前端自動清理過期貼文（本地開發測試用）
 * @returns {Promise<Object>} 清理結果
 */
export const frontendCleanupExpiredPosts = async () => {
  try {
    console.log('開始前端清理過期貼文...');
    
    // 修復時區計算 - 使用更準確的歐洲時間
    const now = new Date();
    // 使用 UTC 時間，歐洲時間通常是 UTC+1 或 UTC+2（夏令時間）
    const europeTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // UTC+2
    console.log(`當前時間: ${now.toISOString()}`);
    console.log(`當前歐洲時間 (UTC+2): ${europeTime.toISOString()}`);
    
    // 檢查集合引用是否正確
    console.log('檢查集合引用:');
    console.log('couchesCollection:', couchesCollection);
    console.log('companionsCollection:', companionsCollection);
    console.log('localsCollection:', localsCollection);
    
    // 要清理的集合列表
    const collections = [
      { 
        collection: couchesCollection, 
        name: "沙發", 
        type: "couch",
        path: 'couches'
      },
      { 
        collection: companionsCollection, 
        name: "旅伴", 
        type: "companion",
        path: 'companions'
      },
      { 
        collection: localsCollection, 
        name: "地陪", 
        type: "local",
        path: 'locals'
      }
    ];
    
    let totalDeleted = 0;
    const deletedPosts = [];
    
    for (const col of collections) {
      try {
        console.log(`開始清理 ${col.name} 貼文...`);
        
        // 檢查集合引用是否有效
        if (!col.collection || typeof col.collection !== 'object') {
          console.error(`${col.name} 集合引用無效:`, col.collection);
          continue;
        }
        
        // 嘗試查詢集合中的所有文檔（先不限制條件）
        let snapshot;
        try {
          // 先嘗試簡單查詢，檢查集合是否可訪問
          snapshot = await getDocs(col.collection);
          console.log(`${col.name} 集合總文檔數:`, snapshot.size);
          
          // 檢查是否有過期文檔
          let hasExpiredDocs = 0;
          let expiredDocs = 0;
          
          snapshot.forEach(docSnapshot => {
            const post = docSnapshot.data();
            
            if (col.type === 'couch') {
              // 沙發貼文：檢查 selectedRanges
              if (post.selectedRanges && Array.isArray(post.selectedRanges) && post.selectedRanges.length > 0) {
                const lastRange = post.selectedRanges[post.selectedRanges.length - 1];
                if (lastRange && lastRange.end) {
                  const endDate = lastRange.end?.toDate?.() || new Date(lastRange.end.seconds * 1000);
                  if (endDate < europeTime) {
                    expiredDocs++;
                    console.log(`發現過期沙發貼文:`, {
                      id: docSnapshot.id,
                      title: post.title || post.location || "未命名",
                      lastRangeEnd: endDate.toISOString(),
                      currentTime: europeTime.toISOString()
                    });
                  }
                }
              }
            } else {
              // 旅伴和地陪貼文：檢查 endDate
              if (post.endDate) {
                const endDate = post.endDate?.toDate?.() || new Date(post.endDate.seconds * 1000);
                if (endDate < europeTime) {
                  expiredDocs++;
                  console.log(`發現過期貼文:`, {
                    id: docSnapshot.id,
                    title: post.title || post.destination || "未命名",
                    endDate: endDate.toISOString(),
                    currentTime: europeTime.toISOString()
                  });
                }
              }
            }
          });
          
          console.log(`${col.name} 集合中過期文檔: ${expiredDocs}`);
          
          if (expiredDocs === 0) {
            console.log(`${col.name} 集合中沒有過期貼文`);
            continue;
          }
          
        } catch (queryError) {
          console.error(`查詢 ${col.name} 集合時發生錯誤:`, queryError);
          continue;
        }
        
        // 現在執行過期查詢 - 根據貼文類型使用不同的查詢邏輯
        try {
          let expiredSnapshot;
          
          if (col.type === 'couch') {
            // 沙發貼文：無法使用 where 查詢，需要手動過濾
            const allDocs = await getDocs(col.collection);
            const expiredDocs = [];
            
            allDocs.forEach(docSnapshot => {
              const post = docSnapshot.data();
              if (post.selectedRanges && Array.isArray(post.selectedRanges) && post.selectedRanges.length > 0) {
                const lastRange = post.selectedRanges[post.selectedRanges.length - 1];
                if (lastRange && lastRange.end) {
                  const endDate = lastRange.end?.toDate?.() || new Date(lastRange.end.seconds * 1000);
                  if (endDate < europeTime) {
                    expiredDocs.push(docSnapshot);
                  }
                }
              }
            });
            
            // 創建一個模擬的 QuerySnapshot
            expiredSnapshot = {
              empty: expiredDocs.length === 0,
              size: expiredDocs.length,
              docs: expiredDocs,
              forEach: (callback) => expiredDocs.forEach(callback)
            };
            
          } else {
            // 旅伴和地陪貼文：使用 where 查詢
            expiredSnapshot = await getDocs(
              query(col.collection, where("endDate", "<", europeTime))
            );
          }
          
          if (expiredSnapshot.empty) {
            console.log(`${col.name} 集合中沒有過期貼文（查詢結果）`);
            continue;
          }
          
          console.log(`${col.name} 集合中找到 ${expiredSnapshot.size} 個過期貼文`);
          
          // 批量刪除過期貼文
          try {
            const batch = writeBatch(db);
            const expiredPosts = [];
            
            expiredSnapshot.forEach(docSnapshot => {
              // 檢查文檔引用是否有效 - 簡化檢查邏輯
              if (!docSnapshot.ref) {
                console.error(`文檔引用為空:`, docSnapshot.ref);
                return;
              }
              
              const post = docSnapshot.data();
              expiredPosts.push({
                id: docSnapshot.id,
                title: post.title || post.destination || "未命名",
                endDate: post.endDate?.toDate?.() || post.endDate,
                type: col.type
              });
              
              // 添加刪除操作到批次
              batch.delete(docSnapshot.ref);
            });
            
            // 檢查是否有有效的刪除操作
            if (expiredPosts.length === 0) {
              console.log(`${col.name} 集合中沒有有效的過期貼文可刪除`);
              continue;
            }
            
            console.log(`準備刪除 ${expiredPosts.length} 個過期貼文...`);
            
            // 執行批量刪除
            await batch.commit();
            
            console.log(`成功刪除 ${expiredPosts.length} 個過期的 ${col.name} 貼文:`, expiredPosts);
            totalDeleted += expiredPosts.length;
            deletedPosts.push(...expiredPosts);
            
          } catch (batchError) {
            console.error(`執行批量刪除時發生錯誤:`, batchError);
            
            // 如果批量刪除失敗，嘗試逐個刪除
            console.log(`嘗試逐個刪除過期貼文...`);
            let individualDeleted = 0;
            
            for (const docSnapshot of expiredSnapshot.docs) {
              try {
                if (docSnapshot.ref) {
                  await docSnapshot.ref.delete();
                  individualDeleted++;
                  console.log(`成功刪除文檔:`, docSnapshot.id);
                }
              } catch (individualError) {
                console.error(`刪除文檔 ${docSnapshot.id} 時發生錯誤:`, individualError);
              }
            }
            
            if (individualDeleted > 0) {
              console.log(`逐個刪除成功 ${individualDeleted} 個文檔`);
              totalDeleted += individualDeleted;
            }
          }
          
        } catch (deleteError) {
          console.error(`刪除 ${col.name} 過期貼文時發生錯誤:`, deleteError);
          continue;
        }
        
      } catch (error) {
        console.error(`清理 ${col.name} 集合時發生錯誤:`, error);
        // 繼續處理下一個集合
      }
    }
    
    console.log(`前端清理完成！總共刪除了 ${totalDeleted} 個過期貼文`);
    
    return {
      success: true,
      message: `成功清理 ${totalDeleted} 個過期貼文`,
      timestamp: europeTime.toISOString(),
      totalDeleted,
      deletedPosts,
      collectionsProcessed: collections.length
    };
    
  } catch (error) {
    console.error('前端清理過期貼文時發生嚴重錯誤:', error);
    return {
      success: false,
      message: '清理失敗',
      error: error.message
    };
  }
};

/**
 * 前端過濾過期貼文（暫時方案）
 * @param {Array} posts - 貼文陣列
 * @param {string} collectionType - 集合類型 ('couch', 'companion', 'local')
 * @returns {Array} 過濾後的貼文陣列
 */
export const filterExpiredPosts = (posts, collectionType) => {
  if (!posts || !Array.isArray(posts)) {
    return [];
  }

  const now = new Date();
  const europeTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
  
  return posts.filter(post => {
    // 檢查是否有 endDate 欄位
    if (!post.endDate) {
      return true; // 沒有 endDate 的貼文保留
    }

    let endDate;
    
    // 處理 Firestore Timestamp 格式
    if (post.endDate && typeof post.endDate.toDate === 'function') {
      endDate = post.endDate.toDate();
    } else if (post.endDate && post.endDate.seconds) {
      // 處理 Firestore Timestamp 物件
      endDate = new Date(post.endDate.seconds * 1000);
    } else if (post.endDate instanceof Date) {
      endDate = post.endDate;
    } else if (typeof post.endDate === 'string') {
      endDate = new Date(post.endDate);
    } else {
      return true; // 無法解析的日期格式保留
    }

    // 檢查是否過期
    return endDate >= europeTime;
  });
};

/**
 * 檢查貼文是否過期
 * @param {Object} post - 貼文物件
 * @param {string} postType - 貼文類型 ('couch', 'companion', 'local')
 * @returns {boolean} 是否過期
 */
export const isPostExpired = (post, postType) => {
  if (postType === 'couch') {
    // 沙發貼文：檢查 selectedRanges 中最後一個區間的 end 時間
    if (!post.selectedRanges || !Array.isArray(post.selectedRanges) || post.selectedRanges.length === 0) {
      return false; // 沒有日期區間的沙發貼文不算過期
    }
    
    // 找到最後一個區間的 end 時間
    const lastRange = post.selectedRanges[post.selectedRanges.length - 1];
    if (!lastRange || !lastRange.end) {
      return false;
    }
    
    const now = new Date();
    const europeTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // UTC+2
    
    let endDate;
    
    // 處理 Firestore Timestamp 格式
    if (lastRange.end && typeof lastRange.end.toDate === 'function') {
      endDate = lastRange.end.toDate();
    } else if (lastRange.end && lastRange.end.seconds) {
      endDate = new Date(lastRange.end.seconds * 1000);
    } else if (lastRange.end instanceof Date) {
      endDate = lastRange.end;
    } else if (typeof lastRange.end === 'string') {
      endDate = new Date(lastRange.end);
    } else {
      return false; // 無法解析的日期格式不算過期
    }
    
    return endDate < europeTime;
    
  } else {
    // 旅伴和地陪貼文：檢查 endDate 欄位
    if (!post.endDate) {
      return false; // 沒有 endDate 的貼文不算過期
    }

    const now = new Date();
    const europeTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // UTC+2
    
    let endDate;
    
    // 處理 Firestore Timestamp 格式
    if (post.endDate && typeof post.endDate.toDate === 'function') {
      endDate = post.endDate.toDate();
    } else if (post.endDate && post.endDate.seconds) {
      endDate = new Date(post.endDate.seconds * 1000);
    } else if (post.endDate instanceof Date) {
      endDate = post.endDate;
    } else if (typeof post.endDate === 'string') {
      endDate = new Date(post.endDate);
    } else {
      return false; // 無法解析的日期格式不算過期
    }

    return endDate < europeTime;
  }
};

/**
 * 格式化歐洲時間
 * @param {Date|string|Object} date - 日期
 * @returns {string} 格式化的歐洲時間字串
 */
export const formatEuropeTime = (date) => {
  if (!date) return '未設定';
  
  let dateObj;
  
  // 處理 Firestore Timestamp 格式
  if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else if (date && date.seconds) {
    dateObj = new Date(date.seconds * 1000);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    return '日期格式錯誤';
  }

  if (isNaN(dateObj.getTime())) {
    return '日期格式錯誤';
  }

  return dateObj.toLocaleString('zh-TW', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 

/**
 * 測試函數：檢查貼文結構和 endDate 欄位
 * 用於調試和診斷問題
 */
export const debugPostStructure = async () => {
  try {
    console.log('=== 開始調試貼文結構 ===');
    
    const collections = [
      { collection: couchesCollection, name: "沙發", type: "couch" },
      { collection: companionsCollection, name: "旅伴", type: "companion" },
      { collection: localsCollection, name: "地陪", type: "local" }
    ];
    
    for (const col of collections) {
      try {
        console.log(`\n--- 檢查 ${col.name} 集合 ---`);
        
        if (!col.collection || typeof col.collection !== 'object') {
          console.error(`${col.name} 集合引用無效:`, col.collection);
          continue;
        }
        
        // 獲取前5個文檔進行檢查
        const snapshot = await getDocs(col.collection);
        console.log(`${col.name} 集合總文檔數:`, snapshot.size);
        
        if (snapshot.empty) {
          console.log(`${col.name} 集合為空`);
          continue;
        }
        
        // 檢查前幾個文檔的結構
        let count = 0;
        snapshot.forEach(docSnapshot => {
          if (count >= 5) return; // 只檢查前5個
          
          const post = docSnapshot.data();
          console.log(`\n文檔 ${count + 1}:`, {
            id: docSnapshot.id,
            title: post.title || post.destination || post.location || "無標題",
            type: col.type
          });
          
          if (col.type === 'couch') {
            // 沙發貼文：顯示 selectedRanges 信息
            if (post.selectedRanges && Array.isArray(post.selectedRanges)) {
              console.log(`  selectedRanges 數量: ${post.selectedRanges.length}`);
              post.selectedRanges.forEach((range, index) => {
                const startDate = range.start?.toDate?.() || new Date(range.start.seconds * 1000);
                const endDate = range.end?.toDate?.() || new Date(range.end.seconds * 1000);
                console.log(`  區間 ${index + 1}:`, {
                  start: startDate.toISOString(),
                  end: endDate.toISOString(),
                  isExpired: endDate < new Date()
                });
              });
              
              // 檢查最後一個區間是否過期
              if (post.selectedRanges.length > 0) {
                const lastRange = post.selectedRanges[post.selectedRanges.length - 1];
                const lastEndDate = lastRange.end?.toDate?.() || new Date(lastRange.end.seconds * 1000);
                console.log(`  最後區間結束時間:`, lastEndDate.toISOString());
                console.log(`  是否過期:`, lastEndDate < new Date());
              }
            } else {
              console.log(`  沒有 selectedRanges 或格式不正確`);
            }
          } else {
            // 旅伴和地陪貼文：顯示 endDate 信息
            console.log(`  endDate:`, post.endDate);
            console.log(`  endDateType:`, typeof post.endDate);
            console.log(`  hasToDate:`, post.endDate && typeof post.endDate.toDate === 'function');
            console.log(`  hasSeconds:`, post.endDate && post.endDate.seconds);
            
            // 如果有 endDate，嘗試解析
            if (post.endDate) {
              try {
                let parsedDate;
                if (post.endDate && typeof post.endDate.toDate === 'function') {
                  parsedDate = post.endDate.toDate();
                } else if (post.endDate && post.endDate.seconds) {
                  parsedDate = new Date(post.endDate.seconds * 1000);
                } else if (post.endDate instanceof Date) {
                  parsedDate = post.endDate;
                } else if (typeof post.endDate === 'string') {
                  parsedDate = new Date(post.endDate);
                }
                
                if (parsedDate && !isNaN(parsedDate.getTime())) {
                  console.log(`  解析後的 endDate:`, parsedDate.toISOString());
                  console.log(`  是否過期:`, parsedDate < new Date());
                } else {
                  console.log(`  無法解析 endDate`);
                }
              } catch (parseError) {
                console.log(`  解析 endDate 時出錯:`, parseError.message);
              }
            }
          }
          
          console.log(`  createdAt:`, post.createdAt);
          console.log(`  userId:`, post.userId);
          
          count++;
        });
        
      } catch (error) {
        console.error(`檢查 ${col.name} 集合時發生錯誤:`, error);
      }
    }
    
    console.log('\n=== 調試完成 ===');
    
  } catch (error) {
    console.error('調試貼文結構時發生錯誤:', error);
  }
}; 
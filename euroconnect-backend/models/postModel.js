const admin = require('firebase-admin');
const db = admin.firestore();

class Post {
  static async create(data) {
    const docRef = await db.collection('posts').add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, ...data };
  }

  static async findById(id) {
    const doc = await db.collection('posts').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async findByType(type) {
    const snapshot = await db.collection('posts')
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .get();
      
    const posts = [];
    snapshot.forEach(doc => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    return posts;
  }
}

module.exports = Post; 
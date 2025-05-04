const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = 'your_jwt_secret_key'; // 確保這個值與 .env 中的相同

const testToken = jwt.sign(
  { 
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  JWT_SECRET
);

console.log('Test token:', testToken);

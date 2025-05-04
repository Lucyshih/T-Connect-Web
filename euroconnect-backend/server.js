const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
require('./firebase-admin');

// 載入環境變數
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/contact', require('./routes/contact'));

// 錯誤處理中介層
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '服務器錯誤',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 處理 404
app.use((req, res) => {
  res.status(404).json({ error: '找不到該路徑' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
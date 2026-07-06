const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'API Gateway',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Microservices API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      categories: '/api/categories',
      news: '/api/news'
    }
  });
});

// Proxy to Categories Service
app.use('/api/categories', createProxyMiddleware({
  target: process.env.CATEGORIES_SERVICE_URL || 'http://categories-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/categories': '' },
  logLevel: 'debug'
}));

// Proxy to News Service
app.use('/api/news', createProxyMiddleware({
  target: process.env.NEWS_SERVICE_URL || 'http://news-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/news': '' },
  logLevel: 'debug'
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

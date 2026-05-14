require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes     = require('./routes/auth');
const shopRoutes     = require('./routes/shop');
const productRoutes  = require('./routes/products');
const billRoutes     = require('./routes/bills');
const analyticsRoutes = require('./routes/analytics');
const visionRoutes   = require('./routes/vision');

// Ensure logs directory
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const app = express();
app.set('trust proxy', 1);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s=>s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null,true) : cb(new Error('CORS rejected')),
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(mongoSanitize());
app.use(hpp());

// HTTP logging
if (process.env.NODE_ENV !== 'test') {
  const morgan = require('morgan');
  app.use(morgan(process.env.NODE_ENV==='production'?'combined':'dev', {
    stream: { write: msg => logger.info(msg.trim()) }
  }));
}

// Rate limits
app.use('/api', rateLimit({ windowMs:15*60*1000, max:500, standardHeaders:true, legacyHeaders:false,
  message:{error:'Too many requests'}, skip: req => req.path==='/health' }));
app.use('/api/auth', rateLimit({ windowMs:15*60*1000, max:20, message:{error:'Too many auth attempts'} }));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/shop',       shopRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/bills',      billRoutes);
app.use('/api/analytics',  analyticsRoutes);
app.use('/api/vision',     visionRoutes);

// Health
app.get('/health', (req,res) => res.json({
  status:'ok', env:process.env.NODE_ENV,
  db: mongoose.connection.readyState===1?'connected':'disconnected',
  uptime: Math.round(process.uptime()), ts: new Date().toISOString()
}));

// 404
app.use((req,res) => res.status(404).json({ error:`${req.method} ${req.originalUrl} not found` }));

// Error handler
app.use(errorHandler);

// DB connect with retry
async function connectDB(retries=5, delay=3000) {
  for (let i=0; i<retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS:5000, socketTimeoutMS:45000, maxPoolSize:10, minPoolSize:2
      });
      logger.info('MongoDB connected');
      return;
    } catch(err) {
      logger.warn(`DB attempt ${i+1}/${retries}: ${err.message}`);
      if (i < retries-1) await new Promise(r=>setTimeout(r,delay));
    }
  }
  logger.error('MongoDB connection failed. Exiting.'); process.exit(1);
}

// Graceful shutdown
let server;
function shutdown(sig) {
  logger.info(`${sig} – shutting down`);
  server.close(async () => { await mongoose.connection.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
}

const PORT = parseInt(process.env.PORT||'4000',10);
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    //server = app.listen(PORT, () => logger.info(`Server on :${PORT} [${process.env.NODE_ENV||'dev'}]`));
    server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server on :${PORT} [${process.env.NODE_ENV || 'dev'}]`);
    });
    process.on('SIGTERM', ()=>shutdown('SIGTERM'));
    process.on('SIGINT',  ()=>shutdown('SIGINT'));
  });
}

module.exports = app;

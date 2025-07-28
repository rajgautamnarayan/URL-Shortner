require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const urlRoutes = require('./routes/urlRoutes');
const Url = require('./models/Url');

const app = express();

// Connect to MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
});

// URL shortening rate limit
const shortenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 URL shortening requests per minute
  message: {
    success: false,
    message: 'Too many URLs created, please try again later.'
  },
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://url-shortner-mrgs-projects.vercel.app'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);
app.use('/api/shorten', shortenLimiter);

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', urlRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend pages - MUST BE BEFORE /:shortCode route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// @route   GET /:shortCode
// @desc    Redirect to original URL
// @access  Public
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Validate short code format
    if (!shortCode || shortCode.length < 6 || shortCode.length > 8) {
      return res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
    }

    // Find URL by short code
    const url = await Url.findByShortCode(shortCode);

    if (!url) {
      // Return 404 page for unknown codes
      return res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
    }

    // Record the click with user agent and IP
    const userAgent = req.get('User-Agent') || '';
    const clientIP = req.ip || req.connection.remoteAddress || '';

    try {
      await url.recordClick(userAgent, clientIP);
    } catch (clickError) {
      console.error('Error recording click:', clickError);
      // Continue with redirect even if click recording fails
    }

    // Redirect to original URL
    res.redirect(302, url.originalUrl);

  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).sendFile(path.join(__dirname, '../frontend/500.html'));
  }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  } else {
    res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: http://localhost:${PORT}`);
});

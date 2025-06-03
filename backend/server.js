
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authenticateToken } = require('./middleware/auth');
const { authorizeWrite, authorizeRead } = require('./middleware/roleAuth');

const authRoutes = require('./routes/auth');
const reportsRoutes = require('./routes/reports');
const vulnerabilitiesRoutes = require('./routes/vulnerabilities');
const vulndbRoutes = require('./routes/vulndb');
const usersRoutes = require('./routes/users');
const attachmentsRoutes = require('./routes/attachments');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - more permissive to handle various client scenarios
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080', 
    ];
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else {
        return allowedOrigin.test(origin);
      }
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Still allow for now to prevent blocking
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Explicit OPTIONS handler for preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Settings routes - database status is public, others require auth
app.use('/api/settings', settingsRoutes);

// Protected routes with role-based access control
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/vulnerabilities', authenticateToken, vulnerabilitiesRoutes);
app.use('/api/vulndb', authenticateToken, vulndbRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/attachments', authenticateToken, attachmentsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'VulnStudio API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', success: false });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found', success: false });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

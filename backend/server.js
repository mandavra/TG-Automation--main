
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Port configuration
const PORT = process.env.PORT || 4000;

// Models
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');

// Controllers
const { seedSuperAdmin } = require('./controllers/adminController');

const { generateAdminIdWithoutSameLastThree } = require('./services/generateOneTimeInviteLink');

// Routes
const adminRoutes = require('./routes/adminRoutes');
const digioRoutes = require('./routes/digio.routes');
const inviteRoute = require('./routes/invite.route');
const invoiceRoutes = require('./routes/invoiceRoutes');
const kycRoutes = require('./routes/kycRoutes');
const otpRoutes = require('./routes/otpRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const planRoutes = require('./routes/planRoutes');
const groupRoutes = require('./routes/groupRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const channelBundleRoutes = require('./routes/channelBundleRoutes');
const paymentCompletionRoutes = require('./routes/paymentCompletionRoutes');
const adminLinkManagementRoutes = require('./routes/adminLinkManagementRoutes');
const publicRoutes = require('./routes/publicRoutes');

const analyticsRoutes = require('./routes/analyticsRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const adminPanelCustomizationRoutes = require('./routes/adminPanelCustomizationRoutes');
const paymentRecoveryRoutes = require('./routes/paymentRecoveryRoutes');
const userActivityRoutes = require('./routes/userActivityRoutes');
const platformFeeRoutes = require('./routes/platformFeeRoutes');
const stepVerificationRoutes = require('./routes/stepVerificationRoutes');
const userAdminRoutes = require('./routes/userAdminRoutes');
const paymentAdminRoutes = require('./routes/paymentAdminRoutes');
const channelMemberAdminRoutes = require('./routes/channelMemberAdminRoutes');
const documentAdminRoutes = require('./routes/documentAdminRoutes');
const emailRoutes = require('./routes/emailRoutes');
const enhancedInvoiceRoutes = require('./routes/enhancedInvoiceRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const userDashboardRoutes = require('./routes/userDashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const channelMembershipRoutes = require('./routes/channelMembershipRoutes');
const channelLinkDeliveryRoutes = require('./routes/channelLinkDeliveryRoutes');
const kycAdminRoutes = require('./routes/kycAdminRoutes');
const digioLegacyRoutes = require('./routes/digioRoutes');
const subscriptionExpiryRoutes = require('./routes/subscriptionExpiryRoutes');

// Services
const notificationService = require('./services/notificationService');
const paymentRecoveryService = require('./services/paymentRecoveryService');
const channelExpiryService = require('./services/channelExpiryService');
const paymentCleanupService = require('./services/paymentCleanupService');
const paymentRecoveryJob = require('./jobs/paymentRecoveryJob');

const app = express();
const server = createServer(app);

// ------------------ Global Error Handlers ------------------
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider restarting the process in production
  // process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Consider restarting the process in production
  // process.exit(1);
});

// ------------------ CORS Setup ------------------
const allowedOrigins = [
  "http://oo00440o40cww4ockosckwkk.31.97.230.61.sslip.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ------------------ Middleware ------------------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ------------------ MongoDB Connection ------------------
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

mongoose.connection.on('error', err => console.error('MongoDB error:', err));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

// ------------------ Socket.IO ------------------
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

notificationService.initializeWebSocketServer(server);

// ------------------ Routes ------------------
app.use('/api/admin', adminRoutes);
app.use('/api/digio', digioRoutes);
app.use('/api/invite', inviteRoute);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/channel-bundles', channelBundleRoutes);
app.use('/api/payment-completion', paymentCompletionRoutes);
app.use('/api/admin-links', adminLinkManagementRoutes);
app.use('/api/withdrawal', withdrawalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin-panel-customization', adminPanelCustomizationRoutes);
app.use('/api/payment-recovery', paymentRecoveryRoutes);
app.use('/api/user-activity', userActivityRoutes);
app.use('/api/platform-fees', platformFeeRoutes);
app.use('/api/step-verification', stepVerificationRoutes);
app.use('/api/users', userAdminRoutes);
app.use('/api/payments', paymentAdminRoutes);
app.use('/api/channel-members', channelMemberAdminRoutes);
app.use('/api/documents', documentAdminRoutes);
app.use('/api/emails', emailRoutes);
// Enhanced invoice routes under different path to avoid conflict
app.use('/api/invoices/enhanced', enhancedInvoiceRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/user', userDashboardRoutes);
app.use('/api/public-user', userRoutes);
app.use('/api/channel-membership', channelMembershipRoutes);
app.use('/api/channel-link-delivery', channelLinkDeliveryRoutes);
app.use('/api/kyc-admin', kycAdminRoutes);
app.use('/api/digio-legacy', digioLegacyRoutes);
app.use('/api/subscription-expiry', subscriptionExpiryRoutes);
app.use('/', publicRoutes);
app.use('/api/analytics', analyticsRoutes);

// Test endpoint
app.get('/api/test-auth', (req, res) => {
  const authHeader = req.header('Authorization');
  res.json({
    message: 'Auth test endpoint',
    hasAuthHeader: !!authHeader,
    authHeader: authHeader ? authHeader.substring(0, 20) + '...' : 'None'
  });
});

// ------------------ Admin ID Generator ------------------
app.get('/api/generate-admin-id', (req, res) => {
  const adminId = generateAdminIdWithoutSameLastThree(6); // 6-digit admin ID
  res.json({ adminId });
});
// ------------------ Admin / Kick Expired Channels ------------------
app.get('/api/admin/expiry-stats', async (req, res) => {
  try {
    const stats = await channelExpiryService.getExpiryStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/kick-expired', async (req, res) => {
  try {
    await channelExpiryService.manualKickExpired();
    res.json({ success: true, message: 'Manual expiry check completed', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------ Health Check ------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    port: PORT
  });
});

// ------------------ Error Handling ------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// ------------------ Services Startup ------------------
// Initialize and start background services with error handling
const startServices = async () => {
  try {
    // Start channel expiry service
    await channelExpiryService.start();
    console.log('✅ Channel expiry service started');

    // Start payment cleanup service
    await paymentCleanupService.startAutoCleanup();
    console.log('✅ Payment cleanup service started');

    // Start payment recovery job if enabled
    if (process.env.ENABLE_PAYMENT_RECOVERY === 'true') {
      try {
        await paymentRecoveryJob.start();
        console.log('✅ Payment recovery job started');

        // Run initial recovery check on startup if configured
        if (process.env.RUN_RECOVERY_ON_STARTUP === 'true') {
          console.log('🚀 Running initial payment recovery check...');
          const result = await paymentRecoveryJob.runOnce();
          console.log(`🔍 Initial recovery check completed: ${result.success} successful, ${result.failed} failed`);
        }
      } catch (error) {
        console.error('❌ Failed to start payment recovery job:', error);
      }
    } else {
      console.log('ℹ️ Payment recovery job is disabled (ENABLE_PAYMENT_RECOVERY=false)');
    }

  } catch (error) {
    console.error('❌ Failed to start one or more services:', error);
  }
};

// Start all services with proper initialization
const initializeServices = async () => {
  try {
    console.log('🚀 Initializing services...');
    await startServices();
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
};

// Initialize services after a short delay to ensure everything is ready
setTimeout(initializeServices, 2000);

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('\n🚦 Received shutdown signal. Starting graceful shutdown...');

  try {
    // Stop payment recovery job if running
    if (paymentRecoveryJob && typeof paymentRecoveryJob.stop === 'function') {
      console.log('🛑 Stopping payment recovery job...');
      await paymentRecoveryJob.stop().catch(console.error);
    }

    // Stop other background services
    if (paymentCleanupService && typeof paymentCleanupService.stopAutoCleanup === 'function') {
      console.log('🧹 Stopping payment cleanup service...');
      await paymentCleanupService.stopAutoCleanup().catch(console.error);
    }

    if (channelExpiryService && typeof channelExpiryService.stopExpiryChecks === 'function') {
      console.log('⏹️ Stopping channel expiry service...');
      await channelExpiryService.stopExpiryChecks().catch(console.error);
    }

    // Close the HTTP server
    console.log('🛑 Closing HTTP server...');
    server.close(async () => {
      console.log('✅ HTTP server closed');

      // Close MongoDB connection
      if (mongoose.connection.readyState === 1) {
        console.log('🔌 Closing MongoDB connection...');
        await mongoose.connection.close(false);
        console.log('✅ MongoDB connection closed');
      }

      console.log('👋 Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcing shutdown');
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ------------------ Seed Super Admin ------------------
(async () => {
  const seedEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@tg.local';
  const seedPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@12345';
  try {
    const result = await seedSuperAdmin({ email: seedEmail, password: seedPassword });
    if (result.seeded) console.log('Super admin seeded:', result.email);
    else if (result.message) console.log(result.message);
    else if (result.error) console.error('Super admin seed error:', result.error);
  } catch (e) {
    console.error('Super admin seed exception:', e.message);
  }
})();

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

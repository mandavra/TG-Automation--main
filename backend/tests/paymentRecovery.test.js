const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const paymentRecoveryService = require('../services/paymentRecoveryService');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const Plan = require('../models/plan.model');

// Mock external services
jest.mock('../services/notificationService');
const notificationService = require('../services/notificationService');

// Mock monitoring service
jest.mock('../services/recoveryMonitoringService');
const monitoringService = require('../services/recoveryMonitoringService');

// Mock notification service
jest.mock('../services/recoveryNotificationService');
const recoveryNotificationService = require('../services/recoveryNotificationService');

// Test data
const testUser = {
  _id: new mongoose.Types.ObjectId(),
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '9876543210',
  telegramUserId: '123456789',
  status: 'active'
};

const testPlan = {
  _id: new mongoose.Types.ObjectId(),
  planName: 'Test Plan',
  amount: 999,
  duration: 30,
  channelList: ['channel1', 'channel2'],
  status: 'active'
};

const testPayment = {
  _id: new mongoose.Types.ObjectId(),
  userid: testUser._id,
  plan_id: testPlan._id,
  plan_name: testPlan.planName,
  amount: testPlan.amount,
  status: 'SUCCESS',
  purchase_datetime: new Date(),
  expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  link_delivered: false,
  delivery_status: 'pending'
};

// Setup and teardown
let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Clear all test data
  await Promise.all([
    User.deleteMany({}),
    Plan.deleteMany({}),
    PaymentLink.deleteMany({}),
    Group.deleteMany({})
  ]);
  
  // Insert test data
  await User.create(testUser);
  await Plan.create(testPlan);
  await PaymentLink.create(testPayment);
  
  // Setup mock implementations
  notificationService.notifyUser.mockResolvedValue(true);
  monitoringService.recordRecoveryAttempt.mockResolvedValue(true);
  recoveryNotificationService.sendRecoveryNotification.mockResolvedValue(true);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Payment Recovery Service', () => {
  describe('findFailedDeliveries', () => {
    it('should find payments with failed deliveries', async () => {
      const result = await paymentRecoveryService.findFailedDeliveries();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]._id.toString()).toBe(testPayment._id.toString());
    });
  });

  describe('processFailedDeliveries', () => {
    it('should process failed deliveries successfully', async () => {
      // Mock successful recovery
      paymentRecoveryService.retryPaymentDelivery = jest.fn()
        .mockResolvedValue({ success: true });
      
      const result = await paymentRecoveryService.processFailedDeliveries();
      
      expect(result).toHaveProperty('success', 1);
      expect(result).toHaveProperty('failed', 0);
      expect(notificationService.notifyUser).toHaveBeenCalled();
    });

    it('should handle delivery failures', async () => {
      // Mock failed recovery
      paymentRecoveryService.retryPaymentDelivery = jest.fn()
        .mockResolvedValue({ 
          success: false, 
          error: 'Delivery failed' 
        });
      
      const result = await paymentRecoveryService.processFailedDeliveries();
      
      expect(result).toHaveProperty('success', 0);
      expect(result).toHaveProperty('failed', 1);
      expect(recoveryNotificationService.sendAdminAlert).toHaveBeenCalled();
    });
  });

  describe('retryPaymentDelivery', () => {
    it('should successfully retry payment delivery', async () => {
      const payment = await PaymentLink.findById(testPayment._id);
      const result = await paymentRecoveryService.retryPaymentDelivery(payment);
      
      expect(result.success).toBe(true);
      expect(monitoringService.recordRecoveryAttempt).toHaveBeenCalledWith(
        payment._id,
        true
      );
    });

    it('should handle missing telegram user ID', async () => {
      // Create a user without telegramUserId
      const userWithoutTelegram = await User.create({
        ...testUser,
        _id: new mongoose.Types.ObjectId(),
        telegramUserId: null
      });
      
      const payment = await PaymentLink.create({
        ...testPayment,
        _id: new mongoose.Types.ObjectId(),
        userid: userWithoutTelegram._id
      });
      
      const result = await paymentRecoveryService.retryPaymentDelivery(payment);
      
      expect(result.success).toBe(false);
      expect(result.needsTelegramLink).toBe(true);
      expect(recoveryNotificationService.sendRecoveryNotification).toHaveBeenCalled();
    });
  });

  describe('notifyAdminsAboutRecovery', () => {
    it('should send notifications to admins', async () => {
      const results = {
        success: 1,
        failed: 0,
        details: [{
          paymentId: testPayment._id,
          success: true
        }]
      };
      
      await paymentRecoveryService.notifyAdminsAboutRecovery(results);
      
      expect(notificationService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Payment Recovery Report',
          message: expect.stringContaining('1 successful recovery')
        })
      );
    });
  });
});

describe('Recovery Monitoring Service', () => {
  it('should record recovery metrics', async () => {
    const metrics = await monitoringService.getRecoveryMetrics();
    
    expect(metrics).toHaveProperty('totalRecoveryAttempts');
    expect(metrics).toHaveProperty('successRate');
    expect(metrics).toHaveProperty('averageRecoveryTime');
  });
  
  it('should track failed recoveries', async () => {
    const error = new Error('Test error');
    await monitoringService.recordFailedRecovery(
      testPayment._id, 
      error
    );
    
    const metrics = await monitoringService.getRecoveryMetrics();
    expect(metrics.failedRecoveries).toBeGreaterThan(0);
  });
});

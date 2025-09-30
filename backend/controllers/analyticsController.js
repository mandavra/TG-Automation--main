const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const Plan = require('../models/plan');
const Invoice = require('../models/Invoice');
const Admin = require('../models/admin.model');

// Get revenue analytics for admin
const getRevenueAnalytics = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    const { dateRange = '30d', groupId } = req.query;
    
    // Calculate date filter
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'lifetime':
        startDate = new Date('2020-01-01'); // Set to a very early date
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Use tenant filter from middleware
    const filter = req.getTenantFilter ? req.getTenantFilter() : { adminId };
    const baseQuery = filter;
    
    // Add date filter
    const dateQuery = {
      ...baseQuery,
      createdAt: { $gte: startDate, $lte: now }
    };

    // Add group filter if specified
    if (groupId && groupId !== 'all') {
      dateQuery.groupId = groupId;
    }

    // Get total revenue
    const totalRevenueResult = await PaymentLink.aggregate([
      { $match: { ...baseQuery, status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Get monthly revenue (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenueResult = await PaymentLink.aggregate([
      { 
        $match: { 
          ...baseQuery, 
          status: 'SUCCESS',
          createdAt: { $gte: monthStart, $lte: now }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

    // Get subscription counts
    const totalSubscriptions = await User.countDocuments({
      ...baseQuery,
      subscriptionStatus: { $in: ['active', 'expired'] }
    });

    const activeSubscriptions = await User.countDocuments({
      ...baseQuery,
      subscriptionStatus: 'active',
      expiryDate: { $gt: now }
    });

    // Get average revenue per user
    const avgRevenuePerUser = totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0;

    // Get recent transactions
    const recentTransactions = await PaymentLink.find(dateQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('adminId', 'email platformFee')
      .populate('userid', 'firstName lastName email phone')
      .lean();

    console.log('Analytics Debug - Date Range:', dateRange, 'Start Date:', startDate, 'Now:', now);
    console.log('Analytics Debug - Recent Transactions Count:', recentTransactions.length);
    console.log('Analytics Debug - Recent Transactions (derived):', recentTransactions.map(t => {
      const derived = computePerTxNet({
        amount: t.amount,
        platformFee: t.platformFee,
        netAmount: t.netAmount,
        adminId: t.adminId ? { platformFee: t.adminId.platformFee } : undefined,
        createdAt: t.createdAt
      });
      return {
        id: t._id,
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
        adminPlatformFee: t.adminId?.platformFee,
        platformFeeUsed: (typeof t.platformFee === 'number' && t.platformFee > 0) ? t.platformFee : derived.fee,
        netAmountUsed: (typeof t.netAmount === 'number' && Number.isFinite(t.netAmount)) ? t.netAmount : derived.net
      };
    }));

    // Get top performing plans
    const topPlans = await PaymentLink.aggregate([
      { $match: { ...baseQuery, status: 'SUCCESS' } },
      { 
        $group: { 
          _id: '$plan_name', 
          revenue: { $sum: '$amount' },
          subscriptions: { $sum: 1 }
        } 
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    // Calculate total for percentages
    const totalPlanRevenue = topPlans.reduce((sum, plan) => sum + plan.revenue, 0);
    const topPlansWithPercentage = topPlans.map(plan => ({
      _id: plan._id,
      type: plan._id,
      revenue: plan.revenue,
      subscriptions: plan.subscriptions,
      percentage: totalPlanRevenue > 0 ? ((plan.revenue / totalPlanRevenue) * 100).toFixed(1) : 0
    }));

    // Get monthly data for chart (last 6 months)
    const monthlyData = await PaymentLink.aggregate([
      { 
        $match: { 
          ...baseQuery, 
          status: 'SUCCESS',
          createdAt: { 
            $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1),
            $lte: now 
          }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
          latestTransactionDate: { $max: '$createdAt' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Fetch per-transaction data for the same window to compute accurate monthly net totals
    const txForWindow = await PaymentLink.find({
      ...baseQuery,
      status: 'SUCCESS',
      createdAt: { 
        $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1),
        $lte: now 
      }
    }).populate('adminId', 'platformFee').select('amount platformFee netAmount adminId createdAt').lean();

    // Helper: compute per-transaction net using available fields (hoisted)
    function computePerTxNet(tx) {
      const amount = Number(tx.amount || 0);
      if (typeof tx.netAmount === 'number' && Number.isFinite(tx.netAmount) && tx.netAmount >= 0) {
        return { net: tx.netAmount, fee: amount - tx.netAmount };
      }
      if (typeof tx.platformFee === 'number' && Number.isFinite(tx.platformFee)) {
        const fee = Math.max(0, tx.platformFee);
        return { net: Math.max(0, amount - fee), fee };
      }
      const adminFee = tx.adminId && typeof tx.adminId.platformFee === 'number' ? tx.adminId.platformFee : undefined;
      if (typeof adminFee === 'number' && Number.isFinite(adminFee) && adminFee !== 0) {
        if (adminFee >= 1) {
          const fee = Math.max(0, adminFee);
          return { net: Math.max(0, amount - fee), fee };
        } else {
          const fee = Math.max(0, amount * adminFee);
          return { net: Math.max(0, amount - fee), fee };
        }
      }
      // Fallback: 2.9%
      const fallbackFee = Math.max(0, amount * 0.029);
      return { net: Math.max(0, amount - fallbackFee), fee: fallbackFee };
    }

    // Group transactions by year-month
    const ymKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthlySums = new Map();
    for (const tx of txForWindow) {
      const key = ymKey(new Date(tx.createdAt));
      const { net, fee } = computePerTxNet(tx);
      const cur = monthlySums.get(key) || { net: 0, fee: 0 };
      cur.net += net;
      cur.fee += fee;
      monthlySums.set(key, cur);
    }

    // Merge accurate net/platform fees into monthly buckets
    const monthlyDataWithNet = monthlyData.map(month => {
      const key = `${month._id.year}-${String(month._id.month).padStart(2, '0')}`;
      const sums = monthlySums.get(key) || { net: 0, fee: 0 };
      return {
        ...month,
        netRevenue: sums.net,
        platformFees: sums.fee,
        latestTransactionDate: month.latestTransactionDate
      };
    });

    // Fetch the admin's platform fee (no hard default)
    let defaultPlatformFee = undefined;
    const adminDoc = await Admin.findOne({ _id: adminId });
    if (adminDoc && typeof adminDoc.platformFee === 'number') {
      defaultPlatformFee = adminDoc.platformFee;
    }

    // Calculate Net Earned Amount (Subtotal) for all successful payments in the date range
    const netEarnedPayments = await PaymentLink.find({
      ...dateQuery,
      status: 'SUCCESS'
    }).populate('adminId', 'platformFee').lean();

    let netEarnedSubtotal = 0;
    for (const tx of netEarnedPayments) {
      const amount = Number(tx.amount || 0);
      if (typeof tx.netAmount === 'number' && tx.netAmount >= 0) {
        netEarnedSubtotal += tx.netAmount;
      } else if (typeof tx.platformFee === 'number' && tx.platformFee > 0) {
        netEarnedSubtotal += (amount - tx.platformFee);
      } else if (tx.adminId && typeof tx.adminId.platformFee === 'number' && tx.adminId.platformFee > 0) {
        if (tx.adminId.platformFee >= 1) {
          netEarnedSubtotal += (amount - tx.adminId.platformFee);
        } else {
          netEarnedSubtotal += (amount - (amount * tx.adminId.platformFee));
        }
      } else if (typeof defaultPlatformFee === 'number' && defaultPlatformFee > 0) {
        if (defaultPlatformFee >= 1) {
          netEarnedSubtotal += (amount - defaultPlatformFee);
        } else {
          netEarnedSubtotal += (amount - (amount * defaultPlatformFee));
        }
      } else {
        // fallback 2.9%
        netEarnedSubtotal += (amount - (amount * 0.029));
      }
    }

    // Calculate growth rate by comparing current period with previous period
    let growthRate = 0;
    try {
      // Calculate previous period dates
      let previousStartDate = new Date();
      let previousEndDate = new Date(startDate);
      
      // Calculate the period duration
      const periodDuration = now.getTime() - startDate.getTime();
      previousStartDate.setTime(previousEndDate.getTime() - periodDuration);
      
      // Get previous period net earnings
      const previousPeriodQuery = {
        ...baseQuery,
        status: 'SUCCESS',
        createdAt: { $gte: previousStartDate, $lt: previousEndDate }
      };
      
      const previousPeriodPayments = await PaymentLink.find(previousPeriodQuery)
        .populate('adminId', 'platformFee').lean();
      
      let previousPeriodNetEarnings = 0;
      for (const tx of previousPeriodPayments) {
        const amount = Number(tx.amount || 0);
        if (typeof tx.netAmount === 'number' && tx.netAmount >= 0) {
          previousPeriodNetEarnings += tx.netAmount;
        } else if (typeof tx.platformFee === 'number' && tx.platformFee > 0) {
          previousPeriodNetEarnings += (amount - tx.platformFee);
        } else if (tx.adminId && typeof tx.adminId.platformFee === 'number' && tx.adminId.platformFee > 0) {
          if (tx.adminId.platformFee >= 1) {
            previousPeriodNetEarnings += (amount - tx.adminId.platformFee);
          } else {
            previousPeriodNetEarnings += (amount - (amount * tx.adminId.platformFee));
          }
        } else if (typeof defaultPlatformFee === 'number' && defaultPlatformFee > 0) {
          if (defaultPlatformFee >= 1) {
            previousPeriodNetEarnings += (amount - defaultPlatformFee);
          } else {
            previousPeriodNetEarnings += (amount - (amount * defaultPlatformFee));
          }
        } else {
          // fallback 2.9%
          previousPeriodNetEarnings += (amount - (amount * 0.029));
        }
      }
      
      // Calculate growth rate percentage with conservative logic
      if (previousPeriodNetEarnings > 0) {
        const rawGrowthRate = ((netEarnedSubtotal - previousPeriodNetEarnings) / previousPeriodNetEarnings) * 100;
        
        // More conservative growth rate handling
        if (Math.abs(rawGrowthRate) > 100) {
          // Cap at 100% for any growth above 100%
          growthRate = rawGrowthRate > 0 ? 100 : -100;
        } else if (Math.abs(rawGrowthRate) < 1) {
          // Round very small changes to 0
          growthRate = 0;
        } else {
          growthRate = rawGrowthRate;
        }
      } else {
        // Always show 0% when there's no previous period data
        growthRate = 0;
      }
      
      // Final safety check - never show more than 100%
      if (Math.abs(growthRate) > 100) {
        growthRate = growthRate > 0 ? 100 : -100;
      }
      
      console.log('DEBUG - Growth Rate Calculation:', {
        currentPeriod: netEarnedSubtotal,
        previousPeriod: previousPeriodNetEarnings,
        growthRate: growthRate,
        dateRange: dateRange,
        currentStart: startDate.toISOString(),
        currentEnd: now.toISOString(),
        previousStart: previousStartDate.toISOString(),
        previousEnd: previousEndDate.toISOString()
      });
    } catch (error) {
      console.error('Error calculating growth rate:', error);
      growthRate = 0;
    }

    // Format recent transactions for frontend
    const formattedTransactions = recentTransactions.map(transaction => {
      const first = transaction.userid?.firstName?.trim();
      const last = transaction.userid?.lastName?.trim();
      const fullName = [first, last].filter(Boolean).join(' ');
      const fallbackName = fullName || transaction.customerName || transaction.userid?.email || transaction.phone || 'Unknown Customer';
      const adminFee = (transaction.adminId && typeof transaction.adminId.platformFee === 'number') ? transaction.adminId.platformFee : undefined;
      const perTx = computePerTxNet(transaction);

      return {
        _id: transaction._id,
        userName: fallbackName,
        phone: transaction.userid?.phone || transaction.phone,
        plan_name: transaction.plan_name,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        adminPlatformFee: adminFee,
        platformFee: (typeof transaction.platformFee === 'number' && transaction.platformFee > 0) ? transaction.platformFee : perTx.fee,
        netAmount: (typeof transaction.netAmount === 'number' && Number.isFinite(transaction.netAmount)) ? transaction.netAmount : perTx.net
      };
    });

    const response = {
      totalRevenue,
      monthlyRevenue,
      totalSubscriptions,
      activeSubscriptions,
      avgRevenuePerUser,
      conversionRate: 75.5, // This would need to be calculated based on actual data
      recentTransactions: formattedTransactions,
      topPlans: topPlansWithPercentage,
      monthlyData: monthlyDataWithNet,
      netEarnedSubtotal,
      growthRate
    };
    
    console.log('DEBUG - Analytics API Response:', {
      netEarnedSubtotal: response.netEarnedSubtotal,
      growthRate: response.growthRate,
      totalRevenue: response.totalRevenue,
      monthlyRevenue: response.monthlyRevenue,
      recentTransactionsCount: response.recentTransactions.length
    });
    
    res.json(response);

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export analytics data
const exportAnalytics = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    const { dateRange = '30d', groupId, format = 'csv' } = req.query;
    
    // Calculate date filter
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Use tenant filter from middleware
    const filter = req.getTenantFilter ? req.getTenantFilter() : { adminId };
    const baseQuery = filter;
    
    // Add date filter
    const dateQuery = {
      ...baseQuery,
      createdAt: { $gte: startDate, $lte: now },
      status: 'SUCCESS'
    };

    // Add group filter if specified
    if (groupId && groupId !== 'all') {
      dateQuery.groupId = groupId;
    }

    // Get all transactions
    const transactions = await PaymentLink.find(dateQuery)
      .sort({ createdAt: -1 })
      .populate('adminId', 'email')
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'Date,Customer Name,Phone,Plan,Amount,Status,Transaction ID\n';
      const csvRows = transactions.map(t => 
        `${new Date(t.createdAt).toLocaleDateString()},${t.customerName || 'N/A'},${t.phone},${t.plan_name},${t.amount},${t.status},${t.orderId || 'N/A'}`
      ).join('\n');
      
      const csvData = csvHeaders + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${dateRange}.csv`);
      res.send(csvData);
    } else {
      // Return JSON
      res.json({ transactions });
    }

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user growth analytics
const getUserGrowthAnalytics = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    const { dateRange = '30d' } = req.query;
    
    // Calculate date filter
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Use tenant filter from middleware
    const filter = req.getTenantFilter ? req.getTenantFilter() : { adminId };
    const baseQuery = filter;

    // Get user growth data
    const userGrowth = await User.aggregate([
      { 
        $match: { 
          ...baseQuery,
          createdAt: { $gte: startDate, $lte: now }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          newUsers: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({ userGrowth });

  } catch (error) {
    console.error('Get user growth analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRevenueAnalytics,
  exportAnalytics,
  getUserGrowthAnalytics
};
const express = require('express');
const app = express();

app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test server is working!', timestamp: new Date().toISOString() });
});

// Plans route
app.get('/api/plans/get', (req, res) => {
  res.json([
    { id: 1, name: 'Basic', price: 100, duration: 30 },
    { id: 2, name: 'Pro', price: 200, duration: 30 },
    { id: 3, name: 'Premium', price: 300, duration: 30 }
  ]);
});

// Invite link route
app.get('/api/invite/invite-link', (req, res) => {
  res.json({
    success: true,
    link: 'https://t.me/+G_Iu7IavFs1lM2Vl',
    linkId: 'G_Iu7IavFs1lM2Vl',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 86400
  });
});

// Payment status route
app.get('/api/payment/status/by-link/:orderId', (req, res) => {
  res.json({
    status: 'SUCCESS',
    data: { status: 'SUCCESS' }
  });
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/api/test`);
}); 
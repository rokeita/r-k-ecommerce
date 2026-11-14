require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { handleWebhook } = require('./controllers/paymentController');
const { seedAdminUser } = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe signs the raw body, so the webhook must be registered before express.json().
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected');
      return seedAdminUser();
    })
    .catch((error) => console.error('MongoDB connection error:', error.message));
}

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Shopfront running on http://localhost:${PORT}`);
});

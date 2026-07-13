const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    items: [
      {
        id: String,
        name: String,
        price: Number,
        quantity: Number
      }
    ],
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 12 },
    total: { type: Number, required: true },
    status: { type: String, default: 'paid' }
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

module.exports = Order;

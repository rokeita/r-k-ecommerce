const { listProducts } = require('../models/Product');
const Order = require('../models/Order');

const getProducts = async (req, res) => {
  try {
    const products = await listProducts();
    res.json(products.map((product) => ({ ...product, id: product.id || product._id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCheckout = async (req, res) => {
  const { items = [], customer = {} } = req.body;

  if (items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + 12;
  const orderId = `ORD-${Date.now()}`;

  try {
    if (process.env.MONGODB_URI) {
      await Order.create({
        orderId,
        customerName: customer.name || 'Guest',
        email: customer.email || 'guest@example.com',
        items,
        subtotal,
        shipping: 12,
        total,
        status: 'paid'
      });
    }

    res.json({
      success: true,
      orderId,
      customerName: customer.name || 'Guest',
      total: Number(total.toFixed(2)),
      items
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  createCheckout
};

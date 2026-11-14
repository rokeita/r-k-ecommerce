const { listProducts } = require('../models/Product');
const Order = require('../models/Order');
const stripe = require('../config/stripe');

const SHIPPING = 12;

const getProducts = async (req, res) => {
  try {
    const products = await listProducts();
    res.json(products.map((product) => ({ ...product, id: product.id || product._id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCheckout = async (req, res) => {
  const { items: requested = [], customer = {} } = req.body || {};

  if (!Array.isArray(requested) || requested.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  try {
    // Never trust client-sent prices; look them up from the catalogue.
    const catalogue = await listProducts();
    const byId = new Map(catalogue.map((p) => [String(p.id || p._id), p]));
    const items = [];
    for (const item of requested) {
      const product = byId.get(String(item.id));
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'Invalid cart item' });
      }
      items.push({ id: String(item.id), name: product.name, price: product.price, quantity });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + SHIPPING;
    const orderId = `ORD-${Date.now()}`;
    const customerName = customer.name || 'Guest';
    const email = customer.email || 'guest@example.com';

    // The order is only marked paid once Stripe confirms the charge (webhook or /api/payments/confirm).
    let session = null;
    if (stripe) {
      const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          ...items.map((item) => ({
            price_data: {
              currency: 'usd',
              product_data: { name: item.name },
              unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
          })),
          {
            price_data: { currency: 'usd', product_data: { name: 'Shipping' }, unit_amount: SHIPPING * 100 },
            quantity: 1
          }
        ],
        customer_email: customer.email || undefined,
        client_reference_id: orderId,
        metadata: { orderId },
        success_url: `${origin}/?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?order=${orderId}&cancelled=1`
      });
    }

    if (process.env.MONGODB_URI) {
      await Order.create({
        orderId,
        customerName,
        email,
        items,
        subtotal,
        shipping: SHIPPING,
        total,
        status: 'pending',
        stripeSessionId: session ? session.id : undefined
      });
    }

    res.json({
      success: true,
      orderId,
      customerName,
      total: Number(total.toFixed(2)),
      items,
      status: 'pending',
      checkoutUrl: session ? session.url : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  createCheckout
};

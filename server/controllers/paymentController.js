const stripe = require('../config/stripe');
const Order = require('../models/Order');

// Only trust Stripe's own record of the session, and only if it charged the order's total.
const markOrderPaid = async (session) => {
  const orderId = session.metadata && session.metadata.orderId;
  if (!orderId || session.payment_status !== 'paid' || !process.env.MONGODB_URI) return false;

  const order = await Order.findOne({ orderId });
  if (!order || Math.round(order.total * 100) !== session.amount_total) return false;

  if (order.status !== 'paid') {
    order.status = 'paid';
    order.stripeSessionId = session.id;
    await order.save();
  }
  return true;
};

const handleWebhook = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ message: 'Stripe webhooks are not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).json({ message: `Webhook signature verification failed: ${error.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await markOrderPaid(event.data.object);
    }
    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const confirmPayment = async (req, res) => {
  const sessionId = req.query.session_id;
  if (!stripe) {
    return res.status(400).json({ message: 'Online payment is not configured' });
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'session_id is required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const stripePaid = session.payment_status === 'paid';
    // With a database, only report paid once the stored order's total matches the charge.
    const paid = stripePaid && (process.env.MONGODB_URI ? await markOrderPaid(session) : true);
    res.json({
      orderId: session.metadata && session.metadata.orderId,
      paid
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { handleWebhook, confirmPayment, markOrderPaid };

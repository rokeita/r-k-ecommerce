const Stripe = require('stripe');

// Null when no key is configured; checkout then records orders as awaiting payment.
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

module.exports = stripe;

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: 'General' },
    description: { type: String, default: '' },
    image: { type: String, default: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80' }
  },
  { timestamps: true }
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const fallbackProducts = [
  {
    id: 'aurora-headphones',
    name: 'Aurora Headphones',
    price: 149,
    category: 'Audio',
    description: 'Immersive sound with adaptive noise cancellation.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'lumen-watch',
    name: 'Lumen Smart Watch',
    price: 199,
    category: 'Wearables',
    description: 'Track workouts, sleep, and wellness with elegance.',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80'
  }
];

const isMongoConnected = () => Boolean(process.env.MONGODB_URI) && mongoose.connection.readyState === 1;

const listProducts = async () => {
  if (isMongoConnected()) {
    return Product.find().sort({ createdAt: -1 }).lean();
  }

  return fallbackProducts.map((product) => ({ ...product }));
};

const createProduct = async (data) => {
  if (isMongoConnected()) {
    const product = await Product.create(data);
    return product.toObject();
  }

  const created = {
    id: `product-${Date.now()}`,
    ...data
  };
  fallbackProducts.unshift(created);
  return created;
};

module.exports = {
  Product,
  listProducts,
  createProduct,
  fallbackProducts
};

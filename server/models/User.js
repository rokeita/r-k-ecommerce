const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'customer' }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

const fallbackUsers = [];

const isMongoConnected = () => Boolean(process.env.MONGODB_URI) && mongoose.connection.readyState === 1;

const hashPassword = async (password) => bcrypt.hash(password, 10);
const comparePassword = async (password, hashed) => bcrypt.compare(password, hashed);

const seedAdminUser = async () => {
  if (isMongoConnected()) {
    // Never seed the public demo password into a real database.
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
      await User.create({
        name: 'Admin',
        email: ADMIN_EMAIL,
        password: await hashPassword(ADMIN_PASSWORD),
        role: 'admin'
      });
    }
    return;
  }

  if (!fallbackUsers.some((user) => user.email === 'admin@example.com')) {
    fallbackUsers.push({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@example.com',
      password: await hashPassword('password123'),
      role: 'admin'
    });
  }
};

const findUserByEmail = async (email) => {
  if (isMongoConnected()) {
    const user = await User.findOne({ email });
    return user ? user.toObject() : null;
  }

  return fallbackUsers.find((user) => user.email === email) || null;
};

const createUser = async ({ name, email, password, role = 'customer' }) => {
  const hashedPassword = await hashPassword(password);

  if (isMongoConnected()) {
    const user = await User.create({ name, email, password: hashedPassword, role });
    return user.toObject();
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    password: hashedPassword,
    role
  };
  fallbackUsers.push(newUser);
  return newUser;
};

seedAdminUser();

module.exports = {
  User,
  hashPassword,
  comparePassword,
  findUserByEmail,
  createUser,
  seedAdminUser,
  fallbackUsers
};

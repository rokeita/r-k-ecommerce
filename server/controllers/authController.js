const jwt = require('jsonwebtoken');
const { comparePassword, createUser, findUserByEmail } = require('../models/User');

const signToken = (user) => jwt.sign(
  { id: user.id || user._id, email: user.email, role: user.role },
  process.env.JWT_SECRET || 'northstar-secret',
  { expiresIn: '7d' }
);

const publicUser = (user) => ({
  id: user.id || user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: publicUser(user)
  });
};

const register = async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const user = await createUser({ name, email, password, role: 'customer' });
  const token = signToken(user);

  res.status(201).json({
    token,
    user: publicUser(user)
  });
};

const getProfile = (req, res) => {
  res.json({ user: publicUser(req.user) });
};

module.exports = {
  login,
  register,
  getProfile
};

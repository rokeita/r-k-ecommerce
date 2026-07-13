const jwt = require('jsonwebtoken');
const { comparePassword, createUser, findUserByEmail } = require('../models/User');

const signToken = (user) => jwt.sign(
  { id: user.id || user._id, email: user.email, role: user.role },
  process.env.JWT_SECRET || 'northstar-secret',
  { expiresIn: '7d' }
);

const login = async (req, res) => {
  const { email, password } = req.body;

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
    user: {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const user = await createUser({ name, email, password, role: 'customer' });
  const token = signToken(user);

  res.status(201).json({
    token,
    user: {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

const getProfile = (req, res) => {
  res.json({ user: req.user });
};

module.exports = {
  login,
  register,
  getProfile
};

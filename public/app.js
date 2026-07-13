const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const subtotalEl = document.getElementById('subtotal');
const feedback = document.getElementById('feedback');
const checkoutForm = document.getElementById('checkoutForm');
const paymentButton = document.querySelector('#checkoutForm button');
const authForm = document.getElementById('authForm');
const authStatus = document.getElementById('authStatus');
const adminForm = document.getElementById('adminForm');
const adminMessage = document.getElementById('adminMessage');

let products = [];
let cart = [];
let authToken = localStorage.getItem('northstar-token') || '';
let user = JSON.parse(localStorage.getItem('northstar-user') || 'null');

const formatCurrency = (value) => `$${value.toFixed(2)}`;

const renderProducts = () => {
  productGrid.innerHTML = products.map((product) => {
    const productId = product.id || product._id;
    return `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}" />
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-meta">
          <span class="price">${formatCurrency(product.price)}</span>
          <button class="button primary" data-id="${productId}">Add to cart</button>
        </div>
      </article>
    `;
  }).join('');
};

const renderCart = () => {
  if (!cart.length) {
    cartItems.innerHTML = '<div class="cart-item">Your cart is empty.</div>';
    cartCount.textContent = '0 items';
    subtotalEl.textContent = formatCurrency(0);
    return;
  }

  const itemsMarkup = cart.map((item) => `
    <div class="cart-item">
      <strong>${item.name}</strong>
      <div>${item.quantity} × ${formatCurrency(item.price)}</div>
    </div>
  `).join('');

  cartItems.innerHTML = itemsMarkup;
  cartCount.textContent = `${cart.reduce((sum, item) => sum + item.quantity, 0)} items`;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  subtotalEl.textContent = formatCurrency(subtotal);
};

const addToCart = (productId) => {
  const product = products.find((item) => (item.id || item._id) === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  renderCart();
  feedback.textContent = `${product.name} added to cart.`;
};

const updateAuthStatus = () => {
  if (user) {
    authStatus.textContent = `Signed in as ${user.name} (${user.role})`;
  } else {
    authStatus.textContent = 'Not signed in';
  }
};

const loadProducts = async () => {
  const response = await fetch('/api/products');
  products = (await response.json()).map((product) => ({ ...product, id: product.id || product._id }));
  renderProducts();
};

productGrid.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  addToCart(button.dataset.id);
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!cart.length) {
    feedback.textContent = 'Please add a product before checkout.';
    return;
  }

  const customer = Object.fromEntries(new FormData(checkoutForm));
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  paymentButton.disabled = true;
  paymentButton.textContent = 'Processing…';

  const intentResponse = await fetch('/api/payments/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: subtotal + 12 })
  });
  const intentResult = await intentResponse.json();

  const payload = {
    items: cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })),
    customer
  };

  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  feedback.textContent = `Order placed successfully! ${result.orderId} for ${result.customerName}. Payment intent ready: ${intentResult.clientSecret ? 'client secret generated' : 'using fallback mode'}.`;
  cart = [];
  renderCart();
  checkoutForm.reset();
  paymentButton.disabled = false;
  paymentButton.textContent = 'Complete order';
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(authForm));
  const endpoint = formData.name ? '/api/auth/register' : '/api/auth/login';
  const payload = formData.name ? { name: formData.name, email: formData.email, password: formData.password } : { email: formData.email, password: formData.password };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (result.token) {
    authToken = result.token;
    user = result.user;
    localStorage.setItem('northstar-token', authToken);
    localStorage.setItem('northstar-user', JSON.stringify(user));
    updateAuthStatus();
    feedback.textContent = `Welcome, ${user.name}!`;
  } else {
    feedback.textContent = result.message || 'Authentication failed.';
  }
  authForm.reset();
});

adminForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!authToken) {
    adminMessage.textContent = 'Please sign in first as an admin.';
    return;
  }

  const payload = Object.fromEntries(new FormData(adminForm));
  payload.price = Number(payload.price);

  const response = await fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  adminMessage.textContent = result.name ? `Added ${result.name}` : result.message || 'Unable to add product.';
  if (result.name) {
    adminForm.reset();
    loadProducts();
  }
});

updateAuthStatus();
loadProducts();

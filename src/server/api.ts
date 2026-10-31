import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  AuthSessionUser,
  isAdmin,
  isManagerOrAdmin,
  canViewProfits,
} from '../lib/auth.ts';
import {
  setupSchema,
  loginSchema,
  productSchema,
  categorySchema,
  customerSchema,
  customerPaymentSchema,
  completeSaleSchema,
  websiteOrderSchema,
  expenseSchema,
  settingsSchema,
  userCreateSchema,
  userUpdateSchema,
  shopSchema,
} from '../lib/validators.ts';
import { getDhakaToday } from '../lib/dates.ts';

export const apiRouter = Router();

// Extend Express Request
export interface AuthenticatedRequest extends Request {
  user?: AuthSessionUser;
}

// Rate limiting in-memory map for login & orders
const rateLimitMap: Record<string, { count: number; resetTime: number }> = {};
function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap[key];
  if (!record || now > record.resetTime) {
    rateLimitMap[key] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  if (record.count >= maxAttempts) {
    return false;
  }
  record.count += 1;
  return true;
}

export function getZodErrorMessage(error: any): string {
  if (!error) return 'Invalid input';
  if (Array.isArray(error.issues) && error.issues.length > 0) {
    return error.issues[0].message;
  }
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors[0].message;
  }
  return error.message || 'Invalid input';
}

// Authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Authorization header Bearer
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Cookie fallback
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'dalim_auth_token') {
        token = v;
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'লগইন আবশ্যক (Authentication required)' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'সেশন মেয়াদোত্তীর্ণ বা অবৈধ (Session expired or invalid)' });
  }

  // Check if user is active in DB
  const dbUser = db.getUserById(user.id);
  if (!dbUser || !dbUser.isActive) {
    return res.status(403).json({ success: false, message: 'অ্যাকাউন্টটি নিষ্ক্রিয় (Account deactivated)' });
  }

  req.user = user;
  next();
}

// Role guards
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'শুধুমাত্র অ্যাডমিন এক্সেস করতে পারবে (Admin access required)' });
  }
  next();
}

export function requireManagerOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isManagerOrAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'অননুমোদিত এক্সেস (Unauthorized access)' });
  }
  next();
}

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// GET /api/store -> shop info + active categories + active products with stock > 0
apiRouter.get('/store', (req, res) => {
  const shopId = 1; // Default shop or from header
  const shop = db.getShopById(shopId);
  const categories = db.getCategories(shopId, true);
  const products = db.getProducts(shopId, { status: 'active', onlyInStock: true });

  // Last entry product shows first in public view (newest products first)
  const sortedProducts = [...products].sort((a, b) => b.id - a.id);

  // Sanitize products: remove buyPrice for public view
  const publicProducts = sortedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    sku: p.sku,
    barcode: p.barcode,
    image: p.image,
    description: p.description,
    sellPrice: p.sellPrice,
    stock: p.stock,
  }));

  res.json({
    success: true,
    data: {
      shop,
      categories,
      products: publicProducts,
    },
  });
});

// POST /api/orders -> public website order
apiRouter.post('/orders', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`order_${ip}`, 10, 60000)) {
    return res.status(429).json({ success: false, message: 'অতিরিক্ত অনুরোধ করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' });
  }

  const parseResult = websiteOrderSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'অবৈধ তথ্য' });
  }

  const result = db.createWebsiteOrder(1, parseResult.data);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }

  res.json({
    success: true,
    data: {
      message: result.message,
      invoiceNo: result.invoiceNo,
    },
  });
});

// Setup status check
apiRouter.get('/auth/setup-status', (req, res) => {
  const userCount = db.getUsersCount();
  res.json({
    success: true,
    data: {
      isSetupAllowed: userCount === 0,
      userCount,
    },
  });
});

// POST /api/auth/setup
apiRouter.post('/auth/setup', async (req, res) => {
  const userCount = db.getUsersCount();
  if (userCount > 0) {
    return res.status(404).json({ success: false, message: 'সেটআপ পূর্বে সম্পন্ন হয়েছে (Setup already completed)' });
  }

  const parseResult = setupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid input' });
  }

  const { fullName, email, password, phone, shopName } = parseResult.data;

  // Check if shop exists or update shop name
  let shop = db.getShopById(1);
  if (!shop) {
    shop = db.createShop({
      shopName: shopName || 'Dalim Store',
      phone: phone || '',
      address: 'ঢাকা, বাংলাদেশ',
      currencySymbol: '৳',
      invoicePrefix: 'INV',
      invoiceFooter: 'ধন্যবাদ, আবার আসবেন!',
      bkashNumber: '',
      nagadNumber: '',
      qrImage: '',
    });
  } else if (shopName) {
    db.updateShop(1, { shopName });
  }

  const passwordHash = await hashPassword(password);
  const newUser = db.createUser({
    shopId: shop.id,
    fullName,
    email,
    phone,
    passwordHash,
    role: 'admin',
    isActive: true,
  });

  const sessionUser: AuthSessionUser = {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    shopId: newUser.shopId,
    phone: newUser.phone,
  };
  const token = signToken(sessionUser);

  res.setHeader(
    'Set-Cookie',
    `dalim_auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400;`
  );

  res.json({
    success: true,
    data: {
      token,
      user: sessionUser,
      message: 'প্রথম অ্যাডমিন সফলভাবে তৈরি হয়েছে! (First admin created successfully)',
    },
  });
});

// POST /api/auth/login
apiRouter.post('/auth/login', async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: 'সঠিক ইমেইল ও পাসওয়ার্ড প্রদান করুন' });
  }

  const { email, password } = parseResult.data;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateKey = `login_${ip}_${email.toLowerCase()}`;

  if (!checkRateLimit(rateKey, 5, 60000)) {
    return res.status(429).json({ success: false, message: 'অতিরিক্ত ব্যর্থ প্রচেষ্টা। অনুগ্রহ করে ১ মিনিট পর চেষ্টা করুন।' });
  }

  const user = db.getUserByEmail(email);
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'ভুল ইমেইল বা পাসওয়ার্ড (Invalid credentials)' });
  }

  const isMatch = await verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'ভুল ইমেইল বা পাসওয়ার্ড (Invalid credentials)' });
  }

  const sessionUser: AuthSessionUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    shopId: user.shopId,
    phone: user.phone,
  };
  const token = signToken(sessionUser);

  res.setHeader(
    'Set-Cookie',
    `dalim_auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400;`
  );

  res.json({
    success: true,
    data: {
      token,
      user: sessionUser,
    },
  });
});

// POST /api/auth/logout
apiRouter.post('/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', `dalim_auth_token=; Path=/; HttpOnly; Max-Age=0;`);
  res.json({ success: true, message: 'লগআউট সফল হয়েছে' });
});

// GET /api/auth/me
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const shop = db.getShopById(user.shopId);
  res.json({
    success: true,
    data: {
      user,
      shop,
    },
  });
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// GET /api/admin/dashboard
apiRouter.get('/admin/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const seeProfits = canViewProfits(user);
  const data = db.getDashboardData(user.shopId, seeProfits);
  res.json({ success: true, data });
});

// --- Products CRUD ---
apiRouter.get('/admin/products', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { search, categoryId, status, lowStockOnly } = req.query;

  const products = db.getProducts(user.shopId, {
    search: search ? String(search) : undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    status: status ? (String(status) as any) : undefined,
    lowStockOnly: lowStockOnly === 'true',
  });

  const seeProfits = canViewProfits(user);
  const sanitized = products.map((p) => ({
    ...p,
    buyPrice: seeProfits ? p.buyPrice : 0, // Cashier cannot see buy price
  }));

  res.json({ success: true, data: sanitized });
});

apiRouter.post('/admin/products', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role === 'cashier') {
    return res.status(403).json({ success: false, message: 'ক্যাশিয়ার পণ্য তৈরি করতে পারবেন না' });
  }

  const parseResult = productSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid product data' });
  }

  const newProd = db.createProduct(user.shopId, parseResult.data, user.id);
  db.logActivity({
    shopId: user.shopId,
    userId: user.id,
    action: 'create_product',
    entity: 'product',
    entityId: String(newProd.id),
    details: `Product created: ${newProd.name} (SKU: ${newProd.sku})`,
  });

  res.json({ success: true, data: newProd });
});

apiRouter.put('/admin/products/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role === 'cashier') {
    return res.status(403).json({ success: false, message: 'ক্যাশিয়ার পণ্য পরিবর্তন করতে পারবেন না' });
  }

  const prodId = Number(req.params.id);
  const parseResult = productSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid product data' });
  }

  const updated = db.updateProduct(prodId, user.shopId, parseResult.data, user.id);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  db.logActivity({
    shopId: user.shopId,
    userId: user.id,
    action: 'update_product',
    entity: 'product',
    entityId: String(prodId),
    details: `Product updated: ${updated.name}`,
  });

  res.json({ success: true, data: updated });
});

apiRouter.delete('/admin/products/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role === 'cashier') {
    return res.status(403).json({ success: false, message: 'ক্যাশিয়ার পণ্য মুছতে পারবেন না' });
  }

  const prodId = Number(req.params.id);
  const result = db.deleteProduct(prodId, user.shopId);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.reason || 'Failed to delete product' });
  }

  db.logActivity({
    shopId: user.shopId,
    userId: user.id,
    action: 'delete_product',
    entity: 'product',
    entityId: String(prodId),
    details: `Product deleted/deactivated: ID ${prodId}`,
  });

  res.json({ success: true, message: result.reason || 'Product deleted' });
});

// Image upload (accepts base64 or returns URL)
apiRouter.post('/admin/upload', requireAuth, (req: AuthenticatedRequest, res) => {
  const { dataUrl, filename } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ success: false, message: 'No image data provided' });
  }

  // If Vercel Blob token is set, it could upload there; otherwise return dataUrl or safe URL
  res.json({
    success: true,
    data: {
      url: dataUrl,
      filename: filename || 'upload.webp',
    },
  });
});

// --- Categories CRUD ---
apiRouter.get('/admin/categories', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const cats = db.getCategories(user.shopId);
  res.json({ success: true, data: cats });
});

apiRouter.post('/admin/categories', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role === 'cashier') {
    return res.status(403).json({ success: false, message: 'ক্যাশিয়ার ক্যাটাগরি তৈরি করতে পারবেন না' });
  }

  const parseResult = categorySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid category data' });
  }

  const cat = db.createCategory(user.shopId, parseResult.data.name, parseResult.data.description, parseResult.data.isActive);
  res.json({ success: true, data: cat });
});

apiRouter.put('/admin/categories/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role === 'cashier') {
    return res.status(403).json({ success: false, message: 'অননুমোদিত' });
  }

  const catId = Number(req.params.id);
  const parseResult = categorySchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid data' });
  }

  const updated = db.updateCategory(catId, user.shopId, parseResult.data);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  res.json({ success: true, data: updated });
});

apiRouter.delete('/admin/categories/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role === 'cashier') {
    return res.status(403).json({ success: false, message: 'ক্যাশিয়ার ক্যাটাগরি মুছতে পারবেন না' });
  }

  const catId = Number(req.params.id);
  const ok = db.deleteCategory(catId, user.shopId);
  if (!ok) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  res.json({ success: true, message: 'Category deleted' });
});

// --- Sales & POS ---
apiRouter.post('/admin/sales', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const parseResult = completeSaleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid sale input' });
  }

  const result = db.completeSale(user.shopId, parseResult.data, user.id);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.error });
  }

  res.json({ success: true, data: result.data });
});

apiRouter.get('/admin/sales', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { from, to, q, customerId, status, page, limit } = req.query;

  const result = db.getSales(user.shopId, {
    from: from ? String(from) : undefined,
    to: to ? String(to) : undefined,
    query: q ? String(q) : undefined,
    customerId: customerId ? Number(customerId) : undefined,
    status: status ? String(status) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 25,
  });

  res.json({ success: true, data: result });
});

apiRouter.get('/admin/sales/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const saleId = Number(req.params.id);
  const details = db.getSaleWithDetails(saleId, user.shopId);
  if (!details) {
    return res.status(404).json({ success: false, message: 'Sale not found' });
  }

  // Cashier should not see buy price / profit on line items
  const seeProfits = canViewProfits(user);
  const sanitizedItems = details.items.map((i) => ({
    ...i,
    buyPrice: seeProfits ? i.buyPrice : 0,
    profit: seeProfits ? i.profit : 0,
  }));

  res.json({
    success: true,
    data: {
      ...details,
      items: sanitizedItems,
    },
  });
});

apiRouter.post('/admin/sales/:id/cancel', requireAuth, requireManagerOrAdmin, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const saleId = Number(req.params.id);
  const { type } = req.body; // 'cancelled' or 'returned'

  const result = db.cancelOrReturnSale(saleId, user.shopId, type === 'returned' ? 'returned' : 'cancelled', user.id);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message || 'Operation failed' });
  }

  res.json({ success: true, message: `Sale ${type === 'returned' ? 'returned' : 'cancelled'} successfully` });
});

// --- Customers ---
apiRouter.get('/admin/customers', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { search } = req.query;
  const list = db.getCustomers(user.shopId, search ? String(search) : undefined);
  res.json({ success: true, data: list });
});

apiRouter.post('/admin/customers', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const parseResult = customerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid customer data' });
  }

  const cust = db.createCustomer(user.shopId, parseResult.data.name, parseResult.data.phone, parseResult.data.address);
  res.json({ success: true, data: cust });
});

apiRouter.put('/admin/customers/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const custId = Number(req.params.id);
  const parseResult = customerSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid data' });
  }

  const updated = db.updateCustomer(custId, user.shopId, parseResult.data);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  res.json({ success: true, data: updated });
});

apiRouter.get('/admin/customers/:id/ledger', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const custId = Number(req.params.id);
  const ledger = db.getCustomerLedger(custId, user.shopId);
  if (!ledger) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }
  res.json({ success: true, data: ledger });
});

apiRouter.post('/admin/customers/:id/payments', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const custId = Number(req.params.id);
  const parseResult = customerPaymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid payment data' });
  }

  const { amount, method, referenceNo, notes } = parseResult.data;
  const payment = db.addCustomerPayment(user.shopId, custId, amount, method, referenceNo, notes, user.id);

  db.logActivity({
    shopId: user.shopId,
    userId: user.id,
    action: 'collect_payment',
    entity: 'payment',
    entityId: String(payment.id),
    details: `Collected ৳${amount} from customer ID ${custId} via ${method}`,
  });

  res.json({ success: true, data: payment });
});

// --- Expenses ---
apiRouter.get('/admin/expenses', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { from, to, category, page, limit } = req.query;

  const result = db.getExpenses(user.shopId, {
    from: from ? String(from) : undefined,
    to: to ? String(to) : undefined,
    category: category ? String(category) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 25,
  });

  res.json({ success: true, data: result });
});

apiRouter.post('/admin/expenses', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const parseResult = expenseSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid expense data' });
  }

  const exp = db.createExpense(user.shopId, parseResult.data, user.id);
  db.logActivity({
    shopId: user.shopId,
    userId: user.id,
    action: 'create_expense',
    entity: 'expense',
    entityId: String(exp.id),
    details: `Expense: ${exp.title} (৳${exp.amount})`,
  });

  res.json({ success: true, data: exp });
});

apiRouter.put('/admin/expenses/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const expId = Number(req.params.id);
  const parseResult = expenseSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid expense data' });
  }

  const updated = db.updateExpense(expId, user.shopId, parseResult.data);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  res.json({ success: true, data: updated });
});

apiRouter.delete('/admin/expenses/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const expId = Number(req.params.id);
  const ok = db.deleteExpense(expId, user.shopId);
  if (!ok) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  res.json({ success: true, message: 'Expense deleted' });
});

// --- Reports ---
apiRouter.get('/admin/reports', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const today = getDhakaToday();
  const from = req.query.from ? String(req.query.from) : today;
  const to = req.query.to ? String(req.query.to) : today;

  const seeProfits = canViewProfits(user);
  const reports = db.getReports(user.shopId, from, to, seeProfits);

  res.json({ success: true, data: reports });
});

// --- Settings ---
apiRouter.get('/admin/settings', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const shop = db.getShopById(user.shopId);
  res.json({ success: true, data: shop });
});

apiRouter.put('/admin/settings', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const parseResult = settingsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid settings data' });
  }

  const updated = db.updateShop(user.shopId, parseResult.data);
  db.logActivity({
    shopId: user.shopId,
    userId: user.id,
    action: 'update_settings',
    entity: 'shop',
    entityId: String(user.shopId),
    details: 'Shop settings updated',
  });

  res.json({ success: true, data: updated });
});

// --- Users (Admin only) ---
apiRouter.get('/admin/users', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const users = db.getUsers(user.shopId).map((u) => ({
    id: u.id,
    shopId: u.shopId,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));
  res.json({ success: true, data: users });
});

apiRouter.post('/admin/users', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const parseResult = userCreateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid user data' });
  }

  const existing = db.getUserByEmail(parseResult.data.email);
  if (existing) {
    return res.status(400).json({ success: false, message: 'এই ইমেইলটি ইতিপূর্বে ব্যবহৃত হয়েছে (Email already in use)' });
  }

  const passwordHash = await hashPassword(parseResult.data.password);
  const newUser = db.createUser({
    shopId: user.shopId,
    fullName: parseResult.data.fullName,
    email: parseResult.data.email,
    phone: parseResult.data.phone || '',
    passwordHash,
    role: parseResult.data.role,
    isActive: parseResult.data.isActive,
  });

  db.logActivity({
    shopId: user.shopId,
    userId: user.id,
    action: 'create_user',
    entity: 'user',
    entityId: String(newUser.id),
    details: `User created: ${newUser.fullName} (${newUser.role})`,
  });

  res.json({
    success: true,
    data: {
      id: newUser.id,
      shopId: newUser.shopId,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      isActive: newUser.isActive,
    },
  });
});

apiRouter.put('/admin/users/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const targetId = Number(req.params.id);
  const parseResult = userUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid user data' });
  }

  const updateData: any = { ...parseResult.data };
  if (updateData.password) {
    updateData.passwordHash = await hashPassword(updateData.password);
    delete updateData.password;
  }

  const updated = db.updateUser(targetId, updateData);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    data: {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      isActive: updated.isActive,
    },
  });
});

// --- Shops (Admin only) ---
apiRouter.get('/admin/shops', requireAuth, requireAdmin, (req, res) => {
  const shops = db.getShops();
  res.json({ success: true, data: shops });
});

apiRouter.post('/admin/shops', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const parseResult = shopSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid shop data' });
  }

  const newShop = db.createShop(parseResult.data as any);
  db.logActivity({
    shopId: newShop.id,
    userId: user.id,
    action: 'create_shop',
    entity: 'shop',
    entityId: String(newShop.id),
    details: `Shop created: ${newShop.shopName}`,
  });

  res.json({ success: true, data: newShop });
});

apiRouter.put('/admin/shops/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const shopId = Number(req.params.id);
  const parseResult = shopSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: getZodErrorMessage(parseResult.error) || 'Invalid shop data' });
  }

  const updated = db.updateShop(shopId, parseResult.data);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Shop not found' });
  }

  res.json({ success: true, data: updated });
});

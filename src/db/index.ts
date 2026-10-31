import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getDhakaToday, getInvoiceDateCode, nowIso, getDhakaDateBounds } from '../lib/dates.ts';
import { roundMoney, calculateLineTotal, calculateProfit, calculateSaleTotals } from '../lib/money.ts';
import { hashPassword } from '../lib/auth.ts';

export interface Shop {
  id: number;
  shopName: string;
  phone: string | null;
  address: string | null;
  currencySymbol: string;
  invoicePrefix: string;
  invoiceFooter: string;
  bkashNumber: string | null;
  nagadNumber: string | null;
  qrImage: string | null;
  createdAt: string;
}

export interface User {
  id: number;
  shopId: number;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  shopId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  shopId: number;
  categoryId: number | null;
  sku: string;
  barcode: string;
  name: string;
  image: string | null;
  description: string | null;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  shopId: number;
  name: string;
  phone: string;
  address: string | null;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  qty: number;
  buyPrice: number;
  sellPrice: number;
  lineTotal: number;
  profit: number;
}

export interface Sale {
  id: number;
  shopId: number;
  invoiceNo: string;
  customerId: number | null;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod: string;
  status: 'completed' | 'cancelled' | 'returned';
  notes: string;
  createdBy: number | null;
  createdAt: string;
}

export interface StockMovement {
  id: number;
  shopId: number;
  productId: number;
  movementType: 'purchase' | 'sale' | 'return' | 'adjustment';
  qty: number;
  unitCost: number;
  referenceId: string;
  note: string;
  createdBy: number | null;
  createdAt: string;
}

export interface Expense {
  id: number;
  shopId: number;
  title: string;
  category: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  shopId: number;
  saleId: number | null;
  customerId: number | null;
  amount: number;
  method: string;
  referenceNo: string;
  notes: string;
  createdBy: number | null;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  shopId: number | null;
  userId: number | null;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

interface DatabaseData {
  shops: Shop[];
  users: User[];
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  saleItems: SaleItem[];
  stockMovements: StockMovement[];
  expenses: Expense[];
  payments: Payment[];
  activityLogs: ActivityLog[];
  sequences: {
    shopId: number;
    userId: number;
    categoryId: number;
    productId: number;
    customerId: number;
    saleId: number;
    saleItemId: number;
    movementId: number;
    expenseId: number;
    paymentId: number;
    activityId: number;
    invoiceSeq: Record<string, number>; // dateStr -> number
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'dalim_store.json');

class DatabaseStore {
  private data: DatabaseData;
  private isLoaded = false;

  constructor() {
    this.data = this.getDefaultState();
    this.init();
  }

  private getDefaultState(): DatabaseData {
    return {
      shops: [],
      users: [],
      categories: [],
      products: [],
      customers: [],
      sales: [],
      saleItems: [],
      stockMovements: [],
      expenses: [],
      payments: [],
      activityLogs: [],
      sequences: {
        shopId: 1,
        userId: 1,
        categoryId: 1,
        productId: 1,
        customerId: 1,
        saleId: 1,
        saleItemId: 1,
        movementId: 1,
        expenseId: 1,
        paymentId: 1,
        activityId: 1,
        invoiceSeq: {},
      },
    };
  }

  private init() {
    if (this.isLoaded) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = this.getDefaultState();
        this.seedDemoData();
        this.save();
      }
    } catch (err) {
      console.error('Error loading DB store, falling back to fresh state:', err);
      this.data = this.getDefaultState();
      this.seedDemoData();
    }
    this.ensurePermanentAdmin();
    this.isLoaded = true;
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Atomic write via temp file
      const tempPath = `${DATA_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DATA_FILE);
    } catch (err) {
      console.error('Error saving DB file:', err);
    }
  }

  public seedDemoData() {
    if (this.data.shops.length > 0) return;

    // 1. Default Shop
    const defaultShop: Shop = {
      id: 1,
      shopName: 'Dalim Store (ডালিম স্টোর)',
      phone: '01711223344',
      address: 'ধানমন্ডি, ঢাকা-১২০৫, বাংলাদেশ',
      currencySymbol: '৳',
      invoicePrefix: 'INV',
      invoiceFooter: 'ডালিম স্টোরে কেনাকাটার জন্য ধন্যবাদ! আবার আসবেন।',
      bkashNumber: '01711223344',
      nagadNumber: '01911223344',
      qrImage: '',
      createdAt: nowIso(),
    };
    this.data.shops.push(defaultShop);
    this.data.sequences.shopId = 2;

    // 2. Demo Categories
    const demoCats = [
      { name: 'মুদি পণ্য (Groceries)', desc: 'চাল, ডাল, তেল, লবণ, মসলা' },
      { name: 'পানীয় ও স্ন্যাকস (Snacks & Drinks)', desc: 'চা, কফি, বিস্কুট, জুস, কোল্ড ড্রিংকস' },
      { name: 'ব্যক্তিগত যত্ন (Personal Care)', desc: 'সাবান, শ্যাম্পু, টুথপেস্ট, তেল' },
      { name: 'দৈনন্দিন গৃহস্থালী (Household)', desc: 'ডিটারজেন্ট, ক্লিনার, টিস্যু' },
    ];

    const catMap: Record<number, number> = {};
    demoCats.forEach((c, idx) => {
      const catId = idx + 1;
      this.data.categories.push({
        id: catId,
        shopId: 1,
        name: c.name,
        description: c.desc,
        isActive: true,
        createdAt: nowIso(),
      });
      catMap[idx] = catId;
    });
    this.data.sequences.categoryId = demoCats.length + 1;

    // 3. Demo Products
    const demoProducts = [
      {
        name: 'মিনিকেট চাল ৫ কেজি (Miniket Rice 5kg)',
        catIndex: 0,
        sku: 'RICE-MINI-5KG',
        barcode: '8901001001',
        buy: 370,
        sell: 420,
        stock: 50,
        lowStock: 10,
        img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
        desc: 'উচ্চ মানের সুস্বাদু ঝরঝরে মিনিকেট চাল',
      },
      {
        name: 'তীর সয়াবিন তেল ২ লিটার (Teer Soybean Oil 2L)',
        catIndex: 0,
        sku: 'OIL-TEER-2L',
        barcode: '8901001002',
        buy: 335,
        sell: 375,
        stock: 35,
        lowStock: 8,
        img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
        desc: 'বিশুদ্ধ রিফাইনড তীর সয়াবিন তেল',
      },
      {
        name: 'দেশি মসুর ডাল ১ কেজি (Lentil 1kg)',
        catIndex: 0,
        sku: 'DAL-DESHI-1KG',
        barcode: '8901001003',
        buy: 125,
        sell: 145,
        stock: 40,
        lowStock: 10,
        img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
        desc: 'তাজা ও খাঁটি দেশি ছোট দানার মসুর ডাল',
      },
      {
        name: 'ফ্রেশ চিনি ১ কেজি (Fresh Sugar 1kg)',
        catIndex: 0,
        sku: 'SUGAR-FRESH-1KG',
        barcode: '8901001004',
        buy: 130,
        sell: 145,
        stock: 60,
        lowStock: 15,
        img: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&auto=format&fit=crop&q=80',
        desc: 'সাদা পরিষ্কার দানাদার চিনি',
      },
      {
        name: 'তাজা ব্ল্যাক টি ৪০০ গ্রাম (Taaza Tea 400g)',
        catIndex: 1,
        sku: 'TEA-TAAZA-400G',
        barcode: '8901001005',
        buy: 210,
        sell: 240,
        stock: 25,
        lowStock: 5,
        img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80',
        desc: 'কড়া লিকার ও মনমাতানো সুবাসের তাজা চা',
      },
      {
        name: 'কোকা-কোলা ৫০০ মিলি (Coca-Cola 500ml)',
        catIndex: 1,
        sku: 'DRINK-COKE-500ML',
        barcode: '8901001006',
        buy: 38,
        sell: 45,
        stock: 4, // low stock for testing!
        lowStock: 8,
        img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
        desc: 'ঠাণ্ডা প্রাণ জুড়ানো কোকা-কোলা বোতল',
      },
      {
        name: 'লাইফবয় সাবান ১০০ গ্রাম (Lifebuoy Soap 100g)',
        catIndex: 2,
        sku: 'SOAP-LIFEBUOY-100G',
        barcode: '8901001007',
        buy: 48,
        sell: 60,
        stock: 50,
        lowStock: 10,
        img: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&auto=format&fit=crop&q=80',
        desc: '১০০% জীবাণু সুরক্ষা সাবান',
      },
      {
        name: 'হুইল ডিটারজেন্ট ১ কেজি (Wheel Detergent 1kg)',
        catIndex: 3,
        sku: 'DET-WHEEL-1KG',
        barcode: '8901001008',
        buy: 135,
        sell: 155,
        stock: 3, // low stock alert!
        lowStock: 6,
        img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
        desc: 'লেমন অ্যান্ড জেসমিন সুবাসিত কাপড়ের ডিটারজেন্ট পাউডার',
      },
    ];

    demoProducts.forEach((p, idx) => {
      const prodId = idx + 1;
      this.data.products.push({
        id: prodId,
        shopId: 1,
        categoryId: catMap[p.catIndex] || null,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        image: p.img,
        description: p.desc,
        buyPrice: p.buy,
        sellPrice: p.sell,
        stock: p.stock,
        lowStockThreshold: p.lowStock,
        status: 'active',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });

      // Stock movement for purchase
      this.data.stockMovements.push({
        id: prodId,
        shopId: 1,
        productId: prodId,
        movementType: 'purchase',
        qty: p.stock,
        unitCost: p.buy,
        referenceId: 'INITIAL-STOCK',
        note: 'প্রারম্ভিক স্টক এন্ট্রি (Initial stock entry)',
        createdBy: 1,
        createdAt: nowIso(),
      });
    });
    this.data.sequences.productId = demoProducts.length + 1;
    this.data.sequences.movementId = demoProducts.length + 1;

    // 4. Demo Customer
    const demoCustomer: Customer = {
      id: 1,
      shopId: 1,
      name: 'মো. রফিকুল ইসলাম (Rafiqul Islam)',
      phone: '01712345678',
      address: 'বাড়ি ১২, রোড ৪, ধানমন্ডি',
      createdAt: nowIso(),
    };
    this.data.customers.push(demoCustomer);
    this.data.sequences.customerId = 2;

    this.save();
  }

  // --- Shops ---
  public getShops(): Shop[] {
    return [...this.data.shops];
  }

  public getShopById(id: number): Shop | null {
    return this.data.shops.find((s) => s.id === id) || null;
  }

  public createShop(shopData: Omit<Shop, 'id' | 'createdAt'>): Shop {
    const newShop: Shop = {
      ...shopData,
      id: this.data.sequences.shopId++,
      createdAt: nowIso(),
    };
    this.data.shops.push(newShop);
    this.save();
    return newShop;
  }

  public updateShop(id: number, updates: Partial<Shop>): Shop | null {
    const shop = this.data.shops.find((s) => s.id === id);
    if (!shop) return null;
    Object.assign(shop, updates);
    this.save();
    return shop;
  }

  // --- Users & Setup ---
  public getUsersCount(): number {
    return this.data.users.length;
  }

  public getUsers(shopId?: number): User[] {
    if (shopId) {
      return this.data.users.filter((u) => u.shopId === shopId);
    }
    return [...this.data.users];
  }

  public getUserById(id: number): User | null {
    return this.data.users.find((u) => u.id === id) || null;
  }

  public getUserByEmail(email: string): User | null {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public createUser(userData: {
    shopId: number;
    fullName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role: 'admin' | 'manager' | 'cashier';
    isActive?: boolean;
  }): User {
    const newUser: User = {
      id: this.data.sequences.userId++,
      shopId: userData.shopId,
      fullName: userData.fullName,
      email: userData.email.toLowerCase().trim(),
      phone: userData.phone || '',
      passwordHash: userData.passwordHash,
      role: userData.role,
      isActive: userData.isActive !== false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public ensurePermanentAdmin(): User {
    const adminEmail = 'shahidulislam726697@gmail.com';
    const passwordHash = bcrypt.hashSync('12345678', 10);
    const existing = this.data.users.find(
      (u) => u.email.toLowerCase() === adminEmail.toLowerCase()
    );

    if (existing) {
      existing.role = 'admin';
      existing.isActive = true;
      existing.passwordHash = passwordHash;
      if (!existing.fullName) {
        existing.fullName = 'Shahidul Islam';
      }
      this.save();
      return existing;
    }

    const newAdmin: User = {
      id: this.data.sequences.userId++,
      shopId: 1,
      fullName: 'Shahidul Islam',
      email: adminEmail,
      phone: '01700000000',
      passwordHash,
      role: 'admin',
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.data.users.unshift(newAdmin);
    this.save();
    return newAdmin;
  }

  public updateUser(id: number, updates: Partial<User>): User | null {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;

    // Prevent deactivating or demoting the permanent super admin
    if (user.email.toLowerCase() === 'shahidulislam726697@gmail.com') {
      if (updates.role && updates.role !== 'admin') {
        updates.role = 'admin';
      }
      if (updates.isActive === false) {
        updates.isActive = true;
      }
    }

    Object.assign(user, updates, { updatedAt: nowIso() });
    this.save();
    return user;
  }

  // --- Categories ---
  public getCategories(shopId: number, onlyActive = false): Category[] {
    return this.data.categories.filter((c) => c.shopId === shopId && (!onlyActive || c.isActive));
  }

  public getCategoryById(id: number, shopId: number): Category | null {
    return this.data.categories.find((c) => c.id === id && c.shopId === shopId) || null;
  }

  public createCategory(shopId: number, name: string, description?: string | null, isActive = true): Category {
    const cat: Category = {
      id: this.data.sequences.categoryId++,
      shopId,
      name,
      description: description || '',
      isActive,
      createdAt: nowIso(),
    };
    this.data.categories.push(cat);
    this.save();
    return cat;
  }

  public updateCategory(id: number, shopId: number, updates: Partial<Category>): Category | null {
    const cat = this.getCategoryById(id, shopId);
    if (!cat) return null;
    Object.assign(cat, updates);
    this.save();
    return cat;
  }

  public deleteCategory(id: number, shopId: number): boolean {
    const idx = this.data.categories.findIndex((c) => c.id === id && c.shopId === shopId);
    if (idx === -1) return false;
    this.data.categories.splice(idx, 1);
    // Nullify products with this category
    this.data.products.forEach((p) => {
      if (p.shopId === shopId && p.categoryId === id) {
        p.categoryId = null;
      }
    });
    this.save();
    return true;
  }

  // --- Products ---
  public getProducts(
    shopId: number,
    options?: {
      search?: string;
      categoryId?: number;
      status?: 'active' | 'inactive';
      lowStockOnly?: boolean;
      onlyInStock?: boolean;
    }
  ): Product[] {
    return this.data.products.filter((p) => {
      if (p.shopId !== shopId) return false;
      if (options?.status && p.status !== options.status) return false;
      if (options?.categoryId && p.categoryId !== options.categoryId) return false;
      if (options?.onlyInStock && p.stock <= 0) return false;
      if (options?.lowStockOnly && (p.stock > p.lowStockThreshold || p.status !== 'active')) return false;
      if (options?.search) {
        const query = options.search.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchSku = p.sku.toLowerCase().includes(query);
        const matchBarcode = p.barcode.toLowerCase().includes(query);
        if (!matchName && !matchSku && !matchBarcode) return false;
      }
      return true;
    });
  }

  public getProductById(id: number, shopId: number): Product | null {
    return this.data.products.find((p) => p.id === id && p.shopId === shopId) || null;
  }

  public getProductByBarcode(barcode: string, shopId: number): Product | null {
    return this.data.products.find((p) => p.barcode === barcode && p.shopId === shopId) || null;
  }

  public createProduct(
    shopId: number,
    data: {
      name: string;
      categoryId?: number | null;
      sku?: string;
      barcode?: string;
      image?: string | null;
      description?: string | null;
      buyPrice: number;
      sellPrice: number;
      stock: number;
      lowStockThreshold?: number;
      status?: 'active' | 'inactive';
    },
    userId?: number
  ): Product {
    const id = this.data.sequences.productId++;
    const sku = data.sku && data.sku.trim().length > 0 ? data.sku.trim() : `SKU-${Date.now().toString().slice(-6)}-${id}`;
    const barcode = data.barcode && data.barcode.trim().length > 0 ? data.barcode.trim() : `890${Math.floor(1000000 + Math.random() * 9000000)}`;

    const product: Product = {
      id,
      shopId,
      categoryId: data.categoryId || null,
      sku,
      barcode,
      name: data.name,
      image: data.image || '',
      description: data.description || '',
      buyPrice: roundMoney(data.buyPrice),
      sellPrice: roundMoney(data.sellPrice),
      stock: roundMoney(data.stock),
      lowStockThreshold: roundMoney(data.lowStockThreshold ?? 5),
      status: data.status || 'active',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.data.products.push(product);

    // Initial stock movement
    if (product.stock > 0) {
      this.data.stockMovements.push({
        id: this.data.sequences.movementId++,
        shopId,
        productId: product.id,
        movementType: 'purchase',
        qty: product.stock,
        unitCost: product.buyPrice,
        referenceId: `NEW-PROD-${product.id}`,
        note: 'নতুন পণ্য তৈরির প্রাথমিক স্টক (Initial product creation)',
        createdBy: userId || null,
        createdAt: nowIso(),
      });
    }

    this.save();
    return product;
  }

  public updateProduct(
    id: number,
    shopId: number,
    data: Partial<Product>,
    userId?: number
  ): Product | null {
    const product = this.getProductById(id, shopId);
    if (!product) return null;

    // Check if stock changed
    if (data.stock !== undefined && data.stock !== null && data.stock !== product.stock) {
      const oldStock = product.stock;
      const newStock = roundMoney(data.stock);
      const diff = roundMoney(newStock - oldStock);

      if (diff > 0) {
        this.data.stockMovements.push({
          id: this.data.sequences.movementId++,
          shopId,
          productId: product.id,
          movementType: 'purchase',
          qty: diff,
          unitCost: product.buyPrice,
          referenceId: `STOCK-INC-${product.id}`,
          note: `স্টক বৃদ্ধি করা হয়েছে (${oldStock} -> ${newStock})`,
          createdBy: userId || null,
          createdAt: nowIso(),
        });
      } else if (diff < 0) {
        this.data.stockMovements.push({
          id: this.data.sequences.movementId++,
          shopId,
          productId: product.id,
          movementType: 'adjustment',
          qty: Math.abs(diff),
          unitCost: product.buyPrice,
          referenceId: `STOCK-ADJ-${product.id}`,
          note: `স্টক সমন্বয় করা হয়েছে (${oldStock} -> ${newStock})`,
          createdBy: userId || null,
          createdAt: nowIso(),
        });
      }
    }

    Object.assign(product, data, { updatedAt: nowIso() });
    this.save();
    return product;
  }

  public deleteProduct(id: number, shopId: number): { success: boolean; reason?: string } {
    const product = this.getProductById(id, shopId);
    if (!product) return { success: false, reason: 'Product not found' };

    // Check if product has sales
    const hasSales = this.data.saleItems.some((item) => item.productId === id);
    if (hasSales) {
      // Soft-deactivate if product has sales history
      product.status = 'inactive';
      this.save();
      return { success: true, reason: 'পণ্যটির বিক্রয় রেকর্ড থাকায় এটিকে ডিঅ্যাক্টিভ (Inactive) করা হয়েছে।' };
    }

    const idx = this.data.products.findIndex((p) => p.id === id && p.shopId === shopId);
    if (idx !== -1) {
      this.data.products.splice(idx, 1);
      this.save();
    }
    return { success: true };
  }

  // --- Customers ---
  public getCustomers(shopId: number, search?: string): (Customer & { totalPurchases: number; totalPaid: number; due: number })[] {
    const list = this.data.customers.filter((c) => {
      if (c.shopId !== shopId) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q);
      }
      return true;
    });

    return list.map((c) => {
      const custSales = this.data.sales.filter((s) => s.customerId === c.id && s.status === 'completed');
      const totalPurchases = custSales.reduce((acc, s) => acc + s.total, 0);
      const totalPaid = custSales.reduce((acc, s) => acc + s.paid, 0);
      const directPayments = this.data.payments
        .filter((p) => p.customerId === c.id && p.saleId === null)
        .reduce((acc, p) => acc + p.amount, 0);
      const totalPaidAll = roundMoney(totalPaid + directPayments);
      const due = Math.max(0, roundMoney(totalPurchases - totalPaidAll));

      return {
        ...c,
        totalPurchases: roundMoney(totalPurchases),
        totalPaid: totalPaidAll,
        due,
      };
    });
  }

  public getCustomerById(id: number, shopId: number): Customer | null {
    return this.data.customers.find((c) => c.id === id && c.shopId === shopId) || null;
  }

  public getCustomerByPhone(phone: string, shopId: number): Customer | null {
    return this.data.customers.find((c) => c.phone === phone && c.shopId === shopId) || null;
  }

  public createCustomer(shopId: number, name: string, phone: string, address?: string | null): Customer {
    const cust: Customer = {
      id: this.data.sequences.customerId++,
      shopId,
      name,
      phone,
      address: address || '',
      createdAt: nowIso(),
    };
    this.data.customers.push(cust);
    this.save();
    return cust;
  }

  public updateCustomer(id: number, shopId: number, updates: Partial<Customer>): Customer | null {
    const cust = this.getCustomerById(id, shopId);
    if (!cust) return null;
    Object.assign(cust, updates);
    this.save();
    return cust;
  }

  public getCustomerLedger(customerId: number, shopId: number) {
    const customer = this.getCustomerById(customerId, shopId);
    if (!customer) return null;

    const salesList = this.data.sales.filter((s) => s.customerId === customerId && s.shopId === shopId);
    const paymentsList = this.data.payments.filter((p) => p.customerId === customerId && p.shopId === shopId);

    return {
      customer,
      sales: salesList,
      payments: paymentsList,
    };
  }

  public addCustomerPayment(
    shopId: number,
    customerId: number,
    amount: number,
    method: string,
    referenceNo?: string | null,
    notes?: string | null,
    userId?: number
  ): Payment {
    const payment: Payment = {
      id: this.data.sequences.paymentId++,
      shopId,
      saleId: null,
      customerId,
      amount: roundMoney(amount),
      method,
      referenceNo: referenceNo || '',
      notes: notes || '',
      createdBy: userId || null,
      createdAt: nowIso(),
    };
    this.data.payments.push(payment);
    this.save();
    return payment;
  }

  // --- Invoice Generator ---
  private generateInvoiceNo(shopId: number, prefix: string): string {
    const dateCode = getInvoiceDateCode();
    const key = `${shopId}-${dateCode}`;
    const seq = (this.data.sequences.invoiceSeq[key] || 0) + 1;
    this.data.sequences.invoiceSeq[key] = seq;
    const seqStr = String(seq).padStart(4, '0');
    return `${prefix}-${dateCode}-${seqStr}`;
  }

  // --- Complete Sale (Business Logic §8.1) ---
  public completeSale(
    shopId: number,
    input: {
      items: Array<{ productId: number; qty: number }>;
      discount?: number;
      paid?: number;
      paymentMethod?: string;
      customerId?: number | null;
      notes?: string | null;
    },
    userId?: number
  ): { success: boolean; data?: { id: number; invoice: string; total: number; due: number; subtotal: number }; error?: string } {
    const shop = this.getShopById(shopId);
    if (!shop) return { success: false, error: 'Shop not found' };

    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Cart must contain at least one item' };
    }

    // 1. Lock and validate each product
    const resolvedItems: Array<{ product: Product; qty: number }> = [];
    for (const item of input.items) {
      const prod = this.getProductById(item.productId, shopId);
      if (!prod) {
        return { success: false, error: `Product not found (ID: ${item.productId})` };
      }
      if (prod.status !== 'active') {
        return { success: false, error: `Product is not active: ${prod.name}` };
      }
      if (prod.stock < item.qty) {
        return { success: false, error: `Insufficient stock: ${prod.name} (Stock: ${prod.stock}, Requested: ${item.qty})` };
      }
      resolvedItems.push({ product: prod, qty: item.qty });
    }

    // 2. Server-side price calculation
    const calcInput = resolvedItems.map((i) => ({ qty: i.qty, sellPrice: i.product.sellPrice }));
    const totals = calculateSaleTotals(calcInput, input.discount || 0, input.paid ?? 0);

    // 3. Customer requirement for Due
    if (totals.due > 0 && !input.customerId) {
      return { success: false, error: 'বাকি টাকা থাকলে কাস্টমার নির্বাচন করা আবশ্যক (Customer required if due > 0)' };
    }

    // 4. Generate unique invoice number
    const invoiceNo = this.generateInvoiceNo(shopId, shop.invoicePrefix || 'INV');
    const saleId = this.data.sequences.saleId++;

    const newSale: Sale = {
      id: saleId,
      shopId,
      invoiceNo,
      customerId: input.customerId || null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      paid: totals.paid,
      due: totals.due,
      paymentMethod: input.paymentMethod || 'cash',
      status: 'completed',
      notes: input.notes || '',
      createdBy: userId || null,
      createdAt: nowIso(),
    };

    // 5. Decrement stock, create sale items and stock movements
    for (const ri of resolvedItems) {
      const lineTotal = calculateLineTotal(ri.qty, ri.product.sellPrice);
      const profit = calculateProfit(ri.qty, ri.product.buyPrice, ri.product.sellPrice);

      this.data.saleItems.push({
        id: this.data.sequences.saleItemId++,
        saleId,
        productId: ri.product.id,
        productName: ri.product.name,
        qty: ri.qty,
        buyPrice: ri.product.buyPrice,
        sellPrice: ri.product.sellPrice,
        lineTotal,
        profit,
      });

      // Stock decrement
      ri.product.stock = roundMoney(ri.product.stock - ri.qty);

      // Stock movement
      this.data.stockMovements.push({
        id: this.data.sequences.movementId++,
        shopId,
        productId: ri.product.id,
        movementType: 'sale',
        qty: ri.qty,
        unitCost: ri.product.buyPrice,
        referenceId: `SALE-${saleId}`,
        note: `ইনভয়েস বিক্রয়: ${invoiceNo}`,
        createdBy: userId || null,
        createdAt: nowIso(),
      });
    }

    // 6. Payment record if paid > 0
    if (totals.paid > 0) {
      this.data.payments.push({
        id: this.data.sequences.paymentId++,
        shopId,
        saleId,
        customerId: input.customerId || null,
        amount: totals.paid,
        method: input.paymentMethod || 'cash',
        referenceNo: invoiceNo,
        notes: `ইনভয়েস ${invoiceNo} বাবদ পরিশোধ`,
        createdBy: userId || null,
        createdAt: nowIso(),
      });
    }

    this.data.sales.push(newSale);

    // 7. Audit log
    this.data.activityLogs.push({
      id: this.data.sequences.activityId++,
      shopId,
      userId: userId || null,
      action: 'create_sale',
      entity: 'sale',
      entityId: String(saleId),
      details: `Invoice: ${invoiceNo}, Total: ৳${totals.total}, Paid: ৳${totals.paid}`,
      createdAt: nowIso(),
    });

    this.save();
    return {
      success: true,
      data: {
        id: saleId,
        invoice: invoiceNo,
        total: totals.total,
        due: totals.due,
        subtotal: totals.subtotal,
      },
    };
  }

  // --- Public Website Order (§8.2) ---
  public createWebsiteOrder(
    shopId: number,
    input: {
      name: string;
      phone: string;
      address?: string;
      items: Array<{ id: number; qty: number }>;
    }
  ): { success: boolean; message: string; invoiceNo?: string } {
    const shop = this.getShopById(shopId);
    if (!shop) return { success: false, message: 'Shop not found' };

    // Attach or create customer
    let customer = this.getCustomerByPhone(input.phone, shopId);
    if (!customer) {
      customer = this.createCustomer(shopId, input.name, input.phone, input.address || 'Online Storefront Order');
    }

    // Lock and check stock
    const resolvedItems: Array<{ product: Product; qty: number }> = [];
    for (const item of input.items) {
      const prod = this.getProductById(item.id, shopId);
      if (!prod || prod.status !== 'active') {
        return { success: false, message: `পণ্যটি বর্তমানে উপলভ্য নয় (Product not available)` };
      }
      if (prod.stock < item.qty) {
        return { success: false, message: `পর্যাপ্ত স্টক নেই: ${prod.name} (মজুদ: ${prod.stock} টি)` };
      }
      resolvedItems.push({ product: prod, qty: item.qty });
    }

    // Invoice format: WEB-YYYYMMDD-HHMMSS-xxx
    const now = new Date();
    const datePart = getInvoiceDateCode();
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const randPart = Math.floor(100 + Math.random() * 900);
    const invoiceNo = `WEB-${datePart}-${timePart}-${randPart}`;

    const calcInput = resolvedItems.map((i) => ({ qty: i.qty, sellPrice: i.product.sellPrice }));
    const totals = calculateSaleTotals(calcInput, 0, 0); // Website order: paid = 0, due = total

    const saleId = this.data.sequences.saleId++;
    const newSale: Sale = {
      id: saleId,
      shopId,
      invoiceNo,
      customerId: customer.id,
      subtotal: totals.subtotal,
      discount: 0,
      total: totals.total,
      paid: 0,
      due: totals.total,
      paymentMethod: 'cash_on_delivery',
      status: 'completed',
      notes: `Website order: ${input.name} (${input.phone})`,
      createdBy: null,
      createdAt: nowIso(),
    };

    for (const ri of resolvedItems) {
      const lineTotal = calculateLineTotal(ri.qty, ri.product.sellPrice);
      const profit = calculateProfit(ri.qty, ri.product.buyPrice, ri.product.sellPrice);

      this.data.saleItems.push({
        id: this.data.sequences.saleItemId++,
        saleId,
        productId: ri.product.id,
        productName: ri.product.name,
        qty: ri.qty,
        buyPrice: ri.product.buyPrice,
        sellPrice: ri.product.sellPrice,
        lineTotal,
        profit,
      });

      ri.product.stock = roundMoney(ri.product.stock - ri.qty);

      this.data.stockMovements.push({
        id: this.data.sequences.movementId++,
        shopId,
        productId: ri.product.id,
        movementType: 'sale',
        qty: ri.qty,
        unitCost: ri.product.buyPrice,
        referenceId: `WEB-ORDER-${saleId}`,
        note: `Website order: ${input.name} (${input.phone})`,
        createdBy: null,
        createdAt: nowIso(),
      });
    }

    this.data.sales.push(newSale);

    this.save();
    return {
      success: true,
      message: `আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। ইনভয়েস নং: ${invoiceNo}`,
      invoiceNo,
    };
  }

  // --- Cancel / Return Sale (§7.5) ---
  public cancelOrReturnSale(
    saleId: number,
    shopId: number,
    type: 'cancelled' | 'returned',
    userId?: number
  ): { success: boolean; message?: string } {
    const sale = this.data.sales.find((s) => s.id === saleId && s.shopId === shopId);
    if (!sale) return { success: false, message: 'Sale not found' };
    if (sale.status === 'cancelled' || sale.status === 'returned') {
      return { success: false, message: `Sale is already marked as ${sale.status}` };
    }

    // Restore stock
    const items = this.data.saleItems.filter((i) => i.saleId === saleId);
    for (const item of items) {
      const prod = this.getProductById(item.productId, shopId);
      if (prod) {
        prod.stock = roundMoney(prod.stock + item.qty);
      }

      this.data.stockMovements.push({
        id: this.data.sequences.movementId++,
        shopId,
        productId: item.productId,
        movementType: 'return',
        qty: item.qty,
        unitCost: item.buyPrice,
        referenceId: `RETURN-${saleId}`,
        note: `পণ্য ফেরত/বাতিল: ইনভয়েস ${sale.invoiceNo}`,
        createdBy: userId || null,
        createdAt: nowIso(),
      });
    }

    sale.status = type;

    this.data.activityLogs.push({
      id: this.data.sequences.activityId++,
      shopId,
      userId: userId || null,
      action: `${type}_sale`,
      entity: 'sale',
      entityId: String(saleId),
      details: `Sale ${sale.invoiceNo} marked as ${type}`,
      createdAt: nowIso(),
    });

    this.save();
    return { success: true };
  }

  // --- Sales List & Details ---
  public getSales(
    shopId: number,
    options?: {
      from?: string;
      to?: string;
      query?: string;
      customerId?: number;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    let list = this.data.sales.filter((s) => s.shopId === shopId);

    if (options?.from) {
      const { startIso } = getDhakaDateBounds(options.from);
      list = list.filter((s) => s.createdAt >= startIso);
    }
    if (options?.to) {
      const { endIso } = getDhakaDateBounds(options.to);
      list = list.filter((s) => s.createdAt <= endIso);
    }
    if (options?.customerId) {
      list = list.filter((s) => s.customerId === options.customerId);
    }
    if (options?.status) {
      list = list.filter((s) => s.status === options.status);
    }
    if (options?.query) {
      const q = options.query.toLowerCase().trim();
      list = list.filter((s) => s.invoiceNo.toLowerCase().includes(q) || s.notes.toLowerCase().includes(q));
    }

    // Sort descending by creation
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const paginated = list.slice((page - 1) * limit, page * limit);

    // Map customer info
    const enriched = paginated.map((s) => {
      const cust = s.customerId ? this.getCustomerById(s.customerId, shopId) : null;
      return {
        ...s,
        customerName: cust ? cust.name : 'সাধারণ ক্রেতা (Walking Customer)',
        customerPhone: cust ? cust.phone : '',
      };
    });

    return {
      sales: enriched,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  public getSaleWithDetails(saleId: number, shopId: number) {
    const sale = this.data.sales.find((s) => s.id === saleId && s.shopId === shopId);
    if (!sale) return null;
    const items = this.data.saleItems.filter((i) => i.saleId === saleId);
    const customer = sale.customerId ? this.getCustomerById(sale.customerId, shopId) : null;
    const shop = this.getShopById(shopId);

    return {
      sale,
      items,
      customer,
      shop,
    };
  }

  // --- Expenses ---
  public getExpenses(
    shopId: number,
    options?: {
      from?: string;
      to?: string;
      category?: string;
      page?: number;
      limit?: number;
    }
  ) {
    let list = this.data.expenses.filter((e) => e.shopId === shopId);

    if (options?.from) {
      list = list.filter((e) => e.expenseDate >= options.from!);
    }
    if (options?.to) {
      list = list.filter((e) => e.expenseDate <= options.to!);
    }
    if (options?.category && options.category !== 'all') {
      list = list.filter((e) => e.category === options.category);
    }

    list.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.id - a.id);

    const totalAmount = list.reduce((acc, e) => acc + e.amount, 0);
    const totalCount = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      expenses: paginated,
      totalAmount: roundMoney(totalAmount),
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  public createExpense(shopId: number, data: { title: string; category: string; amount: number; expenseDate: string; notes?: string | null }, userId?: number): Expense {
    const exp: Expense = {
      id: this.data.sequences.expenseId++,
      shopId,
      title: data.title,
      category: data.category,
      amount: roundMoney(data.amount),
      expenseDate: data.expenseDate,
      notes: data.notes || '',
      createdBy: userId || null,
      createdAt: nowIso(),
    };
    this.data.expenses.push(exp);
    this.save();
    return exp;
  }

  public updateExpense(id: number, shopId: number, data: Partial<Expense>): Expense | null {
    const exp = this.data.expenses.find((e) => e.id === id && e.shopId === shopId);
    if (!exp) return null;
    Object.assign(exp, data);
    this.save();
    return exp;
  }

  public deleteExpense(id: number, shopId: number): boolean {
    const idx = this.data.expenses.findIndex((e) => e.id === id && e.shopId === shopId);
    if (idx === -1) return false;
    this.data.expenses.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Dashboard Data (§7.1) ---
  public getDashboardData(shopId: number, canSeeProfits = true) {
    const todayStr = getDhakaToday();
    const { startIso, endIso } = getDhakaDateBounds(todayStr);

    // Sales today
    const salesToday = this.data.sales.filter(
      (s) => s.shopId === shopId && s.status === 'completed' && s.createdAt >= startIso && s.createdAt <= endIso
    );

    const todaySalesAmount = salesToday.reduce((acc, s) => acc + s.total, 0);
    const invoicesToday = salesToday.length;

    // Gross profit today
    const saleIdsToday = new Set(salesToday.map((s) => s.id));
    const itemsToday = this.data.saleItems.filter((i) => saleIdsToday.has(i.saleId));
    const grossProfitToday = itemsToday.reduce((acc, i) => acc + i.profit, 0);

    // Expense today
    const expensesToday = this.data.expenses.filter((e) => e.shopId === shopId && e.expenseDate === todayStr);
    const todayExpenseAmount = expensesToday.reduce((acc, e) => acc + e.amount, 0);

    const netProfitToday = grossProfitToday - todayExpenseAmount;

    // Active products
    const activeProducts = this.data.products.filter((p) => p.shopId === shopId && p.status === 'active');
    const lowStockCount = activeProducts.filter((p) => p.stock <= p.lowStockThreshold).length;
    const totalStockQty = activeProducts.reduce((acc, p) => acc + p.stock, 0);
    const stockValue = activeProducts.reduce((acc, p) => acc + p.stock * p.buyPrice, 0);
    const expectedProfit = activeProducts.reduce((acc, p) => acc + p.stock * (p.sellPrice - p.buyPrice), 0);

    // Stock added today
    const stockAddedTodayMovements = this.data.stockMovements.filter(
      (m) => m.shopId === shopId && m.movementType === 'purchase' && m.createdAt >= startIso && m.createdAt <= endIso
    );
    const stockAddedToday = stockAddedTodayMovements.reduce((acc, m) => acc + m.qty, 0);

    const recentSales = this.data.sales
      .filter((s) => s.shopId === shopId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((s) => {
        const cust = s.customerId ? this.getCustomerById(s.customerId, shopId) : null;
        return {
          ...s,
          customerName: cust ? cust.name : 'সাধারণ ক্রেতা',
        };
      });

    return {
      todaySales: roundMoney(todaySalesAmount),
      invoicesToday,
      todayExpense: roundMoney(todayExpenseAmount),
      lowStockCount,
      totalStockQty: roundMoney(totalStockQty),
      stockAddedToday: roundMoney(stockAddedToday),
      recentSales,
      ...(canSeeProfits
        ? {
            grossProfitToday: roundMoney(grossProfitToday),
            netProfitToday: roundMoney(netProfitToday),
            stockValue: roundMoney(stockValue),
            expectedProfit: roundMoney(expectedProfit),
          }
        : {}),
    };
  }

  // --- Reports (§7.8) ---
  public getReports(shopId: number, fromDate: string, toDate: string, canSeeProfits = true) {
    const { startIso } = getDhakaDateBounds(fromDate);
    const { endIso } = getDhakaDateBounds(toDate);

    const sales = this.data.sales.filter(
      (s) => s.shopId === shopId && s.status === 'completed' && s.createdAt >= startIso && s.createdAt <= endIso
    );

    const saleIds = new Set(sales.map((s) => s.id));
    const items = this.data.saleItems.filter((i) => saleIds.has(i.saleId));

    const expenses = this.data.expenses.filter((e) => e.shopId === shopId && e.expenseDate >= fromDate && e.expenseDate <= toDate);

    const purchaseMovements = this.data.stockMovements.filter(
      (m) => m.shopId === shopId && m.movementType === 'purchase' && m.createdAt >= startIso && m.createdAt <= endIso
    );

    // Group by Day
    const dayMap: Record<
      string,
      {
        date: string;
        sales: number;
        grossProfit: number;
        expenses: number;
        stockAdded: number;
        invoices: number;
      }
    > = {};

    // Populate dates
    const startD = new Date(fromDate);
    const endD = new Date(toDate);
    for (let dt = new Date(startD); dt <= endD; dt.setDate(dt.getDate() + 1)) {
      const dStr = dt.toISOString().split('T')[0];
      dayMap[dStr] = {
        date: dStr,
        sales: 0,
        grossProfit: 0,
        expenses: 0,
        stockAdded: 0,
        invoices: 0,
      };
    }

    sales.forEach((s) => {
      const dStr = s.createdAt.slice(0, 10);
      if (!dayMap[dStr]) {
        dayMap[dStr] = { date: dStr, sales: 0, grossProfit: 0, expenses: 0, stockAdded: 0, invoices: 0 };
      }
      dayMap[dStr].sales += s.total;
      dayMap[dStr].invoices += 1;
    });

    items.forEach((item) => {
      const sale = sales.find((s) => s.id === item.saleId);
      if (sale) {
        const dStr = sale.createdAt.slice(0, 10);
        if (dayMap[dStr]) {
          dayMap[dStr].grossProfit += item.profit;
        }
      }
    });

    expenses.forEach((e) => {
      const dStr = e.expenseDate;
      if (!dayMap[dStr]) {
        dayMap[dStr] = { date: dStr, sales: 0, grossProfit: 0, expenses: 0, stockAdded: 0, invoices: 0 };
      }
      dayMap[dStr].expenses += e.amount;
    });

    purchaseMovements.forEach((m) => {
      const dStr = m.createdAt.slice(0, 10);
      if (dayMap[dStr]) {
        dayMap[dStr].stockAdded += m.qty;
      }
    });

    const dailyBreakdown = Object.values(dayMap)
      .map((d) => ({
        ...d,
        sales: roundMoney(d.sales),
        grossProfit: roundMoney(d.grossProfit),
        expenses: roundMoney(d.expenses),
        netProfit: roundMoney(d.grossProfit - d.expenses),
        stockAdded: roundMoney(d.stockAdded),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Summary totals
    const totalSales = dailyBreakdown.reduce((acc, d) => acc + d.sales, 0);
    const totalGrossProfit = dailyBreakdown.reduce((acc, d) => acc + d.grossProfit, 0);
    const totalExpenses = dailyBreakdown.reduce((acc, d) => acc + d.expenses, 0);
    const totalNetProfit = totalGrossProfit - totalExpenses;
    const totalStockAdded = dailyBreakdown.reduce((acc, d) => acc + d.stockAdded, 0);
    const totalInvoices = dailyBreakdown.reduce((acc, d) => acc + d.invoices, 0);

    // Top selling products
    const productSalesMap: Record<number, { name: string; qty: number; revenue: number }> = {};
    items.forEach((i) => {
      if (!productSalesMap[i.productId]) {
        productSalesMap[i.productId] = { name: i.productName, qty: 0, revenue: 0 };
      }
      productSalesMap[i.productId].qty += i.qty;
      productSalesMap[i.productId].revenue += i.lineTotal;
    });

    const topSelling = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((p) => ({ ...p, revenue: roundMoney(p.revenue) }));

    // Low stock items
    const lowStock = this.data.products
      .filter((p) => p.shopId === shopId && p.status === 'active' && p.stock <= p.lowStockThreshold)
      .map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, threshold: p.lowStockThreshold }));

    return {
      dailyBreakdown,
      totals: {
        sales: roundMoney(totalSales),
        grossProfit: canSeeProfits ? roundMoney(totalGrossProfit) : 0,
        expenses: roundMoney(totalExpenses),
        netProfit: canSeeProfits ? roundMoney(totalNetProfit) : 0,
        stockAdded: roundMoney(totalStockAdded),
        invoices: totalInvoices,
      },
      topSelling,
      lowStock,
    };
  }

  // Activity Logs
  public logActivity(data: { shopId?: number; userId?: number; action: string; entity: string; entityId: string; details: string }) {
    this.data.activityLogs.push({
      id: this.data.sequences.activityId++,
      shopId: data.shopId || null,
      userId: data.userId || null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      details: data.details,
      createdAt: nowIso(),
    });
    this.save();
  }
}

export const db = new DatabaseStore();

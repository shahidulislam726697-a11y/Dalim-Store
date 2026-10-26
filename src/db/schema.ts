import { pgTable, serial, bigserial, text, numeric, timestamp, boolean, pgEnum, integer } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'cashier']);
export const productStatusEnum = pgEnum('product_status', ['active', 'inactive']);
export const saleStatusEnum = pgEnum('sale_status', ['completed', 'cancelled', 'returned']);
export const movementTypeEnum = pgEnum('movement_type', ['purchase', 'sale', 'return', 'adjustment']);

// 1. shops
export const shops = pgTable('shops', {
  id: serial('id').primaryKey(),
  shopName: text('shop_name').notNull(),
  phone: text('phone'),
  address: text('address'),
  currencySymbol: text('currency_symbol').notNull().default('৳'),
  invoicePrefix: text('invoice_prefix').notNull().default('INV'),
  invoiceFooter: text('invoice_footer').notNull().default('Thank you for shopping with us!'),
  bkashNumber: text('bkash_number'),
  nagadNumber: text('nagad_number'),
  qrImage: text('qr_image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'set null' }),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('cashier').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  sku: text('sku').notNull(),
  barcode: text('barcode').notNull(),
  name: text('name').notNull(),
  image: text('image'),
  description: text('description'),
  buyPrice: numeric('buy_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  sellPrice: numeric('sell_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  stock: numeric('stock', { precision: 12, scale: 2 }).notNull().default('0.00'),
  lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 2 }).notNull().default('5.00'),
  status: productStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. customers
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. sales
export const sales = pgTable('sales', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  invoiceNo: text('invoice_no').notNull(),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0.00'),
  paid: numeric('paid', { precision: 12, scale: 2 }).notNull().default('0.00'),
  due: numeric('due', { precision: 12, scale: 2 }).notNull().default('0.00'),
  paymentMethod: text('payment_method').default('cash').notNull(),
  status: saleStatusEnum('status').default('completed').notNull(),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. sale_items
export const saleItems = pgTable('sale_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  saleId: bigserial('sale_id', { mode: 'number' }).references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'restrict' }).notNull(),
  productName: text('product_name').notNull(),
  qty: numeric('qty', { precision: 12, scale: 2 }).notNull(),
  buyPrice: numeric('buy_price', { precision: 12, scale: 2 }).notNull(),
  sellPrice: numeric('sell_price', { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
  profit: numeric('profit', { precision: 12, scale: 2 }).notNull(),
});

// 8. stock_movements
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  movementType: movementTypeEnum('movement_type').notNull(),
  qty: numeric('qty', { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),
  referenceId: text('reference_id'),
  note: text('note'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. expenses
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  category: text('category').default('other').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  expenseDate: text('expense_date').notNull(), // YYYY-MM-DD
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  saleId: bigserial('sale_id', { mode: 'number' }).references(() => sales.id, { onDelete: 'set null' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: text('method').notNull(),
  referenceNo: text('reference_no'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. activity_logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').references(() => shops.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

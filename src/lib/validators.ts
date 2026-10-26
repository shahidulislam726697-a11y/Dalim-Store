import { z } from 'zod';

export const bdPhoneRegex = /^01[3-9]\d{8}$/;

export const setupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').default('Dalim Store'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  categoryId: z.coerce.number().nullable().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  buyPrice: z.coerce.number().min(0, 'Buy price must be non-negative').default(0),
  sellPrice: z.coerce.number().min(0, 'Sell price must be non-negative'),
  stock: z.coerce.number().default(0),
  lowStockThreshold: z.coerce.number().min(0).default(5),
  status: z.enum(['active', 'inactive']).default('active'),
  image: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(6, 'Valid phone number required'),
  address: z.string().optional().nullable(),
});

export const customerPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  method: z.string().min(1, 'Payment method required'),
  referenceNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const saleItemInputSchema = z.object({
  productId: z.coerce.number().positive(),
  qty: z.coerce.number().positive('Quantity must be greater than 0'),
});

export const completeSaleSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, 'Cart must have at least one product'),
  discount: z.coerce.number().min(0).default(0),
  paid: z.coerce.number().min(0).default(0),
  paymentMethod: z.string().default('cash'),
  customerId: z.coerce.number().nullable().optional(),
  notes: z.string().optional().nullable(),
});

export const websiteOrderSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(bdPhoneRegex, 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)'),
  address: z.string().optional(),
  items: z.array(
    z.object({
      id: z.coerce.number().positive(),
      qty: z.coerce.number().int().min(1).max(50),
    })
  ).min(1, 'Order must contain at least one item').max(50, 'Max 50 items per order'),
});

export const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().default('other'),
  amount: z.coerce.number().positive('Amount must be positive'),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes: z.string().optional().nullable(),
});

export const settingsSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  invoicePrefix: z.string().min(1).default('INV'),
  invoiceFooter: z.string().default('Thank you for shopping with us!'),
  bkashNumber: z.string().optional().nullable(),
  nagadNumber: z.string().optional().nullable(),
  qrImage: z.string().optional().nullable(),
});

export const userCreateSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'cashier']).default('cashier'),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['admin', 'manager', 'cashier']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional().nullable(),
});

export const shopSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  currencySymbol: z.string().default('৳'),
  invoicePrefix: z.string().default('INV'),
  invoiceFooter: z.string().default('Thank you for shopping with us!'),
  bkashNumber: z.string().optional().nullable(),
  nagadNumber: z.string().optional().nullable(),
  qrImage: z.string().optional().nullable(),
});

# Dalim Store POS (ডালিম স্টোর)

A modern, production-ready **Retail POS + Online Storefront + Admin Panel** built with Next.js / React 19, TypeScript, Tailwind CSS v4, and PostgreSQL (Drizzle ORM). Features the signature **Neon UI v5** look, Asia/Dhaka timezone support, 80mm thermal receipt & A4 printing, multi-shop support, and comprehensive inventory & customer credit management.

---

## 🌟 Key Features

1. **পাবলিক অনলাইন স্টোরফ্রন্ট (Public Storefront - `/`)**:
   - বাংলা ইউজার ইন্টারফেস (`lang="bn"`), প্যাসিফিকো ব্র্যান্ড লোগো, লাইভ সার্চ ও ক্যাটাগরি চিপস
   - রিয়েল-টাইম স্টক আপডেট ও ব্যানার মারকুই স্ক্রল
   - স্লাইড-ইন শপিং কার্ট ও ক্যাশ অন ডেলিভারি (COD) চেকআউট
   - ওয়েবসাইট অর্ডারের জন্য স্বয়ংক্রিয় `WEB-YYYYMMDD-HHMMSS-xxx` ইনভয়েস জেনারেশন

2. **পয়েন্ট অব সেল (Point of Sale - `/admin/pos`)**:
   - তাত্ক্ষণিক নাম, SKU ও বারকোড স্ক্যানার (Enter চাপলেই কার্টে যোগ হয়)
   - একাধিক পেমেন্ট মাধ্যম: ক্যাশ, বিকাশ (bKash), নগদ (Nagad), রকেট, কার্ড, ব্যাংক, বাংলা QR
   - পুরো টাকা পরিশোধ (Full Paid) চেকবক্স ও আংশিক পরিশোধে স্বয়ংক্রিয় বাকি (Due) হিসাব
   - ৮০ মিমি থার্মাল স্লিপ এবং A4 ইনভয়েস প্রিন্টিং (পেমেন্ট কিউআর কোড সহ)

3. **স্টক ও ইনভেন্টরি কন্ট্রোল (`/admin/products`)**:
   - রিয়েল-টাইম স্টক ট্র্যাকিং ও লো-স্টক সতর্কতা
   - প্রতিটি ক্রয়, বিক্রয়, রিটার্ন ও সমন্বয়ে `stock_movements` ইতিহাস ট্র্যাকিং
   - পণ্য তালিকা CSV এক্সপোর্ট

4. **হিসাব ও বাকি খাতা (`/admin/customers`)**:
   - মোট ক্রয়, মোট পরিশোধ এবং অবশিষ্ট বাকির খতিয়ান
   - সরাসরি বাকি টাকা আদায়ের রশিদ এবং কাস্টমার লেজার

5. **ব্যবসায়িক প্রতিবেদন ও রিপোর্ট (`/admin/reports`)**:
   - দৈনিক সেলস, মোট লাভ (Gross Profit), খরচ ও নিট লাভ (Net Profit)
   - সর্বাধিক বিক্রিত পণ্য ও স্বল্প স্টক রিপোর্ট
   - A4 সাইজ PDF প্রিন্ট ভিউ ("দৈনিক ব্যবসায়িক রিপোর্ট" ও স্বাক্ষর লাইন সহ)

6. **রোল-বেসড এক্সেস কন্ট্রোল (RBAC)**:
   - **Admin**: সম্পূর্ণ নিয়ন্ত্রণ (ইউজার, সেটিংস ও মাল্টি-শপ সহ)
   - **Manager**: সমস্ত অপারেশন (ইউজার ও সেটিংস ছাড়া)
   - **Cashier**: শুধুমাত্র POS বিক্রয় ও চালান ভিউ (ক্রয়মূল্য ও লাভ গোপন থাকে)

---

## 🚀 Local Development Setup

To run Dalim Store POS locally:

```bash
# 1. Install all dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

- Public Store: `http://localhost:3000/`
- Initial Admin Setup (first-time only): `http://localhost:3000/setup`
- Admin & Staff Login: `http://localhost:3000/admin/login`

---

## ☁️ GitHub & Vercel Deployment Guide

### Step 1: Push to GitHub

```bash
# Initialize git repository
git init
git add .
git commit -m "feat: initial release of Dalim Store POS"
git branch -M main

# Add your GitHub repository remote
git remote add origin https://github.com/YOUR_USERNAME/dalim-store-pos.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New → Project**.
2. **Import** your `dalim-store-pos` GitHub repository (Next.js is detected automatically).
3. Under the **Storage** tab:
   - Connect **Neon Postgres** (this automatically populates `DATABASE_URL`).
   - (Optional) Connect **Vercel Blob** (sets `BLOB_READ_WRITE_TOKEN`).
4. In **Settings → Environment Variables**, add:
   - `AUTH_SECRET`: Generate a 32+ character random secret (e.g. `openssl rand -base64 32`).
   - `NEXT_PUBLIC_APP_NAME`: `Dalim Store`
   - `NEXT_PUBLIC_CURRENCY`: `৳`
   - `TZ`: `Asia/Dhaka`
5. Click **Deploy**.

### Step 3: First-time Admin Initialization

Once deployed to your Vercel URL (e.g., `https://dalim-store.vercel.app`):
1. Navigate to `https://your-app.vercel.app/setup`
2. Fill in the shop name, your full name, email, and password (minimum 8 characters).
3. Submit the form to create your primary **Admin** user and initialize the store.
4. Subsequent visits to `/setup` are permanently locked (returns 404).

---

## 🧪 Running Unit Tests

Run the Vitest test suite to verify financial precision, rounding half-up, and stock validation:

```bash
npm test
```

---

## 🛡️ License

MIT License. Designed & Developed for Dalim Store.

/**
 * Seed script — creates a demo shopkeeper + products
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Shopkeeper = require('../models/Shopkeeper');
const Product = require('../models/Product');

const DEMO_SHOP = {
  shopName: 'Sharma Auto Parts',
  ownerName: 'Rajesh Sharma',
  email: 'demo@smartshop.com',
  password: 'Demo@1234',
  upiId: 'sharma.auto@okaxis',
  phone: '+919876543210',
  address: 'Shop 12, Amritsar Market, Punjab',
  gstNumber: '03ABCDE1234F1Z5',
};

const DEMO_PRODUCTS = [
  { name: 'Engine Oil 1L',     price: 350,  category: 'Oils',        unit: 'litre' },
  { name: 'Brake Pad Set',     price: 680,  category: 'Brakes',      unit: 'set'   },
  { name: 'Air Filter',        price: 220,  category: 'Filters',     unit: 'piece' },
  { name: 'Headlight Bulb H4', price: 180,  category: 'Electricals', unit: 'piece' },
  { name: 'Wiper Blade Pair',  price: 240,  category: 'Accessories', unit: 'pair'  },
  { name: 'Coolant 1L',        price: 280,  category: 'Fluids',      unit: 'litre' },
  { name: 'Spark Plug Set',    price: 420,  category: 'Ignition',    unit: 'set'   },
  { name: 'Clutch Plate',      price: 1200, category: 'Transmission',unit: 'piece' },
];

// Placeholder 1×1 transparent PNG (Cloudinary would be used in production)
const PLACEHOLDER_IMG = 'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/car-parts.jpg';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Remove existing demo shop
  const existing = await Shopkeeper.findOne({ email: DEMO_SHOP.email });
  if (existing) {
    await Product.deleteMany({ shopkeeper: existing._id });
    await existing.deleteOne();
    console.log('Removed old demo data');
  }

  const shop = await Shopkeeper.create(DEMO_SHOP);
  console.log(`Created shop: ${shop.shopName} (shopId: ${shop.shopId})`);

  for (const p of DEMO_PRODUCTS) {
    await Product.create({ shopkeeper: shop._id, imageUrl: PLACEHOLDER_IMG, ...p });
  }
  console.log(`Seeded ${DEMO_PRODUCTS.length} products`);

  console.log('\n── Demo credentials ────────────────────');
  console.log(`  Email:    ${DEMO_SHOP.email}`);
  console.log(`  Password: ${DEMO_SHOP.password}`);
  console.log(`  Shop ID:  ${shop.shopId}`);
  console.log(`  QR URL:   ${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan?shop=${shop.shopId}`);
  console.log('────────────────────────────────────────\n');

  await mongoose.connection.close();
}

seed().catch((err) => { console.error(err); process.exit(1); });

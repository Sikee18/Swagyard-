const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const SEED_DATA = {
  users: [
    {
      id: 'usr_admin_001',
      username: process.env.ADMIN_USERNAME || 'admin',
      email: 'admin@swagyard.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      name: 'Store Administrator'
    },
    {
      id: 'usr_cashier_002',
      username: 'cashier',
      email: 'cashier@swagyard.com',
      password: 'cashier123',
      role: 'cashier',
      name: 'Shift Cashier'
    },
    {
      id: 'usr_staff_003',
      username: process.env.STAFF_USERNAME || 'staff',
      email: 'staff@swagyard.com',
      password: process.env.STAFF_PASSWORD || 'staff123',
      role: 'staff',
      name: 'Store Staff'
    }
  ],
  categories: [
    { id: 1, nameEn: 'Pants & Trousers', nameTa: 'கால்சட்டை', isActive: true, sortOrder: 1 },
    { id: 2, nameEn: 'Casual Shirts', nameTa: 'சட்டை', isActive: true, sortOrder: 2 },
    { id: 3, nameEn: 'T-Shirts & Polos', nameTa: 'டி-சர்ட்', isActive: true, sortOrder: 3 },
    { id: 4, nameEn: 'Traditional & Sarees', nameTa: 'சேலை', isActive: true, sortOrder: 4 },
    { id: 5, nameEn: 'Combo & Bundle Sets', nameTa: 'தொகுப்பு', isActive: true, sortOrder: 5 },
    { id: 6, nameEn: 'Accessories', nameTa: 'துணைப்பொருட்கள்', isActive: true, sortOrder: 6 }
  ],
  products: [
    {
      id: 1,
      name: 'Black Slim Fit Formal Pant',
      nameTa: 'கருப்பு பார்மல் பேண்ட்',
      categoryId: 1,
      priceInPaise: 129900, // ₹1,299.00
      costInPaise: 75000,   // ₹750.00
      stockQuantity: 1,      // 1 unit in stock -> TRIGGERS LOW STOCK ALARM! (<5)
      lowStockAlert: 5,
      sku: 'SWAG-PNT-BLK-01',
      barcode: '890123456001',
      hasVariants: true,
      isActive: true,
      sortOrder: 1,
      description: 'Premium stretch formal trouser for men',
      variants: [
        { id: 101, variantName: 'Size 30', sizeLabel: '30', sku: 'SWAG-PNT-BLK-30', barcode: '890123456011', costInPaise: 75000, priceInPaise: 129900, stock: 0 },
        { id: 102, variantName: 'Size 32', sizeLabel: '32', sku: 'SWAG-PNT-BLK-32', barcode: '890123456012', costInPaise: 75000, priceInPaise: 129900, stock: 1 },
        { id: 103, variantName: 'Size 34', sizeLabel: '34', sku: 'SWAG-PNT-BLK-34', barcode: '890123456013', costInPaise: 75000, priceInPaise: 129900, stock: 0 }
      ]
    },
    {
      id: 2,
      name: 'Oxford Pure Cotton White Shirt',
      nameTa: 'வெள்ளை காட்டன் சட்டை',
      categoryId: 2,
      priceInPaise: 99900,  // ₹999.00
      costInPaise: 55000,   // ₹550.00
      stockQuantity: 18,
      lowStockAlert: 5,
      sku: 'SWAG-SHT-WHT-02',
      barcode: '890123456002',
      hasVariants: true,
      isActive: true,
      sortOrder: 2,
      description: '100% Breathable cotton shirt',
      variants: [
        { id: 104, variantName: 'Medium', sizeLabel: 'M', sku: 'SWAG-SHT-WHT-M', barcode: '890123456021', costInPaise: 55000, priceInPaise: 99900, stock: 6 },
        { id: 105, variantName: 'Large', sizeLabel: 'L', sku: 'SWAG-SHT-WHT-L', barcode: '890123456022', costInPaise: 55000, priceInPaise: 99900, stock: 8 },
        { id: 106, variantName: 'X-Large', sizeLabel: 'XL', sku: 'SWAG-SHT-WHT-XL', barcode: '890123456023', costInPaise: 55000, priceInPaise: 99900, stock: 4 }
      ]
    },
    {
      id: 3,
      name: 'Vintage Oversized Graphic Tee',
      nameTa: 'கிராபிக் டி-சர்ட்',
      categoryId: 3,
      priceInPaise: 69900,  // ₹699.00
      costInPaise: 35000,   // ₹350.00
      stockQuantity: 24,
      lowStockAlert: 5,
      sku: 'SWAG-TEE-OVR-03',
      barcode: '890123456003',
      hasVariants: true,
      isActive: true,
      sortOrder: 3,
      description: 'Heavyweight streetwear oversized fit',
      variants: [
        { id: 107, variantName: 'Medium', sizeLabel: 'M', sku: 'SWAG-TEE-OVR-M', barcode: '890123456031', costInPaise: 35000, priceInPaise: 69900, stock: 10 },
        { id: 108, variantName: 'Large', sizeLabel: 'L', sku: 'SWAG-TEE-OVR-L', barcode: '890123456032', costInPaise: 35000, priceInPaise: 69900, stock: 14 }
      ]
    },
    {
      id: 4,
      name: 'Leather Belt with Brass Buckle',
      nameTa: 'தோல் இடுப்பு பெல்ட்',
      categoryId: 6,
      priceInPaise: 49900,  // ₹499.00
      costInPaise: 22000,   // ₹220.00
      stockQuantity: 12,
      lowStockAlert: 3,
      sku: 'SWAG-ACC-BLT-04',
      barcode: '890123456004',
      hasVariants: false,
      isActive: true,
      sortOrder: 4,
      description: 'Genuine full-grain leather dress belt'
    }
  ],
  coupons: [
    { id: 1, code: 'SWAG10', percentage: 10, minOrderPaise: 50000, usageLimit: 100, usageCount: 4, isActive: true },
    { id: 2, code: 'FESTIVE20', percentage: 20, minOrderPaise: 150000, usageLimit: 50, usageCount: 1, isActive: true },
    { id: 3, code: 'WELCOME50', percentage: 50, minOrderPaise: 200000, usageLimit: 10, usageCount: 0, isActive: true }
  ],
  expenses: [
    {
      id: 'exp_001',
      expenseDate: new Date('2026-10-13').toISOString(),
      categoryId: 1,
      categoryName: 'Rent',
      amountInPaise: 1000000, // ₹10,000.00
      paymentMode: 'cash',
      recordedByName: 'Admin',
      description: 'Monthly store shop rent advance'
    },
    {
      id: 'exp_002',
      expenseDate: new Date('2026-10-14').toISOString(),
      categoryId: 2,
      categoryName: 'Tea & Snacks',
      amountInPaise: 25000, // ₹250.00
      paymentMode: 'cash',
      recordedByName: 'Admin',
      description: 'Daily staff refreshment'
    }
  ],
  customerBirthdays: [
    { id: 1, name: 'Karthik Raja', phone: '9840123456', birthDate: new Date('2026-10-18').toISOString() },
    { id: 2, name: 'Priya Sundaram', phone: '9789012345', birthDate: new Date('2026-10-22').toISOString() }
  ],
  advanceOrders: [
    {
      id: 'adv_001',
      depositId: 'DEP-20261012-0001',
      createdAt: '2026-10-12T05:30:00.000Z',
      createdByName: 'Admin',
      customerName: 'Suresh Kumar',
      phone: '9876543210',
      address: '22 Bazaar Road, Ranipet',
      productName: 'Custom 2-Piece Wedding Suit',
      category: 'Tailoring',
      description: 'Navy blue double-breasted coat with tapered trousers',
      totalAmountPaise: 850000, // ₹8,500.00
      depositAmountPaise: 300000, // ₹3,000.00
      remainingBalancePaise: 550000, // ₹5,500.00
      depositPaymentMode: 'qr',
      expectedDeliveryDate: new Date('2026-10-25').toISOString(),
      status: 'pending_deposit',
      referenceNumber: null,
      remarks: 'Trial fitting scheduled for Oct 21',
      payments: [
        { id: 1, paymentType: 'deposit', amountInPaise: 300000, paymentMode: 'qr', createdAt: '2026-10-12T05:30:00.000Z' }
      ],
      timeline: [
        { id: 1, eventType: 'created', label: 'Deposit Created', remarks: 'Trial fitting scheduled for Oct 21', createdAt: '2026-10-12T05:30:00.000Z' },
        { id: 2, eventType: 'deposit_received', label: 'Deposit Received', remarks: 'Received INR 3000 via QR', createdAt: '2026-10-12T05:30:00.000Z' }
      ]
    }
  ]
};

async function main() {
  console.log('Seeding Swagyard POS initial data...');
  
  // Hash user passwords
  for (const user of SEED_DATA.users) {
    user.passwordHash = bcrypt.hashSync(user.password, 10);
    delete user.password;
  }

  // Save seed data json for local store & test runner
  const seedPath = path.join(__dirname, '..', 'prisma', 'seed_data.json');
  fs.writeFileSync(seedPath, JSON.stringify(SEED_DATA, null, 2));
  console.log('Seed data successfully written to:', seedPath);
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

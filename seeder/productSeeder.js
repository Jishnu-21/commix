require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = 'mongodb+srv://admin:<db_password>@cluster0.qlrgl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const products = [
  {
    name: "Vitamin C Serum",
    description: "Brightening serum for radiant skin with powerful antioxidants",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Vitamin C", "Ferulic Acid", "Vitamin E"],
    hero_ingredients: ["Vitamin C"],
    functions: ["Brightening", "Anti-oxidant"],
    taglines: ["For radiant, glowing skin"],
    variants: [
      {
        name: "30ml",
        price: 45,
        stock_quantity: 100
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732639/products/f4zgha1z3zxqbe1kpywi.jpg"
    ]
  },
  {
    name: "Hydrating Face Cream",
    description: "Rich moisturizing cream with hyaluronic acid",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Hyaluronic Acid", "Ceramides", "Glycerin"],
    hero_ingredients: ["Hyaluronic Acid"],
    functions: ["Hydration", "Moisturizing"],
    taglines: ["24-hour hydration"],
    variants: [
      {
        name: "50ml",
        price: 48,
        stock_quantity: 75
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732640/products/vxgpiplxmzhpu7kjnkfe.jpg"
    ]
  },
  {
    name: "Anti-Aging Night Serum",
    description: "Powerful retinol serum for overnight renewal",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Retinol", "Peptides", "Niacinamide"],
    hero_ingredients: ["Retinol"],
    functions: ["Anti-aging", "Renewal"],
    taglines: ["Wake up to younger-looking skin"],
    variants: [
      {
        name: "30ml",
        price: 55,
        stock_quantity: 50
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732641/products/jkksyllb3naiil2ad0io.jpg"
    ]
  },
  {
    name: "Gentle Cleansing Foam",
    description: "Soft, pH-balanced cleanser for all skin types",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Amino Acids", "Green Tea", "Panthenol"],
    hero_ingredients: ["Green Tea"],
    functions: ["Cleansing", "Soothing"],
    taglines: ["Gentle yet effective cleansing"],
    variants: [
      {
        name: "150ml",
        price: 35,
        stock_quantity: 120
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732642/products/l8ts8osxqtyjup4ep4tf.jpg"
    ]
  },
  {
    name: "Brightening Toner",
    description: "Exfoliating toner with AHA/BHA",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Glycolic Acid", "Salicylic Acid", "Allantoin"],
    hero_ingredients: ["Glycolic Acid"],
    functions: ["Exfoliation", "Brightening"],
    taglines: ["Reveal your natural glow"],
    variants: [
      {
        name: "200ml",
        price: 42,
        stock_quantity: 85
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732643/products/zppoqkdt8b29oxxbetdy.jpg"
    ]
  },
  {
    name: "Nourishing Eye Cream",
    description: "Rich eye cream for dark circles and puffiness",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Caffeine", "Vitamin K", "Peptides"],
    hero_ingredients: ["Caffeine"],
    functions: ["Dark Circle Reduction", "De-puffing"],
    taglines: ["Bright, refreshed eyes"],
    variants: [
      {
        name: "15ml",
        price: 38,
        stock_quantity: 60
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732645/products/bb2mjmpoiigylb7ki43t.jpg"
    ]
  },
  {
    name: "Calming Face Mask",
    description: "Soothing clay mask with centella asiatica",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Centella Asiatica", "Kaolin Clay", "Aloe Vera"],
    hero_ingredients: ["Centella Asiatica"],
    functions: ["Calming", "Purifying"],
    taglines: ["Calm and clear skin"],
    variants: [
      {
        name: "100ml",
        price: 32,
        stock_quantity: 90
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732796/products/xyintn3ya85jmtuvhmvn.jpg"
    ]
  },
  {
    name: "Barrier Repair Cream",
    description: "Intensive moisturizer for damaged skin barrier",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Ceramides", "Fatty Acids", "Squalane"],
    hero_ingredients: ["Ceramides"],
    functions: ["Barrier Repair", "Moisturizing"],
    taglines: ["Restore your skin barrier"],
    variants: [
      {
        name: "50ml",
        price: 46,
        stock_quantity: 70
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732797/products/lihxf3qkesaikd8n5coe.jpg"
    ]
  },
  {
    name: "Pore Minimizing Serum",
    description: "Refining serum for visible pore reduction",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["Niacinamide", "Zinc PCA", "BHA"],
    hero_ingredients: ["Niacinamide"],
    functions: ["Pore Reduction", "Oil Control"],
    taglines: ["Refined, smooth skin"],
    variants: [
      {
        name: "30ml",
        price: 40,
        stock_quantity: 80
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732798/products/zqyzudtw6gf6yofsrali.jpg"
    ]
  },
  {
    name: "Sun Protection Fluid",
    description: "Lightweight SPF50+ sunscreen",
    category_id: "67935d7c5e8e847cc68a212f",
    subcategory_id: "67935d7c5e8e847cc68a2130",
    ingredients: ["UV Filters", "Vitamin E", "Green Tea"],
    hero_ingredients: ["UV Filters"],
    functions: ["Sun Protection", "Anti-oxidant"],
    taglines: ["Daily defense against UV rays"],
    variants: [
      {
        name: "50ml",
        price: 36,
        stock_quantity: 150
      }
    ],
    images: [
      "https://res.cloudinary.com/dkgjl08a5/image/upload/v1737732799/products/jwf6pui5pbfjemeymw4t.jpg"
    ]
  }
];

const seedProducts = async () => {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB Atlas');

    // Insert products
    await Product.insertMany(products);
    console.log('Products seeded successfully');

  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedProducts();

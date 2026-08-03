import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Seeds the storefront catalogue: Category, Product and each product's
 * ProductSize rows.
 *
 * Generated from the working local database on 2026-08-03
 * (4 categories, 19 products, 30 sizes).
 *
 * SAFE TO RE-RUN. Every row is upserted on its unique slug, so running this
 * twice does not duplicate anything and running it against a populated database
 * updates the seeded rows rather than failing. It never deletes a product or
 * category that is not in this file, so anything added through the admin panel
 * survives.
 *
 * Product sizes are the exception: for a product that owns sizes here, the
 * existing sizes are replaced. ProductSize has no natural unique key to upsert
 * on, and leaving stale rows behind would show customers prices that no longer
 * exist.
 *
 * Usage:
 *   pnpm seed:catalogue                     # uses DATA_BASE_URL from the environment
 *   DATA_BASE_URL=mysql://... pnpm seed:catalogue
 */

const categories = [
  {
    "name": "Classic Collection",
    "slug": "classic-collection",
    "description": "test",
    "imageUrl": "/images/products/signature_vanilla.png",
    "sortOrder": 1,
    "isActive": true
  },
  {
    "name": "Signature Pastries",
    "slug": "signature-pastries",
    "description": null,
    "imageUrl": "/images/products/mille-feuille.png",
    "sortOrder": 2,
    "isActive": true
  },
  {
    "name": "Mini Celebration Cakes",
    "slug": "mini-celebration-cakes",
    "description": null,
    "imageUrl": "/images/products/mini-Cakes/cookies-cream-crunch2.jpg",
    "sortOrder": 3,
    "isActive": true
  },
  {
    "name": "CupCakes",
    "slug": "cupcakes",
    "description": null,
    "imageUrl": "/images/products/cupCake_kids.png",
    "sortOrder": 4,
    "isActive": true
  }
];

const products = [
  {
    "categorySlug": "classic-collection",
    "name": "Yene Signature Vanilla",
    "slug": "yene-signature-vanilla",
    "description": "Vanilla sponge layered with diplomat cream and vanilla bean butter cream.",
    "price": "10",
    "hasSizes": true,
    "imageUrl": "/images/products/signature_vanilla.png",
    "prepLeadTimeDays": 1,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "6\"",
        "serves": null,
        "price": "35",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "8\"",
        "serves": null,
        "price": "40",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "10\"",
        "serves": null,
        "price": "50",
        "isActive": true,
        "sortOrder": 2
      },
      {
        "name": "12\"",
        "serves": null,
        "price": "65",
        "isActive": true,
        "sortOrder": 3
      },
      {
        "name": "1/2 Sheet",
        "serves": null,
        "price": "85",
        "isActive": true,
        "sortOrder": 4
      },
      {
        "name": "Full Sheet",
        "serves": null,
        "price": "150",
        "isActive": true,
        "sortOrder": 5
      }
    ]
  },
  {
    "categorySlug": "classic-collection",
    "name": "Midnight Chocolate",
    "slug": "midnight-chocolate",
    "description": "Chocolate cake layered with dark ganache and chocolate buttercream.",
    "price": "0",
    "hasSizes": true,
    "imageUrl": "/images/products/midnight_chocolate.png",
    "prepLeadTimeDays": 1,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "6\"",
        "serves": null,
        "price": "35",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "8\"",
        "serves": null,
        "price": "40",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "10\"",
        "serves": null,
        "price": "50",
        "isActive": true,
        "sortOrder": 2
      },
      {
        "name": "1/2 sheet",
        "serves": null,
        "price": "85",
        "isActive": true,
        "sortOrder": 3
      },
      {
        "name": "Full Sheet",
        "serves": null,
        "price": "150",
        "isActive": true,
        "sortOrder": 4
      }
    ]
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Mille-Feuille",
    "slug": "mille-feuille",
    "description": "Flaky puff pastry layered with pastry cream and a delicate glaze.",
    "price": "45",
    "hasSizes": true,
    "imageUrl": "/images/products/mille-feuille.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "1/4 Sheet",
        "serves": null,
        "price": "45",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "1/2 Sheet",
        "serves": null,
        "price": "85",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "Full Sheet",
        "serves": null,
        "price": "160",
        "isActive": true,
        "sortOrder": 2
      }
    ]
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Tiramisu",
    "slug": "tiramisu",
    "description": "Espresso-soaked sponge layered with silky cream and fine cocoa.",
    "price": "45",
    "hasSizes": true,
    "imageUrl": "/images/products/tiramisu.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "1/4 Sheet",
        "serves": null,
        "price": "45",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "1/2 Sheet",
        "serves": null,
        "price": "85",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "Full Sheet",
        "serves": null,
        "price": "160",
        "isActive": true,
        "sortOrder": 2
      }
    ]
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Diplomat Cake",
    "slug": "diplomat-cake",
    "description": "Golden, flaky puff pastry layered with soft sponge cake and luscious diplomat cream,",
    "price": "45",
    "hasSizes": true,
    "imageUrl": "/images/products/diplomat_cake.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "1/4 Sheet",
        "serves": null,
        "price": "45",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "1/2 Sheet",
        "serves": null,
        "price": "85",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "Full Sheet",
        "serves": null,
        "price": "160",
        "isActive": true,
        "sortOrder": 2
      }
    ]
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Pistachio Baklava",
    "slug": "pistachio-baklava",
    "description": "Golden phyllo layered with pistachios or mixed nuts and\nfinished with syrup.",
    "price": "60",
    "hasSizes": true,
    "imageUrl": "/images/products/baklava.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "Quarter Tray (24 pieces)",
        "serves": null,
        "price": "60",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "Half Tray (48 pieces)",
        "serves": null,
        "price": "115",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "Full Tray (96 pieces)",
        "serves": null,
        "price": "220",
        "isActive": true,
        "sortOrder": 2
      }
    ]
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Walnut Baklava",
    "slug": "walnut-baklava",
    "description": "Golden phyllo layered with pistachios or mixed nuts and\nfinished with syrup.",
    "price": "60",
    "hasSizes": true,
    "imageUrl": "/images/products/baklava.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "Quarter Tray (24 pieces)",
        "serves": null,
        "price": "48",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "Half Tray (48 pieces)",
        "serves": null,
        "price": "90",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "Full Tray (96 pieces)",
        "serves": null,
        "price": "170",
        "isActive": true,
        "sortOrder": 2
      }
    ]
  },
  {
    "categorySlug": "cupcakes",
    "name": "Red Velvet Capcake",
    "slug": "red-velvet-capcake",
    "description": "Classic buttercream Red Velvet Cupcake — perfect for parties and events.",
    "price": "3.5",
    "hasSizes": false,
    "imageUrl": "/images/products/cupCake_kids.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "cupcakes",
    "name": "Vanilla Bean Cupcake",
    "slug": "vanilla-bean-cupcake",
    "description": "Classic buttercream Vanilla Bean Cupcake — perfect for parties and events.",
    "price": "3.5",
    "hasSizes": false,
    "imageUrl": "/images/products/cupCake_kids.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "cupcakes",
    "name": "Chocolate Cupcake",
    "slug": "chocolate-cupcake",
    "description": "Classic buttercream Chocolate Cupcake — perfect for parties and events.",
    "price": "3.5",
    "hasSizes": false,
    "imageUrl": "/images/products/cupCake_kids.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "cupcakes",
    "name": "Strawberry Cream Cupcake",
    "slug": "strawberry-cream-cupcake",
    "description": "Classic buttercream Strawberry Cream Cupcake — perfect for parties and events.",
    "price": "3.5",
    "hasSizes": false,
    "imageUrl": "/images/products/cupCake_kids.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "mini-celebration-cakes",
    "name": "Red Velvet Mini Celebration Cakes",
    "slug": "red-velvet-mini-celebration-cakes",
    "description": "Elegant Red Velvet Mini Celebration Cakes — perfect for birthdays, school.",
    "price": "4",
    "hasSizes": false,
    "imageUrl": "/images/products/mini-Cakes/red-velvet-crumble.jpg",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "mini-celebration-cakes",
    "name": "Vanilla Bean Mini Celebration Cakes",
    "slug": "vanilla-bean-mini-celebration-cakes",
    "description": "Elegant Vanilla Bean Mini Celebration Cakes — perfect for birthdays, school.",
    "price": "4",
    "hasSizes": false,
    "imageUrl": "/images/products/mini-Cakes/pure-vanilla-wave.jpg",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "mini-celebration-cakes",
    "name": "Chocolate Mini Celebration Cakes",
    "slug": "chocolate-mini-celebration-cakes",
    "description": "Elegant Chocolate Mini Celebration Cakes — perfect for birthdays, school.",
    "price": "4",
    "hasSizes": false,
    "imageUrl": "/images/products/mini-Cakes/salted-caramel.jpg",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "mini-celebration-cakes",
    "name": "Strawberry Cream Mini Celebration Cakes",
    "slug": "strawberry-cream-mini-celebration-cakes",
    "description": "Elegant Strawberry Cream Mini Celebration Cakes — perfect for birthdays, school.",
    "price": "4",
    "hasSizes": false,
    "imageUrl": "/images/products/mini-Cakes/strawberry-caramel.jpg",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": true,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "classic-collection",
    "name": "Choux & Cream Horns",
    "slug": "choux-cream-horns",
    "description": "Light choux and puff pastry horns filled with smooth pastry cream.",
    "price": "10",
    "hasSizes": false,
    "imageUrl": "/images/products/choux_cream_horns.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": false,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Red Velvet Cake",
    "slug": "red-velvet-cake",
    "description": "Classic red velvet layered with smooth cream cheese frosting.",
    "price": "80",
    "hasSizes": true,
    "imageUrl": "/images/products/red_velvet.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": false,
    "sortOrder": 0,
    "sizes": [
      {
        "name": "6\"",
        "serves": null,
        "price": "50",
        "isActive": true,
        "sortOrder": 0
      },
      {
        "name": "8\"",
        "serves": null,
        "price": "70",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "name": "10\"",
        "serves": null,
        "price": "90",
        "isActive": true,
        "sortOrder": 2
      },
      {
        "name": "12\"",
        "serves": null,
        "price": "150",
        "isActive": true,
        "sortOrder": 3
      }
    ]
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Matcha Cake",
    "slug": "matcha-cake",
    "description": "Light, fluffy sponge infused with premium matcha green tea, layered\nwith silky cream and offering a beautifully balanced earthy sweetness.",
    "price": "100",
    "hasSizes": false,
    "imageUrl": "/images/products/matcha_cake.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": false,
    "sortOrder": 0,
    "sizes": []
  },
  {
    "categorySlug": "signature-pastries",
    "name": "Pistachio Cake",
    "slug": "pistachio-cake",
    "description": "Tender sponge cake enriched with roasted pistachios, layered with\nsmooth cream and finished with a delicate pistachio flavor that is rich\nyet refined.",
    "price": "150",
    "hasSizes": false,
    "imageUrl": "/images/products/pistacho_cake.png",
    "prepLeadTimeDays": 0,
    "pickupAllowed": true,
    "deliveryAllowed": true,
    "isActive": false,
    "sortOrder": 0,
    "sizes": []
  }
];

function createClient() {
  const raw = process.env.DATA_BASE_URL;
  if (!raw) {
    throw new Error("DATA_BASE_URL is not set.");
  }

  const url = new URL(raw);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 5,
    }),
  });
}

async function main() {
  const prisma = createClient();
  const target = new URL(process.env.DATA_BASE_URL);
  console.log(`Seeding ${target.pathname.replace(/^\//, "")} at ${target.hostname}`);

  try {
    let categoriesCreated = 0;
    let categoriesUpdated = 0;

    for (const category of categories) {
      const existing = await prisma.category.findUnique({
        where: { slug: category.slug },
        select: { id: true },
      });

      await prisma.category.upsert({
        where: { slug: category.slug },
        create: { ...category, createdBy: "seed", updatedBy: "seed" },
        update: { ...category, updatedBy: "seed" },
      });

      if (existing) categoriesUpdated++;
      else categoriesCreated++;
    }

    console.log(
      `Categories: ${categoriesCreated} created, ${categoriesUpdated} updated`,
    );

    // Resolve slugs to ids once. A fresh database assigns different ids than the
    // machine this was generated from, so the seed never hardcodes them.
    const categoryIdBySlug = new Map(
      (await prisma.category.findMany({ select: { id: true, slug: true } })).map(
        (c) => [c.slug, c.id],
      ),
    );

    let productsCreated = 0;
    let productsUpdated = 0;
    let sizesWritten = 0;

    for (const { categorySlug, sizes, ...product } of products) {
      const categoryId = categoryIdBySlug.get(categorySlug);
      if (!categoryId) {
        throw new Error(
          `Product "${product.slug}" references category "${categorySlug}", which was not seeded.`,
        );
      }

      const existing = await prisma.product.findUnique({
        where: { slug: product.slug },
        select: { id: true },
      });

      const saved = await prisma.product.upsert({
        where: { slug: product.slug },
        create: { ...product, categoryId, createdBy: "seed", updatedBy: "seed" },
        update: { ...product, categoryId, updatedBy: "seed" },
        select: { id: true },
      });

      if (existing) productsUpdated++;
      else productsCreated++;

      if (sizes.length > 0) {
        // Replace rather than merge: ProductSize has no unique key to upsert on,
        // and a stale row would offer customers a price that no longer exists.
        await prisma.productSize.deleteMany({ where: { productId: saved.id } });
        await prisma.productSize.createMany({
          data: sizes.map((size) => ({ ...size, productId: saved.id })),
        });
        sizesWritten += sizes.length;
      }
    }

    console.log(`Products:   ${productsCreated} created, ${productsUpdated} updated`);
    console.log(`Sizes:      ${sizesWritten} written`);

    const [categoryTotal, productTotal, sizeTotal] = await Promise.all([
      prisma.category.count(),
      prisma.product.count(),
      prisma.productSize.count(),
    ]);
    console.log(
      `\nDatabase now holds ${categoryTotal} categories, ${productTotal} products, ${sizeTotal} sizes.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultStatuses = [
  {
    name: "Pending",
    description: "Order received, awaiting processing",
    sortOrder: 1,
  },
  {
    name: "In Preparation",
    description: "Order is being prepared",
    sortOrder: 2,
  },
  {
    name: "Ready for Pickup",
    description: "Order is ready for pickup",
    sortOrder: 3,
  },
  {
    name: "Completed",
    description: "Order fulfilled and closed",
    sortOrder: 4,
  },
  { name: "Cancelled", description: "Order cancelled", sortOrder: 5 },
];

async function ensureStatuses() {
  const existing = await prisma.orderStatusEntry.findMany({
    where: { deletedAt: null },
  });
  if (existing.length > 0) return existing;

  const created = [];
  for (const status of defaultStatuses) {
    const entry = await prisma.orderStatusEntry.create({
      data: {
        ...status,
        isActive: true,
        createdBy: "seed",
        updatedBy: "seed",
      },
    });
    created.push(entry);
  }
  return created;
}

async function ensurePickupLocation() {
  const existing = await prisma.pickupLocation.findFirst({
    where: { deletedAt: null },
  });
  if (existing) return existing;

  return prisma.pickupLocation.create({
    data: {
      name: "YeneBakery Main Store",
      address: "When needed our address can be put here",
      isActive: true,
      createdBy: "seed",
      updatedBy: "seed",
    },
  });
}

async function seedOrders() {
  const existing = await prisma.order.findMany();
  if (existing.length > 0) return;

  const statuses = await ensureStatuses();
  const pickupLocation = await ensurePickupLocation();

  const statusMap = new Map(
    statuses.map((status) => [status.name.toLowerCase(), status.id]),
  );
  const pendingId = statusMap.get("pending") ?? statuses[0].id;
  const prepId = statusMap.get("in preparation") ?? pendingId;
  const readyId = statusMap.get("ready for pickup") ?? pendingId;
  const completedId = statusMap.get("completed") ?? pendingId;

  await prisma.order.create({
    data: {
      confirmationNumber: "TB-ABC123",
      customerName: "Sarah Johnson",
      customerEmail: "sarah@example.com",
      customerPhone: "(555) 111-2222",
      fulfillmentMethod: "pickup",
      fulfillmentDate: new Date("2026-02-15"),
      pickupLocationId: pickupLocation.id,
      subtotal: 21.5,
      deliveryFee: 0,
      total: 21.5,
      orderNotes: "Please add extra icing on the cinnamon roll",
      orderStatusId: pendingId,
      paymentStatus: "paid",
      createdBy: "seed",
      updatedBy: "seed",
      items: {
        create: [
          {
            productName: "Sourdough Loaf",
            quantity: 1,
            unitPrice: 8.5,
            lineTotal: 8.5,
          },
          {
            productName: "Classic Croissant",
            quantity: 2,
            unitPrice: 4.5,
            lineTotal: 9.0,
          },
          {
            productName: "Cinnamon Roll",
            quantity: 1,
            unitPrice: 5.0,
            lineTotal: 5.0,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      confirmationNumber: "TB-DEF456",
      customerName: "Mike Chen",
      customerEmail: "mike@business.com",
      customerPhone: "(555) 333-4444",
      businessName: "Chen Corp",
      fulfillmentMethod: "delivery",
      fulfillmentDate: new Date("2026-02-16"),
      deliveryAddress: "456 Business Blvd, Suite 200, Downtown 90210",
      subtotal: 50.0,
      deliveryFee: 5.99,
      total: 55.99,
      orderStatusId: prepId,
      paymentStatus: "paid",
      createdBy: "seed",
      updatedBy: "seed",
      items: {
        create: [
          {
            productName: "Chocolate Chip Cookies (6-pack)",
            quantity: 2,
            unitPrice: 12.0,
            lineTotal: 24.0,
          },
          {
            productName: "Macarons Box (12-pack)",
            quantity: 1,
            unitPrice: 24.0,
            lineTotal: 24.0,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      confirmationNumber: "TB-GHI789",
      customerName: "Emily Davis",
      customerEmail: "emily@email.com",
      customerPhone: "(555) 555-6666",
      fulfillmentMethod: "pickup",
      fulfillmentDate: new Date("2026-02-18"),
      pickupLocationId: pickupLocation.id,
      subtotal: 85.0,
      deliveryFee: 0,
      total: 85.0,
      orderNotes: "Write 'Happy Birthday Sarah!' in blue icing.",
      orderStatusId: pendingId,
      paymentStatus: "paid",
      createdBy: "seed",
      updatedBy: "seed",
      items: {
        create: [
          {
            productName: "Custom Celebration Cake",
            quantity: 1,
            unitPrice: 85.0,
            lineTotal: 85.0,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      confirmationNumber: "TB-JKL012",
      customerName: "Tom Wilson",
      customerEmail: "tom@email.com",
      customerPhone: "(555) 777-8888",
      fulfillmentMethod: "pickup",
      fulfillmentDate: new Date("2026-02-13"),
      pickupLocationId: pickupLocation.id,
      subtotal: 15.0,
      deliveryFee: 0,
      total: 15.0,
      orderStatusId: readyId,
      paymentStatus: "paid",
      createdBy: "seed",
      updatedBy: "seed",
      items: {
        create: [
          {
            productName: "Multigrain Loaf",
            quantity: 1,
            unitPrice: 9.0,
            lineTotal: 9.0,
          },
          {
            productName: "Ciabatta",
            quantity: 1,
            unitPrice: 6.5,
            lineTotal: 6.5,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      confirmationNumber: "TB-MNO345",
      customerName: "Lisa Park",
      customerEmail: "lisa@design.co",
      customerPhone: "(555) 999-0000",
      businessName: "Park Design Co",
      fulfillmentMethod: "delivery",
      fulfillmentDate: new Date("2026-02-20"),
      deliveryAddress: "789 Creative Ln, Apt 3A, Artsville 90211",
      subtotal: 178.5,
      deliveryFee: 5.99,
      total: 184.49,
      orderNotes: "Elegant styling for cupcakes - gold and white theme",
      orderStatusId: completedId,
      paymentStatus: "paid",
      createdBy: "seed",
      updatedBy: "seed",
      items: {
        create: [
          {
            productName: "Wedding Cupcake Tower (48-pack)",
            quantity: 1,
            unitPrice: 150.0,
            lineTotal: 150.0,
          },
          {
            productName: "Brownies (4-pack)",
            quantity: 1,
            unitPrice: 14.0,
            lineTotal: 14.0,
          },
          {
            productName: "Fruit Tart",
            quantity: 2,
            unitPrice: 7.0,
            lineTotal: 14.0,
          },
        ],
      },
    },
  });
}

async function main() {
  await ensureStatuses();
  await seedOrders();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

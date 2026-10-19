import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding The World of Tailors demo data...");

  // Clean (order matters)
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.deliveryStatusHistory.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.fabricOrderItem.deleteMany();
  await prisma.fabricOrder.deleteMany();
  await prisma.bookingNote.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.tailoringBooking.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.designImage.deleteMany();
  await prisma.design.deleteMany();
  await prisma.designCategory.deleteMany();
  await prisma.fabricProductImage.deleteMany();
  await prisma.fabricProduct.deleteMany();
  await prisma.fabricCategory.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.measurementValue.deleteMany();
  await prisma.measurementProfile.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.tailorProfile.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("DemoPass123!", 10);

  // Admin
  const admin = await prisma.user.create({ data: { name: "The World of Tailors Admin", email: "admin@demo.twt.ng", passwordHash: hash, role: "ADMIN", status: "ACTIVE" } });

  // Customers (20)
  const customers = [];
  for (let i = 1; i <= 20; i++) {
    const u = await prisma.user.create({ data: { name: `Customer ${i}`, email: `customer${i}@demo.twt.ng`, passwordHash: hash, role: "CUSTOMER", status: "ACTIVE", phone: `+23480${String(i).padStart(8,"0")}` } });
    await prisma.customerProfile.create({ data: { userId: u.id } });
    await prisma.customerAddress.create({ data: { userId: u.id, label: "Home", fullName: `Customer ${i}`, phone: `+23480${String(i).padStart(8,"0")}`, state: "Lagos", city: "Lagos", street: `${i*2} Allen Avenue, Ikeja`, isDefault: true } });
    customers.push(u);
  }
  // primary demo customer
  const demoCustomer = await prisma.user.create({ data: { name: "Demo Customer", email: "customer@demo.twt.ng", passwordHash: hash, role: "CUSTOMER", status: "ACTIVE", phone: "+2348012345678" } });
  await prisma.customerProfile.create({ data: { userId: demoCustomer.id } });

  // Categories
  const designCats = await Promise.all(["Men's Fashion","Women's Fashion","Traditional","Corporate","Wedding","Casual","Children"].map((n, i) => prisma.designCategory.create({ data: { name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g,"-") } })));
  const fabricCats = await Promise.all(["Ankara","Lace","Aso-Oke","Brocade","Adire","Wool","Cotton"].map(n => prisma.fabricCategory.create({ data: { name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g,"-") } })));

  // Tailors (8)
  const tailorData = [
    { businessName: "Ade Bespoke Atelier", slug: "ade-bespoke", city: "Lagos", specialties: ["Agbada","Kaftan","Corporate"], img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Zara Stitches", slug: "zara-stitches", city: "Abuja", specialties: ["Wedding","Ankara","Bubu"], img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Kente & Co", slug: "kente-co", city: "Accra", specialties: ["Traditional","Kente","Danshiki"], img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop" },
    { businessName: "The Cut Lagos", slug: "the-cut-lagos", city: "Lekki", specialties: ["Casual","Street","Senator"], img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Maison Tolu", slug: "maison-tolu", city: "Victoria Island", specialties: ["Women's","Corporate","Wedding"], img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Savile Yaba", slug: "savile-yaba", city: "Yaba", specialties: ["Mens","Corporate","Kaftan"], img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Ankara Republic", slug: "ankara-republic", city: "Ibadan", specialties: ["Ankara","Casual","Children"], img: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop" },
    { businessName: "House of Aso-Oke", slug: "house-aso-oke", city: "Ilorin", specialties: ["Aso-Oke","Wedding","Traditional"], img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop" },
  ];
  const tailors: any[] = [];
  for (let i = 0; i < tailorData.length; i++) {
    const td = tailorData[i];
    // demo tailor is first
    let email = i===0 ? "tailor@demo.twt.ng" : `tailor${i+1}@demo.twt.ng`;
    let name = td.businessName;
    const u = await prisma.user.create({ data: { name, email, passwordHash: hash, role: "TAILOR", status: "ACTIVE" } });
    const p = await prisma.tailorProfile.create({ data: { userId: u.id, businessName: td.businessName, slug: td.slug, bio: `${td.businessName} — crafted in ${td.city}. ${td.specialties.join(", ")} specialists with 10+ years experience.`, specialties: JSON.stringify(td.specialties), city: td.city, country: "Nigeria", state: "Lagos", address: `${i+1} Fashion Lane, ${td.city}`, latitude: 6.5244 + i*0.01, longitude: 3.3792 + i*0.01, profileImage: td.img, businessStatus: "APPROVED", isPublished: true, ratingAvg: 4.6 + (i%3)*0.1, ratingCount: 40+i*12, startingPrice: 25000+i*5000, turnaroundDays: 5+i%4, experienceYears: 8+i } });
    tailors.push(p);
  }

  // Sellers (6)
  const sellerData = [
    { businessName: "Lagos Fabrics Hub", slug: "lagos-fabrics", city: "Yaba, Lagos", img: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Abuja Lace House", slug: "abuja-lace", city: "Wuse, Abuja", img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Kumasi Textiles", slug: "kumasi-textiles", city: "Kumasi, Ghana", img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Ankara World", slug: "ankara-world", city: "Ibadan", img: "https://images.unsplash.com/photo-1485230893385-4a4c9ff37d2c?q=80&w=400&auto=format&fit=crop" },
    { businessName: "George & Brocade Co", slug: "george-brocade", city: "Port Harcourt", img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400&auto=format&fit=crop" },
    { businessName: "Adire Heritage", slug: "adire-heritage", city: "Abeokuta", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop" },
  ];
  const sellers: any[] = [];
  for (let i = 0; i < sellerData.length; i++) {
    const sd = sellerData[i];
    let email = i===0 ? "seller@demo.twt.ng" : `seller${i+1}@demo.twt.ng`;
    const u = await prisma.user.create({ data: { name: sd.businessName, email, passwordHash: hash, role: "FABRIC_SELLER", status: "ACTIVE" } });
    const p = await prisma.sellerProfile.create({ data: { userId: u.id, businessName: sd.businessName, slug: sd.slug, bio: `${sd.businessName} — trusted supplier since 2012.`, city: sd.city, country: "Nigeria", address: `${i+2} Market Street, ${sd.city}`, latitude: 6.5244+i*0.02, longitude: 3.3792+i*0.02, profileImage: sd.img, businessStatus: "APPROVED", isPublished: true, ratingAvg: 4.7, ratingCount: 60+i*10, deliveryZones: JSON.stringify(["Lagos","Abuja","Ibadan"]), deliveryMethods: "Dispatch Rider, Inter-state Bus" } });
    sellers.push(p);
  }

  // Designs (60)
  const designImages = [
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1485230893385-4a4c9ff37d2c?q=80&w=600&auto=format&fit=crop",
  ];
  const designTitles = ["Heritage Agbada","Ankara Midi Dress","Corporate Kaftan","Wedding Aso-Oke","Casual Senator","Kids Ankara Set","Mens Native Fusion","Womens Bubu Elegance","Corporate Suit","Danshiki Revival","Bridal Lace Aso-Ebi","Street Agbada","Royal Kaftan","Executive Senator","Princess Cut Bubu"];
  for (let i = 0; i < 60; i++) {
    const tailor = tailors[i % tailors.length];
    const cat = designCats[i % designCats.length];
    const title = `${designTitles[i % designTitles.length]} ${Math.floor(i/15)+1}`;
    const slug = `design-${i+1}-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
    const d = await prisma.design.create({ data: { tailorId: tailor.id, categoryId: cat.id, title, slug, description: `Exquisite ${title} crafted with attention to detail. Fabric sourcing available via marketplace. Estimated turnaround ${5+i%5} days.`, price: 20000 + (i%10)*5000, currency: "NGN", turnaroundDays: 5+i%5, isPublished: i < 54 } });
    await prisma.designImage.create({ data: { designId: d.id, url: designImages[i % designImages.length], alt: title, sortOrder: 0 } });
  }

  // Fabric products (50)
  const fabricNames = ["Swiss Lace Ivory","Ankara Gold Burst","Cashmere Wool Charcoal","Aso-Oke Royal Purple","Adire Indigo Splash","Brocade Champagne","Guinea Brocade Navy","Atiku Fabric White","Cotton Ankara Red","Linen Blend Sage","Damask Shine Gold","George Wrapper Emerald","Ankara Blue Burst","Lace Peach Blush","Aso-Oke Crimson"];
  const materials = ["Lace","Ankara","Wool","Aso-Oke","Adire","Brocade"];
  const colors = ["Ivory","Gold","Charcoal","Purple","Indigo","Champagne","Navy","White","Red","Emerald"];
  for (let i = 0; i < 50; i++) {
    const seller = sellers[i % sellers.length];
    const cat = fabricCats[i % fabricCats.length];
    const name = `${fabricNames[i % fabricNames.length]} ${i+1}`;
    const slug = `fabric-${i+1}-${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
    const p = await prisma.fabricProduct.create({ data: { sellerId: seller.id, categoryId: cat.id, name, slug, description: `Premium ${materials[i%materials.length]} fabric suitable for agbada, kaftan and corporate wear. Colour-fast and durable.`, material: materials[i%materials.length], color: colors[i%colors.length], pattern: i%3===0? "Floral": i%3===1? "Geometric":"Plain", price: 5000 + (i%12)*1500, currency: "NGN", unit: i%4===0? "yard":"metre", stock: 20 + (i%8)*10, reserved: 0, minOrderQty: 2, isPublished: i<46, deliveryEligible: true } });
    await prisma.fabricProductImage.create({ data: { productId: p.id, url: designImages[i % designImages.length], alt: name } });
    await prisma.inventoryMovement.create({ data: { productId: p.id, delta: p.stock, reason: "Initial stock" } });
  }

  // Bookings (40)
  for (let i = 0; i < 40; i++) {
    const customer = i===0 ? demoCustomer : customers[i % customers.length];
    const tailor = tailors[i % tailors.length];
    const design = await prisma.design.findFirst({ where: { tailorId: tailor.id } });
    const statuses: any[] = ["REQUESTED","ACCEPTED","IN_PRODUCTION","READY","COMPLETED","DECLINED","CANCELLED"];
    const status = statuses[i % statuses.length];
    const ref = `SC-2024-${String(1200+i).padStart(4,"0")}`;
    const booking = await prisma.tailoringBooking.create({ data: {
      reference: ref, customerId: customer.id, tailorId: tailor.id, designId: design?.id,
      description: `Booking for ${design?.title || "Bespoke"} — special instructions: ${i%2===0?"Add hidden pocket and gold embroidery":"Make it slim fit, 3/4 sleeves"}`,
      status, requestedDate: new Date(Date.now() - i*86400000), estimatedCompletion: new Date(Date.now() + 7*86400000),
      agreedPrice: design?.price || 35000, currency: "NGN", paymentStatus: i%3===0? "PAID":"PENDING",
      measurementSnapshot: { chest: 42, waist: 36, shoulder: 18, sleeve: 24, unit: "in", notes: "Demo measurements" }
    } });
    await prisma.bookingStatusHistory.create({ data: { bookingId: booking.id, fromStatus: null, toStatus: status, changedBy: tailor.userId, message: `Booking ${status.toLowerCase()}` } });
    if (status==="IN_PRODUCTION") await prisma.bookingNote.create({ data: { bookingId: booking.id, authorId: tailor.userId, isInternal: false, message: "Fabric received, cutting in progress. Update in 2 days." } });
  }

  // Fabric orders (35)
  for (let i = 0; i < 35; i++) {
    const customer = i===0 ? demoCustomer : customers[i % customers.length];
    const seller = sellers[i % sellers.length];
    const product = await prisma.fabricProduct.findFirst({ where: { sellerId: seller.id } });
    if (!product) continue;
    const qty = 4 + (i%3);
    const statuses: any[] = ["PENDING","CONFIRMED","PREPARING","READY_FOR_DISPATCH","IN_TRANSIT","DELIVERED","CANCELLED"];
    const status = statuses[i % statuses.length];
    const ref = `FO-2024-${String(80+i).padStart(4,"0")}`;
    const subtotal = product.price * qty;
    const deliveryFee = 2500;
    const order = await prisma.fabricOrder.create({ data: {
      reference: ref, customerId: customer.id, sellerId: seller.id, status, subtotal, deliveryFee, total: subtotal+deliveryFee, currency: "NGN", paymentStatus: i%4===0? "PAID":"PENDING",
      deliveryType: i%3===0? "TO_TAILOR":"TO_CUSTOMER", deliveryAddress: { street: "12 Allen Avenue", city: "Lagos", state: "Lagos" }, tailorDestinationId: i%3===0? tailors[0].id: null
    } });
    await prisma.fabricOrderItem.create({ data: { orderId: order.id, productId: product.id, productName: product.name, unit: product.unit, priceSnapshot: product.price, quantity: qty, lineTotal: subtotal } });
    await prisma.delivery.create({ data: { fabricOrderId: order.id, type: i%3===0? "TO_TAILOR":"TO_CUSTOMER", address: { street: "12 Allen Avenue", city: "Lagos" }, status, trackingCode: `TRK${1000+i}` } });
    await prisma.payment.create({ data: { reference: `PAY-${ref}`, fabricOrderId: order.id, amount: subtotal+deliveryFee, currency: "NGN", provider: "paystack", status: i%4===0? "PAID":"PENDING" } });
  }

  // Reviews (30)
  for (let i = 0; i < 30; i++) {
    const author = customers[i % customers.length];
    const tailor = tailors[i % tailors.length];
    await prisma.review.create({ data: { authorId: author.id, tailorId: tailor.id, rating: 4 + (i%2), comment: ["Excellent finishing!","Delivered on time, great quality","Love the attention to detail","Will order again"][i%4], isPublished: true } });
  }

  // Notifications
  await prisma.notification.createMany({ data: [
    { userId: demoCustomer.id, title: "Booking accepted", message: "Ade Bespoke accepted your Agbada booking. Est. completion: 26 Oct.", type: "booking", link: "/dashboard/customer/bookings" },
    { userId: tailors[0].userId, title: "New booking request", message: "Chidi ordered Heritage Agbada — review measurements", type: "booking", link: "/dashboard/tailor/bookings" },
    { userId: sellers[0].userId, title: "New fabric order", message: "Order FO-2024-089: 4m Ankara Gold Burst to Ade Bespoke", type: "order", link: "/dashboard/seller/orders" },
  ] });

  await prisma.auditLog.createMany({ data: [
    { userId: admin.id, action: "APPROVE_TAILOR", entity: "tailorProfile", entityId: tailors[0].id, metadata: { approver: admin.email } },
    { userId: admin.id, action: "REVIEW_PRODUCT", entity: "fabricProduct", entityId: "prod-1", metadata: { result: "approved" } },
  ]});

  console.log("✅ Seed complete: 1 admin, 8 tailors, 6 sellers, 20+ customers, 60 designs, 50 fabrics, 40 bookings, 35 orders, 30 reviews");
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());

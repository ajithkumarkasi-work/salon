import { PrismaClient, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding GlowBook database...');

  if (await prisma.salon.count()) {
    console.log('Demo data already exists; skipping seed.');
    return;
  }

  // ─── Salon Categories ───────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.salonCategory.upsert({
      where: { slug: 'hair-salon' },
      update: {},
      create: { name: 'Hair Salon', slug: 'hair-salon', icon: '✂️' },
    }),
    prisma.salonCategory.upsert({
      where: { slug: 'spa' },
      update: {},
      create: { name: 'Spa', slug: 'spa', icon: '🧖' },
    }),
    prisma.salonCategory.upsert({
      where: { slug: 'nail-salon' },
      update: {},
      create: { name: 'Nail Salon', slug: 'nail-salon', icon: '💅' },
    }),
    prisma.salonCategory.upsert({
      where: { slug: 'beauty-salon' },
      update: {},
      create: { name: 'Beauty Salon', slug: 'beauty-salon', icon: '💄' },
    }),
    prisma.salonCategory.upsert({
      where: { slug: 'wellness-center' },
      update: {},
      create: { name: 'Wellness Center', slug: 'wellness-center', icon: '🌿' },
    }),
  ]);

  // ─── Demo Users ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('GlowBook2024', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@glowbook.demo' },
    update: {},
    create: {
      email: 'admin@glowbook.demo',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@glowbook.demo' },
    update: {},
    create: {
      email: 'owner@glowbook.demo',
      passwordHash,
      firstName: 'Meera',
      lastName: 'Krishnan',
      phone: '+919876543210',
      role: 'SALON_OWNER',
      emailVerified: true,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@glowbook.demo' },
    update: {},
    create: {
      email: 'customer@glowbook.demo',
      passwordHash,
      firstName: 'Ajith',
      lastName: 'Kumar',
      phone: '+919988776655',
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer2@glowbook.demo' },
    update: {},
    create: {
      email: 'customer2@glowbook.demo',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Customer',
      phone: '+919900112233',
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });

  const staffDemoUser = await prisma.user.upsert({
    where: { email: 'staff@glowbook.demo' },
    update: {},
    create: {
      email: 'staff@glowbook.demo',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+919123456789',
      role: 'STAFF',
      emailVerified: true,
    },
  });

  // ─── Additional Customers ────────────────────────────────────────────────────
  const customerNames = [
    ['Ananya', 'Menon'], ['Riya', 'Patel'], ['Sneha', 'Iyer'], ['Divya', 'Nair'],
    ['Pooja', 'Gupta'], ['Lakshmi', 'Rao'], ['Kavya', 'Reddy'], ['Sruthi', 'Varma'],
    ['Nisha', 'Pillai'], ['Aishwarya', 'Bose'],
  ];

  const customers: User[] = [];
  for (const [firstName, lastName] of customerNames) {
    customers.push(
      await prisma.user.upsert({
        where: { email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@glowbook.demo` },
        update: {
          firstName,
          lastName,
          role: 'CUSTOMER',
          emailVerified: true,
          isActive: true,
        },
        create: {
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@glowbook.demo`,
          passwordHash,
          firstName,
          lastName,
          role: 'CUSTOMER',
          emailVerified: true,
        },
      }),
    );
  }

  // ─── Salons ─────────────────────────────────────────────────────────────────
  const salonData = [
    {
      name: 'Glow & Grace Salon',
      slug: 'glow-grace-salon',
      description: 'A premium hair and beauty salon in the heart of the city. We specialize in modern cuts, coloring, and luxury treatments using top-quality products.',
      phone: '+914422334455',
      email: 'hello@glowgrace.in',
      address: '12, Park Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600001',
      latitude: 13.0827,
      longitude: 80.2707,
      coverImageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',
      logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200',
      isVerified: true,
      rating: 4.7,
      reviewCount: 128,
      priceRange: 3,
      categoryId: categories[0].id,
    },
    {
      name: 'Serenity Spa & Wellness',
      slug: 'serenity-spa-wellness',
      description: 'Escape the everyday at Serenity. Our expert therapists offer deep tissue massages, aromatherapy, and holistic skin care rituals.',
      phone: '+914433221100',
      email: 'info@serenityspa.in',
      address: '8, Banjara Hills Road',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500034',
      latitude: 17.4126,
      longitude: 78.4071,
      coverImageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1200',
      logoUrl: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=200',
      isVerified: true,
      rating: 4.9,
      reviewCount: 215,
      priceRange: 4,
      categoryId: categories[1].id,
    },
    {
      name: 'Luxe Nail Studio',
      slug: 'luxe-nail-studio',
      description: 'Expert nail technicians offering gel, acrylic, nail art, and manicure services in a relaxing studio environment.',
      phone: '+918011223344',
      email: 'book@luxenail.in',
      address: '45, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      zipCode: '560001',
      latitude: 12.9716,
      longitude: 77.5946,
      coverImageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200',
      logoUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200',
      isVerified: true,
      rating: 4.6,
      reviewCount: 89,
      priceRange: 2,
      categoryId: categories[2].id,
    },
    {
      name: 'The Beauty Bar',
      slug: 'the-beauty-bar',
      description: 'Mumbai\'s favorite beauty destination for makeup, skin care, eyebrows, and threading services.',
      phone: '+912211223344',
      email: 'appointments@thebeautybar.in',
      address: '22, Linking Road, Bandra',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400050',
      latitude: 19.0596,
      longitude: 72.8295,
      coverImageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200',
      logoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200',
      isVerified: true,
      rating: 4.5,
      reviewCount: 167,
      priceRange: 3,
      categoryId: categories[3].id,
    },
    {
      name: 'Zen Wellness Center',
      slug: 'zen-wellness-center',
      description: 'A holistic wellness destination offering yoga, meditation, and Ayurvedic treatments for mind, body and soul.',
      phone: '+919911223344',
      email: 'namaste@zenwellness.in',
      address: '7, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110001',
      latitude: 28.6139,
      longitude: 77.2090,
      coverImageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200',
      logoUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200',
      isVerified: true,
      rating: 4.8,
      reviewCount: 93,
      priceRange: 3,
      categoryId: categories[4].id,
    },
  ];

  const salons = await Promise.all(
    salonData.map((data) =>
      prisma.salon.create({ data: { ...data, ownerId: ownerUser.id } })
    )
  );

  // ─── Working Hours ────────────────────────────────────────────────────────────
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  for (const salon of salons) {
    await prisma.workingHour.createMany({
      data: days.map((day) => ({
        salonId: salon.id,
        dayOfWeek: day as any,
        openTime: '09:00',
        closeTime: day === 'SUNDAY' ? '17:00' : '20:00',
        isClosed: false,
      })),
      skipDuplicates: true,
    });
  }

  // ─── Service Categories ──────────────────────────────────────────────────────
  const hairCat = await prisma.serviceCategory.create({
    data: { salonId: salons[0].id, name: 'Hair', slug: 'hair', icon: '✂️' },
  });
  const skinCat = await prisma.serviceCategory.create({
    data: { salonId: salons[0].id, name: 'Skin', slug: 'skin', icon: '✨' },
  });

  // ─── Services ───────────────────────────────────────────────────────────────
  const serviceData = [
    // Glow & Grace
    { salonId: salons[0].id, categoryId: hairCat.id, name: 'Haircut & Styling', description: 'Expert cut and blow-dry tailored to your face shape.', price: 600, duration: 45, bufferTime: 10, imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600' },
    { salonId: salons[0].id, categoryId: hairCat.id, name: 'Hair Color', description: 'Full hair color with premium Schwarzkopf products.', price: 2500, duration: 120, bufferTime: 15, imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600' },
    { salonId: salons[0].id, categoryId: hairCat.id, name: 'Keratin Treatment', description: 'Frizz-free, silky smooth hair for 3 months.', price: 4500, duration: 180, bufferTime: 30, imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600' },
    { salonId: salons[0].id, categoryId: skinCat.id, name: 'Classic Facial', description: 'Deep cleansing facial with extractions and moisturizing mask.', price: 1200, duration: 60, bufferTime: 10, imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600' },
    { salonId: salons[0].id, categoryId: hairCat.id, name: 'Bridal Hair', description: 'Full bridal hair styling with trial session included.', price: 8000, duration: 180, bufferTime: 30, imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600' },

    // Serenity Spa
    { salonId: salons[1].id, name: 'Swedish Massage', description: 'Relaxing full-body Swedish massage using aromatic oils.', price: 2000, duration: 60, bufferTime: 15, imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600' },
    { salonId: salons[1].id, name: 'Deep Tissue Massage', description: 'Targeted deep tissue work to release chronic muscle tension.', price: 2800, duration: 90, bufferTime: 15, imageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600' },
    { salonId: salons[1].id, name: 'Aromatherapy', description: 'Holistic aromatherapy session with essential oils.', price: 1800, duration: 60, bufferTime: 10, imageUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600' },
    { salonId: salons[1].id, name: 'Hot Stone Therapy', description: 'Warm basalt stones melt away tension and improve circulation.', price: 3200, duration: 90, bufferTime: 20, imageUrl: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=600' },

    // Luxe Nail
    { salonId: salons[2].id, name: 'Classic Manicure', description: 'Nail shaping, cuticle care, and polish application.', price: 400, duration: 30, bufferTime: 5, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600' },
    { salonId: salons[2].id, name: 'Gel Manicure', description: 'Long-lasting gel polish that stays chip-free for 2+ weeks.', price: 800, duration: 45, bufferTime: 10, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600' },
    { salonId: salons[2].id, name: 'Acrylic Extensions', description: 'Full set of acrylic nail extensions with custom shaping.', price: 1500, duration: 90, bufferTime: 15, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600' },
    { salonId: salons[2].id, name: 'Nail Art', description: 'Custom nail art designs — from minimalist to elaborate.', price: 600, duration: 60, bufferTime: 10, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600' },
  ];

  const services = await prisma.service.createMany({
    data: serviceData.map((s, i) => ({ ...s, displayOrder: i })),
  });

  const createdServices = await prisma.service.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  // ─── Staff Members ────────────────────────────────────────────────────────────
  const staffNames = [
    { firstName: 'Priya', lastName: 'Sharma', role: 'Senior Stylist', bio: '8 years of experience in hair styling and coloring.', salonIdx: 0 },
    { firstName: 'Anu', lastName: 'Krishnamurthy', role: 'Color Specialist', bio: 'Certified Schwarzkopf color technician with a passion for transformations.', salonIdx: 0 },
    { firstName: 'Sarah', lastName: 'Thomas', role: 'Skin Care Specialist', bio: 'Licensed esthetician specializing in anti-aging and brightening treatments.', salonIdx: 0 },
    { firstName: 'Divya', lastName: 'Menon', role: 'Hair Artist', bio: 'Specializes in bridal hair and creative styling.', salonIdx: 0 },
    { firstName: 'Rekha', lastName: 'Nair', role: 'Wellness Therapist', bio: 'Certified in Swedish, deep tissue, and aromatherapy techniques.', salonIdx: 1 },
    { firstName: 'Sunita', lastName: 'Pillai', role: 'Spa Therapist', bio: '10 years of experience in luxury spa treatments.', salonIdx: 1 },
    { firstName: 'Meena', lastName: 'Iyer', role: 'Massage Specialist', bio: 'Expert in hot stone therapy and deep tissue massage.', salonIdx: 1 },
    { firstName: 'Lavanya', lastName: 'Reddy', role: 'Nail Artist', bio: 'Instagram-worthy nail art specialist with 5 years of experience.', salonIdx: 2 },
    { firstName: 'Tara', lastName: 'Singh', role: 'Nail Technician', bio: 'Certified nail tech specializing in gel and acrylics.', salonIdx: 2 },
  ];

  for (let i = 0; i < staffNames.length; i++) {
    const s = staffNames[i];
    const isDemo = i === 0; // First staff member is the demo staff

    const user = isDemo
      ? staffDemoUser
      : await prisma.user.create({
          data: {
            email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@glowbook.demo`,
            passwordHash,
            firstName: s.firstName,
            lastName: s.lastName,
            role: 'STAFF',
            emailVerified: true,
          },
        });

    const salon = salons[s.salonIdx];
    const salonServices = createdServices.filter((srv) => srv.salonId === salon.id);

    await prisma.staff.create({
      data: {
        userId: user.id,
        salonId: salon.id,
        bio: s.bio,
        role: s.role,
        rating: 4.5 + Math.random() * 0.5,
        services: {
          create: salonServices.map((srv) => ({ serviceId: srv.id })),
        },
      },
    });
  }

  const staffMembers = await prisma.staff.findMany({
    include: { user: true, services: true },
  });

  // ─── Staff Working Hours ──────────────────────────────────────────────────────
  for (const staff of staffMembers) {
    await prisma.workingHour.createMany({
      data: days.slice(0, 6).map((day) => ({
        staffId: staff.id,
        dayOfWeek: day as any,
        openTime: '09:00',
        closeTime: '18:00',
        isClosed: false,
      })),
      skipDuplicates: true,
    });
  }

  // ─── Appointments ─────────────────────────────────────────────────────────────
  const allCustomers = [customerUser, ...customers];
  const now = new Date();
  const shouldCreateAppointments = (await prisma.appointment.count()) === 0;

  let appointmentCount = 0;
  for (let dayOffset = -60; shouldCreateAppointments && dayOffset <= 30; dayOffset++) {
    if (appointmentCount >= 500) break;

    const appointmentDate = new Date(now);
    appointmentDate.setDate(now.getDate() + dayOffset);
    const dateStr = appointmentDate.toISOString().split('T')[0];

    // Skip some days randomly
    if (Math.random() < 0.2) continue;

    const dailyCount = Math.floor(Math.random() * 8) + 2;

    for (let i = 0; i < dailyCount && appointmentCount < 500; i++) {
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const salon = salons[Math.floor(Math.random() * salons.length)];
      const salonServices = createdServices.filter((s) => s.salonId === salon.id);
      if (salonServices.length === 0) continue;

      const service = salonServices[Math.floor(Math.random() * salonServices.length)];
      const salonStaff = staffMembers.filter((st) => st.salonId === salon.id);
      if (salonStaff.length === 0) continue;

      const staff = salonStaff[Math.floor(Math.random() * salonStaff.length)];
      const hour = 9 + Math.floor(Math.random() * 9);
      const minute = Math.random() < 0.5 ? 0 : 30;

      const startTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);

      const isPast = startTime < now;
      const status = isPast
        ? Math.random() < 0.85
          ? 'COMPLETED'
          : Math.random() < 0.5
          ? 'CANCELLED'
          : 'NO_SHOW'
        : Math.random() < 0.7
        ? 'CONFIRMED'
        : 'PENDING';

      const price = Number(service.price);
      const discount = Math.random() < 0.1 ? price * 0.1 : 0;
      const tax = (price - discount) * 0.18;
      const total = price - discount + tax;

      try {
        const appointment = await prisma.appointment.create({
          data: {
            salonId: salon.id,
            customerId: customer.id,
            staffId: staff.id,
            serviceId: service.id,
            status,
            startTime,
            endTime,
            price,
            discount,
            tax,
            total,
            qrCode: `QR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        });

        if (status === 'COMPLETED') {
          await prisma.payment.create({
            data: {
              appointmentId: appointment.id,
              customerId: customer.id,
              amount: total,
              currency: 'INR',
              status: 'SUCCEEDED',
              provider: 'stripe',
              providerPaymentId: `pi_demo_${appointment.id.slice(0, 8)}`,
            },
          });

          // Create review for ~60% of completed appointments
          if (Math.random() < 0.6) {
            const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars mostly
            await prisma.review.create({
              data: {
                appointmentId: appointment.id,
                salonId: salon.id,
                staffId: staff.id,
                customerId: customer.id,
                rating,
                comment: getReviewComment(rating),
              },
            });
          }
        }

        appointmentCount++;
      } catch {
        // Skip conflicts
      }
    }
  }

  // ─── Coupons ─────────────────────────────────────────────────────────────────
  await prisma.coupon.createMany({
    data: [
      {
        salonId: salons[0].id,
        code: 'WELCOME20',
        type: 'PERCENTAGE',
        value: 20,
        minAmount: 500,
        maxDiscount: 500,
        newCustomersOnly: true,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        isActive: true,
      },
      {
        salonId: salons[0].id,
        code: 'GLOW200',
        type: 'FIXED',
        value: 200,
        minAmount: 1000,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        isActive: true,
      },
      {
        salonId: salons[1].id,
        code: 'SPA15',
        type: 'PERCENTAGE',
        value: 15,
        minAmount: 1500,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  // Update salon ratings from seeded reviews
  for (const salon of salons) {
    const stats = await prisma.review.aggregate({
      where: { salonId: salon.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    if (stats._avg.rating) {
      await prisma.salon.update({
        where: { id: salon.id },
        data: { rating: stats._avg.rating, reviewCount: stats._count.rating },
      });
    }
  }

  console.log(`✅ Seeded successfully:`);
  console.log(`   - ${salons.length} salons`);
  console.log(`   - ${staffMembers.length} staff members`);
  console.log(`   - ${createdServices.length} services`);
  console.log(`   - ${allCustomers.length} customers`);
  console.log(`   - ${appointmentCount} appointments`);
  console.log('');
  console.log('🔑 Demo accounts:');
  console.log('   customer@glowbook.demo  / GlowBook2024');
  console.log('   owner@glowbook.demo     / GlowBook2024');
  console.log('   staff@glowbook.demo     / GlowBook2024');
  console.log('   admin@glowbook.demo     / GlowBook2024');
}

function getReviewComment(rating: number): string {
  const fiveStar = [
    'Absolutely loved my experience here. Priya is incredibly talented!',
    'Best salon in the city. Will definitely be back!',
    'The staff was so professional and the results were stunning.',
    'Amazing service from start to finish. My hair has never looked better.',
    'Five stars all the way. Booked my next appointment before I left.',
  ];
  const fourStar = [
    'Great service overall. The staff is very skilled.',
    'Really happy with the results. Minor wait time but worth it.',
    'Good experience. Will recommend to friends.',
    'Professional staff and clean environment. Happy with the outcome.',
  ];

  const pool = rating >= 5 ? fiveStar : fourStar;
  return pool[Math.floor(Math.random() * pool.length)];
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

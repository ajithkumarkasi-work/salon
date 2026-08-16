import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const STAFF_EMAIL = 'staff@glowbook.demo';
const OWNER_EMAIL = 'owner@glowbook.demo';
const CUSTOMER_FIXTURES = [
	{ email: 'customer@glowbook.demo', firstName: 'Ajith', lastName: 'Kumar' },
	{ email: 'customer2@glowbook.demo', firstName: 'Demo', lastName: 'Customer' },
	{ email: 'customer3@glowbook.demo', firstName: 'Riya', lastName: 'Patel' },
];

const CONFIRMED_APPOINTMENT_COUNT = 10;

async function main() {
	console.log('Seeding dummy staff appointments + reviews...');

	const passwordHash = await bcrypt.hash('GlowBook2024', 12);

	const owner = await prisma.user.upsert({
		where: { email: OWNER_EMAIL },
		update: {
			firstName: 'Meera',
			lastName: 'Krishnan',
			role: 'SALON_OWNER',
			emailVerified: true,
			isActive: true,
		},
		create: {
			email: OWNER_EMAIL,
			passwordHash,
			firstName: 'Meera',
			lastName: 'Krishnan',
			role: 'SALON_OWNER',
			emailVerified: true,
			isActive: true,
		},
	});

	const customers = await Promise.all(
		CUSTOMER_FIXTURES.map((item) =>
			prisma.user.upsert({
				where: { email: item.email },
				update: {
					firstName: item.firstName,
					lastName: item.lastName,
					role: 'CUSTOMER',
					emailVerified: true,
					isActive: true,
				},
				create: {
					email: item.email,
					passwordHash,
					firstName: item.firstName,
					lastName: item.lastName,
					role: 'CUSTOMER',
					emailVerified: true,
					isActive: true,
				},
			}),
		),
	);

	const staffUser = await prisma.user.upsert({
		where: { email: STAFF_EMAIL },
		update: {
			firstName: 'Priya',
			lastName: 'Sharma',
			role: 'STAFF',
			emailVerified: true,
			isActive: true,
		},
		create: {
			email: STAFF_EMAIL,
			passwordHash,
			firstName: 'Priya',
			lastName: 'Sharma',
			role: 'STAFF',
			emailVerified: true,
			isActive: true,
		},
	});

	const category = await prisma.salonCategory.upsert({
		where: { slug: 'hair-salon' },
		update: {},
		create: {
			name: 'Hair Salon',
			slug: 'hair-salon',
			icon: '✂️',
		},
	});

	const salon = await prisma.salon.upsert({
		where: { slug: 'glow-grace-salon' },
		update: {
			ownerId: owner.id,
			categoryId: category.id,
			isActive: true,
		},
		create: {
			name: 'Glow & Grace Salon',
			slug: 'glow-grace-salon',
			description: 'Salon for demo data',
			phone: '+914422334455',
			email: 'hello@glowgrace.in',
			address: '12, Park Street',
			city: 'Chennai',
			state: 'Tamil Nadu',
			zipCode: '600001',
			ownerId: owner.id,
			categoryId: category.id,
			isActive: true,
			isVerified: true,
			rating: 4.7,
			reviewCount: 1,
			priceRange: 3,
		},
	});

	const service = await prisma.service.upsert({
		where: {
			id: 'staff-dummy-service-id',
		},
		update: {
			salonId: salon.id,
			name: 'Haircut & Styling',
			description: 'Custom haircut with blow dry finish.',
			price: 800,
			duration: 45,
			isActive: true,
			displayOrder: 0,
		},
		create: {
			id: 'staff-dummy-service-id',
			salonId: salon.id,
			name: 'Haircut & Styling',
			description: 'Custom haircut with blow dry finish.',
			price: 800,
			duration: 45,
			bufferTime: 10,
			isActive: true,
			displayOrder: 0,
		},
	});

	const staff = await prisma.staff.upsert({
		where: { userId: staffUser.id },
		update: {
			salonId: salon.id,
			role: 'Senior Stylist',
			bio: 'Specializes in cuts and styling consultations.',
			isActive: true,
			services: {
				deleteMany: {},
				create: [{ serviceId: service.id }],
			},
		},
		create: {
			userId: staffUser.id,
			salonId: salon.id,
			role: 'Senior Stylist',
			bio: 'Specializes in cuts and styling consultations.',
			isActive: true,
			rating: 4.8,
			reviewCount: 1,
			services: {
				create: [{ serviceId: service.id }],
			},
		},
	});

	const existingAppointments = await prisma.appointment.findMany({
		where: { staffId: staff.id },
		select: { id: true },
	});
	const existingAppointmentIds = existingAppointments.map((item) => item.id);

	if (existingAppointmentIds.length > 0) {
		const existingPayments = await prisma.payment.findMany({
			where: { appointmentId: { in: existingAppointmentIds } },
			select: { id: true },
		});
		const existingPaymentIds = existingPayments.map((item) => item.id);

		if (existingPaymentIds.length > 0) {
			await prisma.refund.deleteMany({ where: { paymentId: { in: existingPaymentIds } } });
		}

		await prisma.review.deleteMany({ where: { appointmentId: { in: existingAppointmentIds } } });
		await prisma.payment.deleteMany({ where: { appointmentId: { in: existingAppointmentIds } } });
		await prisma.appointment.deleteMany({ where: { id: { in: existingAppointmentIds } } });
	}

	for (let i = 0; i < CONFIRMED_APPOINTMENT_COUNT; i++) {
		const customer = customers[i % customers.length];
		const startTime = new Date();
		startTime.setDate(startTime.getDate() + Math.floor(i / 2) + 1);
		startTime.setHours(10 + (i % 6), 0, 0, 0);
		const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);

		await prisma.appointment.create({
			data: {
				salonId: salon.id,
				customerId: customer.id,
				staffId: staff.id,
				serviceId: service.id,
				status: 'CONFIRMED',
				startTime,
				endTime,
				price: 800,
				discount: 0,
				tax: 144,
				total: 944,
				notes: 'Seeded confirmed appointment for staff demo account',
				qrCode: `STAFF_DEMO_CONFIRMED_${String(i + 1).padStart(3, '0')}`,
			},
		});
	}

	await prisma.staff.update({
		where: { id: staff.id },
		data: {
			rating: 0,
			reviewCount: 0,
		},
	});

	console.log(`Done: Reset staff@glowbook.demo appointments and added ${CONFIRMED_APPOINTMENT_COUNT} CONFIRMED appointments.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

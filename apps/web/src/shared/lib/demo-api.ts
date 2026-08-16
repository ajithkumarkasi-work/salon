import type { AxiosRequestConfig, AxiosResponse } from 'axios';

type AnyRecord = Record<string, any>;
type DemoService = {
  id: string;
  salonId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  bufferTime: number;
  imageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  category: { id: string; name: string } | null;
};

const nowIso = new Date().toISOString();

const baseDemoUser = {
  avatarUrl: null,
  isActive: true,
  emailVerified: true,
  createdAt: nowIso,
  updatedAt: nowIso,
};

function getDemoUserByEmail(email: string) {
  if (email === 'admin@glowbook.demo') {
    return {
      ...baseDemoUser,
      id: 'user_admin_1',
      email,
      firstName: 'Platform',
      lastName: 'Admin',
      phone: null,
      role: 'ADMIN',
    };
  }

  if (email === 'owner@glowbook.demo') {
    return {
      ...baseDemoUser,
      id: 'user_owner_1',
      email,
      firstName: 'Meera',
      lastName: 'Krishnan',
      phone: '+919876543210',
      role: 'SALON_OWNER',
    };
  }

  if (email === 'staff@glowbook.demo') {
    return {
      ...baseDemoUser,
      id: 'user_staff_1',
      email,
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+919123456789',
      role: 'STAFF',
    };
  }

  if (email === 'customer2@glowbook.demo') {
    return {
      ...baseDemoUser,
      id: 'user_customer_2',
      email,
      firstName: 'Demo',
      lastName: 'Customer',
      phone: '+919900112233',
      role: 'CUSTOMER',
    };
  }

  return {
    ...baseDemoUser,
    id: 'user_customer_1',
    email,
    firstName: 'Ajith',
    lastName: 'Kumar',
    phone: '+919988776655',
    role: 'CUSTOMER',
  };
}

const ownerUser = {
  id: 'user_owner_1',
  firstName: 'Meera',
  lastName: 'Krishnan',
  avatarUrl: null,
};

const salons = [
  {
    id: 'salon_1',
    name: 'Glow and Grace Salon',
    slug: 'glow-grace-salon',
    city: 'Chennai',
    rating: 4.7,
    createdAt: nowIso,
  },
];

const services: DemoService[] = [
  {
    id: 'service_1',
    salonId: 'salon_1',
    name: 'Haircut and Styling',
    description: 'Precision haircut and blow dry',
    price: 1200,
    duration: 60,
    bufferTime: 10,
    imageUrl: null,
    isActive: true,
    displayOrder: 1,
    category: { id: 'cat_1', name: 'Hair' },
  },
  {
    id: 'service_2',
    salonId: 'salon_1',
    name: 'Bridal Makeup',
    description: 'HD bridal look with premium products',
    price: 8500,
    duration: 180,
    bufferTime: 15,
    imageUrl: null,
    isActive: true,
    displayOrder: 2,
    category: { id: 'cat_2', name: 'Makeup' },
  },
  {
    id: 'service_3',
    salonId: 'salon_1',
    name: 'Deep Tissue Massage',
    description: 'Relaxing full body massage',
    price: 2500,
    duration: 90,
    bufferTime: 10,
    imageUrl: null,
    isActive: true,
    displayOrder: 3,
    category: { id: 'cat_3', name: 'Spa' },
  },
];

const staff = [
  {
    id: 'staff_1',
    salonId: 'salon_1',
    role: 'Senior Stylist',
    bio: 'Color specialist with 8+ years experience.',
    rating: 4.8,
    user: ownerUser,
    services: [services[0], services[1]],
  },
  {
    id: 'staff_2',
    salonId: 'salon_1',
    role: 'Therapist',
    bio: 'Certified wellness therapist.',
    rating: 4.6,
    user: {
      id: 'user_staff_2',
      firstName: 'Nisha',
      lastName: 'Verma',
      avatarUrl: null,
    },
    services: [services[2]],
  },
];

function makeAppt(id: string, dayOffset: number, hour: number, status: string, serviceIdx: number, staffIdx: number, customer: AnyRecord) {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, 0, 0, 0);
  const service = services[serviceIdx];
  const end = new Date(start.getTime() + service.duration * 60000);
  return {
    id,
    salonId: 'salon_1',
    customerId: customer.id,
    staffId: staff[staffIdx].id,
    serviceId: service.id,
    status,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    total: service.price,
    notes: null,
    customer,
    staff: staff[staffIdx],
    service,
  };
}

const customers = [
  { id: 'cust_1', firstName: 'Ananya', lastName: 'Menon', email: 'ananya@example.com', phone: '+919900000001' },
  { id: 'cust_2', firstName: 'Riya', lastName: 'Patel', email: 'riya@example.com', phone: '+919900000002' },
  { id: 'cust_3', firstName: 'Sneha', lastName: 'Iyer', email: 'sneha@example.com', phone: '+919900000003' },
  { id: 'cust_4', firstName: 'Divya', lastName: 'Nair', email: 'divya@example.com', phone: '+919900000004' },
];

let appointments = [
  makeAppt('appt_1', 0, 10, 'CONFIRMED', 0, 0, customers[0]),
  makeAppt('appt_2', 0, 12, 'ARRIVED', 1, 0, customers[1]),
  makeAppt('appt_3', 0, 15, 'PENDING', 2, 1, customers[2]),
  makeAppt('appt_4', -1, 11, 'COMPLETED', 0, 0, customers[3]),
  makeAppt('appt_5', -2, 14, 'COMPLETED', 2, 1, customers[0]),
  makeAppt('appt_6', 2, 16, 'CONFIRMED', 1, 0, customers[2]),
];

let coupons = [
  {
    id: 'coupon_1',
    salonId: 'salon_1',
    code: 'WELCOME20',
    type: 'PERCENTAGE',
    value: 20,
    minAmount: 500,
    maxDiscount: 500,
    usageCount: 18,
    usageLimit: 100,
    newCustomersOnly: true,
    validFrom: nowIso,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: 'coupon_2',
    salonId: 'salon_1',
    code: 'SPA300',
    type: 'FIXED',
    value: 300,
    minAmount: 1500,
    maxDiscount: null,
    usageCount: 7,
    usageLimit: 50,
    newCustomersOnly: false,
    validFrom: nowIso,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
];

const reviews = [
  {
    id: 'rev_1',
    rating: 5,
    comment: 'Excellent service and very professional staff.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    customer: customers[0],
    staff: staff[0],
  },
  {
    id: 'rev_2',
    rating: 4,
    comment: 'Great experience. Will visit again.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    customer: customers[1],
    staff: staff[1],
  },
];

function buildResponse(config: AxiosRequestConfig, data: any, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers: {},
    config: config as any,
  };
}

function parseUrl(url: string) {
  const parsed = new URL(url, 'http://demo.local');
  return {
    path: parsed.pathname,
    query: parsed.searchParams,
  };
}

function getRangeDays(startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  return { start, end, days };
}

function getSummary() {
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const totalRevenue = completed.reduce((sum, a) => sum + Number(a.total), 0);
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
  return {
    totalRevenue,
    totalBookings: appointments.length,
    completedBookings: completed.length,
    cancelledBookings: cancelled,
    newCustomers: 9,
    averageBookingValue: completed.length ? totalRevenue / completed.length : 0,
    cancellationRate: appointments.length ? (cancelled / appointments.length) * 100 : 0,
    averageRating: 4.7,
  };
}

function getRevenueSeries(startDate?: string, endDate?: string, groupBy?: string) {
  const { start, days } = getRangeDays(startDate, endDate);
  const points = Math.min(days, groupBy === 'week' ? 13 : 30);
  return Array.from({ length: points }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    return {
      date: d.toISOString(),
      revenue: 8000 + ((i * 1370) % 9000),
      bookings: 4 + (i % 7),
    };
  });
}

function getPopularServices() {
  return [
    { serviceId: services[0].id, serviceName: services[0].name, bookings: 42, revenue: 50400 },
    { serviceId: services[2].id, serviceName: services[2].name, bookings: 27, revenue: 67500 },
    { serviceId: services[1].id, serviceName: services[1].name, bookings: 18, revenue: 153000 },
  ];
}

function getStaffPerformance() {
  return [
    { staffId: staff[0].id, staffName: `${staff[0].user.firstName} ${staff[0].user.lastName}`, bookings: 33, revenue: 128000, rating: 4.8 },
    { staffId: staff[1].id, staffName: `${staff[1].user.firstName} ${staff[1].user.lastName}`, bookings: 22, revenue: 86000, rating: 4.6 },
  ];
}

function getAppointmentsFromParams(query: URLSearchParams, paramsObj?: AnyRecord) {
  const status = query.get('status') ?? paramsObj?.status;
  const startDate = query.get('startDate') ?? paramsObj?.startDate;
  const endDate = query.get('endDate') ?? paramsObj?.endDate;
  const page = Number(query.get('page') ?? paramsObj?.page ?? 1);
  const limit = Number(query.get('limit') ?? paramsObj?.limit ?? 20);

  let filtered = [...appointments];

  if (status) {
    filtered = filtered.filter((a) => a.status === status);
  }
  if (startDate) {
    const s = new Date(startDate);
    filtered = filtered.filter((a) => new Date(a.startTime) >= s);
  }
  if (endDate) {
    const e = new Date(endDate);
    filtered = filtered.filter((a) => new Date(a.startTime) <= e);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return { data, meta: { total, page, limit, totalPages } };
}

export async function demoApiAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method ?? 'get').toLowerCase();
  const rawUrl = config.url ?? '/';
  const { path, query } = parseUrl(rawUrl);
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data ?? {});

  if (method === 'post' && path === '/auth/login') {
    const email = String(body.email ?? '').toLowerCase();
    const password = String(body.password ?? '');
    if (email.endsWith('@glowbook.demo') && password === 'GlowBook2024') {
      const user = getDemoUserByEmail(email);
      return buildResponse(config, {
        user,
        tokens: { accessToken: 'demo-access-token', refreshToken: 'demo-refresh-token' },
      });
    }
    return buildResponse(config, { message: 'Invalid credentials' }, 401);
  }

  if (method === 'post' && path === '/auth/register') {
    const user = getDemoUserByEmail(String(body.email ?? '').toLowerCase());
    return buildResponse(config, {
      user: {
        ...user,
        id: `user_${Date.now()}`,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
      },
      tokens: { accessToken: 'demo-access-token', refreshToken: 'demo-refresh-token' },
    });
  }

  if (method === 'post' && path === '/auth/refresh') {
    return buildResponse(config, {
      tokens: { accessToken: 'demo-access-token-next', refreshToken: 'demo-refresh-token-next' },
    });
  }

  if (method === 'post' && path === '/auth/logout') {
    return buildResponse(config, { ok: true });
  }

  if (method === 'get' && path === '/salons/mine') {
    return buildResponse(config, salons);
  }

  if (method === 'get' && /^\/salons\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    const salon = salons.find((s) => s.id === id) ?? salons[0];
    return buildResponse(config, {
      ...salon,
      category: { id: 'cat_hair', name: 'Hair Salon' },
      images: [],
      workingHours: [],
      holidays: [],
      staff,
      services,
      coupons,
    });
  }

  if (method === 'get' && /^\/salons\/[^/]+\/staff$/.test(path)) {
    return buildResponse(config, staff);
  }

  if (method === 'get' && /^\/salons\/[^/]+\/services$/.test(path)) {
    return buildResponse(config, services);
  }

  if (method === 'get' && path === '/availability') {
    const params = config.params as AnyRecord;
    const selectedDate = String(params?.date ?? '').slice(0, 10);
    const selectedStaffId = params?.staffId ? String(params.staffId) : undefined;

    const dayAppointments = appointments.filter((a) => {
      const apptDate = a.startTime.slice(0, 10);
      if (apptDate !== selectedDate) return false;
      if (selectedStaffId && a.staffId !== selectedStaffId) return false;
      return a.status !== 'CANCELLED';
    });

    const bookedTimes = new Set(dayAppointments.map((a) => {
      const dt = new Date(a.startTime);
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }));

    const allSlots = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    const slots = allSlots.filter((s) => !bookedTimes.has(s));
    return buildResponse(config, slots);
  }

  if (method === 'post' && /^\/salons\/[^/]+\/services$/.test(path)) {
    const created = {
      id: `service_${Date.now()}`,
      salonId: path.split('/')[2],
      name: body.name,
      description: body.description ?? null,
      price: Number(body.price ?? 0),
      duration: Number(body.duration ?? 30),
      bufferTime: Number(body.bufferTime ?? 0),
      imageUrl: null,
      isActive: true,
      displayOrder: services.length + 1,
      category: null,
    };
    services.push(created);
    return buildResponse(config, created);
  }

  if (method === 'patch' && /^\/services\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    const idx = services.findIndex((s) => s.id === id);
    if (idx >= 0) services[idx] = { ...services[idx], ...body };
    return buildResponse(config, services[idx] ?? { id, ...body });
  }

  if (method === 'delete' && /^\/services\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    const idx = services.findIndex((s) => s.id === id);
    if (idx >= 0) services[idx] = { ...services[idx], isActive: false };
    return buildResponse(config, { ok: true });
  }

  if (method === 'get' && path === '/appointments') {
    return buildResponse(config, getAppointmentsFromParams(query, config.params as AnyRecord));
  }

  if (method === 'get' && /^\/appointments\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return buildResponse(config, { message: 'Not found' }, 404);
    return buildResponse(config, appt);
  }

  if (method === 'get' && path === '/appointments/calendar') {
    const data = getAppointmentsFromParams(query, config.params as AnyRecord).data;
    return buildResponse(config, data);
  }

  if (method === 'patch' && /^\/appointments\/[^/]+\/status$/.test(path)) {
    const id = path.split('/')[2];
    appointments = appointments.map((a) => (a.id === id ? { ...a, status: body.status ?? a.status } : a));
    return buildResponse(config, appointments.find((a) => a.id === id));
  }

  if (method === 'post' && /^\/appointments\/[^/]+\/cancel$/.test(path)) {
    const id = path.split('/')[2];
    appointments = appointments.map((a) => (a.id === id ? { ...a, status: 'CANCELLED', notes: body.reason ?? null } : a));
    return buildResponse(config, appointments.find((a) => a.id === id));
  }

  if (method === 'get' && path === '/analytics/summary') {
    return buildResponse(config, getSummary());
  }

  if (method === 'get' && path === '/analytics/revenue') {
    const p = config.params as AnyRecord;
    return buildResponse(config, getRevenueSeries(p?.startDate, p?.endDate, p?.groupBy));
  }

  if (method === 'get' && path === '/analytics/services') {
    return buildResponse(config, getPopularServices());
  }

  if (method === 'get' && path === '/analytics/staff-performance') {
    return buildResponse(config, getStaffPerformance());
  }

  if (method === 'get' && path === '/payments/history') {
    const data = appointments
      .filter((a) => a.status === 'COMPLETED')
      .map((a, i) => ({
        id: `pay_${i + 1}`,
        amount: a.total,
        refundAmount: 0,
        status: 'SUCCEEDED',
        createdAt: a.startTime,
        providerPaymentId: `pi_demo_${i + 1}`,
        appointment: {
          salon: { name: salons[0].name },
          service: { name: a.service.name },
        },
      }));
    return buildResponse(config, { data, meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 } });
  }

  if (method === 'get' && /^\/salons\/[^/]+\/reviews$/.test(path)) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, reviews.length);
    return buildResponse(config, {
      data: reviews,
      stats: { average: avg, count: reviews.length },
    });
  }

  if (method === 'get' && /^\/coupons\/salon\/[^/]+$/.test(path)) {
    return buildResponse(config, coupons);
  }

  if (method === 'delete' && /^\/coupons\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    coupons = coupons.map((c) => (c.id === id ? { ...c, isActive: false } : c));
    return buildResponse(config, { ok: true });
  }

  return buildResponse(config, { message: `Demo API route not implemented: ${method.toUpperCase()} ${path}` }, 404);
}

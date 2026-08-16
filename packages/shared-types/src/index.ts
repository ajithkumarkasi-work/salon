// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SALON_OWNER = 'SALON_OWNER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_RESCHEDULED = 'BOOKING_RESCHEDULED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  APPOINTMENT_STARTING = 'APPOINTMENT_STARTING',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  NEW_BOOKING = 'NEW_BOOKING',
  CUSTOMER_ARRIVED = 'CUSTOMER_ARRIVED',
  STAFF_SCHEDULE_CHANGED = 'STAFF_SCHEDULE_CHANGED',
}

export enum DayOfWeek {
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

// ─── Base ─────────────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Salon ────────────────────────────────────────────────────────────────────

export interface SalonCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface Salon extends BaseEntity {
  name: string;
  slug: string;
  description: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  priceRange: number; // 1-4 ($, $$, $$$, $$$$)
  ownerId: string;
  categoryId: string;
  category?: SalonCategory;
  images?: SalonImage[];
  workingHours?: WorkingHour[];
}

export interface SalonImage extends BaseEntity {
  salonId: string;
  url: string;
  caption: string | null;
  order: number;
}

export interface WorkingHour extends BaseEntity {
  salonId: string | null;
  staffId: string | null;
  dayOfWeek: DayOfWeek;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  isClosed: boolean;
}

export interface SalonHoliday extends BaseEntity {
  salonId: string;
  date: string; // ISO date
  name: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface Staff extends BaseEntity {
  userId: string;
  salonId: string;
  bio: string | null;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  services?: Service[];
  workingHours?: WorkingHour[];
}

export interface StaffLeave extends BaseEntity {
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  isApproved: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface ServiceCategory extends BaseEntity {
  name: string;
  slug: string;
  icon: string | null;
  salonId: string;
}

export interface Service extends BaseEntity {
  salonId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  duration: number; // minutes
  bufferTime: number; // minutes
  imageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  category?: ServiceCategory;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface TimeSlot {
  time: string; // HH:mm
  staffId: string;
  staffName: string;
  isAvailable: boolean;
}

export interface AvailabilityQuery {
  salonId: string;
  serviceId: string;
  staffId?: string;
  date: string; // YYYY-MM-DD
}

export interface AvailabilityResponse {
  date: string;
  slots: TimeSlot[];
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface Appointment extends BaseEntity {
  salonId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  status: AppointmentStatus;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  price: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  qrCode: string;
  salon?: Pick<Salon, 'id' | 'name' | 'address' | 'phone' | 'coverImageUrl'>;
  customer?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'avatarUrl'>;
  staff?: Pick<Staff, 'id' | 'role' | 'avatarUrl'> & { user: Pick<User, 'firstName' | 'lastName'> };
  service?: Pick<Service, 'id' | 'name' | 'duration' | 'price' | 'imageUrl'>;
  payment?: Payment;
  review?: Review;
  statusHistory?: AppointmentStatusHistory[];
}

export interface AppointmentStatusHistory extends BaseEntity {
  appointmentId: string;
  status: AppointmentStatus;
  changedById: string;
  note: string | null;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment extends BaseEntity {
  appointmentId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  providerClientSecret: string | null;
  refundAmount: number;
  refundReason: string | null;
  refundedAt: string | null;
  metadata: Record<string, unknown> | null;
}

// ─── Coupon ───────────────────────────────────────────────────────────────────

export interface Coupon extends BaseEntity {
  salonId: string;
  code: string;
  type: CouponType;
  value: number;
  minAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  newCustomersOnly: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export interface CouponValidationResponse {
  valid: boolean;
  discount: number;
  message?: string;
  coupon?: Coupon;
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface Review extends BaseEntity {
  appointmentId: string;
  salonId: string;
  staffId: string;
  customerId: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  customer?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  staff?: Pick<Staff, 'id'> & { user: Pick<User, 'firstName' | 'lastName'> };
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  isRead: boolean;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export interface Favorite extends BaseEntity {
  userId: string;
  salonId: string;
  salon?: Salon;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  newCustomers: number;
  repeatCustomers: number;
  averageBookingValue: number;
  cancellationRate: number;
  averageRating: number;
}

export interface PopularService {
  serviceId: string;
  serviceName: string;
  bookings: number;
  revenue: number;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  bookings: number;
  revenue: number;
  rating: number;
}

export interface PeakHour {
  hour: number;
  bookings: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface SocketEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

export type AppointmentSocketEvent = SocketEvent<{
  appointment: Appointment;
  salonId: string;
  customerId: string;
}>;

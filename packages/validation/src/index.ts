import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Salon ────────────────────────────────────────────────────────────────────

export const CreateSalonSchema = z.object({
  name: z.string().min(2, 'Salon name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  email: z.string().email(),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().min(3),
  categoryId: z.string().uuid(),
  priceRange: z.number().int().min(1).max(4),
});

export const UpdateSalonSchema = CreateSalonSchema.partial();

// ─── Service ──────────────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  imageUrl: z
    .string()
    .refine((value) => /^https?:\/\//.test(value) || /^data:image\//.test(value), {
      message: 'Service image must be a valid image URL or uploaded image data',
    })
    .optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive('Price must be positive'),
  duration: z.number().int().min(5, 'Minimum 5 minutes').max(480, 'Maximum 8 hours'),
  bufferTime: z.number().int().min(0).max(60).default(0),
  displayOrder: z.number().int().min(0).default(0),
});

export const UpdateServiceSchema = CreateServiceSchema.partial();

// ─── Staff ────────────────────────────────────────────────────────────────────

export const CreateStaffSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  role: z.string().min(1).max(50).default('Stylist'),
  serviceIds: z.array(z.string().uuid()).min(1, 'Assign at least one service'),
});

export const UpdateStaffSchema = CreateStaffSchema.omit({ password: true }).partial();

// ─── Working Hours ────────────────────────────────────────────────────────────

const TimeString = z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Invalid time format HH:mm');

export const WorkingHourSchema = z.object({
  dayOfWeek: z.enum(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  openTime: TimeString,
  closeTime: TimeString,
  isClosed: z.boolean().default(false),
});

export const WorkingHoursSchema = z.array(WorkingHourSchema);

// ─── Availability ─────────────────────────────────────────────────────────────

export const AvailabilityQuerySchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

// ─── Appointment ──────────────────────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  startTime: z.string().datetime(),
  customerEmail: z.string().email().optional(),
  customerFirstName: z.string().min(1).max(50).optional(),
  customerLastName: z.string().min(1).max(50).optional(),
  customerPhone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
  manualReason: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  couponCode: z.string().optional(),
});

export const RescheduleAppointmentSchema = z.object({
  staffId: z.string().uuid(),
  startTime: z.string().datetime(),
});

export const CancelAppointmentSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW']),
  note: z.string().max(500).optional(),
});

// ─── Review ───────────────────────────────────────────────────────────────────

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// ─── Coupon ───────────────────────────────────────────────────────────────────

export const CreateCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Coupon code must be uppercase alphanumeric'),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minAmount: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  newCustomersOnly: z.boolean().default(false),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

export const UpdateCouponSchema = CreateCouponSchema.partial();

export const ValidateCouponSchema = z.object({
  code: z.string().min(1),
  salonId: z.string().uuid(),
  amount: z.number().positive(),
  serviceId: z.string().uuid().optional(),
});

// ─── Profile ──────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  avatarUrl: z
    .string()
    .refine((value) => /^https?:\/\//.test(value) || /^data:image\//.test(value), {
      message: 'Avatar must be a valid image URL or uploaded image data',
    })
    .optional(),
});

// ─── Payment ──────────────────────────────────────────────────────────────────

export const CreatePaymentSchema = z.object({
  appointmentId: z.string().uuid(),
  currency: z.string().length(3).default('INR'),
});

export const ConfirmPaymentSchema = z.object({
  paymentId: z.string(),
  providerPaymentId: z.string(),
});

export const RefundPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.string().min(1).max(500),
});

// ─── QR Check-in ──────────────────────────────────────────────────────────────

export const QrCheckInSchema = z.object({
  qrCode: z.string().min(1),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type CreateSalonDto = z.infer<typeof CreateSalonSchema>;
export type UpdateSalonDto = z.infer<typeof UpdateSalonSchema>;
export type CreateServiceDto = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceDto = z.infer<typeof UpdateServiceSchema>;
export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>;
export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;
export type RescheduleAppointmentDto = z.infer<typeof RescheduleAppointmentSchema>;
export type CancelAppointmentDto = z.infer<typeof CancelAppointmentSchema>;
export type UpdateAppointmentStatusDto = z.infer<typeof UpdateAppointmentStatusSchema>;
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponDto = z.infer<typeof UpdateCouponSchema>;
export type ValidateCouponDto = z.infer<typeof ValidateCouponSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;
export type AvailabilityQueryDto = z.infer<typeof AvailabilityQuerySchema>;

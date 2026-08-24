// Firestore collection names — keep in sync with apps/api/prisma/schema.prisma models.
export const Collections = {
  users: 'users',
  salons: 'salons',
  salonCategories: 'salonCategories',
  serviceCategories: 'serviceCategories',
  services: 'services',
  staff: 'staff',
  staffLeaves: 'staffLeaves',
  appointmentStatusHistory: 'appointmentStatusHistory',
  workingHours: 'workingHours',
  appointments: 'appointments',
  favorites: 'favorites',
  reviews: 'reviews',
  coupons: 'coupons',
  notifications: 'notifications',
} as const;

import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

const mockPrisma = {
  service: { findUnique: jest.fn() },
  salonHoliday: { findFirst: jest.fn() },
  staff: { findFirst: jest.fn(), findMany: jest.fn() },
  appointment: { findMany: jest.fn(), findFirst: jest.fn() },
  workingHour: { findFirst: jest.fn() },
  staffLeave: { findFirst: jest.fn() },
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    jest.clearAllMocks();
  });

  describe('getAvailableSlots', () => {
    it('should throw BadRequestException for past dates', async () => {
      await expect(
        service.getAvailableSlots({
          salonId: 'salon1',
          serviceId: 'service1',
          date: '2020-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return empty slots on salon holiday', async () => {
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'service1', duration: 60, bufferTime: 0 });
      mockPrisma.salonHoliday.findFirst.mockResolvedValue({ id: 'holiday1', name: 'Diwali' });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const result = await service.getAvailableSlots({
        salonId: 'salon1',
        serviceId: 'service1',
        date,
      });

      expect(result.slots).toHaveLength(0);
    });

    it('should return slots for a working day', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      mockPrisma.service.findUnique.mockResolvedValue({ id: 'service1', duration: 60, bufferTime: 0 });
      mockPrisma.salonHoliday.findFirst.mockResolvedValue(null);
      mockPrisma.staff.findMany.mockResolvedValue([{
        id: 'staff1',
        salonId: 'salon1',
        user: { firstName: 'Priya', lastName: 'Sharma' },
      }]);
      mockPrisma.workingHour.findFirst.mockResolvedValue({
        dayOfWeek: 'MONDAY',
        openTime: '09:00',
        closeTime: '18:00',
        isClosed: false,
      });
      mockPrisma.staffLeave.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots({
        salonId: 'salon1',
        serviceId: 'service1',
        date,
      });

      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots.every((s) => s.isAvailable)).toBe(true);
    });

    it('should exclude slots conflicting with existing appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      mockPrisma.service.findUnique.mockResolvedValue({ id: 'service1', duration: 60, bufferTime: 0 });
      mockPrisma.salonHoliday.findFirst.mockResolvedValue(null);
      mockPrisma.staff.findMany.mockResolvedValue([{
        id: 'staff1',
        salonId: 'salon1',
        user: { firstName: 'Priya', lastName: 'Sharma' },
      }]);
      mockPrisma.workingHour.findFirst.mockResolvedValue({
        dayOfWeek: 'MONDAY',
        openTime: '09:00',
        closeTime: '18:00',
        isClosed: false,
      });
      mockPrisma.staffLeave.findFirst.mockResolvedValue(null);

      // Existing 10:00-11:00 appointment
      mockPrisma.appointment.findMany.mockResolvedValue([{
        startTime: new Date(`${date}T10:00:00.000Z`),
        endTime: new Date(`${date}T11:00:00.000Z`),
      }]);

      const result = await service.getAvailableSlots({
        salonId: 'salon1',
        serviceId: 'service1',
        date,
        staffId: 'staff1',
      });

      // 10:00 and 10:15 (which would overlap with 10:00-11:00) should not be available
      const slot10 = result.slots.find((s) => s.time === '10:00');
      expect(slot10).toBeUndefined();
    });
  });

  describe('validateSlot', () => {
    it('should return false for past slots', async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000);
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'service1', duration: 60, bufferTime: 0 });

      const result = await service.validateSlot('salon1', 'staff1', 'service1', pastTime);
      expect(result).toBe(false);
    });

    it('should return false when slot conflicts with existing appointment', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'service1', duration: 60, bufferTime: 0 });
      mockPrisma.salonHoliday.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'existing-appt' });

      const result = await service.validateSlot('salon1', 'staff1', 'service1', futureTime);
      expect(result).toBe(false);
    });

    it('should return true when slot is available', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'service1', duration: 60, bufferTime: 0 });
      mockPrisma.salonHoliday.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const result = await service.validateSlot('salon1', 'staff1', 'service1', futureTime);
      expect(result).toBe(true);
    });
  });
});

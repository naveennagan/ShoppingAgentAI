import { describe, it, expect } from 'vitest';
import {
  isInstallationQuery,
  isCheckAppointmentQuery,
  parseSlotSelection,
  formatAvailableSlots,
  formatAppointmentDetails,
  formatBookingConfirmation,
  formatSlotLabel,
} from '../installation-query-utils';
import type { Appointment } from '@/types/checkout';

describe('isInstallationQuery', () => {
  it('detects "installation" keyword', () => {
    expect(isInstallationQuery('When is my installation?')).toBe(true);
  });

  it('detects "book installation"', () => {
    expect(isInstallationQuery('I want to book installation')).toBe(true);
  });

  it('detects "appointment"', () => {
    expect(isInstallationQuery('Can I schedule an appointment?')).toBe(true);
  });

  it('detects "engineer visit"', () => {
    expect(isInstallationQuery('When is the engineer visit?')).toBe(true);
  });

  it('detects "install date"', () => {
    expect(isInstallationQuery('What is my install date?')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isInstallationQuery('BOOK INSTALLATION')).toBe(true);
  });

  it('returns false for unrelated messages', () => {
    expect(isInstallationQuery('show me broadband plans')).toBe(false);
    expect(isInstallationQuery('add to cart')).toBe(false);
    expect(isInstallationQuery('hello')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isInstallationQuery('')).toBe(false);
  });
});

describe('isCheckAppointmentQuery', () => {
  it('detects "check my installation"', () => {
    expect(isCheckAppointmentQuery('check my installation')).toBe(true);
  });

  it('detects "my appointment"', () => {
    expect(isCheckAppointmentQuery('What about my appointment?')).toBe(true);
  });

  it('detects "when is my installation"', () => {
    expect(isCheckAppointmentQuery('when is my installation')).toBe(true);
  });

  it('detects "installation status"', () => {
    expect(isCheckAppointmentQuery('installation status')).toBe(true);
  });

  it('returns false for booking queries', () => {
    expect(isCheckAppointmentQuery('book installation')).toBe(false);
  });

  it('returns false for unrelated messages', () => {
    expect(isCheckAppointmentQuery('show plans')).toBe(false);
  });
});

describe('parseSlotSelection', () => {
  const slots = [
    { date: '2025-04-05', slot: 'morning', timeRange: '8am-12pm', available: true },
    { date: '2025-04-05', slot: 'afternoon', timeRange: '12pm-5pm', available: false },
    { date: '2025-04-06', slot: 'morning', timeRange: '8am-12pm', available: true },
  ];

  it('selects by 1-based numeric index among available slots', () => {
    const result = parseSlotSelection('1', slots);
    expect(result).toEqual({ date: '2025-04-05', slot: 'morning', timeRange: '8am-12pm' });
  });

  it('selects second available slot with index 2', () => {
    const result = parseSlotSelection('2', slots);
    expect(result).toEqual({ date: '2025-04-06', slot: 'morning', timeRange: '8am-12pm' });
  });

  it('returns null for out-of-range index', () => {
    expect(parseSlotSelection('5', slots)).toBeNull();
  });

  it('returns null for zero index', () => {
    expect(parseSlotSelection('0', slots)).toBeNull();
  });

  it('matches by date text', () => {
    const result = parseSlotSelection('2025-04-06', slots);
    expect(result).toEqual({ date: '2025-04-06', slot: 'morning', timeRange: '8am-12pm' });
  });

  it('returns null for unrelated text', () => {
    expect(parseSlotSelection('hello', slots)).toBeNull();
  });

  it('returns null for empty slots', () => {
    expect(parseSlotSelection('1', [])).toBeNull();
  });
});

describe('formatSlotLabel', () => {
  it('formats a slot as "date — slot (timeRange)"', () => {
    const result = formatSlotLabel({ date: '2025-04-05', slot: 'morning', timeRange: '8am-12pm' });
    expect(result).toBe('2025-04-05 — morning (8am-12pm)');
  });
});

describe('formatAvailableSlots', () => {
  it('formats available slots as bulleted list with count', () => {
    const slots = [
      { date: '2025-04-05', slot: 'morning', timeRange: '8am-12pm', available: true },
      { date: '2025-04-06', slot: 'afternoon', timeRange: '12pm-5pm', available: true },
    ];
    const result = formatAvailableSlots(slots);
    expect(result).toContain('2 available installation slots');
    expect(result).toContain('• 1.');
    expect(result).toContain('• 2.');
    expect(result).toContain('2025-04-05');
    expect(result).toContain('2025-04-06');
  });

  it('filters out unavailable slots', () => {
    const slots = [
      { date: '2025-04-05', slot: 'morning', timeRange: '8am-12pm', available: true },
      { date: '2025-04-05', slot: 'afternoon', timeRange: '12pm-5pm', available: false },
    ];
    const result = formatAvailableSlots(slots);
    expect(result).toContain('1 available installation slot');
    expect(result).not.toContain('afternoon');
  });

  it('returns no-slots message when all unavailable', () => {
    const slots = [
      { date: '2025-04-05', slot: 'morning', timeRange: '8am-12pm', available: false },
    ];
    const result = formatAvailableSlots(slots);
    expect(result).toContain('no available installation slots');
  });

  it('returns no-slots message for empty array', () => {
    const result = formatAvailableSlots([]);
    expect(result).toContain('no available installation slots');
  });
});

describe('formatAppointmentDetails', () => {
  const appointment: Appointment = {
    appointmentId: 'apt-1',
    orderId: 'order-1',
    preferredDate: '2025-04-05',
    preferredTimeSlot: 'morning',
    status: 'pending',
  };

  it('includes date', () => {
    expect(formatAppointmentDetails(appointment)).toContain('Date: 2025-04-05');
  });

  it('includes time slot', () => {
    expect(formatAppointmentDetails(appointment)).toContain('Time Slot: morning');
  });

  it('includes status', () => {
    expect(formatAppointmentDetails(appointment)).toContain('Status: pending');
  });

  it('includes confirmed date when present', () => {
    const apt = { ...appointment, confirmedDate: '2025-04-05' };
    expect(formatAppointmentDetails(apt)).toContain('Confirmed Date: 2025-04-05');
  });

  it('includes engineer name when present', () => {
    const apt = { ...appointment, engineerName: 'John' };
    expect(formatAppointmentDetails(apt)).toContain('Engineer: John');
  });
});

describe('formatBookingConfirmation', () => {
  const appointment: Appointment = {
    appointmentId: 'apt-1',
    orderId: 'order-1',
    preferredDate: '2025-04-05',
    preferredTimeSlot: 'morning',
    status: 'pending',
  };

  it('includes booking confirmation header', () => {
    expect(formatBookingConfirmation(appointment)).toContain('Installation Booked');
  });

  it('includes date and time slot', () => {
    const result = formatBookingConfirmation(appointment);
    expect(result).toContain('Date: 2025-04-05');
    expect(result).toContain('Time Slot: morning');
  });

  it('includes appointment ID', () => {
    expect(formatBookingConfirmation(appointment)).toContain('Appointment ID: apt-1');
  });

  it('includes status', () => {
    expect(formatBookingConfirmation(appointment)).toContain('Status: pending');
  });
});

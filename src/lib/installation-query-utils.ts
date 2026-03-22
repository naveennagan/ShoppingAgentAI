import type { Appointment } from '@/types/checkout';

/** Keywords that indicate an installation date query */
const INSTALLATION_KEYWORDS = [
  'installation', 'install date', 'book installation',
  'appointment', 'engineer visit',
  'available installation', 'schedule installation',
  'installation date', 'installation slot',
  'book an appointment', 'book appointment',
];

/** Keywords that indicate checking an existing appointment */
const CHECK_APPOINTMENT_KEYWORDS = [
  'check my installation', 'check installation',
  'my appointment', 'my installation',
  'when is my installation', 'installation status',
  'appointment status', 'confirm installation',
];

/** Detect if a message is asking about installation dates or appointments */
export function isInstallationQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return INSTALLATION_KEYWORDS.some(k => lower.includes(k));
}

/** Detect if a message is asking to check an existing appointment */
export function isCheckAppointmentQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return CHECK_APPOINTMENT_KEYWORDS.some(k => lower.includes(k));
}

/** Detect if a message is selecting a slot from the displayed list (e.g. "1", "2", or date text) */
export function parseSlotSelection(
  text: string,
  slots: Array<{ date: string; slot: string; timeRange: string; available: boolean }>
): { date: string; slot: string; timeRange: string } | null {
  const trimmed = text.trim();

  // Try numeric selection (1-based index)
  const num = parseInt(trimmed, 10);
  const availableSlots = slots.filter(s => s.available);
  if (!isNaN(num) && num >= 1 && num <= availableSlots.length) {
    const selected = availableSlots[num - 1];
    return { date: selected.date, slot: selected.slot, timeRange: selected.timeRange };
  }

  // Try matching by date or slot text
  const lower = trimmed.toLowerCase();
  const matched = availableSlots.find(s =>
    lower.includes(s.date.toLowerCase()) ||
    lower.includes(formatSlotLabel(s).toLowerCase())
  );
  if (matched) {
    return { date: matched.date, slot: matched.slot, timeRange: matched.timeRange };
  }

  return null;
}

/** Format a single slot for display as a bulleted list item */
export function formatSlotLabel(slot: { date: string; slot: string; timeRange: string }): string {
  return `${slot.date} — ${slot.slot} (${slot.timeRange})`;
}

/** Format available slots as a bulleted list message */
export function formatAvailableSlots(
  slots: Array<{ date: string; slot: string; timeRange: string; available: boolean }>
): string {
  const available = slots.filter(s => s.available);
  if (available.length === 0) {
    return 'There are no available installation slots at the moment. Please try again later.';
  }
  const lines = available.map((s, i) => `• ${i + 1}. ${formatSlotLabel(s)}`);
  return `I found ${available.length} available installation slot${available.length > 1 ? 's' : ''}:\n\n${lines.join('\n')}\n\nPlease select a slot by typing its number.`;
}

/** Format appointment details for display */
export function formatAppointmentDetails(appointment: Appointment): string {
  const lines = [
    `📅 **Your Installation Appointment**\n`,
    `• Date: ${appointment.preferredDate}`,
    `• Time Slot: ${appointment.preferredTimeSlot}`,
    `• Status: ${appointment.status}`,
  ];
  if (appointment.confirmedDate) {
    lines.push(`• Confirmed Date: ${appointment.confirmedDate}`);
  }
  if (appointment.engineerName) {
    lines.push(`• Engineer: ${appointment.engineerName}`);
  }
  return lines.join('\n');
}

/** Format booking confirmation message */
export function formatBookingConfirmation(appointment: Appointment): string {
  return [
    `✅ **Installation Booked!**\n`,
    `• Date: ${appointment.preferredDate}`,
    `• Time Slot: ${appointment.preferredTimeSlot}`,
    `• Status: ${appointment.status}`,
    `• Appointment ID: ${appointment.appointmentId}`,
    `\nYou'll receive a confirmation with further details.`,
  ].join('\n');
}

export type ItemType = 'device' | 'broadband_service';
export type FulfillmentType = 'shipping' | 'installation';
export type ServiceStatus =
  | 'pending_appointment'
  | 'appointment_booked'
  | 'installation_scheduled'
  | 'active'
  | 'cancelled';

export interface CheckoutCartItem {
  cartItemId: string;
  itemType: ItemType;
  fulfillmentType: FulfillmentType;
  displayName: string;
  displaySummary?: string;
  unitPrice: number;
  quantity: number;
}

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

export interface CheckoutSession {
  sessionId: string;
  hasDevices: boolean;
  hasBroadbandService: boolean;
  devicePaymentDone: boolean;
  broadbandBookingStatus: Record<string, string>;
  oneTimeTotal: number;
  monthlyTotal: number;
  status: 'open' | 'device_paid' | 'complete';
  deviceItems: CheckoutCartItem[];
  serviceItems: CheckoutCartItem[];
  customerDetails?: CustomerDetails;
}

export interface AppointmentRequest {
  sessionId: string;
  preferredDate: string; // ISO date
  preferredTimeSlot: string;
  broadbandItemId?: string;
}

export interface Appointment {
  appointmentId: string;
  orderId: string;
  preferredDate: string;
  preferredTimeSlot: string;
  confirmedDate?: string;
  engineerName?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface Subscription {
  subscriptionId: string;
  orderId: string;
  status: 'inactive' | 'active' | 'cancelled';
  monthlyPrice: number;
  startDate?: string;
  activatedAt?: string;
  planName?: string;
}

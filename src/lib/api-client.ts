import type { BroadbandAddress, BroadbandAddon, BroadbandPlan, TvPackage, SimPlan, HomePhoneService, UserSelectionPayload } from '@/types/broadband';
import type { Appointment, AppointmentRequest, CheckoutSession, CustomerDetails, Subscription } from '@/types/checkout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const apiClient = {
  async getProducts() {
    const res = await fetch(`${API_URL}/api/products`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async getProductById(id: string) {
    const res = await fetch(`${API_URL}/api/products/${id}`);
    if (!res.ok) throw new Error('Failed to fetch product');
    return res.json();
  },

  async chat(message: string, history: Array<{ role: string; text: string }>) {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    if (!res.ok) throw new Error('Failed to send chat message');
    return res.json();
  },

  // Cart APIs
  async getCart(sessionId: string) {
    const res = await fetch(`${API_URL}/api/cart/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
  },

  async addToCart(sessionId: string, productId: string, quantity: number = 1) {
    const res = await fetch(`${API_URL}/api/cart/${sessionId}/add?productId=${productId}&quantity=${quantity}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to add to cart');
    return res.json();
  },

  async addBatchToCart(sessionId: string, productIds: string[]) {
    const res = await fetch(`${API_URL}/api/cart/${sessionId}/add-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productIds)
    });
    if (!res.ok) throw new Error('Failed to add batch to cart');
    return res.json();
  },

  async addBroadbandServiceToCart(sessionId: string, item: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    item_type: 'broadband_service';
    fulfillment_type: 'installation';
    broadband_ref: string;
    display_name: string;
    display_summary: string;
    unit_price: number;
  }) {
    const res = await fetch(`${API_URL}/api/cart/${sessionId}/add-broadband`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Failed to add broadband service to cart');
    return res.json();
  },

  async removeFromCart(sessionId: string, productId: string) {
    const res = await fetch(`${API_URL}/api/cart/${sessionId}/remove/${productId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove from cart');
    return res.json();
  },

  async clearCart(sessionId: string) {
    const res = await fetch(`${API_URL}/api/cart/${sessionId}/clear`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to clear cart');
    return res.json();
  },

  // Chat History APIs
  async getChatHistory(sessionId: string) {
    const res = await fetch(`${API_URL}/api/chat-history/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async addChatMessage(sessionId: string, role: string, text: string) {
    const res = await fetch(`${API_URL}/api/chat-history/${sessionId}/add?role=${role}&text=${encodeURIComponent(text)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to add chat message');
    return res.json();
  },

  async clearChatHistory(sessionId: string) {
    const res = await fetch(`${API_URL}/api/chat-history/${sessionId}/clear`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to clear chat history');
    return res.json();
  },

  // Promotion APIs
  async getPromotionsForProduct(productId: string) {
    const res = await fetch(`${API_URL}/api/promotions/product/${productId}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Bundle APIs
  async getActiveBundles() {
    const res = await fetch(`${API_URL}/api/bundles/active`);
    if (!res.ok) return [];
    return res.json();
  },

  // Broadband APIs
  async getAddresses(postcode: string): Promise<BroadbandAddress[]> {
    const res = await fetch(`${API_URL}/api/broadband/addresses?postcode=${encodeURIComponent(postcode)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch addresses');
    }
    return res.json();
  },

  async getAddons(planType?: string): Promise<BroadbandAddon[]> {
    const params = planType ? `?planType=${encodeURIComponent(planType)}` : '';
    const res = await fetch(`${API_URL}/api/broadband/addons${params}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getTvPackages(): Promise<TvPackage[]> {
    const res = await fetch(`${API_URL}/api/broadband/tv-packages`);
    if (!res.ok) throw new Error('Failed to fetch TV packages');
    return res.json();
  },

  async getSimPlans(): Promise<SimPlan[]> {
    const res = await fetch(`${API_URL}/api/broadband/sim-plans`);
    if (!res.ok) throw new Error('Failed to fetch SIM plans');
    return res.json();
  },

  async getHomePhoneServices(): Promise<HomePhoneService[]> {
    const res = await fetch(`${API_URL}/api/broadband/home-phone-services`);
    if (!res.ok) throw new Error('Failed to fetch home phone services');
    return res.json();
  },

  async submitUserSelection(selection: UserSelectionPayload): Promise<void> {
    const res = await fetch(`${API_URL}/api/broadband/user-selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection),
    });
    if (!res.ok) throw new Error('Failed to submit order');
  },

  async getPlansForAddress(uprn: string): Promise<BroadbandPlan[]> {
    const eligRes = await fetch(`${API_URL}/api/broadband/eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uprn })
    });
    if (!eligRes.ok) {
      const data = await eligRes.json().catch(() => ({}));
      throw new Error(data.message || 'Eligibility check failed');
    }
    const eligibility = await eligRes.json();
    if (!eligibility.eligible) return [];

    const plansRes = await fetch(`${API_URL}/api/broadband/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uprn })
    });
    if (!plansRes.ok) {
      const data = await plansRes.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch broadband plans');
    }
    return plansRes.json();
  },

  async validateCouponCode(code: string, productIds: string[], itemType?: string) {
    const body: Record<string, unknown> = { code, productIds };
    if (itemType) {
      body.itemType = itemType;
    }
    const res = await fetch(`${API_URL}/api/promotions/validate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let errorMsg = 'Failed to validate coupon code';
      try {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      } catch {
        // Response wasn't JSON (e.g. "Service temporarily unavailable")
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  },

  // Checkout APIs
  async createCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const res = await fetch(`${API_URL}/api/checkout/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to create checkout session');
    }
    return res.json();
  },

  async processDevicePayment(
    sessionId: string,
    paymentDetails: { cardholderName: string; last4Digits: string; voucherDiscount?: number; voucherName?: string }
  ) {
    const res = await fetch(`${API_URL}/api/checkout/device-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...paymentDetails })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to process device payment');
    }
    return res.json();
  },

  async getAvailableSlots(): Promise<Array<{ date: string; slot: string; timeRange: string; available: boolean }>> {
    const res = await fetch(`${API_URL}/api/checkout/slots`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch available slots');
    }
    return res.json();
  },

  async bookAppointment(request: AppointmentRequest & { discountedMonthlyTotal?: number }): Promise<Appointment> {
    const res = await fetch(`${API_URL}/api/checkout/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to book appointment');
    }
    return res.json();
  },

  async getAppointment(appointmentId: string): Promise<Appointment> {
    const res = await fetch(`${API_URL}/api/checkout/appointments/${appointmentId}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch appointment');
    }
    return res.json();
  },

  async getSubscription(sessionId: string): Promise<Subscription | null> {
    const res = await fetch(`${API_URL}/api/checkout/subscriptions/${sessionId}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch subscription');
    }
    return res.json();
  },

  async saveCustomerDetails(sessionId: string, details: CustomerDetails): Promise<void> {
    const res = await fetch(`${API_URL}/api/checkout/session/${sessionId}/customer-details`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to save customer details');
    }
  },

  async getCustomerDetails(sessionId: string): Promise<CustomerDetails | null> {
    const res = await fetch(`${API_URL}/api/checkout/session/${sessionId}/customer-details`);
    if (res.status === 404) return null;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch customer details');
    }
    return res.json();
  },

  async getSubscriptions(sessionId: string): Promise<Subscription[]> {
    const res = await fetch(`${API_URL}/api/checkout/subscriptions/${sessionId}/all`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch subscriptions');
    }
    return res.json();
  }
};

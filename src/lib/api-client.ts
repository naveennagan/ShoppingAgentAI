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

  // Coupon APIs
  async validateCouponCode(code: string, productIds: string[]) {
    const res = await fetch(`${API_URL}/api/promotions/validate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, productIds })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to validate coupon code');
    }
    return res.json();
  }
};

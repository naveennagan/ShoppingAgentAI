'use client';

import { useState, useEffect } from 'react';
import './orders.css';

interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  orderId: string;
  sessionId: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  orderDate: string;
  shippingAddress: string;
  paymentMethod: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get session ID from localStorage or generate one
    let currentSessionId = localStorage.getItem('sessionId');
    if (!currentSessionId) {
      currentSessionId = 'user123';
      localStorage.setItem('sessionId', currentSessionId);
    }
    console.log('Using session ID:', currentSessionId);
    setSessionId(currentSessionId);
    fetchOrders(currentSessionId);
  }, []);

  const fetchOrders = async (sessionId: string) => {
    try {
      console.log('Fetching orders for session:', sessionId);
      const response = await fetch(`http://localhost:8080/api/orders?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const ordersData = await response.json();
      console.log('Orders data:', ordersData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return '#28a745';
      case 'processing': return '#ffc107';
      case 'shipped': return '#17a2b8';
      case 'delivered': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading">Loading your orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>My Orders</h1>
        <p>Track and manage your purchases</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <h3>No orders yet</h3>
          <p>When you place orders, they'll appear here.</p>
          <a href="/products" className="shop-now-btn">
            Start Shopping
          </a>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.orderId} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.orderId}</h3>
                  <p className="order-date">{formatDate(order.orderDate)}</p>
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="order-items">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <img 
                      src={item.imageUrl} 
                      alt={item.productName}
                      className="item-image"
                    />
                    <div className="item-details">
                      <h4>{item.productName}</h4>
                      <p>Quantity: {item.quantity}</p>
                      <p className="item-price">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-details">
                  <p><strong>Shipping Address:</strong> {order.shippingAddress}</p>
                  <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                </div>
                <div className="order-total">
                  <h3>Total: ${order.totalAmount.toFixed(2)}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function POST(req: Request) {
  try {
    const { message, history, cartItems, appliedCouponCode, appliedDeviceCoupon, appliedBroadbandCoupon, broadbandPlans } = await req.json();

    const backendRes = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, cartItems, appliedCouponCode, appliedDeviceCoupon, appliedBroadbandCoupon, broadbandPlans }),
    });

    if (!backendRes.ok) {
      return NextResponse.json({
        action: 'none',
        message: 'Chat service is temporarily unavailable. Please try again.',
      });
    }

    return NextResponse.json(await backendRes.json());
  } catch {
    return NextResponse.json({
      action: 'none',
      message: 'Chat service is temporarily unavailable. Please try again.',
    });
  }
}

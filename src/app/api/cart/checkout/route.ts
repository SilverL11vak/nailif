import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ensureCatalogTables, getProductsByIds } from '@/lib/catalog';
import { createOrder, ensureOrdersTable, setOrderStripeSession } from '@/lib/orders';
import { getStripeServer } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';

interface CartCheckoutPayload {
  items: Array<{ productId: string; quantity: number }>;
  customerEmail?: string;
}

function getBaseUrlFromHeaders(originHeader: string | null, hostHeader: string | null) {
  if (originHeader) return originHeader;
  if (hostHeader) return `https://${hostHeader}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';
}

export async function POST(request: Request) {
  try {
    // Rate limit check - prevent payment abuse
    const rateLimit = checkRateLimit('checkout', request.headers);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) } }
      );
    }

    const payload = (await request.json()) as CartCheckoutPayload;
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    await ensureCatalogTables();
    await ensureOrdersTable();

    const uniqueProductIds = [...new Set(payload.items.map((item) => item.productId))];
    const products = await getProductsByIds(uniqueProductIds);

    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 });
    }

    const quantities = new Map<string, number>();
    for (const item of payload.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + Math.max(1, item.quantity));
    }

    const lineItems = products.map((product) => ({
      quantity: quantities.get(product.id) ?? 1,
      price_data: {
        currency: 'eur',
        unit_amount: product.price * 100,
        product_data: {
          name: product.name,
          description: product.description,
          images: product.imageUrl ? [product.imageUrl] : undefined,
        },
      },
    }));

    const normalizedItems = products.map((product) => ({
      id: product.id,
      name: product.name,
      quantity: quantities.get(product.id) ?? 1,
      price: product.price,
    }));
    const amountTotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderId = await createOrder({
      orderType: 'product_purchase',
      amountTotal,
      currency: 'eur',
      customerEmail: payload.customerEmail,
      items: normalizedItems,
    });

    const h = await headers();
    const baseUrl = getBaseUrlFromHeaders(h.get('origin'), h.get('host'));
    const stripe = getStripeServer();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: payload.customerEmail,
      metadata: {
        flow: 'product_purchase',
        order_id: orderId,
      },
      success_url: `${baseUrl}/success?type=order&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/shop?payment=cancelled`,
    });

    await setOrderStripeSession(orderId, session.id);

    return NextResponse.json({
      ok: true,
      orderId,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('POST /api/cart/checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to start checkout. Configure STRIPE_SECRET_KEY first.' },
      { status: 500 }
    );
  }
}


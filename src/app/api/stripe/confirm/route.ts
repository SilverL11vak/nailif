import { NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { reconcileBookingPayment } from '@/lib/bookings';
import { reconcileOrderPayment } from '@/lib/orders';
import { getAdminFromCookies } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    // Require admin authentication
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<{
      sessionId: string;
      paymentIntentId: string;
      type: 'booking' | 'order';
    }>;

    // Accept either sessionId or paymentIntentId
    const stripeId = payload.sessionId || payload.paymentIntentId;
    if (!stripeId || !payload.type) {
      return NextResponse.json(
        { error: 'sessionId or paymentIntentId and type are required' },
        { status: 400 }
      );
    }

    if (payload.type !== 'booking' && payload.type !== 'order') {
      return NextResponse.json(
        { error: 'type must be either "booking" or "order"' },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();

    // Verify payment status directly with Stripe server-side
    let stripePaymentStatus: string;
    let actualPaymentIntentId: string | undefined;

    try {
      // Try to retrieve as checkout session first
      const session = await stripe.checkout.sessions.retrieve(stripeId).catch(() => null);
      if (session) {
        stripePaymentStatus = session.payment_status;
        // Checkout sessions have payment_intent as a string or as a PaymentIntent object
        const paymentIntentRef = session.payment_intent;
        if (typeof paymentIntentRef === 'string') {
          actualPaymentIntentId = paymentIntentRef;
        } else if (paymentIntentRef && typeof paymentIntentRef === 'object') {
          actualPaymentIntentId = (paymentIntentRef as { id: string }).id;
        }
      } else {
        // Try as payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(stripeId).catch(() => null);
        if (paymentIntent) {
          stripePaymentStatus = paymentIntent.status;
          actualPaymentIntentId = paymentIntent.id;
        } else {
          return NextResponse.json(
            { status: 'rejected', reason: 'Invalid Stripe ID - not found as session or payment intent' },
            { status: 400 }
          );
        }
      }
    } catch (stripeError) {
      console.error('Stripe retrieval error:', stripeError);
      return NextResponse.json(
        { status: 'rejected', reason: 'Failed to verify payment with Stripe' },
        { status: 400 }
      );
    }

    // Only proceed if Stripe confirms successful payment
    const isPaid = stripePaymentStatus === 'paid' || stripePaymentStatus === 'succeeded';
    if (!isPaid) {
      return NextResponse.json(
        { status: 'rejected', reason: `Payment not completed - Stripe status: ${stripePaymentStatus}` },
        { status: 400 }
      );
    }

    // Perform reconciliation based on type
    if (payload.type === 'booking') {
      const result = await reconcileBookingPayment({
        stripeSessionId: payload.sessionId,
        stripePaymentIntentId: payload.paymentIntentId || actualPaymentIntentId,
        adminId: admin.id,
        adminName: admin.name,
      });

      if (!result.success) {
        return NextResponse.json({ status: 'rejected', reason: result.reason }, { status: 400 });
      }

      if (result.alreadyPaid) {
        return NextResponse.json({
          status: 'already_paid',
          bookingId: result.bookingId,
          message: 'Booking was already marked as paid',
        });
      }

      return NextResponse.json({
        status: 'reconciled',
        bookingId: result.bookingId,
        message: 'Booking payment reconciled successfully',
      });
    }

    // Order reconciliation
    const result = await reconcileOrderPayment({
      stripeSessionId: payload.sessionId,
      stripePaymentIntentId: payload.paymentIntentId || actualPaymentIntentId,
      adminId: admin.id,
      adminName: admin.name,
    });

    if (!result.success) {
      return NextResponse.json({ status: 'rejected', reason: result.reason }, { status: 400 });
    }

    if (result.alreadyPaid) {
      return NextResponse.json({
        status: 'already_paid',
        orderId: result.orderId,
        message: 'Order was already marked as paid',
      });
    }

    return NextResponse.json({
      status: 'reconciled',
      orderId: result.orderId,
      message: 'Order payment reconciled successfully',
    });
  } catch (error) {
    console.error('POST /api/stripe/confirm error:', error);
    return NextResponse.json({ error: 'Failed to reconcile payment' }, { status: 500 });
  }
}

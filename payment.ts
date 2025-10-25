import Stripe from 'stripe';

let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
} else {
  console.warn('STRIPE_SECRET_KEY is not set - payment functionality will be disabled');
}

export interface CreatePaymentIntentParams {
  amount: number; // in cents
  currency?: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const { amount, currency = 'gbp', metadata } = params;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

export async function confirmPaymentIntent(paymentIntentId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
  });

  return {
    refundId: refund.id,
    status: refund.status,
    amount: refund.amount,
  };
}

export { stripe };


import { stripe } from './payment';

export interface CreateCheckoutSessionParams {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number; // in cents
  }>;
  shipping: number; // in cents
  total: number; // in cents
  metadata: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    shippingAddress: string; // JSON string
    items: string; // JSON string
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
  };
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const { orderNumber, customerEmail, items, shipping, total, metadata } = params;

  // Create line items for Stripe (products)
  const lineItems = items.map(item => ({
    price_data: {
      currency: 'gbp',
      product_data: {
        name: item.productName,
      },
      unit_amount: item.price,
    },
    quantity: item.quantity,
  }));

  // Add shipping as a line item if shipping cost exists
  if (shipping > 0) {
    lineItems.push({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: 'Shipping',
        },
        unit_amount: shipping,
      },
      quantity: 1,
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL || 'https://infiniteclothingstore.co.uk'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'https://infiniteclothingstore.co.uk'}/checkout`,
    customer_email: customerEmail,
    metadata,
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

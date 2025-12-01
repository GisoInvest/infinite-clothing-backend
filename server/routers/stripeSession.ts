import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { stripe } from "../payment";

export const stripeSessionRouter = router({
  getSession: publicProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);
        
        return {
          metadata: session.metadata,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_email,
        };
      } catch (error) {
        console.error('Failed to retrieve Stripe session:', error);
        throw new Error('Failed to retrieve payment session');
      }
    }),
});

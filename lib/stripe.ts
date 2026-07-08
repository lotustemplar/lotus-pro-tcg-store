import Stripe from "stripe";

// Placeholder-safe: app boots even without real keys set, but checkout calls
// will fail with a clear error until STRIPE_SECRET_KEY is provided in .env
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-06-20",
});

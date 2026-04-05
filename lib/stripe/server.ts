import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeServer() {
  if (stripeClient) return stripeClient

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  stripeClient = new Stripe(secretKey)
  return stripeClient
}
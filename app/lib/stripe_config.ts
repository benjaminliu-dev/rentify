import { env } from "process";
import Stripe from "stripe";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY!)
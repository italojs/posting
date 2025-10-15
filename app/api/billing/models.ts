export enum BillingPlanId {
    FREE = 'free',
    NEWSLETTER_GROWTH = 'newsletter_growth',
    NEWSLETTER_SCALE = 'newsletter_scale',
}

export interface BillingPlanDefinition {
    id: BillingPlanId;
    name: string;
    description: string;
    /** Maximum newsletters that can be generated in the current billing cycle. Undefined/null means unlimited */
    monthlyNewsletterLimit?: number | null;
    /** Whether this plan requires a paid subscription */
    paid: boolean;
    /** Environment key used to resolve the Stripe price for this plan */
    stripePriceEnvKey?: string;
}

export type BillingSubscriptionStatus =
    | 'free'
    | 'active'
    | 'trialing'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'past_due'
    | 'unpaid';

export interface UserSubscription {
    _id: string;
    userId: string;
    planId: BillingPlanId;
    status: BillingSubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NewsletterUsage {
    _id: string;
    userId: string;
    /** Month key in the form YYYY-MM */
    month: string;
    planId: BillingPlanId;
    newsletterCount: number;
    updatedAt: Date;
    createdAt: Date;
}

export interface BillingPlanPublicInfo {
    id: BillingPlanId;
    name: string;
    description: string;
    monthlyNewsletterLimit?: number | null;
    paid: boolean;
    price?: {
        amount: number;
        currency: string;
        interval?: string;
    };
}

export interface SubscriptionOverview {
    plan: {
        id: BillingPlanId;
        name: string;
        description: string;
        monthlyNewsletterLimit?: number | null;
        paid: boolean;
    };
    subscription: {
        status: BillingSubscriptionStatus;
        planId: BillingPlanId;
        cancelAtPeriodEnd: boolean;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
    };
    usage: {
        month: string;
        newsletterCount: number;
    } | null;
    stripe: {
        configured: boolean;
    };
}

export interface CreateCheckoutSessionResult {
    sessionId: string | null;
    subscription?: {
        status: BillingSubscriptionStatus;
        planId: BillingPlanId;
    };
}

export interface FinalizeCheckoutSessionResult {
    subscription: {
        status: BillingSubscriptionStatus;
        planId: BillingPlanId;
        cancelAtPeriodEnd?: boolean;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
    };
}

export interface BillingPortalSessionResult {
    url?: string | null;
}

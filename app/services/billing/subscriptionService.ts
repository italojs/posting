import Stripe from 'stripe';
import { Meteor } from 'meteor/meteor';
import NewsletterUsageCollection from '/app/api/billing/newsletterUsage';
import UserSubscriptionsCollection from '/app/api/billing/userSubscriptions';
import {
    BillingPlanDefinition,
    BillingPlanId,
    BillingPlanPublicInfo,
    BillingSubscriptionStatus,
    NewsletterUsage,
    UserSubscription,
} from '/app/api/billing/models';

type PlanWithRuntime = BillingPlanDefinition & {
    stripePriceId?: string;
};

const PLAN_PRICE_ENV_MAP: Partial<Record<BillingPlanId, string>> = {
    [BillingPlanId.NEWSLETTER_GROWTH]: 'STRIPE_NEWSLETTER_GROWTH_PRICE_ID',
    [BillingPlanId.NEWSLETTER_SCALE]: 'STRIPE_NEWSLETTER_SCALE_PRICE_ID',
};

const PLAN_DEFINITIONS: BillingPlanDefinition[] = [
    {
        id: BillingPlanId.FREE,
        name: 'Plano Gratuito',
        description: 'Gere 1 newsletter por mês.',
        monthlyNewsletterLimit: 1,
        paid: false,
    },
    {
        id: BillingPlanId.NEWSLETTER_GROWTH,
        name: 'Newsletter Growth',
        description: 'Gere até 4 newsletters por mês.',
        monthlyNewsletterLimit: 4,
        paid: true,
        stripePriceEnvKey: PLAN_PRICE_ENV_MAP[BillingPlanId.NEWSLETTER_GROWTH],
    },
    {
        id: BillingPlanId.NEWSLETTER_SCALE,
        name: 'Newsletter Scale',
        description: 'Gere newsletters ilimitadas por mês.',
        monthlyNewsletterLimit: null,
        paid: true,
        stripePriceEnvKey: PLAN_PRICE_ENV_MAP[BillingPlanId.NEWSLETTER_SCALE],
    },
];

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2024-06-20';

const readEnvValue = (key?: string): string | undefined => {
    if (!key) return undefined;
    const fromSettings = (Meteor.settings?.private?.[key] as string | undefined) ?? undefined;
    if (fromSettings && typeof fromSettings === 'string' && fromSettings.trim()) {
        return fromSettings.trim();
    }
    const fromEnv = process.env[key];
    if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
        return fromEnv.trim();
    }
    return undefined;
};

const withRuntimeData = (plan: BillingPlanDefinition): PlanWithRuntime => {
    if (!plan.paid) {
        return plan;
    }
    const priceId = readEnvValue(plan.stripePriceEnvKey);
    return {
        ...plan,
        stripePriceId: priceId,
    };
};

const getStripeSecretKey = (): string | undefined => {
    const fromSettings = Meteor.settings?.private?.STRIPE_SECRET_KEY as string | undefined;
    if (fromSettings && fromSettings.trim()) {
        return fromSettings.trim();
    }
    const fromEnv = process.env.STRIPE_SECRET_KEY;
    if (fromEnv && fromEnv.trim()) {
        return fromEnv.trim();
    }
    return undefined;
};

let cachedStripe: Stripe | undefined;

const getStripeClient = (): Stripe => {
    if (cachedStripe) return cachedStripe;
    const secret = getStripeSecretKey();
    if (!secret) {
        throw new Meteor.Error('stripe-not-configured', 'Stripe não está configurado');
    }
    cachedStripe = new Stripe(secret, {
        apiVersion: STRIPE_API_VERSION,
    });
    return cachedStripe;
};

const getCurrentMonthKey = (date: Date = new Date()): string => {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

export interface ResolvedSubscription {
    subscription: UserSubscription;
    plan: PlanWithRuntime;
}

export interface NewsletterQuotaContext {
    monthKey: string;
    usage: NewsletterUsage;
    plan: PlanWithRuntime;
}

class SubscriptionService {
    getStripe() {
        return getStripeClient();
    }

    hasStripeConfigured(): boolean {
        try {
            return !!getStripeSecretKey();
        } catch (error) {
            return false;
        }
    }

    getPlansWithRuntime(): PlanWithRuntime[] {
        return PLAN_DEFINITIONS.map(withRuntimeData);
    }

    getPlanById(planId: BillingPlanId): PlanWithRuntime {
        const plan = PLAN_DEFINITIONS.find((p) => p.id === planId);
        if (!plan) {
            throw new Meteor.Error('billing-plan-not-found', 'Plano não encontrado');
        }
        return withRuntimeData(plan);
    }

    getPlanByStripePrice(priceId: string): PlanWithRuntime | undefined {
        if (!priceId) return undefined;
        const plans = this.getPlansWithRuntime();
        return plans.find((plan) => plan.stripePriceId === priceId);
    }

    getPublicPlans = async (): Promise<BillingPlanPublicInfo[]> => {
        const plans = this.getPlansWithRuntime();
        if (!this.hasStripeConfigured()) {
            return plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                description: plan.description,
                monthlyNewsletterLimit: plan.monthlyNewsletterLimit,
                paid: plan.paid,
            }));
        }

        const stripeClient = this.getStripe();

        const enrichedPlans: BillingPlanPublicInfo[] = [];
        for (const plan of plans) {
            if (!plan.paid || !plan.stripePriceId) {
                enrichedPlans.push({
                    id: plan.id,
                    name: plan.name,
                    description: plan.description,
                    monthlyNewsletterLimit: plan.monthlyNewsletterLimit,
                    paid: plan.paid,
                });
                continue;
            }

            try {
                const price = await stripeClient.prices.retrieve(plan.stripePriceId);
                if (price.unit_amount && price.currency) {
                    enrichedPlans.push({
                        id: plan.id,
                        name: plan.name,
                        description: plan.description,
                        monthlyNewsletterLimit: plan.monthlyNewsletterLimit,
                        paid: true,
                        price: {
                            amount: price.unit_amount,
                            currency: price.currency,
                            interval: price.recurring?.interval,
                        },
                    });
                } else {
                    enrichedPlans.push({
                        id: plan.id,
                        name: plan.name,
                        description: plan.description,
                        monthlyNewsletterLimit: plan.monthlyNewsletterLimit,
                        paid: true,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch Stripe price', plan.stripePriceId, error);
                enrichedPlans.push({
                    id: plan.id,
                    name: plan.name,
                    description: plan.description,
                    monthlyNewsletterLimit: plan.monthlyNewsletterLimit,
                    paid: true,
                });
            }
        }

        return enrichedPlans;
    };

    private async ensureSubscription(userId: string): Promise<UserSubscription> {
        let subscription = (await UserSubscriptionsCollection.findOneAsync({ userId })) as UserSubscription | undefined;
        if (subscription) {
            const planExists = PLAN_DEFINITIONS.some((plan) => plan.id === subscription.planId);
            if (!planExists) {
                subscription = undefined;
            }
        }
        if (!subscription) {
            const now = new Date();
            const doc: Omit<UserSubscription, '_id'> = {
                userId,
                planId: BillingPlanId.FREE,
                status: 'free',
                createdAt: now,
                updatedAt: now,
            };
            const _id = await UserSubscriptionsCollection.insertAsync(doc as any);
            subscription = { _id, ...doc };
        }
        return subscription;
    }

    async getResolvedSubscription(userId: string): Promise<ResolvedSubscription> {
        const subscription = await this.ensureSubscription(userId);
        const plan = this.getPlanById(subscription.planId);
        return { subscription, plan };
    }

    async setSubscription(
        userId: string,
        planId: BillingPlanId,
        extra: Partial<Omit<UserSubscription, '_id' | 'userId' | 'planId' | 'createdAt'>> = {},
    ): Promise<UserSubscription> {
        const now = new Date();
        const update: Partial<UserSubscription> = {
            planId,
            updatedAt: now,
            ...extra,
        };
        const current = (await UserSubscriptionsCollection.findOneAsync({ userId })) as UserSubscription | undefined;

        if (current) {
            await UserSubscriptionsCollection.updateAsync(
                { _id: current._id },
                {
                    $set: update,
                },
            );
            return {
                ...current,
                ...update,
            };
        }

        const doc: Omit<UserSubscription, '_id'> = {
            userId,
            planId,
            status: extra.status ?? (planId === BillingPlanId.FREE ? 'free' : 'active'),
            stripeCustomerId: extra.stripeCustomerId,
            stripeSubscriptionId: extra.stripeSubscriptionId,
            stripePriceId: extra.stripePriceId,
            currentPeriodStart: extra.currentPeriodStart,
            currentPeriodEnd: extra.currentPeriodEnd,
            cancelAtPeriodEnd: extra.cancelAtPeriodEnd,
            createdAt: now,
            updatedAt: now,
        };

        const _id = await UserSubscriptionsCollection.insertAsync(doc as any);
        return { _id, ...doc };
    }

    async downgradeToFree(userId: string): Promise<UserSubscription> {
        return this.setSubscription(userId, BillingPlanId.FREE, {
            status: 'free',
            stripeSubscriptionId: undefined,
            stripePriceId: undefined,
            currentPeriodStart: undefined,
            currentPeriodEnd: undefined,
            cancelAtPeriodEnd: false,
        });
    }

    async syncFromStripeSubscription(userId: string, subscription: Stripe.Subscription): Promise<UserSubscription> {
        const priceId = typeof subscription.items.data[0]?.price?.id === 'string' ? subscription.items.data[0].price.id : undefined;
        if (!priceId) {
            throw new Meteor.Error('stripe-subscription-invalid', 'Assinatura do Stripe sem price ID');
        }
        const plan = this.getPlanByStripePrice(priceId);
        if (!plan) {
            throw new Meteor.Error('stripe-plan-unknown', 'Plano associado ao Stripe não é suportado');
        }

        const status = this.mapStripeStatus(subscription.status);
        const currentPeriodStart = subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000)
            : undefined;
        const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : undefined;

        return this.setSubscription(userId, plan.id, {
            status,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
            stripePriceId: priceId,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? undefined,
        });
    }

    mapStripeStatus(status: Stripe.Subscription.Status): BillingSubscriptionStatus {
        switch (status) {
            case 'active':
                return 'active';
            case 'trialing':
                return 'trialing';
            case 'canceled':
                return 'canceled';
            case 'incomplete':
                return 'incomplete';
            case 'incomplete_expired':
                return 'incomplete_expired';
            case 'past_due':
                return 'past_due';
            case 'unpaid':
                return 'unpaid';
            default:
                return 'active';
        }
    }

    private async getOrCreateUsage(userId: string, planId: BillingPlanId, monthKey: string): Promise<NewsletterUsage> {
        let usage = (await NewsletterUsageCollection.findOneAsync({ userId, month: monthKey })) as NewsletterUsage | undefined;
        if (!usage) {
            const now = new Date();
            const doc: Omit<NewsletterUsage, '_id'> = {
                userId,
                month: monthKey,
                planId,
                newsletterCount: 0,
                createdAt: now,
                updatedAt: now,
            };
            const _id = await NewsletterUsageCollection.insertAsync(doc as any);
            usage = { _id, ...doc };
        } else if (usage.planId !== planId) {
            await NewsletterUsageCollection.updateAsync(
                { _id: usage._id },
                { $set: { planId, updatedAt: new Date() } },
            );
            usage = { ...usage, planId };
        }
        return usage;
    }

    async prepareNewsletterQuota(userId: string): Promise<NewsletterQuotaContext> {
        const { plan } = await this.getResolvedSubscription(userId);
        const monthKey = getCurrentMonthKey();
        const usage = await this.getOrCreateUsage(userId, plan.id, monthKey);
        if (plan.monthlyNewsletterLimit != null && usage.newsletterCount >= plan.monthlyNewsletterLimit) {
            const limitMessage =
                plan.monthlyNewsletterLimit === 1
                    ? '1 newsletter mensal'
                    : `${plan.monthlyNewsletterLimit} newsletters mensais`;
            throw new Meteor.Error(
                'newsletter-limit-reached',
                `Você atingiu o limite de ${limitMessage} do plano ${plan.name}.`,
            );
        }
        return { monthKey, usage, plan };
    }

    async commitNewsletterUsage(userId: string, context: NewsletterQuotaContext): Promise<NewsletterUsage> {
        const now = new Date();
        const limit = context.plan.monthlyNewsletterLimit;
        const selector: Record<string, any> = { _id: context.usage._id };
        if (limit != null) {
            selector.newsletterCount = { $lt: limit };
        }

        const modifier = {
            $inc: {
                newsletterCount: 1,
            },
            $set: {
                updatedAt: now,
                planId: context.plan.id,
            },
        };

        const result = await NewsletterUsageCollection.updateAsync(selector, modifier);
        if (limit != null && result === 0) {
            const limitMessage =
                limit === 1 ? '1 newsletter mensal' : `${limit} newsletters mensais`;
            throw new Meteor.Error(
                'newsletter-limit-reached',
                `Você atingiu o limite de ${limitMessage} do plano ${context.plan.name}.`,
            );
        }

        return {
            ...context.usage,
            planId: context.plan.id,
            newsletterCount: context.usage.newsletterCount + 1,
            updatedAt: now,
        };
    }

    async getUsageSummary(userId: string): Promise<NewsletterUsage | undefined> {
        const monthKey = getCurrentMonthKey();
        const usage = (await NewsletterUsageCollection.findOneAsync({ userId, month: monthKey })) as NewsletterUsage | undefined;
        return usage ?? undefined;
    }

    async getOrCreateStripeCustomer(userId: string): Promise<string> {
        const subscription = await this.ensureSubscription(userId);
        if (subscription.stripeCustomerId) {
            return subscription.stripeCustomerId;
        }

        const stripe = this.getStripe();
        const user = (await Meteor.users.findOneAsync(userId)) as Meteor.User | undefined;
        const email = user?.emails?.[0]?.address;

        const customer = await stripe.customers.create({
            email: email ?? undefined,
            metadata: {
                meteorUserId: userId,
            },
        });

        await UserSubscriptionsCollection.updateAsync(
            { _id: subscription._id },
            {
                $set: {
                    stripeCustomerId: customer.id,
                    updatedAt: new Date(),
                },
            },
        );

        return customer.id;
    }

    async cancelStripeSubscription(userId: string): Promise<UserSubscription> {
        const subscription = (await UserSubscriptionsCollection.findOneAsync({ userId })) as UserSubscription | undefined;
        if (!subscription?.stripeSubscriptionId) {
            return this.downgradeToFree(userId);
        }

        const stripe = this.getStripe();
        const updatedStripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        return this.syncFromStripeSubscription(userId, updatedStripeSubscription);
    }

    async cancelStripeSubscriptionImmediately(userId: string): Promise<void> {
        const subscription = (await UserSubscriptionsCollection.findOneAsync({ userId })) as UserSubscription | undefined;
        if (!subscription?.stripeSubscriptionId) {
            return;
        }

        const stripe = this.getStripe();
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    async resumeStripeSubscription(userId: string): Promise<UserSubscription> {
        const subscription = (await UserSubscriptionsCollection.findOneAsync({ userId })) as UserSubscription | undefined;
        if (!subscription?.stripeSubscriptionId) {
            const ensured = await this.ensureSubscription(userId);
            return ensured;
        }

        const stripe = this.getStripe();
        const updatedStripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: false,
        });

        return this.syncFromStripeSubscription(userId, updatedStripeSubscription);
    }
}

export const subscriptionService = new SubscriptionService();

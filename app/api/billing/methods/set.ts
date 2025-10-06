import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Stripe from 'stripe';
import { BillingPlanId } from '../models';
import { subscriptionService } from '/app/services/billing/subscriptionService';
import { currentUserAsync } from '/server/utils/meteor';

const billingPlanValues = Object.values(BillingPlanId);

const isValidUrl = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    try {
        // eslint-disable-next-line no-new
        new URL(value);
        return true;
    } catch (error) {
        return false;
    }
};

const appendSessionPlaceholder = (url: string): string => {
    if (url.includes('session_id={CHECKOUT_SESSION_ID}')) {
        return url;
    }
    const delimiter = url.includes('?') ? '&' : '?';
    return `${url}${delimiter}session_id={CHECKOUT_SESSION_ID}`;
};

Meteor.methods({
    'set.billing.createCheckoutSession': async ({
        planId,
        successUrl,
        cancelUrl,
    }: {
        planId: BillingPlanId;
        successUrl: string;
        cancelUrl: string;
    }) => {
        check(planId, Match.OneOf(...billingPlanValues));
        check(successUrl, String);
        check(cancelUrl, String);

        const user = await currentUserAsync();
        if (!user) {
            throw new Meteor.Error('not-authorized', 'É necessário estar autenticado.');
        }

        if (!isValidUrl(successUrl) || !isValidUrl(cancelUrl)) {
            throw new Meteor.Error('invalid-url', 'URLs inválidas fornecidas para o checkout.');
        }

        const plan = subscriptionService.getPlanById(planId);

        if (!plan.paid) {
            const updated = await subscriptionService.downgradeToFree(user._id);
            return {
                sessionId: null,
                subscription: {
                    status: updated.status,
                    planId: updated.planId,
                },
            };
        }

        if (!subscriptionService.hasStripeConfigured()) {
            throw new Meteor.Error('stripe-not-configured', 'Stripe não está configurado.');
        }

        if (!plan.stripePriceId) {
            throw new Meteor.Error('stripe-plan-misconfigured', 'Preço do plano não configurado no Stripe.');
        }

        const stripe = subscriptionService.getStripe();
        const customerId = await subscriptionService.getOrCreateStripeCustomer(user._id);
        const formattedSuccessUrl = appendSessionPlaceholder(successUrl.trim());

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            automatic_tax: { enabled: true },
            allow_promotion_codes: true,
            success_url: formattedSuccessUrl,
            cancel_url: cancelUrl.trim(),
            metadata: {
                planId,
                meteorUserId: user._id,
            },
            subscription_data: {
                metadata: {
                    planId,
                    meteorUserId: user._id,
                },
            },
        });

        return {
            sessionId: session.id,
        };
    },
    'set.billing.finalizeCheckoutSession': async ({ sessionId }: { sessionId: string }) => {
        check(sessionId, String);
        const user = await currentUserAsync();
        if (!user) {
            throw new Meteor.Error('not-authorized', 'É necessário estar autenticado.');
        }

        if (!subscriptionService.hasStripeConfigured()) {
            throw new Meteor.Error('stripe-not-configured', 'Stripe não está configurado.');
        }

        const stripe = subscriptionService.getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription'],
        });

        if (!session) {
            throw new Meteor.Error('stripe-session-not-found', 'Sessão de checkout não encontrada.');
        }

        if (session.metadata?.meteorUserId && session.metadata.meteorUserId !== user._id) {
            throw new Meteor.Error('stripe-session-mismatch', 'Sessão pertence a outro usuário.');
        }

        if (session.status !== 'complete') {
            throw new Meteor.Error('stripe-session-incomplete', 'O checkout não foi concluído.');
        }

        let subscription: Stripe.Subscription | null = null;
        if (typeof session.subscription === 'string') {
            subscription = await stripe.subscriptions.retrieve(session.subscription);
        } else if (session.subscription) {
            subscription = session.subscription;
        }

        if (!subscription) {
            throw new Meteor.Error('stripe-subscription-not-found', 'Assinatura do Stripe não encontrada.');
        }

        const updated = await subscriptionService.syncFromStripeSubscription(user._id, subscription);

        return {
            subscription: {
                status: updated.status,
                planId: updated.planId,
                cancelAtPeriodEnd: updated.cancelAtPeriodEnd ?? false,
                currentPeriodStart: updated.currentPeriodStart ? updated.currentPeriodStart.toISOString() : null,
                currentPeriodEnd: updated.currentPeriodEnd ? updated.currentPeriodEnd.toISOString() : null,
            },
        };
    },
    'set.billing.createPortalSession': async ({ returnUrl }: { returnUrl: string }) => {
        check(returnUrl, String);
        const user = await currentUserAsync();
        if (!user) {
            throw new Meteor.Error('not-authorized', 'É necessário estar autenticado.');
        }

        if (!subscriptionService.hasStripeConfigured()) {
            throw new Meteor.Error('stripe-not-configured', 'Stripe não está configurado.');
        }

        if (!isValidUrl(returnUrl)) {
            throw new Meteor.Error('invalid-url', 'URL de retorno inválida.');
        }

        const stripe = subscriptionService.getStripe();
        const customerId = await subscriptionService.getOrCreateStripeCustomer(user._id);
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl.trim(),
        });

        return { url: portalSession.url };
    },
    'set.billing.switchToFree': async () => {
        const user = await currentUserAsync();
        if (!user) {
            throw new Meteor.Error('not-authorized', 'É necessário estar autenticado.');
        }

        if (subscriptionService.hasStripeConfigured()) {
            try {
                await subscriptionService.cancelStripeSubscriptionImmediately(user._id);
            } catch (error) {
                console.error('Erro ao cancelar assinatura Stripe imediatamente', error);
            }
        }

        const updated = await subscriptionService.downgradeToFree(user._id);

        return {
            subscription: {
                status: updated.status,
                planId: updated.planId,
            },
        };
    },
    'set.billing.cancelSubscriptionAtPeriodEnd': async () => {
        const user = await currentUserAsync();
        if (!user) {
            throw new Meteor.Error('not-authorized', 'É necessário estar autenticado.');
        }

        if (!subscriptionService.hasStripeConfigured()) {
            throw new Meteor.Error('stripe-not-configured', 'Stripe não está configurado.');
        }

        const updated = await subscriptionService.cancelStripeSubscription(user._id);
        return {
            subscription: {
                status: updated.status,
                planId: updated.planId,
                cancelAtPeriodEnd: updated.cancelAtPeriodEnd ?? false,
            },
        };
    },
    'set.billing.resumeSubscription': async () => {
        const user = await currentUserAsync();
        if (!user) {
            throw new Meteor.Error('not-authorized', 'É necessário estar autenticado.');
        }

        if (!subscriptionService.hasStripeConfigured()) {
            throw new Meteor.Error('stripe-not-configured', 'Stripe não está configurado.');
        }

        const updated = await subscriptionService.resumeStripeSubscription(user._id);
        return {
            subscription: {
                status: updated.status,
                planId: updated.planId,
                cancelAtPeriodEnd: updated.cancelAtPeriodEnd ?? false,
            },
        };
    },
});

import { Meteor } from 'meteor/meteor';
import { subscriptionService } from '/app/services/billing/subscriptionService';
import { currentUserAsync } from '/server/utils/meteor';

Meteor.methods({
    'get.billing.plans': async () => {
        const plans = await subscriptionService.getPublicPlans();
        return plans;
    },
    'get.billing.subscriptionOverview': async () => {
        const user = await currentUserAsync();
        if (!user) {
            throw new Meteor.Error('not-authorized', 'É necessário estar autenticado.');
        }

        const { subscription, plan } = await subscriptionService.getResolvedSubscription(user._id);
        const usage = await subscriptionService.getUsageSummary(user._id);

        return {
            plan: {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                monthlyNewsletterLimit: plan.monthlyNewsletterLimit,
                paid: plan.paid,
            },
            subscription: {
                status: subscription.status,
                planId: subscription.planId,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
                currentPeriodStart: subscription.currentPeriodStart ? subscription.currentPeriodStart.toISOString() : null,
                currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
            },
            usage: usage
                ? {
                      month: usage.month,
                      newsletterCount: usage.newsletterCount,
                  }
                : null,
            stripe: {
                configured: subscriptionService.hasStripeConfigured(),
            },
        };
    },
});

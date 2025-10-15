import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, message, Progress, Row, Space, Spin, Tag, Typography } from 'antd';
import { Meteor } from 'meteor/meteor';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { BillingPlanId, BillingPlanPublicInfo, CreateCheckoutSessionResult, FinalizeCheckoutSessionResult, SubscriptionOverview } from '/app/api/billing/models';
import { errorResponse } from '/app/utils/errors';
import { protectedRoutes } from '/app/utils/constants/routes';

const { Title, Paragraph, Text } = Typography;

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
    if (!stripePromise) {
        const publishableKey =
            (Meteor.settings?.public as any)?.STRIPE_PUBLISHABLE_KEY ||
            (typeof process !== 'undefined' ? process.env?.STRIPE_PUBLISHABLE_KEY : undefined);
        if (!publishableKey || typeof publishableKey !== 'string') {
            return null;
        }
        stripePromise = loadStripe(publishableKey);
    }
    return stripePromise;
};

const BillingPage: React.FC = () => {
    const { t, i18n } = useTranslation('common');
    const [, navigate] = useLocation();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<BillingPlanPublicInfo[]>([]);
    const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
    const [planLoading, setPlanLoading] = useState<BillingPlanId | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [finalizing, setFinalizing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [planList, subscription] = (await Promise.all([
                Meteor.callAsync('get.billing.plans'),
                Meteor.callAsync('get.billing.subscriptionOverview'),
            ])) as [BillingPlanPublicInfo[], SubscriptionOverview];
            setPlans(planList);
            setOverview(subscription);
        } catch (error) {
            errorResponse(error as Meteor.Error, t('billing.loadError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const currentPlanId = overview?.subscription.planId;
    const freePlan = useMemo(
        () => plans.find((plan) => plan.id === BillingPlanId.FREE),
        [plans],
    );

    const usageCount = overview?.usage?.newsletterCount ?? 0;
    const usageLimit = overview?.plan.monthlyNewsletterLimit ?? null;
    const remaining = useMemo(() => {
        if (usageLimit == null) return null;
        return Math.max(usageLimit - usageCount, 0);
    }, [usageLimit, usageCount]);
    const usagePercent = useMemo(() => {
        if (usageLimit == null || usageLimit <= 0) {
            return 0;
        }
        return Math.min((usageCount / usageLimit) * 100, 100);
    }, [usageCount, usageLimit]);

    const formatLimitLabel = useCallback(
        (plan: BillingPlanPublicInfo) => {
            if (plan.monthlyNewsletterLimit == null) {
                return t('billing.limitUnlimited');
            }
            if (plan.monthlyNewsletterLimit === 1) {
                return t('billing.limitSingle');
            }
            return t('billing.limitMultiple', { count: plan.monthlyNewsletterLimit });
        },
        [t],
    );

    const formatPrice = useCallback(
        (plan: BillingPlanPublicInfo) => {
            if (!plan.paid) {
                return t('billing.priceFree');
            }
            if (!plan.price) {
                return t('billing.priceContact');
            }
            const formatter = new Intl.NumberFormat(i18n.language, {
                style: 'currency',
                currency: plan.price.currency.toUpperCase(),
            });
            const amount = formatter.format(plan.price.amount / 100);
            const interval =
                plan.price.interval === 'month'
                    ? t('billing.intervalMonthly')
                    : plan.price.interval === 'year'
                      ? t('billing.intervalYearly')
                      : plan.price.interval ?? '';
            return interval ? `${amount}/${interval}` : amount;
        },
        [i18n.language, t],
    );

    const cleanQueryParams = useCallback(() => {
        navigate(protectedRoutes.billing.path, { replace: true });
    }, [navigate]);

    const finalizeCheckoutIfNeeded = useCallback(async () => {
        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('session_id');
        const successFlag = url.searchParams.get('success');
        const canceledFlag = url.searchParams.get('canceled');

        if (sessionId && successFlag) {
            setFinalizing(true);
            try {
                const result = (await Meteor.callAsync('set.billing.finalizeCheckoutSession', {
                    sessionId,
                })) as FinalizeCheckoutSessionResult;
                if (result?.subscription?.planId) {
                    message.success(t('billing.checkoutSuccess'));
                    await fetchData();
                }
            } catch (error) {
                errorResponse(error as Meteor.Error, t('billing.checkoutError'));
            } finally {
                setFinalizing(false);
                cleanQueryParams();
            }
        } else if (canceledFlag) {
            message.info(t('billing.checkoutCanceled'));
            cleanQueryParams();
        }
    }, [cleanQueryParams, fetchData, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        finalizeCheckoutIfNeeded();
    }, [finalizeCheckoutIfNeeded]);

    const handlePlanSelection = useCallback(
        async (plan: BillingPlanPublicInfo) => {
            if (plan.id === currentPlanId) {
                return;
            }

            setPlanLoading(plan.id);
            try {
                const successUrl = `${window.location.origin}${protectedRoutes.billing.path}?success=1`;
                const cancelUrl = `${window.location.origin}${protectedRoutes.billing.path}?canceled=1`;
                const result = (await Meteor.callAsync('set.billing.createCheckoutSession', {
                    planId: plan.id,
                    successUrl,
                    cancelUrl,
                })) as CreateCheckoutSessionResult;

                if (!plan.paid) {
                    message.success(t('billing.freeActivated'));
                    await fetchData();
                    return;
                }

                if (!result.sessionId) {
                    message.error(t('billing.checkoutUnavailable'));
                    return;
                }

                const stripeClientPromise = getStripe();
                if (!stripeClientPromise) {
                    message.error(t('billing.missingPublishableKey'));
                    return;
                }

                const stripeClient = await stripeClientPromise;
                if (!stripeClient) {
                    message.error(t('billing.checkoutUnavailable'));
                    return;
                }

                const { error } = await stripeClient.redirectToCheckout({
                    sessionId: result.sessionId,
                });

                if (error) {
                    message.error(error.message || t('billing.checkoutError'));
                }
            } catch (error) {
                errorResponse(error as Meteor.Error, t('billing.checkoutError'));
            } finally {
                setPlanLoading(null);
            }
        },
        [currentPlanId, fetchData, t],
    );

    const handlePortal = useCallback(async () => {
        setActionLoading('portal');
        try {
            const returnUrl = `${window.location.origin}${protectedRoutes.billing.path}`;
            const result = (await Meteor.callAsync('set.billing.createPortalSession', {
                returnUrl,
            })) as { url?: string };
            if (result?.url) {
                window.location.href = result.url;
            } else {
                message.error(t('billing.portalUnavailable'));
            }
        } catch (error) {
            errorResponse(error as Meteor.Error, t('billing.portalError'));
        } finally {
            setActionLoading(null);
        }
    }, [t]);

    const handleCancelAtPeriodEnd = useCallback(async () => {
        setActionLoading('cancel');
        try {
            await Meteor.callAsync('set.billing.cancelSubscriptionAtPeriodEnd');
            message.success(t('billing.cancelAtPeriodEndConfirmation'));
            await fetchData();
        } catch (error) {
            errorResponse(error as Meteor.Error, t('billing.portalError'));
        } finally {
            setActionLoading(null);
        }
    }, [fetchData, t]);

    const handleResumeSubscription = useCallback(async () => {
        setActionLoading('resume');
        try {
            await Meteor.callAsync('set.billing.resumeSubscription');
            message.success(t('billing.resumeSuccess'));
            await fetchData();
        } catch (error) {
            errorResponse(error as Meteor.Error, t('billing.portalError'));
        } finally {
            setActionLoading(null);
        }
    }, [fetchData, t]);

    const loadingState = loading || finalizing;

    return (
        <Spin spinning={loadingState}>
            <Space
                direction="vertical"
                size="large"
                style={{ width: '100%' }}
            >
                <div>
                    <Title level={2}>{t('billing.title')}</Title>
                    <Paragraph type="secondary">{t('billing.subtitle')}</Paragraph>
                </div>

                {overview && (
                    <Card>
                        <Space
                            direction="vertical"
                            size="large"
                            style={{ width: '100%' }}
                        >
                            <div>
                                <Text strong>{t('billing.currentPlan')}</Text>
                                <div>
                                    <Title
                                        level={4}
                                        style={{ marginBottom: 0 }}
                                    >
                                        {overview.plan.name}
                                    </Title>
                                    <Text type="secondary">{formatLimitLabel(overview.plan)}</Text>
                                </div>
                            </div>
                            <div>
                                <Text strong>{t('billing.usageTitle')}</Text>
                                {usageLimit != null ? (
                                    <Space direction="vertical">
                                        <Progress
                                            percent={usagePercent}
                                            status={
                                                usageLimit > 0 && usageCount >= usageLimit ? 'exception' : 'normal'
                                            }
                                        />
                                        <Text>
                                            {t('billing.usageSummary', {
                                                used: usageCount,
                                                limit: usageLimit,
                                            })}
                                        </Text>
                                        <Text type="secondary">
                                            {t('billing.usageRemaining', {
                                                remaining: remaining ?? 0,
                                            })}
                                        </Text>
                                    </Space>
                                ) : (
                                    <Text>{t('billing.usageUnlimited', { used: usageCount })}</Text>
                                )}
                            </div>

                            {overview.subscription.cancelAtPeriodEnd && (
                                <Alert
                                    type="warning"
                                    message={t('billing.cancelScheduled')}
                                    showIcon
                                />
                            )}
                        </Space>
                    </Card>
                )}

                {!overview?.stripe.configured && (
                    <Alert
                        type="warning"
                        showIcon
                        message={t('billing.stripeWarningTitle')}
                        description={t('billing.stripeWarningDescription')}
                    />
                )}

                <Row gutter={[24, 24]}>
                    {plans.map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        const disablePaidAction = plan.paid && !overview?.stripe.configured;
                        return (
                            <Col
                                key={plan.id}
                                xs={24}
                                md={12}
                                xl={8}
                            >
                                <Card
                                    bordered
                                    style={
                                        isCurrent
                                            ? { borderColor: '#2563eb', boxShadow: '0 0 0 1px rgba(37,99,235,0.2)' }
                                            : undefined
                                    }
                                >
                                    <Space
                                        direction="vertical"
                                        size="middle"
                                        style={{ width: '100%' }}
                                    >
                                        <div>
                                            <Space>
                                                <Title
                                                    level={4}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    {plan.name}
                                                </Title>
                                                {isCurrent && <Tag color="blue">{t('billing.currentTag')}</Tag>}
                                            </Space>
                                            <Paragraph type="secondary">{plan.description}</Paragraph>
                                        </div>

                                        <Title level={3}>{formatPrice(plan)}</Title>
                                        <Tag>{formatLimitLabel(plan)}</Tag>

                                        <Button
                                            type={isCurrent ? 'default' : 'primary'}
                                            disabled={isCurrent || disablePaidAction}
                                            loading={planLoading === plan.id}
                                            onClick={() => handlePlanSelection(plan)}
                                            block
                                        >
                                            {isCurrent
                                                ? t('billing.currentPlanButton')
                                                : plan.paid
                                                    ? t('billing.choosePlanButton')
                                                    : t('billing.activateFreeButton')}
                                        </Button>

                                        {isCurrent && overview?.subscription.planId !== BillingPlanId.FREE && (
                                            <Space
                                                direction="vertical"
                                                style={{ width: '100%' }}
                                            >
                                                <Button
                                                    onClick={handlePortal}
                                                    block
                                                    loading={actionLoading === 'portal'}
                                                    type="default"
                                                >
                                                    {t('billing.manageBilling')}
                                                </Button>
                                                {overview.subscription.cancelAtPeriodEnd ? (
                                                    <Button
                                                        onClick={handleResumeSubscription}
                                                        type="link"
                                                        block
                                                        loading={actionLoading === 'resume'}
                                                    >
                                                        {t('billing.resumeSubscription')}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={handleCancelAtPeriodEnd}
                                                        type="link"
                                                        block
                                                        loading={actionLoading === 'cancel'}
                                                    >
                                                        {t('billing.cancelAtPeriodEnd')}
                                                    </Button>
                                                )}
                                                {freePlan && (
                                                    <Button
                                                        onClick={() => handlePlanSelection(freePlan)}
                                                        type="link"
                                                        block
                                                        disabled={planLoading === freePlan.id}
                                                    >
                                                        {t('billing.switchToFree')}
                                                    </Button>
                                                )}
                                            </Space>
                                        )}
                                    </Space>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            </Space>
        </Spin>
    );
};

export default BillingPage;

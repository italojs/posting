import {
    LoadingOutlined,
    SendOutlined,
    RobotOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    FileTextOutlined,
    SearchOutlined,
    CopyOutlined,
    AppstoreAddOutlined,
    TwitterOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Form, Input, List, Space, Typography, message, Badge, Collapse, Select, Tag, Radio } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';

type BasicSiteProps = {
    userId?: string;
};
import {
    RssItem,
    NewsletterSection,
    GenerateSuggestionResult,
    CreateContentInput,
    GenerateSectionSearchResult,
    SearchNewsResult,
    GeneratedNewsletterPreview,
    GeneratedNewsletterSectionPreview,
    GenerateTwitterThreadResult,
    TwitterThread,
} from '/app/api/contents/models';
import { BrandSummary, BrandContextForAI } from '/app/api/brands/models';

import { publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';

type CreateContentPageProps = BasicSiteProps;
type SectionGenerationEntry = {
    preview: GeneratedNewsletterSectionPreview;
    fingerprint: string;
    generatedAt: string;
};
type SectionGenerationMap = Record<string, SectionGenerationEntry>;

const CreateContentPage: React.FC<CreateContentPageProps> = ({ userId }) => {
    const [form] = Form.useForm();
    const { t, i18n } = useTranslation('common');
    const [, navigate] = useLocation();
    const [loading, setLoading] = useState(false);
    const [AILoading, setAILoading] = useState(false);
    const [processingNewsletter, setProcessingNewsletter] = useState(false);
    const [contentType, setContentType] = useState<'newsletter' | 'social' | null>(null);
    
    
    // Custom CSS for Collapse
    const collapseStyles = `
        .custom-collapse .ant-collapse-item {
            border: 1px solid #e9ecef !important;
            border-radius: 8px !important;
            margin-bottom: 12px !important;
            overflow: hidden !important;
        }
        .custom-collapse .ant-collapse-header {
            background-color: #f8f9fa !important;
            border: none !important;
            padding: 12px 16px !important;
        }
        .custom-collapse .ant-collapse-content {
            border-top: none !important;
            background-color: #ffffff !important;
        }
        .custom-collapse .ant-collapse-content-box {
            padding: 16px !important;
        }
        
        /* Custom scrollbar styles */
        .rss-articles-scroll::-webkit-scrollbar {
            width: 6px;
        }
        .rss-articles-scroll::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }
        .rss-articles-scroll::-webkit-scrollbar-thumb {
            background: #1DA1F2;
            border-radius: 3px;
        }
        .rss-articles-scroll::-webkit-scrollbar-thumb:hover {
            background: #0d8bd9;
        }
    `;
    const [isEdit, params] = useRoute(protectedRoutes.editContent.path);
    const editingId = isEdit ? (params as any)?.id as string : undefined;
    const [rssItems, setRssItems] = useState<RssItem[]>([]);
    const [selectedItemLinks, setSelectedItemLinks] = useState<Set<string>>(new Set());
    const [favoriteUrls, setFavoriteUrls] = useState<string[]>([]);
    // removed per-source manual selection; always use all favorites
    // Newsletter sections: when newsletter is selected, user can create multiple sections and pick items per section
    const [sections, setSections] = useState<NewsletterSection[]>([]);
    const [activeSectionIndex, setActiveSectionIndex] = useState<number>(-1);
    const [sectionQueryLoading, setSectionQueryLoading] = useState<Record<string, boolean>>({});
    const [sectionNewsLoading, setSectionNewsLoading] = useState<Record<string, boolean>>({});
    const [sectionNewsResults, setSectionNewsResults] = useState<Record<string, SearchNewsResult[]>>({});
    const requestedQueriesRef = useRef<Set<string>>(new Set());
    const [newsletterPreview, setNewsletterPreview] = useState<GeneratedNewsletterPreview | null>(null);
    const [sectionGenerations, setSectionGenerations] = useState<SectionGenerationMap>({});
    const [sectionGenerationLoading, setSectionGenerationLoading] = useState<Record<string, boolean>>({});
    const [brands, setBrands] = useState<BrandSummary[]>([]);
    const [brandsLoading, setBrandsLoading] = useState(false);
    const [loadedContentBrand, setLoadedContentBrand] = useState<{ id: string; snapshot?: BrandContextForAI } | null>(null);

    // Twitter Thread states
    const [selectedTwitterArticle, setSelectedTwitterArticle] = useState<RssItem | null>(null);
    const [generatingThread, setGeneratingThread] = useState(false);
    const [generatedThread, setGeneratedThread] = useState<TwitterThread | null>(null);

    const fetchBrands = useCallback(async () => {
        setBrandsLoading(true);
        try {
            const result = (await Meteor.callAsync('get.brands.mine')) as BrandSummary[];
            setBrands(result || []);
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.brandsLoadError'));
        } finally {
            setBrandsLoading(false);
        }
    }, [t]);

    const handleCopyPreviewMarkdown = async () => {
        if (!newsletterPreview?.compiledMarkdown) return;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(newsletterPreview.compiledMarkdown);
                message.success(t('createContent.newsletterPreviewCopySuccess'));
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (error) {
            message.error(t('createContent.newsletterPreviewCopyError'));
        }
    };
    // Only favorites mode

    const currentSection = activeSectionIndex >= 0 ? sections[activeSectionIndex] : undefined;
    const currentSectionId = currentSection?.id ?? '';
    const currentSectionQueries = currentSection?.newsSearchQueries || [];
    const currentSectionNewsResults = currentSectionId ? sectionNewsResults[currentSectionId] || [] : [];
    const currentSectionQueriesLoading = currentSectionId ? !!sectionQueryLoading[currentSectionId] : false;
    const currentSectionNewsLoading = currentSectionId ? !!sectionNewsLoading[currentSectionId] : false;
    const currentSectionGeneration = currentSectionId ? sectionGenerations[currentSectionId] : undefined;
    const currentSectionGenerationLoading = currentSectionId ? !!sectionGenerationLoading[currentSectionId] : false;
    const sectionsWithContent = useMemo(
        () =>
            sections.filter(
                (section) => (section.rssItems?.length || 0) > 0 || (section.newsArticles?.length || 0) > 0,
            ),
        [sections],
    );
    const generatedSectionsCount = useMemo(
        () =>
            sectionsWithContent.filter((section) => {
                if (!section.id) return false;
                return !!sectionGenerations[section.id];
            }).length,
        [sectionsWithContent, sectionGenerations],
    );
    const allSectionsGenerated = sectionsWithContent.length > 0 && generatedSectionsCount === sectionsWithContent.length;
    // const freePlanLimit = subscriptionOverview?.plan?.monthlyNewsletterLimit ?? null;
    // const usedNewsletters = subscriptionOverview?.usage?.newsletterCount ?? 0;
    const freePlanLimit = null;
    const usedNewsletters = 0;
    const remainingNewsletters = freePlanLimit != null ? Math.max(freePlanLimit - usedNewsletters, 0) : null;
    // const showFreePlanLimitAlert = subscriptionOverview?.plan?.id === BillingPlanId.FREE && freePlanLimit != null;
    const showFreePlanLimitAlert = false;
    const freePlanLimitLabel = useMemo(() => {
        if (freePlanLimit == null) return '';
        return freePlanLimit === 1
            ? t('createContent.freePlanLimitSingle')
            : t('createContent.freePlanLimitMultiple', { count: freePlanLimit });
    }, [freePlanLimit, t]);
    const computeSectionFingerprint = useCallback((section: NewsletterSection): string => {
        if (!section) return '';
        const rssItems = (section.rssItems || []).map((item) => ({
            link: item.link || '',
            title: item.title || '',
        }));
        const newsArticles = (section.newsArticles || []).map((item) => ({
            link: item.link || '',
            title: item.title || '',
        }));

        return JSON.stringify({
            title: (section.title || '').trim(),
            description: (section.description || '').trim(),
            rssItems,
            newsArticles,
        });
    }, []);

    useEffect(() => {
        const run = async () => {
            try {
                setLoadedContentBrand(null);
                const res = (await Meteor.callAsync('get.userProfiles.rssFavorites')) as { urls: string[] };
                const urls = (res.urls || []).filter(Boolean);
                setFavoriteUrls(urls);
                requestedQueriesRef.current = new Set();
                setSectionNewsResults({});
                setSectionQueryLoading({});
                setSectionNewsLoading({});
                setNewsletterPreview(null);
                // sempre usar todos os favoritos
                // If editing, load existing content and populate
                if (editingId) {
                    const doc = (await Meteor.callAsync('get.contents.byId', { _id: editingId })) as any;
                    if (doc) {
                        form.setFieldsValue({
                            name: doc.name,
                            audience: doc.audience,
                            goal: doc.goal,
                            brandId: doc.brandId,
                            newsletter: !!doc.networks?.newsletter,
                            instagram: !!doc.networks?.instagram,
                            twitter: !!doc.networks?.twitter,
                            tiktok: !!doc.networks?.tiktok,
                            linkedin: !!doc.networks?.linkedin,
                        });
                        setLoadedContentBrand(
                            doc.brandId
                                ? {
                                      id: doc.brandId,
                                      snapshot: doc.brandSnapshot,
                                  }
                                : null,
                        );
                        // ignorar seleções salvas; usar todos os favoritos
                        // Preload sections and selected items
                        const docSections = (doc.newsletterSections || []) as NewsletterSection[];
                        const normalizedSections = docSections.map((section) => ({
                            ...section,
                            rssItems: Array.isArray(section.rssItems) ? section.rssItems : [],
                            newsArticles: Array.isArray((section as any).newsArticles)
                                ? (section as any).newsArticles
                                : [],
                            newsSearchQueries: Array.isArray(section.newsSearchQueries)
                                ? section.newsSearchQueries
                                : undefined,
                        }));
                        setSections(normalizedSections);
                        setSectionGenerations({});
                        requestedQueriesRef.current = new Set(
                            docSections
                                .filter((section) => Array.isArray(section.newsSearchQueries) && section.newsSearchQueries.length > 0)
                                .map((section) => section.id)
                                .filter((id): id is string => typeof id === 'string'),
                        );
                        setSectionNewsResults({});
                        setSectionQueryLoading({});
                        setSectionNewsLoading({});
                        setActiveSectionIndex(docSections.length ? 0 : -1);
                        // For general (non-newsletter), mark selectedItemLinks from doc.rssItems
                        const selectedLinks = new Set<string>((doc.rssItems || []).map((it: RssItem) => it.link || it.title || ''));
                        setSelectedItemLinks(selectedLinks);
                        if (doc.newsletterOutput) {
                            const { generatedAt: _generatedAt, ...storedPreview } = doc.newsletterOutput;
                            setNewsletterPreview(storedPreview as GeneratedNewsletterPreview);
                        }
                    }
                }
            } catch (err) {
                // ignore
            }
        };
        run();
    }, [editingId]);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    useEffect(() => {
        if (!userId) return;

        return () => {
        };
    }, [userId, t]);

    // manual URL input removed; only favorites are used

    // Observa valores do formulário para redes sociais (inclusive setFieldsValue)
    const watchNewsletter = Form.useWatch('newsletter', form);
    const watchInstagram = Form.useWatch('instagram', form);
    const watchTwitter = Form.useWatch('twitter', form);
    const watchTiktok = Form.useWatch('tiktok', form);
    const watchLinkedin = Form.useWatch('linkedin', form);
    const watchBrandId = Form.useWatch('brandId', form);

    const resolveBrandContext = useCallback(
        (brandId?: string | null): BrandContextForAI | undefined => {
            if (!brandId) return undefined;
            const brand = brands.find((item) => item._id === brandId);
            if (brand) {
                return {
                    name: brand.name,
                    description: brand.description,
                    tone: brand.tone,
                    audience: brand.audience,
                    differentiators: brand.differentiators,
                    keywords: brand.keywords,
                };
            }
            if (loadedContentBrand && loadedContentBrand.id === brandId && loadedContentBrand.snapshot) {
                return loadedContentBrand.snapshot;
            }
            return undefined;
        },
        [brands, loadedContentBrand],
    );

    const brandOptions = useMemo(() => {
        const options = brands.map((brand) => ({ value: brand._id, label: brand.name }));
        if (loadedContentBrand && loadedContentBrand.id && !options.some((option) => option.value === loadedContentBrand.id)) {
            options.push({
                value: loadedContentBrand.id,
                label:
                    loadedContentBrand.snapshot?.name
                        ? `${loadedContentBrand.snapshot.name} ${t('createContent.brandMissingSuffix')}`
                        : t('createContent.brandMissingLabel'),
            });
        }
        return options;
    }, [brands, loadedContentBrand, t]);

    const selectedBrandSummary = useMemo<BrandSummary | undefined>(() => {
        if (!watchBrandId) return undefined;
        const found = brands.find((brand) => brand._id === watchBrandId);
        if (found) return found;
        if (loadedContentBrand && loadedContentBrand.id === watchBrandId && loadedContentBrand.snapshot) {
            const snapshot = loadedContentBrand.snapshot;
            return {
                _id: watchBrandId,
                name: snapshot.name || t('createContent.brandMissingName'),
                description: snapshot.description,
                tone: snapshot.tone,
                audience: snapshot.audience,
                differentiators: snapshot.differentiators,
                keywords: snapshot.keywords,
            };
        }
        return undefined;
    }, [brands, watchBrandId, loadedContentBrand, t]);

    const isBrandMissing = useMemo(() => {
        if (!watchBrandId) return false;
        const exists = brands.some((brand) => brand._id === watchBrandId);
        return !exists && loadedContentBrand !== null && loadedContentBrand.id === watchBrandId;
    }, [brands, loadedContentBrand, watchBrandId]);

    useEffect(() => {
        if (!watchNewsletter) return;
        if (sections.length === 0) return;

        const sectionsToFetch = sections.filter((section) => {
            const sectionId = section.id;
            if (!sectionId) return false;
            if (!section.title || section.title.trim().length < 3) return false;
            if (section.newsSearchQueries && section.newsSearchQueries.length > 0) return false;
            if (requestedQueriesRef.current.has(sectionId)) return false;
            return true;
        });

        if (sectionsToFetch.length === 0) return;

        let cancelled = false;

        const fetchSuggestions = async () => {
            const newsletterValues = form.getFieldsValue(['name', 'audience', 'goal']);
            const brandContext = resolveBrandContext(form.getFieldValue('brandId'));
            for (const section of sectionsToFetch) {
                if (cancelled) break;
                const sectionId = section.id as string;
                requestedQueriesRef.current.add(sectionId);
                setSectionQueryLoading((prev) => ({ ...prev, [sectionId]: true }));
                try {
                    const result = (await Meteor.callAsync('get.contents.generateSectionSearchQueries', {
                        newsletter: {
                            name: newsletterValues?.name || '',
                            audience: newsletterValues?.audience || '',
                            goal: newsletterValues?.goal || '',
                        },
                        section: { title: section.title, description: section.description },
                        language: i18n.language,
                        brand: brandContext,
                    })) as GenerateSectionSearchResult;

                    if (!cancelled && result?.queries?.length) {
                        setSections((prev) =>
                            prev.map((item) => (item.id === sectionId ? { ...item, newsSearchQueries: result.queries } : item)),
                        );
                    }
                } catch (error) {
                    if (!cancelled) {
                        errorResponse(error as Meteor.Error, t('createContent.sectionSearchSuggestionsError'));
                    }
                } finally {
                    if (!cancelled) {
                        setSectionQueryLoading((prev) => ({ ...prev, [sectionId]: false }));
                    }
                }
            }
        };

        fetchSuggestions();

        return () => {
            cancelled = true;
        };
    }, [sections, watchNewsletter, form, i18n.language, t, resolveBrandContext, watchBrandId]);

    useEffect(() => {
        const existingIds = new Set(
            sections
                .map((section) => section.id)
                .filter((id): id is string => typeof id === 'string'),
        );

        requestedQueriesRef.current = new Set(
            Array.from(requestedQueriesRef.current).filter((id) => existingIds.has(id)),
        );

        setSectionNewsResults((prev) => {
            const entries = Object.entries(prev).filter(([key]) => existingIds.has(key));
            if (entries.length === Object.keys(prev).length) return prev;
            return entries.reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {} as Record<string, SearchNewsResult[]>);
        });

        setSectionNewsLoading((prev) => {
            const entries = Object.entries(prev).filter(([key]) => existingIds.has(key));
            if (entries.length === Object.keys(prev).length) return prev;
            return entries.reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {} as Record<string, boolean>);
        });

        setSectionQueryLoading((prev) => {
            const entries = Object.entries(prev).filter(([key]) => existingIds.has(key));
            if (entries.length === Object.keys(prev).length) return prev;
            return entries.reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {} as Record<string, boolean>);
        });
    }, [sections]);
    useEffect(() => {
        if (sections.length === 0 && Object.keys(sectionGenerations).length === 0) {
            return;
        }

        const nextMap: SectionGenerationMap = {};
        let shouldUpdate = false;
        const validIds = new Set<string>();

        for (const section of sections) {
            if (!section.id) continue;
            validIds.add(section.id);
            const existing = sectionGenerations[section.id];
            if (!existing) continue;
            const fingerprint = computeSectionFingerprint(section);
            if (existing.fingerprint === fingerprint) {
                nextMap[section.id] = existing;
            } else {
                shouldUpdate = true;
            }
        }

        if (!shouldUpdate) {
            for (const key of Object.keys(sectionGenerations)) {
                if (!validIds.has(key)) {
                    shouldUpdate = true;
                    break;
                }
            }
        }

        if (shouldUpdate) {
            setSectionGenerations(nextMap);
            setNewsletterPreview(null);
        }
    }, [sections, sectionGenerations, computeSectionFingerprint]);

    const handleFetchRss = async (auto = false) => {
        // Only fetch when at least one network is selected
        const v = form.getFieldsValue(['newsletter', 'instagram', 'twitter', 'tiktok', 'linkedin']);
        const anyNetwork = !!(v?.newsletter || v?.instagram || v?.twitter || v?.tiktok || v?.linkedin);
        if (!anyNetwork) {
            if (!auto) message.info(t('createContent.selectNetworkPrompt'));
            setRssItems([]);
            setSelectedItemLinks(new Set());
            return;
        }

        const merged = Array.from(new Set(favoriteUrls));
        if (merged.length === 0) {
            if (!auto) message.warning(t('createContent.needAtLeastOneUrl'));
            setRssItems([]);
            setSelectedItemLinks(new Set());
            return;
        }
        setLoading(true);
        try {
            const res = (await Meteor.callAsync('get.contents.fetchRss', { urls: merged })) as { items: RssItem[] };
            setRssItems(res.items || []);
            setSelectedItemLinks(new Set());
            if ((res.items || []).length === 0) message.info(t('createContent.listEmpty'));
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.loadError'));
        }
        setLoading(false);
    };

    // Auto-carrega itens quando favoritos OU redes mudarem (inclusive quando setadas via setFieldsValue)
    useEffect(() => {
        const any = !!(watchNewsletter || watchInstagram || watchTwitter || watchTiktok || watchLinkedin);
        if (!any) return;
        if (favoriteUrls.length === 0) return;
        handleFetchRss(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favoriteUrls, watchNewsletter, watchInstagram, watchTwitter, watchTiktok, watchLinkedin]);

    const buildContentPayload = async (): Promise<CreateContentInput> => {
        const values = await form.validateFields();
        const urls = Array.from(new Set(favoriteUrls));
        const itemsToSave = rssItems.filter((it) => !it.link || selectedItemLinks.has(it.link));

        let newsletterSectionsPayload: NewsletterSection[] | undefined = undefined;
        if (values.newsletter && sections.length > 0) {
            newsletterSectionsPayload = sections.map((s, idx) => ({
                id: s.id,
                title: s.title?.trim() || `Seção ${idx + 1}`,
                description: s.description?.trim() || undefined,
                rssItems: s.rssItems || [],
                newsArticles: s.newsArticles || [],
                newsSearchQueries:
                    s.newsSearchQueries && s.newsSearchQueries.length > 0 ? [...s.newsSearchQueries] : undefined,
            }));
        }

        return {
            name: values.name,
            audience: values.audience,
            goal: values.goal,
            rssUrls: urls,
            rssItems: itemsToSave,
            networks: {
                newsletter: !!values.newsletter,
                instagram: !!values.instagram,
                twitter: !!values.twitter,
                tiktok: !!values.tiktok,
                linkedin: !!values.linkedin,
            },
            newsletterSections: newsletterSectionsPayload,
            brandId: values.brandId || undefined,
        };
    };

    const handleSave = async () => {
        let payload: CreateContentInput;
        try {
            payload = await buildContentPayload();
        } catch (error) {
            if (!(error as any)?.errorFields) {
                errorResponse(error as Meteor.Error, t('createContent.saveError'));
            }
            return;
        }

        const isNewsletterFlow = !!payload.networks.newsletter;
        let navigateDestination: string | null = null;

        let generatedSectionPayload: GeneratedNewsletterSectionPreview[] | undefined;
        if (isNewsletterFlow) {
            if (sectionsWithContent.length === 0) {
                message.info(t('createContent.sectionGenerationStatusEmpty'));
                return;
            }
            if (!allSectionsGenerated) {
                message.warning(t('createContent.sectionGenerationMissing'));
                return;
            }
            generatedSectionPayload = sections
                .map((section) => (section.id ? sectionGenerations[section.id]?.preview : undefined))
                .filter((section): section is GeneratedNewsletterSectionPreview => !!section);
        }

        if (isNewsletterFlow) {
            setProcessingNewsletter(true);
            setNewsletterPreview(null);
        } else {
            setLoading(true);
        }

        const method = editingId ? 'set.contents.update' : 'set.contents.create';
        const params = editingId ? { _id: editingId, ...payload } : payload;

        let savedId = editingId;
        try {
            const saveResult = (await Meteor.callAsync(method, params)) as { _id: string };
            if (!savedId) {
                savedId = saveResult?._id;
            }

            if (isNewsletterFlow) {
                if (!savedId) {
                    message.error(t('createContent.saveError'));
                } else {
                    if (!editingId) {
                        navigateDestination = protectedRoutes.editContent.path.replace(':id', savedId);
                    }
                    try {
                        const preview = (await Meteor.callAsync('set.contents.processNewsletter', {
                            ...payload,
                            _id: savedId,
                            language: i18n.language,
                            generatedSections: generatedSectionPayload,
                        })) as GeneratedNewsletterPreview;
                        setNewsletterPreview(preview);
                        message.success(t('createContent.processNewsletterSuccess'));
                    } catch (error) {
                        errorResponse(error as Meteor.Error, t('createContent.processNewsletterError'));
                    }
                }
            } else {
                message.success(t('createContent.saved'));
                navigateDestination = publicRoutes.home.path;
            }
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.saveError'));
        } finally {
            if (isNewsletterFlow) {
                setProcessingNewsletter(false);
            } else {
                setLoading(false);
            }
        }

        if (navigateDestination) {
            navigate(navigateDestination);
        }
    };

    const handleGenerateAISuggestion = async () => {
        try {
            const networkValues = form.getFieldsValue(['newsletter', 'instagram', 'twitter', 'tiktok', 'linkedin']);
            const anyNetwork = !!(networkValues?.newsletter || networkValues?.instagram || networkValues?.twitter || networkValues?.tiktok || networkValues?.linkedin);
            if (!anyNetwork) {
                message.warning(t('createContent.selectNetworkPrompt'));
                return;
            }

            const formValues = await form.validateFields(['name', 'audience', 'goal']);
            const brandContext = resolveBrandContext(form.getFieldValue('brandId'));
            
            setAILoading(true);
            
            const numberOfSections = 3;
            
            // Get current language from i18n
            const currentLanguage = i18n.language;

            const result = (await Meteor.callAsync('get.contents.generateSuggestion', {
                contentTemplate: formValues,
                numberOfSections,
                language: currentLanguage,
                brand: brandContext,
            })) as GenerateSuggestionResult;

            form.setFieldsValue({
                name: result.title
            });

            if (networkValues.newsletter) {
                const newSections: NewsletterSection[] = result.sections.map((section, index) => ({
                    id: sections[index]?.id || Math.random().toString(36).slice(2, 9),
                    title: section.title,
                    description: section.description,
                    rssItems: [],
                    newsArticles: [],
                    newsSearchQueries:
                        section.newsSearchQueries && section.newsSearchQueries.length > 0
                            ? section.newsSearchQueries
                            : undefined,
                }));
                setSections(newSections);
                requestedQueriesRef.current = new Set(
                    newSections
                        .filter((section) => section.newsSearchQueries && section.newsSearchQueries.length > 0 && section.id)
                        .map((section) => section.id as string),
                );
                setSectionNewsResults({});
                setSectionQueryLoading({});
                setSectionNewsLoading({});
                setSectionGenerations({});
                setNewsletterPreview(null);
                setActiveSectionIndex(0);
            }

            message.success(t('createContent.generateAISuggestionSuccess', { count: result.sections.length }));

        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.generateAISuggestionError'));
        } finally {
            setAILoading(false);
        }
    };

    const handleRefreshSectionQueries = async (section: NewsletterSection) => {
        const sectionId = section.id;
        if (!sectionId) return;
        const trimmedTitle = section.title?.trim();
        if (!trimmedTitle) {
            message.info(t('createContent.sectionSearchSuggestionsNeedTitle'));
            return;
        }

        requestedQueriesRef.current.add(sectionId);
        setSectionQueryLoading((prev) => ({ ...prev, [sectionId]: true }));

        try {
            const newsletterValues = form.getFieldsValue(['name', 'audience', 'goal']);
            const result = (await Meteor.callAsync('get.contents.generateSectionSearchQueries', {
                newsletter: {
                    name: newsletterValues?.name || '',
                    audience: newsletterValues?.audience || '',
                    goal: newsletterValues?.goal || '',
                },
                section: { title: section.title, description: section.description },
                language: i18n.language,
                brand: resolveBrandContext(form.getFieldValue('brandId')),
            })) as GenerateSectionSearchResult;

            setSections((prev) =>
                prev.map((item) => (item.id === sectionId ? { ...item, newsSearchQueries: result.queries } : item)),
            );
            setSectionNewsResults((prev) => {
                if (!prev[sectionId]) return prev;
                const { [sectionId]: _removed, ...rest } = prev;
                return rest;
            });
            if (result.queries.length === 0) {
                message.warning(t('createContent.sectionSearchSuggestionsEmptyResult'));
            } else {
                message.success(t('createContent.sectionSearchSuggestionsUpdated'));
            }
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.sectionSearchSuggestionsError'));
        } finally {
            setSectionQueryLoading((prev) => ({ ...prev, [sectionId]: false }));
        }
    };

    const handleFetchNewsForSection = async (section: NewsletterSection) => {
        const sectionId = section.id;
        if (!sectionId) return;
        const queries = (section.newsSearchQueries || []).filter((query) => !!query?.trim());
        if (queries.length === 0) {
            message.info(t('createContent.sectionSearchNewsNeedSuggestions'));
            return;
        }

        const uniqueQueries = Array.from(new Set(queries)).slice(0, 3);
        setSectionNewsLoading((prev) => ({ ...prev, [sectionId]: true }));

        try {
            const results = (await Promise.all(
                uniqueQueries.map((query) =>
                    Meteor.callAsync('get.contents.searchNews', {
                        query,
                        language: i18n.language,
                    }) as Promise<SearchNewsResult>,
                ),
            )) as SearchNewsResult[];

            setSectionNewsResults((prev) => ({ ...prev, [sectionId]: results }));
            message.success(t('createContent.sectionSearchNewsLoaded'));
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.sectionSearchNewsError'));
        } finally {
            setSectionNewsLoading((prev) => ({ ...prev, [sectionId]: false }));
        }
    };

    const handleGenerateSectionContent = async (section: NewsletterSection) => {
        const sectionId = section.id;
        if (!sectionId) return;

        const hasContent =
            (section.rssItems && section.rssItems.length > 0) ||
            (section.newsArticles && section.newsArticles.length > 0);

        if (!hasContent) {
            message.info(t('createContent.sectionGenerationNeedContent'));
            return;
        }

        let baseValues: { name: string; audience?: string; goal?: string };
        try {
            baseValues = await form.validateFields(['name', 'audience', 'goal']);
        } catch (error) {
            // Validation errors already highlighted by the form
            return;
        }

        setSectionGenerationLoading((prev) => ({ ...prev, [sectionId]: true }));
        try {
            const preview = (await Meteor.callAsync('set.contents.generateNewsletterSection', {
                _id: editingId,
                name: baseValues.name,
                audience: baseValues.audience,
                goal: baseValues.goal,
                section: {
                    ...section,
                    rssItems: Array.isArray(section.rssItems) ? section.rssItems : [],
                    newsArticles: Array.isArray(section.newsArticles) ? section.newsArticles : [],
                    newsSearchQueries: Array.isArray(section.newsSearchQueries)
                        ? section.newsSearchQueries
                        : undefined,
                },
                language: i18n.language,
                brandId: form.getFieldValue('brandId') || undefined,
            })) as GeneratedNewsletterSectionPreview;

            const fingerprint = computeSectionFingerprint(section);
            setSectionGenerations((prev) => ({
                ...prev,
                [sectionId]: {
                    preview,
                    fingerprint,
                    generatedAt: new Date().toISOString(),
                },
            }));
            setNewsletterPreview(null);
            message.success(t('createContent.sectionGenerationSuccess'));
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.sectionGenerationError'));
        } finally {
            setSectionGenerationLoading((prev) => {
                const next = { ...prev };
                delete next[sectionId];
                return next;
            });
        }
    };

    // Twitter Thread functions
    const handleGenerateTwitterThread = async () => {
        if (!selectedTwitterArticle) {
            message.error(t('createContent.selectArticlePrompt'));
            return;
        }

        setGeneratingThread(true);
        try {
            const brandContext = resolveBrandContext(watchBrandId);
            
            // Use text extraction for better content analysis
            let articleWithFullText = selectedTwitterArticle;
            if (selectedTwitterArticle.link) {
                try {
                    const extractedText = await Meteor.callAsync('extract.articleText', {
                        url: selectedTwitterArticle.link
                    }) as { text: string };
                    
                    if (extractedText?.text) {
                        articleWithFullText = {
                            ...selectedTwitterArticle,
                            contentSnippet: extractedText.text
                        };
                    }
                } catch (error) {
                    // Silently fallback to original content if extraction fails
                }
            }
            
            const result = (await Meteor.callAsync('get.contents.generateTwitterThread', {
                article: articleWithFullText,
                brand: brandContext,
                language: i18n.language,
            })) as GenerateTwitterThreadResult;

            setGeneratedThread(result.thread);
            message.success(t('createContent.threadGenerated'));
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.threadGenerationError'));
        } finally {
            setGeneratingThread(false);
        }
    };

    const handleCopyIndividualTweet = async (tweet: string, index: number) => {
        const numberedTweet = `${index + 1}/ ${tweet}`;
        
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(numberedTweet);
            message.success(t('createContent.tweetCopied', { number: index + 1 }));
        } else {
            message.error(t('createContent.clipboardNotSupported'));
        }
    };

    const handleResetTwitterThread = () => {
        setSelectedTwitterArticle(null);
        setGeneratedThread(null);
    };

    

    if (!userId) {
        // fallback guard
        navigate(protectedRoutes.createContent.path);
        return <LoadingOutlined />;
    }

    return (
        <>
            <style>{collapseStyles}</style>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
                <Typography.Title level={3}>
                    {t('createContent.title')}
                </Typography.Title>
                <Typography.Text type="secondary">
                    {t('createContent.subtitle')}
                </Typography.Text>
            </div>

            {/* Content Type Selection */}
            {!contentType && (
                <Card style={{ marginTop: '24px' }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Typography.Title level={4} style={{ marginBottom: '24px' }}>
                            Que tipo de conteúdo você quer criar?
                        </Typography.Title>
                        <Space size="large" direction="vertical" style={{ width: '100%' }}>
                            <Card 
                                hoverable 
                                onClick={() => setContentType('newsletter')}
                                style={{ cursor: 'pointer', borderColor: '#1890ff' }}
                            >
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                                    <Typography.Title level={5}>Newsletter</Typography.Title>
                                    <Typography.Text type="secondary">
                                        Crie newsletters completas com múltiplas seções e conteúdo estruturado
                                    </Typography.Text>
                                </div>
                            </Card>
                            <Card 
                                hoverable 
                                onClick={() => setContentType('social')}
                                style={{ cursor: 'pointer', borderColor: '#1890ff' }}
                            >
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <TwitterOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                                    <Typography.Title level={5}>Redes Sociais</Typography.Title>
                                    <Typography.Text type="secondary">
                                        Crie conteúdo otimizado para redes sociais como Twitter, LinkedIn e Instagram
                                    </Typography.Text>
                                </div>
                            </Card>
                        </Space>
                    </div>
                </Card>
            )}

            {/* Content Creation Form */}
            {contentType && (
                <>
                    <div style={{ marginBottom: '16px' }}>
                        <Button 
                            onClick={() => setContentType(null)} 
                            style={{ marginBottom: '16px' }}
                        >
                            ← Voltar para seleção
                        </Button>
                    </div>

                    {showFreePlanLimitAlert && (
                        <Alert
                            type="warning"
                            showIcon
                            message={t('createContent.freePlanLimitTitle')}
                            description={t('createContent.freePlanLimitDescription', {
                                limitLabel: freePlanLimitLabel,
                                used: usedNewsletters,
                                remaining: remainingNewsletters ?? 0,
                            })}
                        />
                    )}

                    {/* Layout em uma única coluna */}
                    <div 
                        style={{ 
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '20px',
                            alignItems: 'start',
                            minHeight: '600px'
                        }}
                    >
                        {/* Sidebar - Configuration Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '600px' }}>
                    {/* Card 1: Basic Config */}
                    <Card 
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    backgroundColor: '#5B5BD6', 
                                    color: 'white', 
                                    borderRadius: '50%', 
                                    width: '32px', 
                                    height: '32px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                }}>
                                    1
                                </div>
                                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                                    {t('createContent.card1Tittle')}
                                </span>
                            </div>
                        }
                        styles={{
                            header: { borderBottom: 'none' },
                            body: { paddingTop: 0 }
                        }}
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={{ brandId: undefined, newsletter: false, instagram: false, twitter: false, tiktok: false, linkedin: false }}
                            style={{ padding: '8px 0' }}
                            onValuesChange={(_, all) => {
                                const any = !!(all?.newsletter || all?.instagram || all?.twitter || all?.tiktok || all?.linkedin);
                                
                                // Enforce exclusive selection - only one network can be selected at a time
                                if (all?.newsletter) {
                                    if (all?.instagram || all?.twitter || all?.tiktok || all?.linkedin) {
                                        form.setFieldsValue({ instagram: false, twitter: false, tiktok: false, linkedin: false });
                                    }
                                    // Ensure at least one section exists and is active
                                    if (!sections.length) {
                                        const first = { id: Math.random().toString(36).slice(2, 9), title: '', description: '', rssItems: [], newsArticles: [] };
                                        setSections([first]);
                                        setActiveSectionIndex(0);
                                    }
                                } else if (all?.instagram) {
                                    form.setFieldsValue({ newsletter: false, twitter: false, tiktok: false, linkedin: false });
                                } else if (all?.twitter) {
                                    form.setFieldsValue({ newsletter: false, instagram: false, tiktok: false, linkedin: false });
                                } else if (all?.tiktok) {
                                    form.setFieldsValue({ newsletter: false, instagram: false, twitter: false, linkedin: false });
                                } else if (all?.linkedin) {
                                    form.setFieldsValue({ newsletter: false, instagram: false, twitter: false, tiktok: false });
                                }
                                
                                // If newsletter turned off and no other networks, clear section focus; keep sections data
                                if (!all?.newsletter && !(all?.instagram || all?.twitter || all?.tiktok || all?.linkedin)) {
                                    setActiveSectionIndex(-1);
                                    setNewsletterPreview(null);
                                }
                                if (any) {
                                    handleFetchRss(true);
                                } else {
                                    setRssItems([]);
                                    setSelectedItemLinks(new Set());
                                }
                            }}
                        >
                            <Form.Item
                                name="brandId"
                                label={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{t('createContent.brandLabel')}</span>
                                        <Button
                                            size="small"
                                            type="link"
                                            icon={<AppstoreAddOutlined />}
                                            onClick={() => navigate(protectedRoutes.brands.path)}
                                        >
                                            {t('createContent.manageBrands')}
                                        </Button>
                                    </div>
                                }
                            >
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder={t('createContent.brandPlaceholder') as string}
                                    loading={brandsLoading}
                                    options={brandOptions}
                                    optionFilterProp="label"
                                />
                            </Form.Item>

                            <div style={{ marginBottom: 16 }}>
                                {selectedBrandSummary ? (
                                    <div
                                        style={{
                                            border: '1px solid #e0e7ff',
                                            background: '#f5f7ff',
                                            borderRadius: 8,
                                            padding: 12,
                                        }}
                                    >
                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                            <Typography.Text strong>{selectedBrandSummary.name}</Typography.Text>
                                            {selectedBrandSummary.description && (
                                                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                                    {selectedBrandSummary.description}
                                                </Typography.Text>
                                            )}
                                            {selectedBrandSummary.tone && (
                                                <Typography.Text style={{ fontSize: 12 }}>
                                                    <strong>{t('createContent.brandTone')}:</strong> {selectedBrandSummary.tone}
                                                </Typography.Text>
                                            )}
                                            {selectedBrandSummary.audience && (
                                                <Typography.Text style={{ fontSize: 12 }}>
                                                    <strong>{t('createContent.brandAudience')}:</strong> {selectedBrandSummary.audience}
                                                </Typography.Text>
                                            )}
                                            {selectedBrandSummary.differentiators && (
                                                <Typography.Text style={{ fontSize: 12 }}>
                                                    <strong>{t('createContent.brandDifferentiators')}:</strong> {selectedBrandSummary.differentiators}
                                                </Typography.Text>
                                            )}
                                            {selectedBrandSummary.keywords && selectedBrandSummary.keywords.length > 0 && (
                                                <Space size={[4, 4]} wrap>
                                                    {selectedBrandSummary.keywords.map((keyword) => (
                                                        <Typography.Text key={keyword} code style={{ fontSize: 12 }}>
                                                            {keyword}
                                                        </Typography.Text>
                                                    ))}
                                                </Space>
                                            )}
                                            {isBrandMissing && (
                                                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                                                    {t('createContent.brandMissingWarning')}
                                                </Typography.Text>
                                            )}
                                        </Space>
                                    </div>
                                ) : brands.length === 0 ? (
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        {t('createContent.brandEmptyHint')}
                                    </Typography.Text>
                                ) : (
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        {t('createContent.brandHelper')}
                                    </Typography.Text>
                                )}
                            </div>

                            <Form.Item 
                                name="name" 
                                label={<span style={{ fontWeight: '600', fontSize: '14px' }}>{t('createContent.nameLabel')}</span>} 
                                rules={[{ required: true }]}
                            > 
                                <Input 
                                    placeholder="Newsletter" 
                                    allowClear 
                                    style={{ 
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        fontSize: '14px'
                                    }}
                                />
                            </Form.Item>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Form.Item 
                                    name="audience" 
                                    label={<span style={{ fontWeight: '600', fontSize: '14px' }}>{t('createContent.audienceLabel')}</span>}
                                >
                                    <Input 
                                        placeholder={t('createContent.audiencePlaceholder') as string} 
                                        allowClear 
                                        style={{ 
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </Form.Item>

                                <Form.Item 
                                    name="goal" 
                                    label={<span style={{ fontWeight: '600', fontSize: '14px' }}>{t('createContent.goalLabel')}</span>}
                                >
                                    <Input.TextArea 
                                        rows={3} 
                                        placeholder={t('createContent.goalPlaceholder') as string}
                                        style={{ 
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            resize: 'none'
                                        }}
                                    />
                                </Form.Item>
                            </div>

                            <div>
                                <Typography.Text 
                                    strong 
                                    style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        display: 'block'
                                    }}
                                >
                                    {t('createContent.networksTitle')}
                                </Typography.Text>
                                <Space size={[4, 4]}>
                                    <Form.Item name="newsletter" valuePropName="checked" noStyle>
                                        <Checkbox 
                                            style={{ 
                                                fontSize: '13px',
                                                padding: '4px 8px'
                                            }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    form.setFieldsValue({
                                                        instagram: false,
                                                        twitter: false,
                                                        tiktok: false,
                                                        linkedin: false
                                                    });
                                                }
                                            }}
                                        >
                                            {t('createContent.newsletter')}
                                        </Checkbox>
                                    </Form.Item>
                                    <Form.Item name="instagram" valuePropName="checked" noStyle>
                                        <Checkbox 
                                            style={{ 
                                                fontSize: '13px',
                                                padding: '4px 2px'
                                            }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    form.setFieldsValue({
                                                        newsletter: false,
                                                        twitter: false,
                                                        tiktok: false,
                                                        linkedin: false
                                                    });
                                                }
                                            }}
                                        >
                                            {t('createContent.instagram')}
                                        </Checkbox>
                                    </Form.Item>
                                    <Form.Item name="twitter" valuePropName="checked" noStyle>
                                        <Checkbox 
                                            style={{ 
                                                fontSize: '13px',
                                                padding: '4px 2px'
                                            }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    form.setFieldsValue({
                                                        newsletter: false,
                                                        instagram: false,
                                                        tiktok: false,
                                                        linkedin: false
                                                    });
                                                }
                                            }}
                                        >
                                            {t('createContent.twitter')}
                                        </Checkbox>
                                    </Form.Item>
                                    <Form.Item name="tiktok" valuePropName="checked" noStyle>
                                        <Checkbox 
                                            style={{ 
                                                fontSize: '13px',
                                                padding: '4px 2px'
                                            }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    form.setFieldsValue({
                                                        newsletter: false,
                                                        instagram: false,
                                                        twitter: false,
                                                        linkedin: false
                                                    });
                                                }
                                            }}
                                        >
                                            {t('createContent.tiktok')}
                                        </Checkbox>
                                    </Form.Item>
                                    <Form.Item name="linkedin" valuePropName="checked" noStyle>
                                        <Checkbox 
                                            style={{ 
                                                fontSize: '13px',
                                                padding: '4px 2px'
                                            }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    form.setFieldsValue({
                                                        newsletter: false,
                                                        instagram: false,
                                                        twitter: false,
                                                        tiktok: false
                                                    });
                                                }
                                            }}
                                        >
                                            {t('createContent.linkedin')}
                                        </Checkbox>
                                    </Form.Item>
                                </Space>
                            </div>
                        </Form>
                    </Card>

                    {/* Card 2: Twitter Thread Generation */}
                    <Form form={form}>
                        <Form.Item shouldUpdate noStyle>
                            {({ getFieldValue }) => {
                                const isTwitter = !!getFieldValue('twitter');
                                if (!isTwitter) return null;
                                
                                return (
                                    <Card 
                                        title={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    backgroundColor: '#1DA1F2', 
                                                    color: 'white', 
                                                    borderRadius: '50%', 
                                                    width: '32px', 
                                                    height: '32px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    2
                                                </div>
                                                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                                                    {t('createContent.twitterThreadTitle')}
                                                </span>
                                            </div>
                                        }
                                        styles={{
                                            header: { borderBottom: 'none' },
                                            body: { paddingTop: 0 }
                                        }}
                                    >
                                        <div style={{ padding: '8px 0' }}>
                                            <Typography.Text type="secondary" style={{ marginBottom: '16px', display: 'block' }}>
                                                {t('createContent.twitterThreadHelp')}
                                            </Typography.Text>

                                            {/* RSS Articles Grouped by Source - Moved to top */}
                                            {rssItems.length > 0 && (
                                                <div style={{ margin: '0 0 16px' }}>
                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                        {t('createContent.selectArticlePrompt')} ({rssItems.length} {t('createContent.itemsFound', { count: rssItems.length })})
                                                    </Typography.Text>
                                                    
                                                    <div style={{ marginTop: 12 }}>
                                                        {(() => {
                                                            // Group articles by source like in newsletter
                                                            const getKey = (it: RssItem) => it.link || it.title || '';
                                                            const groups: { [key: string]: RssItem[] } = {};
                                                            rssItems.forEach((item) => {
                                                                const sourceName = item.source || 'Unknown';
                                                                if (!groups[sourceName]) groups[sourceName] = [];
                                                                groups[sourceName].push(item);
                                                            });
                                                            const groupedArticles = Object.entries(groups).map(([name, items]) => ({ name, items }));
                                                            
                                                            return (
                                                                <Collapse
                                                                    className="custom-collapse"
                                                                    items={groupedArticles.map((group) => ({
                                                                        key: group.name,
                                                                        label: (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                                                <span style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937' }}>
                                                                                    {group.name}
                                                                                </span>
                                                                                <Badge count={group.items.length} overflowCount={99} style={{ backgroundColor: '#1DA1F2' }} />
                                                                            </div>
                                                                        ),
                                                                        children: (
                                                                            <div 
                                                                                className="rss-articles-scroll"
                                                                                style={{ 
                                                                                    paddingTop: '0px',
                                                                                    maxHeight: '300px',
                                                                                    overflowY: 'auto',
                                                                                    overflowX: 'hidden',
                                                                                    paddingRight: '8px'
                                                                                }}
                                                                            >
                                                                                <List
                                                                                    dataSource={group.items}
                                                                                    split={false}
                                                                                    renderItem={(it) => {
                                                                                        const linkKey = getKey(it);
                                                                                        const isSelected: boolean = selectedTwitterArticle && getKey(selectedTwitterArticle) === linkKey ? true : false;
                                                                                        
                                                                                        return (
                                                                                            <List.Item
                                                                                                style={{
                                                                                                    background: isSelected ? '#e6f7ff' : 'transparent',
                                                                                                    border: isSelected ? '2px solid #1DA1F2' : '1px solid transparent',
                                                                                                    borderRadius: '6px',
                                                                                                    marginBottom: '8px',
                                                                                                    padding: '12px',
                                                                                                    cursor: 'pointer',
                                                                                                    transition: 'all 0.2s ease'
                                                                                                }}
                                                                                                onClick={() => {
                                                                                                    if (!linkKey) return;
                                                                                                    // Toggle selection - if same article, deselect, otherwise select
                                                                                                    if (isSelected) {
                                                                                                        setSelectedTwitterArticle(null);
                                                                                                        setGeneratedThread(null);
                                                                                                    } else {
                                                                                                        setSelectedTwitterArticle(it);
                                                                                                        setGeneratedThread(null);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <List.Item.Meta
                                                                                                    avatar={
                                                                                                        <Radio
                                                                                                            checked={isSelected}
                                                                                                            onChange={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                if (e.target.checked) {
                                                                                                                    setSelectedTwitterArticle(it);
                                                                                                                    setGeneratedThread(null);
                                                                                                                } else {
                                                                                                                    setSelectedTwitterArticle(null);
                                                                                                                    setGeneratedThread(null);
                                                                                                                }
                                                                                                            }}
                                                                                                        />
                                                                                                    }
                                                                                                    title={
                                                                                                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                                                                                                            {it.link ? (
                                                                                                                <a 
                                                                                                                    href={it.link} 
                                                                                                                    target="_blank" 
                                                                                                                    rel="noreferrer"
                                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                                    style={{ color: '#1d4ed8', textDecoration: 'none' }}
                                                                                                                >
                                                                                                                    {it.title || it.link}
                                                                                                                </a>
                                                                                                            ) : (
                                                                                                                it.title || 'No title'
                                                                                                            )}
                                                                                                        </div>
                                                                                                    }
                                                                                                    description={
                                                                                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                                                                            {it.contentSnippet && (
                                                                                                                <div>{it.contentSnippet.substring(0, 150)}{it.contentSnippet.length > 150 && '...'}</div>
                                                                                                            )}
                                                                                                            {it.pubDate && (
                                                                                                                <div style={{ marginTop: '4px' }}>
                                                                                                                    {new Date(it.pubDate).toLocaleDateString()}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    }
                                                                                                />
                                                                                            </List.Item>
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        ),
                                                                    }))}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Generate Button */}
                                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                                <Button
                                                    type="primary"
                                                    icon={<TwitterOutlined />}
                                                    onClick={handleGenerateTwitterThread}
                                                    loading={generatingThread}
                                                    disabled={!selectedTwitterArticle || rssItems.length === 0}
                                                    style={{ background: '#1DA1F2', borderColor: '#1DA1F2' }}
                                                >
                                                    {t('createContent.generateThread')}
                                                </Button>
                                                {selectedTwitterArticle && (
                                                    <Button
                                                        type="link"
                                                        onClick={handleResetTwitterThread}
                                                        style={{ marginLeft: '8px' }}
                                                    >
                                                        Reset
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Selected Article Preview */}
                                            {selectedTwitterArticle && (
                                                <div style={{ padding: '12px', background: '#f0f8ff', borderRadius: '6px', border: '1px solid #1DA1F2', marginBottom: '16px' }}>
                                                    <Typography.Text strong style={{ fontSize: '13px', color: '#1DA1F2' }}>
                                                        {t('createContent.selectArticlePrompt')}:
                                                    </Typography.Text>
                                                    <div style={{ marginTop: '8px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                                            {selectedTwitterArticle.title}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                                            {selectedTwitterArticle.source} {selectedTwitterArticle.pubDate && `• ${new Date(selectedTwitterArticle.pubDate).toLocaleDateString()}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Thread Preview - Moved to appear after article selection */}
                                            {generatedThread && (
                                                <div style={{ marginBottom: '24px' }}>
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <Typography.Text strong style={{ fontSize: '16px' }}>
                                                            {t('createContent.threadPreview')}
                                                        </Typography.Text>
                                                    </div>
                                                    
                                                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                                        {generatedThread.tweets.map((tweet, index) => (
                                                            <Card 
                                                                key={index}
                                                                size="small"
                                                                style={{ 
                                                                    background: '#f8f9fa',
                                                                    border: '1px solid #e9ecef'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                    <div style={{ flex: 1, marginRight: '12px' }}>
                                                                        <div style={{ fontSize: '12px', color: '#1DA1F2', fontWeight: '600', marginBottom: '4px' }}>
                                                                            Tweet {index + 1}
                                                                        </div>
                                                                        <Typography.Text style={{ fontSize: '13px' }}>
                                                                            {tweet}
                                                                        </Typography.Text>
                                                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                                            {t('createContent.characterCount', { count: `${index + 1}/ ${tweet}`.length })}
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        icon={<CopyOutlined />}
                                                                        size="small"
                                                                        onClick={() => handleCopyIndividualTweet(tweet, index)}
                                                                        style={{ 
                                                                            background: '#1DA1F2', 
                                                                            borderColor: '#1DA1F2',
                                                                            color: 'white'
                                                                        }}
                                                                    />
                                                                </div>
                                                            </Card>
                                                        ))}
                                                    </Space>

                                                    {generatedThread.articleUrl && (
                                                        <div style={{ marginTop: '16px', padding: '12px', background: '#f0f8ff', borderRadius: '6px' }}>
                                                            <Typography.Text style={{ fontSize: '12px', color: '#1890ff' }}>
                                                                <strong>Fonte:</strong> <a href={generatedThread.articleUrl} target="_blank" rel="noopener noreferrer">
                                                                    {generatedThread.articleTitle}
                                                                </a>
                                                            </Typography.Text>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                );
                            }}
                        </Form.Item>
                    </Form>

                    

                    {/* Card 3: Content Generation */}
                    <Form form={form}>
                        <Form.Item shouldUpdate noStyle>
                            {({ getFieldValue }) => {
                                const isNewsletter = !!getFieldValue('newsletter');
                                if (!isNewsletter) return null;
                                
                                return (
                                    <Card 
                                        title={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    backgroundColor: '#5B5BD6', 
                                                    color: 'white', 
                                                    borderRadius: '50%', 
                                                    width: '32px', 
                                                    height: '32px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    3
                                                </div>
                                                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                                                    Seções da Newsletter
                                                </span>
                                            </div>
                                        }
                                        styles={{
                                            header: { borderBottom: 'none' },
                                            body: { paddingTop: 0 }
                                        }}
                                    >
                                        <div style={{ padding: '8px 0' }}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    marginBottom: '12px'
                                                }}>
                                                    <Typography.Text 
                                                        strong 
                                                        style={{ 
                                                            fontWeight: '600', 
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        Seções da Newsletter:
                                                    </Typography.Text>
                                                    <Button
                                                        type="link"
                                                        style={{ 
                                                            color: '#5B5BD6',
                                                            fontSize: '14px',
                                                            padding: 0,
                                                            height: 'auto'
                                                        }}
                                                        onClick={() => {
                                                            const newSection: NewsletterSection = {
                                                                id: Math.random().toString(36).slice(2, 9),
                                                                title: '',
                                                                description: '',
                                                                rssItems: [],
                                                                newsArticles: [],
                                                            };
                                                            setSections((prev) => [...prev, newSection]);
                                                            setActiveSectionIndex(sections.length);
                                                        }}
                                                    >
                                                        + Adicionar Seção
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* List of Saved Sections */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {sections.map((section, idx) => {
                                                    if (!section.title && !section.description) return null;
                                                    const sectionGenerated = !!(section.id && sectionGenerations[section.id]);
                
                                                    return (
                                                        <div
                                                            key={section.id}
                                                            style={{
                                                                backgroundColor: '#f8f9fa',
                                                                border: '1px solid #e9ecef',
                                                                borderRadius: '8px',
                                                                padding: '12px 16px',
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'flex-start', 
                                                                justifyContent: 'space-between',
                                                                marginBottom: '4px'
                                                            }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <Typography.Text 
                                                                        strong 
                                                                        style={{ 
                                                                            fontSize: '14px',
                                                                            color: '#1a1a1a',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        }}
                                                                    >
                                                                        {section.title}
                                                                    </Typography.Text>
                                                                    <Typography.Text 
                                                                        type="secondary" 
                                                                        style={{ 
                                                                            fontSize: '12px',
                                                                            lineHeight: '1.4'
                                                                        }}
                                                                    >
                                                                        {section.description}
                                                                    </Typography.Text>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    <div style={{ 
                                                                        backgroundColor: '#5B5BD6', 
                                                                        color: 'white', 
                                                                        borderRadius: '50%', 
                                                                        width: '20px', 
                                                                        height: '20px', 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'center',
                                                                        fontSize: '12px',
                                                                        fontWeight: 'bold',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    {sectionGenerated && (
                                                                        <Tag color="green" style={{ marginLeft: 4 }}>
                                                                            {t('createContent.sectionGeneratedBadge')}
                                                                        </Tag>
                                                                    )}
                                                                    <Button
                                                                        type="text"
                                                                        size="small"
                                                                        icon={<EditOutlined />}
                                                                        style={{ 
                                                                            width: '24px',
                                                                            height: '24px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                        onClick={() => setActiveSectionIndex(idx)}
                                                                    />
                                                                    <Button
                                                                        type="text"
                                                                        size="small"
                                                                        icon={<DeleteOutlined />}
                                                                        style={{ 
                                                                            width: '24px',
                                                                            height: '24px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: '#ff4d4f'
                                                                        }}
                                                                        onClick={() => {
                                                                            if (sections.length > 1) {
                                                                                setSections((prev) => prev.filter((s) => s.id !== section.id));
                                                                                if (activeSectionIndex === idx) {
                                                                                    setActiveSectionIndex(0);
                                                                                } else if (activeSectionIndex > idx) {
                                                                                    setActiveSectionIndex((i) => i - 1);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {(section.rssItems && section.rssItems.length > 0) && (
                                                                <div style={{ marginTop: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 6, padding: '8px 12px' }}>
                                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                                        {t('createContent.sectionSelectedArticlesTitle', { count: section.rssItems.length })}
                                                                    </Typography.Text>
                                                                    <List
                                                                        dataSource={section.rssItems}
                                                                        split={false}
                                                                        style={{ marginTop: 6, maxHeight: 200, overflow: 'auto' }}
                                                                        renderItem={(it) => (
                                                                            <List.Item style={{ padding: '6px 0' }}>
                                                                                <Typography.Text style={{ fontSize: 12 }}>
                                                                                    {it.link ? (
                                                                                        <a href={it.link} target="_blank" rel="noreferrer">{it.title || it.link}</a>
                                                                                    ) : (
                                                                                        it.title || 'No title'
                                                                                    )}
                                                                                </Typography.Text>
                                                                            </List.Item>
                                                                        )}
                                                                    />
                                                                </div>
                                                            )}
                                                            {(section.newsArticles && section.newsArticles.length > 0) && (
                                                                <div style={{ marginTop: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 6, padding: '8px 12px' }}>
                                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                                        {t('createContent.sectionSelectedNewsTitle', { count: section.newsArticles.length })}
                                                                    </Typography.Text>
                                                                    <List
                                                                        dataSource={section.newsArticles}
                                                                        split={false}
                                                                        style={{ marginTop: 6, maxHeight: 200, overflow: 'auto' }}
                                                                        renderItem={(it) => (
                                                                            <List.Item style={{ padding: '6px 0' }}>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                                    {it.link ? (
                                                                                        <a href={it.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                                                                                            {it.title}
                                                                                        </a>
                                                                                    ) : (
                                                                                        <Typography.Text style={{ fontSize: 12 }}>{it.title}</Typography.Text>
                                                                                    )}
                                                                                    {(it.source || it.query) && (
                                                                                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                                                                            {[it.source, it.query].filter(Boolean).join(' • ')}
                                                                                        </Typography.Text>
                                                                                    )}
                                                                                </div>
                                                                            </List.Item>
                                                                        )}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Edit Form */}
                                            {activeSectionIndex >= 0 && sections[activeSectionIndex] && (
                                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e9ecef' }}>
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between',
                                                        marginBottom: '12px'
                                                    }}>
                                                        <Typography.Text strong style={{ fontSize: '14px' }}>
                                                            Editando Seção {activeSectionIndex + 1}:
                                                        </Typography.Text>
                                                        <Space size={8} align="center">
                                                            {currentSectionGeneration && (
                                                                <Tag color="green">{t('createContent.sectionGeneratedBadge')}</Tag>
                                                            )}
                                                            <Button
                                                                type="text"
                                                                size="small"
                                                                icon={<SaveOutlined />}
                                                                style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#5B5BD6',
                                                                }}
                                                                onClick={() => setActiveSectionIndex(-1)}
                                                                title="Fechar edição"
                                                            />
                                                        </Space>
                                                        {/* Removido dropdown; seleção agora é uma lista agrupada abaixo */}
                                                    </div>
                                                    <Space direction="vertical" style={{ width: '100%' }}>
                                                        <Input
                                                            placeholder="Título da seção"
                                                            value={sections[activeSectionIndex]?.title}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setSections((prev) => {
                                                                    const next = [...prev];
                                                                    next[activeSectionIndex] = { ...next[activeSectionIndex], title: v };
                                                                    return next;
                                                                });
                                                            }}
                                                            style={{ 
                                                                borderRadius: '6px',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                        <Input.TextArea
                                                            rows={3}
                                                            placeholder="Descrição da seção"
                                                            value={sections[activeSectionIndex]?.description}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setSections((prev) => {
                                                                    const next = [...prev];
                                                                    next[activeSectionIndex] = { ...next[activeSectionIndex], description: v };
                                                                    return next;
                                                                });
                                                            }}
                                                            style={{ 
                                                                borderRadius: '6px',
                                                                fontSize: '14px',
                                                                resize: 'none'
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'flex-start',
                                                                alignItems: 'center',
                                                                gap: 12,
                                                            }}
                                                        >
                                                            <Button
                                                                type="primary"
                                                                icon={<RobotOutlined />}
                                                                onClick={() => currentSection && handleGenerateSectionContent(currentSection)}
                                                                loading={currentSectionGenerationLoading}
                                                            >
                                                                {currentSectionGeneration
                                                                    ? t('createContent.sectionRegenerateButton')
                                                                    : t('createContent.sectionGenerateButton')}
                                                            </Button>
                                                        </div>
                                                        <div
                                                            style={{
                                                                border: '1px solid #e5e7eb',
                                                                borderRadius: '8px',
                                                                backgroundColor: '#ffffff',
                                                                padding: '12px 14px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '12px',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                }}
                                                            >
                                                                <Typography.Text strong style={{ fontSize: '13px', color: '#111827' }}>
                                                                    {t('createContent.sectionSearchSuggestionsTitle')}
                                                                </Typography.Text>
                                                                <Space size={8}>
                                                                    <Button
                                                                        type="text"
                                                                        icon={<RobotOutlined />}
                                                                        style={{ color: '#5B5BD6', padding: 0 }}
                                                                        onClick={() => currentSection && handleRefreshSectionQueries(currentSection)}
                                                                        loading={currentSectionQueriesLoading}
                                                                        disabled={!currentSection?.title?.trim()}
                                                                    >
                                                                        {t('createContent.sectionSearchSuggestionsRefresh')}
                                                                    </Button>
                                                                    <Button
                                                                        type="text"
                                                                        icon={<SearchOutlined />}
                                                                        style={{ color: '#1f2937', padding: 0 }}
                                                                        onClick={() => currentSection && handleFetchNewsForSection(currentSection)}
                                                                        loading={currentSectionNewsLoading}
                                                                        disabled={currentSectionQueries.length === 0}
                                                                    >
                                                                        {t('createContent.sectionSearchNewsButton')}
                                                                    </Button>
                                                                </Space>
                                                            </div>
                                                            <div>
                                                                {currentSectionQueries.length ? (
                                                                    <Space wrap size={[8, 8]}>
                                                                        {currentSectionQueries.map((query) => (
                                                                            <span
                                                                                key={query}
                                                                                style={{
                                                                                    backgroundColor: '#eef2ff',
                                                                                    color: '#312e81',
                                                                                    borderRadius: '999px',
                                                                                    padding: '4px 10px',
                                                                                    fontSize: 12,
                                                                                    lineHeight: 1.2,
                                                                                }}
                                                                            >
                                                                                {query}
                                                                            </span>
                                                                        ))}
                                                                    </Space>
                                                                ) : (
                                                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                                        {t('createContent.sectionSearchSuggestionsEmpty')}
                                                                    </Typography.Text>
                                                                )}
                                                            </div>
                                                            {currentSectionNewsLoading && (
                                                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                                    {t('createContent.sectionSearchNewsLoading')}
                                                                </div>
                                                            )}
                                                            {!currentSectionNewsLoading && currentSectionNewsResults.length > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                    {currentSectionNewsResults.map((group) => (
                                                                        <div
                                                                            key={group.query}
                                                                            style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}
                                                                        >
                                                                            <Typography.Text strong style={{ fontSize: 13 }}>
                                                                                {t('createContent.sectionSearchNewsGroupTitle', { query: group.query })}
                                                                            </Typography.Text>
                                                                            {group.articles.length === 0 ? (
                                                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                                                    {t('createContent.sectionSearchNewsGroupEmpty')}
                                                                                </Typography.Text>
                                                                            ) : (
                                                                                <List
                                                                                    dataSource={group.articles}
                                                                                    split={false}
                                                                                    style={{ marginTop: 8 }}
                                                                                    renderItem={(article) => {
                                                                                        const linkKey = article.link || article.title || '';
                                                                                        const isSelected = !!currentSection?.newsArticles?.some(
                                                                                            (item) => item.link === article.link || (!item.link && item.title === article.title),
                                                                                        );

                                                                                        const toggleSelection = (explicit?: boolean) => {
                                                                                            if (!linkKey) return;
                                                                                            setSections((prev) => {
                                                                                                if (activeSectionIndex < 0 || activeSectionIndex >= prev.length) {
                                                                                                    return prev;
                                                                                                }
                                                                                                const next = [...prev];
                                                                                                const sectionDraft = { ...next[activeSectionIndex] };
                                                                                                const currentNews = Array.isArray(sectionDraft.newsArticles)
                                                                                                    ? [...sectionDraft.newsArticles]
                                                                                                    : [];
                                                                                                const existingIndex = currentNews.findIndex(
                                                                                                    (item) => item.link === article.link || (!item.link && item.title === article.title),
                                                                                                );
                                                                                                const shouldSelect = explicit ?? existingIndex < 0;

                                                                                                if (shouldSelect) {
                                                                                                    if (existingIndex < 0) {
                                                                                                        if (!article.link && !article.title) {
                                                                                                            return prev;
                                                                                                        }
                                                                                                        currentNews.push({
                                                                                                            title: article.title || article.link || 'Notícia',
                                                                                                            link: article.link || '',
                                                                                                            source: article.source,
                                                                                                            snippet: article.snippet,
                                                                                                            date: article.date,
                                                                                                            query: group.query,
                                                                                                        });
                                                                                                        sectionDraft.newsArticles = currentNews;
                                                                                                        next[activeSectionIndex] = sectionDraft;
                                                                                                        next.forEach((sec, idx) => {
                                                                                                            if (idx === activeSectionIndex) return;
                                                                                                            if (!sec) return;
                                                                                                            const newsList = Array.isArray(sec.newsArticles)
                                                                                                                ? [...sec.newsArticles]
                                                                                                                : [];
                                                                                                            const otherIndex = newsList.findIndex(
                                                                                                                (item) => item.link === article.link,
                                                                                                            );
                                                                                                            if (otherIndex >= 0) {
                                                                                                                newsList.splice(otherIndex, 1);
                                                                                                                next[idx] = { ...sec, newsArticles: newsList };
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                                                                                } else if (existingIndex >= 0) {
                                                                                                    currentNews.splice(existingIndex, 1);
                                                                                                    sectionDraft.newsArticles = currentNews;
                                                                                                    next[activeSectionIndex] = sectionDraft;
                                                                                                }

                                                                                                return next;
                                                                                            });
                                                                                        };

                                                                                        return (
                                                                                            <List.Item
                                                                                                style={{
                                                                                                    padding: '6px 0',
                                                                                                    backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                                                                                                    borderRadius: 6,
                                                                                                    cursor: linkKey ? 'pointer' : 'default',
                                                                                                    transition: 'background-color 0.2s ease',
                                                                                                }}
                                                                                                onClick={() => toggleSelection()}
                                                                                            >
                                                                                                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                                                                                                    <Checkbox
                                                                                                        checked={isSelected}
                                                                                                        onChange={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            toggleSelection(e.target.checked);
                                                                                                        }}
                                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                                    />
                                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                                                                                        {article.link ? (
                                                                                                            <a
                                                                                                                href={article.link}
                                                                                                                target="_blank"
                                                                                                                rel="noreferrer"
                                                                                                                style={{ fontWeight: 600, color: '#1d4ed8' }}
                                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                                            >
                                                                                                                {article.title}
                                                                                                            </a>
                                                                                                        ) : (
                                                                                                            <Typography.Text strong>{article.title}</Typography.Text>
                                                                                                        )}
                                                                                                        {(article.source || article.date) && (
                                                                                                            <span style={{ fontSize: 11, color: '#6b7280' }}>
                                                                                                                {[article.source, article.date]
                                                                                                                    .filter(Boolean)
                                                                                                                    .join(' • ')}
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {article.snippet && (
                                                                                                            <Typography.Paragraph style={{ margin: 0, fontSize: 12, color: '#374151' }}>
                                                                                                                {article.snippet}
                                                                                                            </Typography.Paragraph>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </List.Item>
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {(() => {
                                                            // Lista de artigos por fonte (estilo Card 4), apenas para a seção ativa
                                                            const getKey = (it: RssItem) => it.link || it.title || '';
                                                            const selectedInOthers = new Set<string>(
                                                                sections
                                                                    .filter((_, idx) => idx !== activeSectionIndex)
                                                                    .flatMap((s) => (s.rssItems || []).map(getKey))
                                                            );
                                                            const groups: { [key: string]: RssItem[] } = {};
                                                            rssItems.forEach((item) => {
                                                                const key = getKey(item);
                                                                if (!key || selectedInOthers.has(key)) return;
                                                                const sourceName = item.source || 'Unknown';
                                                                if (!groups[sourceName]) groups[sourceName] = [];
                                                                groups[sourceName].push(item);
                                                            });
                                                            const groupedAvailable = Object.entries(groups).map(([name, items]) => ({ name, items }));
                                                            return (
                                                                <>
                                                                <div style={{ margin: '8px 0 12px' }}>
                                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                                        Fontes favoritas ({favoriteUrls.length})
                                                                    </Typography.Text>
                                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                                                        {favoriteUrls.map((url) => (
                                                                            <span key={url} style={{
                                                                                background: '#f0f2f5',
                                                                                border: '1px solid #e5e7eb',
                                                                                borderRadius: 14,
                                                                                padding: '2px 8px',
                                                                                fontSize: 12,
                                                                                color: '#374151',
                                                                                maxWidth: '100%',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                                whiteSpace: 'nowrap'
                                                                            }} title={url}>
                                                                                {url}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                {groupedAvailable.length === 0 ? (
                                                                    <div style={{ textAlign: 'center', padding: 12, color: '#999' }}>
                                                                        {t('createContent.listEmpty')}
                                                                    </div>
                                                                ) : (
                                                                <Collapse
                                                                    items={groupedAvailable.map(group => ({
                                                                        key: group.name,
                                                                        label: (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                                                <span style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937' }}>
                                                                                    {group.name}
                                                                                </span>
                                                                                <Badge count={group.items.length} overflowCount={99} style={{ backgroundColor: '#6366f1' }} />
                                                                            </div>
                                                                        ),
                                                                        children: (
                                                                            <div style={{ paddingTop: '0px' }}>
                                                                                <List
                                                                                    dataSource={group.items}
                                                                                    split={false}
                                                                                    renderItem={(it) => {
                                                                                        const linkKey = getKey(it);
                                                                                        const current = sections[activeSectionIndex];
                                                                                        const exists = current.rssItems.find((r) => (r.link || r.title) === (it.link || it.title));
                                                                                        const checked = !!exists;
                                                                                        return (
                                                                                            <List.Item
                                                                                                style={{
                                                                                                    background: 'transparent',
                                                                                                    border: 'none',
                                                                                                    borderRadius: '0px',
                                                                                                    marginBottom: '16px',
                                                                                                    padding: '8px 0px',
                                                                                                    cursor: 'pointer',
                                                                                                    transition: 'all 0.2s ease'
                                                                                                }}
                                                                                                onClick={() => {
                                                                                                    if (!linkKey) return;
                                                                                                    setSections((prev) => {
                                                                                                        const next = [...prev];
                                                                                                        const s = next[activeSectionIndex];
                                                                                                        const existsIdx = s.rssItems.findIndex(
                                                                                                            (r) => (r.link || r.title) === (it.link || it.title),
                                                                                                        );
                                                                                                        if (existsIdx >= 0) s.rssItems.splice(existsIdx, 1);
                                                                                                        else {
                                                                                                            s.rssItems.push(it);
                                                                                                            next.forEach((sec, i) => {
                                                                                                                if (i !== activeSectionIndex) {
                                                                                                                    const ri = sec.rssItems.findIndex((r) => (r.link || r.title) === linkKey);
                                                                                                                    if (ri >= 0) sec.rssItems.splice(ri, 1);
                                                                                                                }
                                                                                                            });
                                                                                                        }
                                                                                                        next[activeSectionIndex] = { ...s };
                                                                                                        return next;
                                                                                                    });
                                                                                                }}
                                                                                            >
                                                                                                <List.Item.Meta
                                                                                                    avatar={
                                                                                                        <Checkbox
                                                                                                            checked={checked}
                                                                                                            onChange={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                const isC = e.target.checked;
                                                                                                                setSections((prev) => {
                                                                                                                    const next = [...prev];
                                                                                                                    const s = next[activeSectionIndex];
                                                                                                                    const existsIdx = s.rssItems.findIndex(
                                                                                                                        (r) => (r.link || r.title) === (it.link || it.title),
                                                                                                                    );
                                                                                                                    const present = existsIdx >= 0;
                                                                                                                    if (isC && !present) {
                                                                                                                        s.rssItems.push(it);
                                                                                                                        next.forEach((sec, i) => {
                                                                                                                            if (i !== activeSectionIndex) {
                                                                                                                                const ri = sec.rssItems.findIndex((r) => (r.link || r.title) === linkKey);
                                                                                                                                if (ri >= 0) sec.rssItems.splice(ri, 1);
                                                                                                                            }
                                                                                                                        });
                                                                                                                    }
                                                                                                                    if (!isC && present) s.rssItems.splice(existsIdx, 1);
                                                                                                                    next[activeSectionIndex] = { ...s };
                                                                                                                    return next;
                                                                                                                });
                                                                                                            }}
                                                                                                        />
                                                                                                    }
                                                                                                    title={
                                                                                                        it.link ? (
                                                                                                            <a href={it.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                                                                                                {it.title || it.link}
                                                                                                            </a>
                                                                                                        ) : (
                                                                                                            it.title || 'No title'
                                                                                                        )
                                                                                                    }
                                                                                                    description={
                                                                                                        <div>
                                                                                                            <div style={{ 
                                                                                                                marginBottom: 4,
                                                                                                                overflow: 'hidden',
                                                                                                                display: '-webkit-box',
                                                                                                                WebkitLineClamp: 2,
                                                                                                                WebkitBoxOrient: 'vertical',
                                                                                                                fontSize: '13px',
                                                                                                                color: '#666',
                                                                                                                lineHeight: '1.4'
                                                                                                            }}>
                                                                                                                {it.contentSnippet || 'Sem descrição disponível'}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    }
                                                                                                />
                                                                                            </List.Item>
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )
                                                                    }))}
                                                                    style={{ backgroundColor: 'transparent', border: 'none' }}
                                                                    expandIconPosition="end"
                                                                    ghost
                                                                    size="large"
                                                                    className="custom-collapse"
                                                                />
                                                                )}
                                                                </>
                                                            );

                                                        })()}
                                                        {currentSectionGeneration && (
        <Card
            size="small"
            title={t('createContent.sectionPreviewTitle')}
            style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
        >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {t('createContent.newsletterPreviewOriginalTitle', {
                        title: currentSectionGeneration.preview.originalTitle,
                    })}
                </Typography.Text>
                <Typography.Title level={5} style={{ marginBottom: 4 }}>
                    {currentSectionGeneration.preview.generatedTitle}
                </Typography.Title>
                <Typography.Text style={{ color: '#4b5563' }}>
                    {currentSectionGeneration.preview.summary}
                </Typography.Text>
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                    {currentSectionGeneration.preview.body}
                </Typography.Paragraph>
                {currentSectionGeneration.preview.callToAction && (
                    <Typography.Text strong style={{ color: '#2563eb' }}>
                        {t('createContent.newsletterPreviewCallToAction', {
                            cta: currentSectionGeneration.preview.callToAction,
                        })}
                    </Typography.Text>
                )}
                <div>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                        {t('createContent.newsletterPreviewArticlesTitle')}
                    </Typography.Text>
                    <List
                        dataSource={currentSectionGeneration.preview.articleSummaries}
                        split={false}
                        style={{ marginTop: 6 }}
                        renderItem={(article) => (
                            <List.Item style={{ padding: '4px 0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {article.url ? (
                                        <a href={article.url} target="_blank" rel="noreferrer">
                                            {article.title}
                                        </a>
                                    ) : (
                                        <Typography.Text strong>{article.title}</Typography.Text>
                                    )}
                                    <Typography.Text style={{ fontSize: 12, color: '#6b7280' }}>
                                        {article.summary}
                                    </Typography.Text>
                                </div>
                            </List.Item>
                        )}
                    />
                </div>
            </Space>
        </Card>
    )}
</Space>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                );
                            }}
                        </Form.Item>
                    </Form>
                    </div>
                    </div>

                    {/* Newsletter Preview */}
                    {newsletterPreview && (
                <Card
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <span>{t('createContent.newsletterPreviewCardTitle')}</span>
                            <Space size={8}>
                                <Button type="text" icon={<CopyOutlined />} onClick={handleCopyPreviewMarkdown}>
                                    {t('createContent.newsletterPreviewCopy')}
                                </Button>
                                <Button
                                    type="text"
                                    onClick={() => setNewsletterPreview(null)}
                                    style={{ color: '#ef4444' }}
                                >
                                    {t('createContent.newsletterPreviewClear')}
                                </Button>
                            </Space>
                        </div>
                    }
                    style={{ borderColor: '#d1d5db' }}
                >
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div>
                            <Typography.Title level={4} style={{ marginBottom: 4 }}>
                                {newsletterPreview.title}
                            </Typography.Title>
                            <Space direction="vertical" size={2}>
                                {newsletterPreview.goal && (
                                    <Typography.Text>
                                        <strong>{t('createContent.newsletterPreviewGoal')}:</strong> {newsletterPreview.goal}
                                    </Typography.Text>
                                )}
                                {newsletterPreview.audience && (
                                    <Typography.Text>
                                        <strong>{t('createContent.newsletterPreviewAudience')}:</strong> {newsletterPreview.audience}
                                    </Typography.Text>
                                )}
                            </Space>
                        </div>

                        <List
                            dataSource={newsletterPreview.sections}
                            split
                            renderItem={(section, idx) => (
                                <List.Item style={{ alignItems: 'flex-start' }}>
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <Typography.Title level={5} style={{ marginBottom: 0 }}>
                                            {idx + 1}. {section.generatedTitle}
                                        </Typography.Title>
                                        <Typography.Text style={{ color: '#4b5563' }}>{section.summary}</Typography.Text>
                                        {section.originalDescription && (
                                            <Typography.Text type="secondary">
                                                {t('createContent.newsletterPreviewOriginalTitle', {
                                                    title: section.originalTitle,
                                                })}
                                            </Typography.Text>
                                        )}
                                        {section.articleSummaries.length > 0 && (
                                            <div>
                                                <Typography.Text strong>
                                                    {t('createContent.newsletterPreviewArticlesTitle')}
                                                </Typography.Text>
                                                <List
                                                    dataSource={section.articleSummaries}
                                                    style={{ marginTop: 4 }}
                                                    split={false}
                                                    renderItem={(articleSummary) => (
                                                        <List.Item style={{ padding: '4px 0' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                {articleSummary.url ? (
                                                                    <a href={articleSummary.url} target="_blank" rel="noreferrer">
                                                                        {articleSummary.title}
                                                                    </a>
                                                                ) : (
                                                                    <Typography.Text strong>{articleSummary.title}</Typography.Text>
                                                                )}
                                                                <Typography.Text style={{ color: '#6b7280', fontSize: 12 }}>
                                                                    {articleSummary.summary}
                                                                </Typography.Text>
                                                            </div>
                                                        </List.Item>
                                                    )}
                                                />
                                            </div>
                                        )}
                                        <Typography.Paragraph style={{ marginBottom: 0 }}>
                                            {section.body}
                                        </Typography.Paragraph>
                                        {section.callToAction && (
                                            <Typography.Text strong style={{ color: '#2563eb' }}>
                                                {t('createContent.newsletterPreviewCallToAction', {
                                                    cta: section.callToAction,
                                                })}
                                            </Typography.Text>
                                        )}
                                    </Space>
                                </List.Item>
                            )}
                        />

                        {newsletterPreview.compiledMarkdown && (
                            <div>
                                <Typography.Text strong>
                                    {t('createContent.newsletterPreviewMarkdownTitle')}
                                </Typography.Text>
                                <pre
                                    style={{
                                        background: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 8,
                                        padding: 16,
                                        marginTop: 8,
                                        maxHeight: 300,
                                        overflow: 'auto',
                                        fontSize: 12,
                                    }}
                                >
                                    {newsletterPreview.compiledMarkdown}
                                </pre>
                            </div>
                        )}
                    </Space>
                </Card>
            )}

            {/* Action Buttons */}
            <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space wrap>
                        <Button
                            type="default"
                            icon={<RobotOutlined />}
                            onClick={handleGenerateAISuggestion}
                            loading={AILoading}
                            style={{ background: '#f0f0f0', borderColor: '#d9d9d9' }}
                        >
                            {t('createContent.generateAISuggestion')}
                        </Button>
                        {watchNewsletter && (
                            <Button
                                type="primary"
                                icon={<FileTextOutlined />}
                                onClick={handleSave}
                                loading={processingNewsletter || loading}
                                disabled={sectionsWithContent.length === 0 || !allSectionsGenerated}
                            >
                                {t('createContent.generateAndSaveNewsletter')}
                            </Button>
                        )}
                        {!watchNewsletter && (
                            <Button type="primary" icon={<SendOutlined />} onClick={handleSave} loading={loading}>
                                {t('createContent.save')}
                            </Button>
                        )}
                    </Space>
                    {watchNewsletter && (
                        <Typography.Text type={allSectionsGenerated ? 'success' : 'secondary'}>
                            {sectionsWithContent.length > 0
                                ? t('createContent.sectionGenerationStatus', {
                                      generated: generatedSectionsCount,
                                      total: sectionsWithContent.length,
                                  })
                                : t('createContent.sectionGenerationStatusEmpty')}
                        </Typography.Text>
                    )}
                </Space>
            </div>
                </>
            )}

        </Space>
        </>
    );
};

export default CreateContentPage;

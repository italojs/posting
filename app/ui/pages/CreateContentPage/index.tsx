import { LoadingOutlined, SendOutlined, RobotOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, Form, Space, Typography, message } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import type { BasicSiteProps } from '/app/ui/pages/App';
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
    GenerateLinkedInPostResult,
    LinkedInPost,
} from '/app/api/contents/models';
import { BrandSummary, BrandContextForAI } from '/app/api/brands/models';
import { publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';
import ContentTypeSelector from './components/ContentTypeSelector';
import ConfigurationPanel from './components/ConfigurationPanel';
import NewsletterWorkspace from './components/NewsletterWorkspace';
import type { SectionGenerationEntry } from './types';

type CreateContentPageProps = BasicSiteProps;
type SectionGenerationMap = Record<string, SectionGenerationEntry>;

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

const CreateContentPage: React.FC<CreateContentPageProps> = ({ userId }) => {
    const [form] = Form.useForm();
    const { t, i18n } = useTranslation('common');
    const [, navigate] = useLocation();
    const [loading, setLoading] = useState(false);
    const [AILoading, setAILoading] = useState(false);
    const [processingNewsletter, setProcessingNewsletter] = useState(false);
    const [contentType, setContentType] = useState<'newsletter' | 'social' | null>(null);
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

    // LinkedIn Post states
    const [selectedLinkedInArticle, setSelectedLinkedInArticle] = useState<RssItem | null>(null);
    const [generatingLinkedInPost, setGeneratingLinkedInPost] = useState(false);
    const [generatedLinkedInPost, setGeneratedLinkedInPost] = useState<LinkedInPost | null>(null);

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
                console.log('Favorite URLs loaded:', urls);
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

                        // Determine content type based on networks
                        if (doc.networks?.newsletter) {
                            setContentType('newsletter');
                        } else if (doc.networks?.twitter || doc.networks?.linkedin || doc.networks?.instagram || doc.networks?.tiktok) {
                            setContentType('social');
                        }
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
        
        console.log('handleFetchRss called:', { auto, networks: v, anyNetwork, favoriteUrls: favoriteUrls.length });
        
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
            console.log('Fetching RSS from URLs:', merged);
            const res = (await Meteor.callAsync('get.contents.fetchRss', { urls: merged })) as { items: RssItem[] };
            console.log('RSS fetched:', res.items?.length || 0, 'items');
            setRssItems(res.items || []);
            setSelectedItemLinks(new Set());
            if ((res.items || []).length === 0) message.info(t('createContent.listEmpty'));
        } catch (error) {
            console.error('RSS fetch error:', error);
            errorResponse(error as Meteor.Error, t('createContent.loadError'));
        }
        setLoading(false);
    };

    // Auto-carrega itens quando favoritos OU redes mudarem (inclusive quando setadas via setFieldsValue)
    useEffect(() => {
        const any = !!(watchNewsletter || watchInstagram || watchTwitter || watchTiktok || watchLinkedin);
        console.log('useEffect triggered:', { any, favoriteUrls: favoriteUrls.length, watchNewsletter, watchTwitter, watchLinkedin });
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

    const handleSave = async (processNewsletter: boolean = false) => {
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

        // For newsletter processing, we need sections with content and all sections generated
        let generatedSectionPayload: GeneratedNewsletterSectionPreview[] | undefined;
        if (isNewsletterFlow && processNewsletter) {
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

        if (isNewsletterFlow && processNewsletter) {
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

            if (isNewsletterFlow && processNewsletter) {
                // Only process newsletter when explicitly requested
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
                // Simple save without newsletter processing
                message.success(t('createContent.saved'));
                if (!editingId) {
                    navigateDestination = publicRoutes.home.path;
                }
            }
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.saveError'));
        } finally {
            if (isNewsletterFlow && processNewsletter) {
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
            
            const result = (await Meteor.callAsync('get.contents.generateTwitterThread', {
                article: selectedTwitterArticle,
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

    // LinkedIn Post functions
    const handleGenerateLinkedInPost = async () => {
        if (!selectedLinkedInArticle) {
            message.error(t('createContent.selectArticleForLinkedin'));
            return;
        }

        setGeneratingLinkedInPost(true);
        try {
            const brandContext = resolveBrandContext(watchBrandId);
            
            const result = (await Meteor.callAsync('get.contents.generateLinkedInPost', {
                article: selectedLinkedInArticle,
                brand: brandContext,
                language: i18n.language,
            })) as GenerateLinkedInPostResult;

            setGeneratedLinkedInPost(result.post);
            message.success(t('createContent.linkedinPostGenerated'));
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.linkedinPostGenerationError'));
        } finally {
            setGeneratingLinkedInPost(false);
        }
    };

    const handleCopyLinkedInPost = async () => {
        if (!generatedLinkedInPost?.content) {
            message.error('No LinkedIn post to copy');
            return;
        }
        
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(generatedLinkedInPost.content);
            message.success(t('createContent.linkedinPostCopied'));
        } else {
            message.error(t('createContent.clipboardNotSupported'));
        }
    };

    const handleResetLinkedInPost = () => {
        setSelectedLinkedInArticle(null);
        setGeneratedLinkedInPost(null);
    };

    const handleSelectContentType = (type: 'newsletter' | 'social') => {
        setContentType(type);
        
        // Set appropriate form values based on type
        if (type === 'newsletter') {
            form.setFieldsValue({
                newsletter: true,
                twitter: false,
                linkedin: false,
                instagram: false,
                tiktok: false,
            });
            
            // Initialize newsletter sections if not exists
            if (!sections.length) {
                const firstSection = {
                    id: Math.random().toString(36).slice(2, 9),
                    title: '',
                    description: '',
                    rssItems: [],
                    newsArticles: [],
                };
                setSections([firstSection]);
                setActiveSectionIndex(0);
            }
            
            // Automatically fetch RSS for newsletter (wait for favoriteUrls to be loaded)
            if (favoriteUrls.length > 0) {
                setTimeout(() => handleFetchRss(true), 100);
            }
        } else if (type === 'social') {
            form.setFieldsValue({
                newsletter: false,
                // Don't set social networks yet, let user choose
            });
        }
    };

    const handleBackToSelection = () => {
        setContentType(null);
        form.resetFields(['newsletter', 'twitter', 'linkedin', 'instagram', 'tiktok']);
        setRssItems([]);
        setSelectedItemLinks(new Set());
        setActiveSectionIndex(-1);
        setNewsletterPreview(null);
    };

    

    if (!userId) {
        // fallback guard
        navigate(protectedRoutes.createContent.path);
        return <LoadingOutlined />;
    }

    return (
        <>
            <style>{collapseStyles}</style>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
                <ContentTypeSelector
                    onSelectType={handleSelectContentType}
                />
            )}

            {/* Content Creation Form */}
            {contentType && (
                <>
                    <div style={{ marginBottom: '16px' }}>
                        <Button 
                            onClick={handleBackToSelection} 
                            style={{ marginBottom: '16px' }}
                        >
                            ← Voltar para seleção
                        </Button>
                        <Typography.Text strong style={{ marginLeft: '16px' }}>
                            Modo: {contentType === 'newsletter' ? 'Newsletter' : 'Redes Sociais'}
                        </Typography.Text>
                    </div>

                    {/* Layout em uma única coluna */}
            <div 
                style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    alignItems: 'stretch',
                    width: '100%'
                }}
            >
                <ConfigurationPanel
                    contentType={contentType}
                    form={form}
                    t={t}
                    brandOptions={brandOptions}
                    brands={brands}
                    brandsLoading={brandsLoading}
                    selectedBrandSummary={selectedBrandSummary}
                    isBrandMissing={isBrandMissing}
                    handleFetchRss={handleFetchRss}
                    rssItems={rssItems}
                    navigate={navigate}
                    selectedTwitterArticle={selectedTwitterArticle}
                    setSelectedTwitterArticle={setSelectedTwitterArticle}
                    generatingThread={generatingThread}
                    generatedThread={generatedThread}
                    setGeneratedThread={setGeneratedThread}
                    handleGenerateTwitterThread={handleGenerateTwitterThread}
                    handleCopyIndividualTweet={handleCopyIndividualTweet}
                    handleResetTwitterThread={handleResetTwitterThread}
                    selectedLinkedInArticle={selectedLinkedInArticle}
                    setSelectedLinkedInArticle={setSelectedLinkedInArticle}
                    generatingLinkedInPost={generatingLinkedInPost}
                    generatedLinkedInPost={generatedLinkedInPost}
                    setGeneratedLinkedInPost={setGeneratedLinkedInPost}
                    handleGenerateLinkedInPost={handleGenerateLinkedInPost}
                    handleCopyLinkedInPost={handleCopyLinkedInPost}
                    handleResetLinkedInPost={handleResetLinkedInPost}
                />
                
                {contentType === 'newsletter' && (
                    <NewsletterWorkspace
                        form={form}
                        t={t}
                        sections={sections}
                        setSections={setSections}
                        activeSectionIndex={activeSectionIndex}
                        setActiveSectionIndex={setActiveSectionIndex}
                        sectionGenerations={sectionGenerations}
                        handleRefreshSectionQueries={handleRefreshSectionQueries}
                        handleFetchNewsForSection={handleFetchNewsForSection}
                        handleGenerateSectionContent={handleGenerateSectionContent}
                        currentSection={currentSection}
                        currentSectionId={currentSectionId}
                        currentSectionQueries={currentSectionQueries}
                        currentSectionNewsResults={currentSectionNewsResults}
                        currentSectionQueriesLoading={currentSectionQueriesLoading}
                        currentSectionNewsLoading={currentSectionNewsLoading}
                        currentSectionGeneration={currentSectionGeneration}
                        currentSectionGenerationLoading={currentSectionGenerationLoading}
                        favoriteUrls={favoriteUrls}
                        rssItems={rssItems}
                        newsletterPreview={newsletterPreview}
                        handleCopyPreviewMarkdown={handleCopyPreviewMarkdown}
                        setNewsletterPreview={setNewsletterPreview}
                        handleGenerateAISuggestion={handleGenerateAISuggestion}
                        AILoading={AILoading}
                    />
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space wrap>
                        {contentType && (
                            <Button 
                                type="primary" 
                                icon={<SendOutlined />} 
                                onClick={() => handleSave(false)} 
                                loading={loading}
                            >
                                {t('createContent.save')}
                            </Button>
                        )}
                        {contentType === 'newsletter' && watchNewsletter && (
                            <Button
                                type="default"
                                icon={<FileTextOutlined />}
                                onClick={() => handleSave(true)}
                                loading={processingNewsletter || loading}
                                disabled={sectionsWithContent.length === 0 || !allSectionsGenerated}
                            >
                                {t('createContent.generateAndSaveNewsletter')}
                            </Button>
                        )}
                    </Space>
                    {contentType === 'newsletter' && watchNewsletter && (
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

import { LoadingOutlined, SendOutlined, StarFilled, RobotOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Form, Input, List, Space, Typography, message, Badge, Collapse } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { BasicSiteProps } from '../App';
import { RssItem, NewsletterSection, GenerateSuggestionResult } from '/app/api/contents/models';
import { publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';

type CreateContentPageProps = BasicSiteProps;

const CreateContentPage: React.FC<CreateContentPageProps> = ({ userId }) => {
    const [form] = Form.useForm();
    const { t, i18n } = useTranslation('common');
    const [, navigate] = useLocation();
    const [loading, setLoading] = useState(false);
    const [AILoading, setAILoading] = useState(false);
    
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
    `;
    const [isEdit, params] = useRoute(protectedRoutes.editContent.path);
    const editingId = isEdit ? (params as any)?.id as string : undefined;
    const [rssItems, setRssItems] = useState<RssItem[]>([]);
    const [selectedItemLinks, setSelectedItemLinks] = useState<Set<string>>(new Set());
    const [favoriteUrls, setFavoriteUrls] = useState<string[]>([]);
    const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);
    // Newsletter sections: when newsletter is selected, user can create multiple sections and pick items per section
    const [sections, setSections] = useState<NewsletterSection[]>([]);
    const [activeSectionIndex, setActiveSectionIndex] = useState<number>(-1);
    // Only favorites mode

    const rssCount = rssItems?.length ?? 0;

    useEffect(() => {
        const run = async () => {
            try {
                const res = (await Meteor.callAsync('get.userProfiles.rssFavorites')) as { urls: string[] };
                const urls = (res.urls || []).filter(Boolean);
                setFavoriteUrls(urls);
                // auto-select at least one favorite and load items
                if (urls.length > 0) {
                    setSelectedFavorites((prev) => (prev.length > 0 ? prev : [urls[0]]));
                }
                // If editing, load existing content and populate
                if (editingId) {
                    const doc = (await Meteor.callAsync('get.contents.byId', { _id: editingId })) as any;
                    if (doc) {
                        form.setFieldsValue({
                            name: doc.name,
                            audience: doc.audience,
                            goal: doc.goal,
                            newsletter: !!doc.networks?.newsletter,
                            instagram: !!doc.networks?.instagram,
                            twitter: !!doc.networks?.twitter,
                            tiktok: !!doc.networks?.tiktok,
                            linkedin: !!doc.networks?.linkedin,
                        });
                        // Preselect favorites that exist in doc.rssUrls
                        const preset = (doc.rssUrls || []).filter((u: string) => urls.includes(u));
                        setSelectedFavorites(preset.length ? preset : urls.slice(0, 1));
                        // Preload sections and selected items
                        const docSections = (doc.newsletterSections || []) as NewsletterSection[];
                        setSections(docSections);
                        setActiveSectionIndex(docSections.length ? 0 : -1);
                        // For general (non-newsletter), mark selectedItemLinks from doc.rssItems
                        const selectedLinks = new Set<string>((doc.rssItems || []).map((it: RssItem) => it.link || it.title || ''));
                        setSelectedItemLinks(selectedLinks);
                    }
                }
            } catch (err) {
                // ignore
            }
        };
        run();
    }, [editingId]);

    // manual URL input removed; only favorites are used

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

        const merged = Array.from(new Set(selectedFavorites));
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

    // auto-load items whenever selected favorites change
    useEffect(() => {
        // don't auto-fetch on first render until favorites are known; rely on init effect to set selection
        handleFetchRss(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFavorites]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const urls = Array.from(new Set(selectedFavorites));
            
            // For newsletter mode, items are organized within sections
            // For other modes, collect all articles from all sections
            let itemsToSave: RssItem[] = [];
            let newsletterSections: NewsletterSection[] | undefined = undefined;
            
            if (values.newsletter && sections.length > 0) {
                // Newsletter mode: use sections with their articles
                newsletterSections = sections.map((s, idx) => ({
                    id: s.id,
                    title: s.title?.trim() || `${t('createContent.section', 'Seção')} ${idx + 1}`,
                    description: s.description?.trim() || undefined,
                    rssItems: s.rssItems || [],
                }));
                
                // For newsletter, itemsToSave includes all articles from all sections
                itemsToSave = sections.flatMap(s => s.rssItems || []);
            } else {
                // Non-newsletter mode: use old logic with selectedItemLinks
                itemsToSave = rssItems.filter((it) => !it.link || selectedItemLinks.has(it.link));
            }
            setLoading(true);
            const method = editingId ? 'set.contents.update' : 'set.contents.create';
            const payload: any = {
                ...(editingId ? { _id: editingId } : {}),
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
                newsletterSections,
            };
            await Meteor.callAsync(method, payload);
            message.success(t('createContent.saved'));
            navigate(publicRoutes.home.path);
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.saveError'));
        }
        setLoading(false);
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
            
            setAILoading(true);
            
            const numberOfSections = 3;
            
            // Get current language from i18n
            const currentLanguage = i18n.language;

            const result = (await Meteor.callAsync('get.contents.generateSuggestion', {
                contentTemplate: formValues,
                numberOfSections,
                language: currentLanguage
            })) as GenerateSuggestionResult;

            form.setFieldsValue({
                name: result.title
            });

            if (networkValues.newsletter) {
                const newSections: NewsletterSection[] = result.sections.map((section, index) => ({
                    id: sections[index]?.id || Math.random().toString(36).slice(2, 9),
                    title: section.title,
                    description: section.description,
                    rssItems: []
                }));
                setSections(newSections);
                setActiveSectionIndex(0);
            }

            message.success(`✨ Suggestion generated! ${result.sections.length} sections created automatically.`);

        } catch (error) {
            errorResponse(error as Meteor.Error, 'Error generating AI suggestion. Please try again.');
        } finally {
            setAILoading(false);
        }
    };

    const isFavorited = (url: string) => favoriteUrls.includes(url);
    const toggleFavorite = async (url: string) => {
        try {
            if (isFavorited(url)) {
                await Meteor.callAsync('set.userProfile.removeRssFavorites', { urls: [url] });
                setFavoriteUrls((prev) => prev.filter((u) => u !== url));
                // if it was selected, unselect; optionally keep at least one selected if possible
                setSelectedFavorites((prev) => {
                    const next = prev.filter((u) => u !== url);
                    if (next.length === 0 && favoriteUrls.length > 0) {
                        const remaining = favoriteUrls.filter((u) => u !== url);
                        if (remaining.length > 0) return [remaining[0]];
                    }
                    return next;
                });
                message.success(t('createContent.favoritesRemoved'));
            } else {
                await Meteor.callAsync('set.userProfile.addRssFavorites', { urls: [url] });
                setFavoriteUrls((prev) => Array.from(new Set([...prev, url])));
                // if nothing selected yet, select this one automatically
                setSelectedFavorites((prev) => (prev.length === 0 ? [url] : prev));
                message.success(t('createContent.favoritesAdded'));
            }
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.favoritesError'));
        }
    };

    // no manual input; removed addFavoriteToInput
    const selectableFavorites = useMemo(() => favoriteUrls, [favoriteUrls]);

    // function to group news by RSS source
    const groupedRssItems = useMemo(() => {
        const groups: { [key: string]: RssItem[] } = {};
        
        rssItems.forEach(item => {
            const sourceName = item.source || 'Unknown';
            
            if (!groups[sourceName]) {
                groups[sourceName] = [];
            }
            
            groups[sourceName].push(item);
        });
        
        return Object.entries(groups).map(([name, items]) => ({ name, items }));
    }, [rssItems]);

    // Function to check if an article is already in any section
    const isArticleInAnySection = (article: RssItem) => {
        const articleKey = article.link || article.title || '';
        return sections.some(section => 
            section.rssItems.some(item => (item.link || item.title || '') === articleKey)
        );
    };

    // Function to add article to active section
    const addArticleToActiveSection = (article: RssItem) => {
        if (activeSectionIndex < 0 || !sections[activeSectionIndex]) return;
        
        setSections((prev) => {
            const next = [...prev];
            const section = next[activeSectionIndex];
            const articleKey = article.link || article.title || '';
            
            // Check if it already exists in the section
            const exists = section.rssItems.find(item => (item.link || item.title || '') === articleKey);
            if (!exists) {
                section.rssItems.push(article);
                next[activeSectionIndex] = { ...section };
            }
            
            return next;
        });
    };

    // Function to remove article from active section
    const removeArticleFromActiveSection = (article: RssItem) => {
        if (activeSectionIndex < 0 || !sections[activeSectionIndex]) return;
        
        setSections((prev) => {
            const next = [...prev];
            const section = next[activeSectionIndex];
            const articleKey = article.link || article.title || '';
            
            section.rssItems = section.rssItems.filter(item => 
                (item.link || item.title || '') !== articleKey
            );
            next[activeSectionIndex] = { ...section };
            
            return next;
        });
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

            {/* Grid Layout: Same Width, Same Height */}
            <div 
                style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    alignItems: 'start',
                    minHeight: '600px',
                    maxWidth: '100%',
                    width: '100%'
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
                            initialValues={{ newsletter: false, instagram: false, twitter: false, tiktok: false, linkedin: false }}
                            style={{ padding: '8px 0' }}
                            onValuesChange={(_, all) => {
                                const any = !!(all?.newsletter || all?.instagram || all?.twitter || all?.tiktok || all?.linkedin);
                                // Enforce newsletter-exclusive mode
                                if (all?.newsletter) {
                                    if (all?.instagram || all?.twitter || all?.tiktok || all?.linkedin) {
                                        form.setFieldsValue({ instagram: false, twitter: false, tiktok: false, linkedin: false });
                                    }
                                    // Ensure at least one section exists and is active
                                    if (!sections.length) {
                                        const first = { id: Math.random().toString(36).slice(2, 9), title: '', description: '', rssItems: [] };
                                        setSections([first]);
                                        setActiveSectionIndex(0);
                                    }
                                }
                                // If newsletter turned off and no other networks, clear section focus; keep sections data
                                if (!all?.newsletter && !(all?.instagram || all?.twitter || all?.tiktok || all?.linkedin)) {
                                    setActiveSectionIndex(-1);
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
                                <Form.Item shouldUpdate noStyle>
                                    {({ getFieldValue }) => {
                                        const isNewsletter = !!getFieldValue('newsletter');
                                        return (
                                            <Space size={[4, 4]}>
                                                <Form.Item name="newsletter" valuePropName="checked" noStyle>
                                                    <Checkbox 
                                                        style={{ 
                                                            fontSize: '13px',
                                                            padding: '4px 8px'
                                                        }}
                                                    >
                                                        {t('createContent.newsletter')}
                                                    </Checkbox>
                                                </Form.Item>
                                                <Form.Item name="instagram" valuePropName="checked" noStyle>
                                                    <Checkbox 
                                                        disabled={isNewsletter}
                                                        style={{ 
                                                            fontSize: '13px',
                                                            padding: '4px 2px'
                                                        }}
                                                    >
                                                        {t('createContent.instagram')}
                                                    </Checkbox>
                                                </Form.Item>
                                                <Form.Item name="twitter" valuePropName="checked" noStyle>
                                                    <Checkbox 
                                                        disabled={isNewsletter}
                                                        style={{ 
                                                            fontSize: '13px',
                                                            padding: '4px 2px'
                                                        }}
                                                    >
                                                        {t('createContent.twitter')}
                                                    </Checkbox>
                                                </Form.Item>
                                                <Form.Item name="tiktok" valuePropName="checked" noStyle>
                                                    <Checkbox 
                                                        disabled={isNewsletter}
                                                        style={{ 
                                                            fontSize: '13px',
                                                            padding: '4px 2px'
                                                        }}
                                                    >
                                                        {t('createContent.tiktok')}
                                                    </Checkbox>
                                                </Form.Item>
                                                <Form.Item name="linkedin" valuePropName="checked" noStyle>
                                                    <Checkbox 
                                                        disabled={isNewsletter}
                                                        style={{ 
                                                            fontSize: '13px',
                                                            padding: '4px 2px'
                                                        }}
                                                    >
                                                        {t('createContent.linkedin')}
                                                    </Checkbox>
                                                </Form.Item>
                                            </Space>
                                        );
                                    }}
                                </Form.Item>
                            </div>
                        </Form>
                    </Card>

                    {/* Card 2: Sources RSS */}
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
                                    2
                                </div>
                                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                                    {t('createContent.rssSourcesCard')}
                                </span>
                            </div>
                        }
                        styles={{
                            header: { borderBottom: 'none' },
                            body: { paddingTop: 0 }
                        }}
                    >
                        <Form form={form} style={{ padding: '8px 0' }}>
                            <Form.Item shouldUpdate noStyle>
                                {({ getFieldValue }) => {
                                    const any = !!(
                                        getFieldValue('newsletter') ||
                                        getFieldValue('instagram') ||
                                        getFieldValue('twitter') ||
                                        getFieldValue('tiktok') ||
                                        getFieldValue('linkedin')
                                    );
                                    if (!any) return null;
                                    return (
                                        selectableFavorites.length > 0 && (
                                            <div>
                                                <Typography.Text 
                                                    strong 
                                                    style={{ 
                                                        fontWeight: '600', 
                                                        fontSize: '14px',
                                                        display: 'block'
                                                    }}
                                                >
                                                    {t('createContent.favoritesTitle')}
                                                </Typography.Text>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {selectableFavorites.map((url) => {
                                                        const selected = selectedFavorites.includes(url);
                                                        return (
                                                            <div
                                                                key={url}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '4px 6px',
                                                                    border: '1px solid #d9d9d9',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: selected ? '#f0f2ff' : '#ffffff',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    minHeight: '40px'
                                                                }}
                                                                onClick={() =>
                                                                    setSelectedFavorites((prev) =>
                                                                        prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
                                                                    )
                                                                }
                                                            >
                                                                <span style={{ 
                                                                    fontSize: '14px',
                                                                    color: '#333',
                                                                    flex: 1,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    marginRight: '12px'
                                                                }}>
                                                                    {url}
                                                                </span>
                                                                <Button
                                                                    size="small"
                                                                    type="text"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleFavorite(url);
                                                                    }}
                                                                    style={{
                                                                        border: 'none',
                                                                        boxShadow: 'none',
                                                                        padding: '2px',
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        backgroundColor: '#FCD34D',
                                                                        borderRadius: '4px'
                                                                    }}
                                                                    icon={<StarFilled style={{ color: '#ffffff', fontSize: '12px' }} />}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <Typography.Text 
                                                    type="secondary"
                                                    style={{ fontSize: '12px', lineHeight: '1.4' }}
                                                >
                                                    {t('createContent.favoritesHelp')}
                                                </Typography.Text>
                                            </div>
                                        )
                                    );
                                }}
                            </Form.Item>

                            <Form.Item shouldUpdate noStyle>
                                {({ getFieldValue }) => {
                                    const anyNetwork = !!(
                                        getFieldValue('newsletter') ||
                                        getFieldValue('instagram') ||
                                        getFieldValue('twitter') ||
                                        getFieldValue('tiktok') ||
                                        getFieldValue('linkedin')
                                    );
                                    if (!anyNetwork)
                                        return (
                                            <div style={{ 
                                                textAlign: 'center', 
                                                padding: '20px 16px',
                                                background: '#fafafa',
                                                borderRadius: '8px',
                                                border: '1px solid #f0f0f0'
                                            }}>
                                                <Typography.Text 
                                                    type="secondary"
                                                    style={{ fontSize: '14px' }}
                                                >
                                                    {t('createContent.selectNetworkPrompt')}
                                                </Typography.Text>
                                            </div>
                                        );
                                    return (
                                        <div style={{ 
                                            textAlign: 'center',
                                            padding: '16px',
                                            background: '#f6f8fa',
                                            borderRadius: '8px',
                                            border: '1px solid #e8eaed'
                                        }}>
                                            <Typography.Text 
                                                strong
                                                style={{ 
                                                    fontSize: '14px',
                                                    color: '#1f2937',
                                                    display: 'block'
                                                }}
                                            >
                                                {t('createContent.itemsFound', { count: rssCount })}
                                            </Typography.Text>
                                            {getFieldValue('newsletter') && activeSectionIndex >= 0 && sections[activeSectionIndex] && (
                                                <div style={{ 
                                                    padding: '8px 12px', 
                                                    background: '#f0f2f5', 
                                                    borderRadius: '6px' 
                                                }}>
                                                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                                        {t('createContent.selectingForSection', {
                                                            title:
                                                                sections[activeSectionIndex].title ||
                                                                `${t('createContent.section', 'Seção')} ${activeSectionIndex + 1}`,
                                                        })}
                                                    </Typography.Text>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            </Form.Item>
                        </Form>
                    </Card>

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
                                                    {t('createContent.contentGenerationCard')}
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
                                                        {t('createContent.newsletterSectionsTitle')}
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
                                                            };
                                                            setSections((prev) => [...prev, newSection]);
                                                            setActiveSectionIndex(sections.length);
                                                        }}
                                                    >
                                                        {t('createContent.addSectionButton')}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Sections List - Interactive Cards */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {sections.map((section, idx) => {
                                                    const isEditing = activeSectionIndex === idx;
                                                    const hasContent = section.title || section.description;
                                                    
                                                    return (
                                                        <div
                                                            key={section.id}
                                                            style={{
                                                                backgroundColor: isEditing ? '#f0f2ff' : '#f8f9fa',
                                                                border: `1px solid ${isEditing ? '#5B5BD6' : '#e9ecef'}`,
                                                                borderRadius: '8px',
                                                                padding: '12px 16px',
                                                                position: 'relative',
                                                                transition: 'all 0.3s ease'
                                                            }}
                                                        >
                                                            {!isEditing && hasContent ? (
                                                                // View Mode (Mini Card)
                                                                <div style={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'flex-start', 
                                                                    justifyContent: 'space-between',
                                                                    gap: '12px'
                                                                }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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
                                                                            <Typography.Text 
                                                                                strong 
                                                                                style={{ 
                                                                                    fontSize: '14px',
                                                                                    color: '#1a1a1a'
                                                                                }}
                                                                            >
                                                                                {section.title}
                                                                            </Typography.Text>
                                                                        </div>
                                                                        <Typography.Text 
                                                                            type="secondary" 
                                                                            style={{ 
                                                                                fontSize: '12px',
                                                                                lineHeight: '1.4',
                                                                                display: 'block',
                                                                                marginLeft: '28px'
                                                                            }}
                                                                        >
                                                                            {section.description}
                                                                        </Typography.Text>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
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
                                                                                        setActiveSectionIndex(-1);
                                                                                    } else if (activeSectionIndex > idx) {
                                                                                        setActiveSectionIndex((i) => i - 1);
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // Edit Mode (Inline Form)
                                                                <div>
                                                                    <div style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'space-between',
                                                                        marginBottom: '12px'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                                                                fontWeight: 'bold'
                                                                            }}>
                                                                                {idx + 1}
                                                                            </div>
                                                                            <Typography.Text 
                                                                                strong 
                                                                                style={{ 
                                                                                    fontSize: '14px',
                                                                                    color: '#5B5BD6'
                                                                                }}
                                                                            >
                                                                                {hasContent ? t('createContent.editingSection') : t('createContent.newSection')}
                                                                            </Typography.Text>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '4px' }}>
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
                                                                                    color: '#52c41a'
                                                                                }}
                                                                                onClick={() => setActiveSectionIndex(-1)}
                                                                                title={t('createContent.saveAndClose')}
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
                                                                                        setActiveSectionIndex(-1);
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <Space direction="vertical" style={{ width: '100%' }}>
                                                                        <Input
                                                                            placeholder={t('createContent.sectionTitlePlaceholder')}
                                                                            value={section.title}
                                                                            onChange={(e) => {
                                                                                const v = e.target.value;
                                                                                setSections((prev) => {
                                                                                    const next = [...prev];
                                                                                    next[idx] = { ...next[idx], title: v };
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
                                                                            placeholder={t('createContent.sectionDescriptionPlaceholder')}
                                                                            value={section.description}
                                                                            onChange={(e) => {
                                                                                const v = e.target.value;
                                                                                setSections((prev) => {
                                                                                    const next = [...prev];
                                                                                    next[idx] = { ...next[idx], description: v };
                                                                                    return next;
                                                                                });
                                                                            }}
                                                                            style={{ 
                                                                                borderRadius: '6px',
                                                                                fontSize: '14px',
                                                                                resize: 'none'
                                                                            }}
                                                                        />
                                                                        
                                                                        {/* Section Articles List */}
                                                                        {section.rssItems && section.rssItems.length > 0 && (
                                                                            <div style={{ marginTop: '16px' }}>
                                                                                <Typography.Text 
                                                                                    strong 
                                                                                    style={{ 
                                                                                        fontSize: '13px',
                                                                                        display: 'block',
                                                                                        marginBottom: '8px',
                                                                                        color: '#5B5BD6'
                                                                                    }}
                                                                                >
                                                                                    {t('createContent.articlesInSection')} ({section.rssItems.length})
                                                                                </Typography.Text>
                                                                                <div>
                                                                                    {section.rssItems.map((article, articleIdx) => (
                                                                                        <div
                                                                                            key={`${article.link || article.title}-${articleIdx}`}
                                                                                            style={{
                                                                                                border: '1px solid #f0f0f0',
                                                                                                borderRadius: '6px',
                                                                                                padding: '8px 12px',
                                                                                                marginBottom: '8px',
                                                                                                backgroundColor: '#fafafa',
                                                                                                display: 'flex',
                                                                                                alignItems: 'flex-start',
                                                                                                gap: '8px',
                                                                                                maxWidth: '100%',
                                                                                                overflow: 'hidden'
                                                                                            }}
                                                                                        >
                                                                                            <div style={{ flex: '0 1 auto', minWidth: 0 }}>
                                                                                                <div style={{ 
                                                                                                    fontSize: '13px',
                                                                                                    fontWeight: '500'                                                                                                    
                                                                                                }}>
                                                                                                    {article.title}
                                                                                                </div>
                                                                                                <div style={{ 
                                                                                                    fontSize: '12px',
                                                                                                    color: '#666',
                                                                                                    overflow: 'hidden',
                                                                                                    display: '-webkit-box',
                                                                                                    WebkitLineClamp: 2,
                                                                                                    WebkitBoxOrient: 'vertical'
                                                                                                }}>
                                                                                                    {article.contentSnippet}
                                                                                                </div>
                                                                                            </div>
                                                                                            <Button
                                                                                                type="primary"
                                                                                                size="small"
                                                                                                danger
                                                                                                icon={<span style={{ fontSize: '12px' }}>→</span>}
                                                                                                onClick={() => removeArticleFromActiveSection(article)}
                                                                                                style={{
                                                                                                    width: '24px',
                                                                                                    height: '24px',
                                                                                                    display: 'flex',
                                                                                                    alignItems: 'center',
                                                                                                    justifyContent: 'center',
                                                                                                    flexShrink: 0
                                                                                                }}
                                                                                                title={t('createContent.removeFromSection')}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Space>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>


                                        </div>
                                    </Card>
                                );
                            }}
                        </Form.Item>
                    </Form>
                </div>

                {/* Main Content - News Feed */}
                <div>
                    {/* Card 4: News Feed */}
                    <Form form={form}>
                        <Form.Item shouldUpdate noStyle>
                            {({ getFieldValue }) => {
                                const any = !!(
                                    getFieldValue('newsletter') ||
                                    getFieldValue('instagram') ||
                                    getFieldValue('twitter') ||
                                    getFieldValue('tiktok') ||
                                    getFieldValue('linkedin')
                                );
                                if (!any) return null;
                                
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
                                                    4
                                                </div>
                                                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                                                    {t('createContent.newsFeedCard')}
                                                </span>
                                            </div>
                                        }
                                        style={{ height: 'fit-content' }}
                                        styles={{
                                            header: { borderBottom: 'none' },
                                            body: { paddingTop: 0 }
                                        }}
                                    >
                                        <div 
                                            style={{ 
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '20px',
                                                alignItems: 'start',
                                                minHeight: '500px'
                                            }}
                                        >
                                           

                                            {/* Main content - List of news items grouped by source */}
                                            <div style={{ maxHeight: 600, overflow: 'auto' }}>
                                                {groupedRssItems.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                        {t('createContent.listEmpty')}
                                                    </div>
                                                ) : (
                                                    <Collapse
                                                        items={groupedRssItems
                                                            .map(group => ({
                                                                ...group,
                                                                items: group.items.filter(item => !isArticleInAnySection(item))
                                                            }))
                                                            .filter(group => group.items.length > 0)
                                                            .map(group => ({
                                                            key: group.name,
                                                            label: (
                                                                <div style={{ 
                                                                    display: 'flex', 
                                                                    justifyContent: 'space-between', 
                                                                    alignItems: 'center', 
                                                                    width: '100%'
                                                                }}>
                                                                    <span style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937' }}>
                                                                        {group.name}
                                                                    </span>
                                                                    <Badge 
                                                                        count={group.items.filter(item => !isArticleInAnySection(item)).length} 
                                                                        overflowCount={99}
                                                                        style={{ backgroundColor: '#6366f1' }}
                                                                    />
                                                                </div>
                                                            ),
                                                            children: (
                                                                <div style={{ paddingTop: '0px' }}>
                                                                    <List
                                                                        dataSource={group.items.filter(item => !isArticleInAnySection(item))}
                                                                        split={false}
                                                                        renderItem={(it) => {
                                                                            const canAdd = activeSectionIndex >= 0 && sections[activeSectionIndex];
                                                                            
                                                                            return (
                                                                                <List.Item
                                                                                    style={{
                                                                                        background: 'transparent',
                                                                                        border: 'none',
                                                                                        marginBottom: '12px',
                                                                                        padding: '8px 0',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                >
                                                                                    <List.Item.Meta
                                                                                        avatar={
                                                                                            canAdd ? (
                                                                                                <Button
                                                                                                    type="primary"
                                                                                                    size="small"
                                                                                                    icon={<span style={{ fontSize: '12px' }}>←</span>}
                                                                                                    onClick={() => addArticleToActiveSection(it)}
                                                                                                    style={{
                                                                                                        backgroundColor: '#52c41a',
                                                                                                        borderColor: '#52c41a',
                                                                                                        width: '28px',
                                                                                                        height: '28px',
                                                                                                        display: 'flex',
                                                                                                        alignItems: 'center',
                                                                                                        justifyContent: 'center'
                                                                                                    }}
                                                                                                    title={t('createContent.addToActiveSection')}
                                                                                                />
                                                                                            ) : (
                                                                                                <div style={{
                                                                                                    width: '28px',
                                                                                                    height: '28px',
                                                                                                    backgroundColor: '#f5f5f5',
                                                                                                    borderRadius: '4px',
                                                                                                    display: 'flex',
                                                                                                    alignItems: 'center',
                                                                                                    justifyContent: 'center',
                                                                                                    color: '#d9d9d9'
                                                                                                }}>
                                                                                                    ●
                                                                                                </div>
                                                                                            )
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
                                                                                                    {it.contentSnippet || t('createContent.noDescriptionAvailable')}
                                                                                                </div>
                                                                                                {!canAdd && (
                                                                                                    <Typography.Text 
                                                                                                        type="secondary" 
                                                                                                        style={{ fontSize: '12px', fontStyle: 'italic' }}
                                                                                                    >
                                                                                                        {t('createContent.selectSectionToEdit')}
                                                                                                    </Typography.Text>
                                                                                                )}
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
                                                        style={{ 
                                                            backgroundColor: 'transparent',
                                                            border: 'none'
                                                        }}
                                                        expandIconPosition="end"
                                                        ghost
                                                        size="large"
                                                        className="custom-collapse"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            }}
                        </Form.Item>
                    </Form>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button 
                        type="default" 
                        icon={<RobotOutlined />} 
                        onClick={handleGenerateAISuggestion} 
                        loading={AILoading}
                        style={{ background: '#f0f0f0', borderColor: '#d9d9d9' }}
                    >
                        {t('createContent.generateAISuggestion')}
                    </Button>
                    <Button type="primary" icon={<SendOutlined />} onClick={handleSave} loading={loading}>
                        {t('createContent.generate')}
                    </Button>
                </Space>
            </div>
        </Space>
        </>
    );
};

export default CreateContentPage;

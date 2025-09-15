import { LoadingOutlined, SendOutlined, RobotOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Form, Input, List, Space, Typography, message, Badge, Collapse } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
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
    // removed per-source manual selection; always use all favorites
    // Newsletter sections: when newsletter is selected, user can create multiple sections and pick items per section
    const [sections, setSections] = useState<NewsletterSection[]>([]);
    const [activeSectionIndex, setActiveSectionIndex] = useState<number>(-1);
    // Only favorites mode


    useEffect(() => {
        const run = async () => {
            try {
                const res = (await Meteor.callAsync('get.userProfiles.rssFavorites')) as { urls: string[] };
                const urls = (res.urls || []).filter(Boolean);
                setFavoriteUrls(urls);
                // sempre usar todos os favoritos
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
                        // ignorar seleções salvas; usar todos os favoritos
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

    // Observa valores do formulário para redes sociais (inclusive setFieldsValue)
    const watchNewsletter = Form.useWatch('newsletter', form);
    const watchInstagram = Form.useWatch('instagram', form);
    const watchTwitter = Form.useWatch('twitter', form);
    const watchTiktok = Form.useWatch('tiktok', form);
    const watchLinkedin = Form.useWatch('linkedin', form);

    // Auto-carrega itens quando favoritos OU redes mudarem (inclusive quando setadas via setFieldsValue)
    useEffect(() => {
        const any = !!(watchNewsletter || watchInstagram || watchTwitter || watchTiktok || watchLinkedin);
        if (!any) return;
        if (favoriteUrls.length === 0) return;
        handleFetchRss(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favoriteUrls, watchNewsletter, watchInstagram, watchTwitter, watchTiktok, watchLinkedin]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const urls = Array.from(new Set(favoriteUrls));
            const itemsToSave = rssItems.filter((it) => !it.link || selectedItemLinks.has(it.link));

            // If newsletter and sections exist, build per-section items (using selectedItemLinks as selection for the active section)
            let newsletterSections: NewsletterSection[] | undefined = undefined;
            if (values.newsletter && sections.length > 0) {
                newsletterSections = sections.map((s, idx) => ({
                    id: s.id,
                    title: s.title?.trim() || `Seção ${idx + 1}`,
                    description: s.description?.trim() || undefined,
                    rssItems: s.rssItems || [],
                }));
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

    const handleSaveHtmls = async () => {
        const values = await form.validateFields();
        const urls = Array.from(new Set(favoriteUrls));
        
        let itemsToSave: RssItem[] = [];
        let newsletterSections: NewsletterSection[] | undefined = undefined;
        
        if (values.newsletter && sections.length > 0) {
            newsletterSections = sections.map((s, idx) => ({
                id: s.id,
                title: s.title?.trim() || `${t('createContent.section', 'Seção')} ${idx + 1}`,
                description: s.description?.trim() || undefined,
                rssItems: s.rssItems || [],
            }));
            
            itemsToSave = sections.flatMap(s => s.rssItems || []);
        } else {
            itemsToSave = rssItems.filter((it) => !it.link || selectedItemLinks.has(it.link));
        }

        setLoading(true);
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
        
        await Meteor.callAsync('set.contents.saveHtmls', payload);
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
                                                    2
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
                                                                        Artigos selecionados ({section.rssItems.length})
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
                                                        <Typography.Text 
                                                            strong 
                                                            style={{ 
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            Editando Seção {activeSectionIndex + 1}:
                                                        </Typography.Text>
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
                                                                color: '#5B5BD6'
                                                            }}
                                                            onClick={() => setActiveSectionIndex(-1)}
                                                            title="Fechar edição"
                                                        />
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
                    <Button type="default" onClick={handleSaveHtmls} loading={loading}>
                        {t('createContent.extractText')}
                    </Button>
                </Space>
            </div>
        </Space>
        </>
    );
};

export default CreateContentPage;

import { LoadingOutlined, SendOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Divider, Form, Input, List, Row, Space, Tag, Typography, message, Tabs, Badge } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { BasicSiteProps } from '../App';
import { RssItem, NewsletterSection } from '/app/api/contents/models';
import { publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';

type CreateContentPageProps = BasicSiteProps;

const CreateContentPage: React.FC<CreateContentPageProps> = ({ userId }) => {
    const [form] = Form.useForm();
    const { t } = useTranslation('common');
    const [, navigate] = useLocation();
    const [loading, setLoading] = useState(false);
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
            } catch (err) {
                // ignore
            }
        };
        run();
    }, []);

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
            await Meteor.callAsync('set.contents.create', {
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
            });
            message.success(t('createContent.saved'));
            navigate(publicRoutes.home.path);
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.saveError'));
        }
        setLoading(false);
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

    if (!userId) {
        // fallback guard
        navigate(protectedRoutes.createContent.path);
        return <LoadingOutlined />;
    }

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Typography.Title level={3} style={{ marginBottom: 0 }}>
                    {t('createContent.title')}
                </Typography.Title>
                <Typography.Text type="secondary">
                    {/* optional subtitle; keeping UI clean */}
                </Typography.Text>
            </div>

            <Card>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ newsletter: false, instagram: false, twitter: false, tiktok: false, linkedin: false }}
                    onValuesChange={(_, all) => {
                        const any = !!(all?.newsletter || all?.instagram || all?.twitter || all?.tiktok || all?.linkedin);
                        if (any) {
                            handleFetchRss(true);
                        } else {
                            setRssItems([]);
                            setSelectedItemLinks(new Set());
                        }
                    }}
                >
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="name" label={t('createContent.nameLabel')} rules={[{ required: true }]}> 
                                <Input placeholder="Newsletter" allowClear />
                            </Form.Item>

                            <Form.Item name="audience" label={t('createContent.audienceLabel')}>
                                <Input placeholder={t('createContent.audiencePlaceholder') as string} allowClear />
                            </Form.Item>

                            <Form.Item name="goal" label={t('createContent.goalLabel')}>
                                <Input.TextArea rows={3} placeholder={t('createContent.goalPlaceholder') as string} />
                            </Form.Item>

                            {/* Manual URL entry removed: only favorites are used */}

                            <Divider />
                            <Typography.Text strong>{t('createContent.networksTitle')}</Typography.Text>
                            <div style={{ marginTop: 8, marginBottom: 8 }}>
                                <Space wrap>
                                    <Form.Item name="newsletter" valuePropName="checked" noStyle>
                                        <Checkbox>{t('createContent.newsletter')}</Checkbox>
                                    </Form.Item>
                                    <Form.Item name="instagram" valuePropName="checked" noStyle>
                                        <Checkbox>{t('createContent.instagram')}</Checkbox>
                                    </Form.Item>
                                    <Form.Item name="twitter" valuePropName="checked" noStyle>
                                        <Checkbox>{t('createContent.twitter')}</Checkbox>
                                    </Form.Item>
                                    <Form.Item name="tiktok" valuePropName="checked" noStyle>
                                        <Checkbox>{t('createContent.tiktok')}</Checkbox>
                                    </Form.Item>
                                    <Form.Item name="linkedin" valuePropName="checked" noStyle>
                                        <Checkbox>{t('createContent.linkedin')}</Checkbox>
                                    </Form.Item>
                                </Space>
                            </div>

                            {/* Newsletter Sections UI moved to the right column Tabs for clarity */}

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
                                            <>
                                                <Divider />
                                                <Typography.Text strong>{t('createContent.favoritesTitle')}</Typography.Text>
                                                <div style={{ marginTop: 8, marginBottom: 8 }}>
                                                    {selectableFavorites.map((url) => {
                                                        const selected = selectedFavorites.includes(url);
                                                        const starred = isFavorited(url);
                                                        return (
                                                            <Tag
                                                                key={url}
                                                                color={selected ? 'geekblue' : 'default'}
                                                                style={{ marginBottom: 8, userSelect: 'none' }}
                                                                onClick={() =>
                                                                    setSelectedFavorites((prev) =>
                                                                        prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
                                                                    )
                                                                }
                                                            >
                                                                <Space size={6}>
                                                                    <span>{url}</span>
                                                                    <Button
                                                                        size="small"
                                                                        type="text"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleFavorite(url);
                                                                        }}
                                                                        icon={starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                                                                    />
                                                                </Space>
                                                            </Tag>
                                                        );
                                                    })}
                                                </div>
                                                <Typography.Text type="secondary">
                                                    {t('createContent.favoritesHelp')}
                                                </Typography.Text>
                                            </>
                                        )
                                    );
                                }}
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
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
                                            <div style={{ marginTop: 8 }}>
                                                <Typography.Text type="secondary">
                                                    {t('createContent.selectNetworkPrompt')}
                                                </Typography.Text>
                                            </div>
                                        );
                                    return (
                                        <div style={{ marginTop: 8 }}>
                                            <Typography.Text type="secondary">
                                                {t('createContent.itemsFound', { count: rssCount })}
                                            </Typography.Text>
                                        <Tabs
                                            type="editable-card"
                                            hideAdd
                                            activeKey={activeSectionIndex >= 0 && sections[activeSectionIndex] ? sections[activeSectionIndex].id! : 'general'}
                                            onChange={(key) => {
                                                if (key === 'general') return setActiveSectionIndex(-1);
                                                const idx = sections.findIndex((s) => s.id === key);
                                                setActiveSectionIndex(idx >= 0 ? idx : -1);
                                            }}
                                            onEdit={(targetKey, action) => {
                                                if (action === 'add') {
                                                    const newSection: NewsletterSection = {
                                                        id: Math.random().toString(36).slice(2, 9),
                                                        title: '',
                                                        description: '',
                                                        rssItems: [],
                                                    };
                                                    setSections((prev) => [...prev, newSection]);
                                                    setActiveSectionIndex(sections.length);
                                                }
                                                if (action === 'remove' && typeof targetKey === 'string') {
                                                    const removeIdx = sections.findIndex((s) => s.id === targetKey);
                                                    if (removeIdx >= 0) {
                                                        setSections((prev) => prev.filter((s) => s.id !== targetKey));
                                                        if (activeSectionIndex === removeIdx) setActiveSectionIndex(-1);
                                                        else if (activeSectionIndex > removeIdx) setActiveSectionIndex((i) => i - 1);
                                                    }
                                                }
                                            }}
                                            items={[
                                                {
                                                    key: 'general',
                                                    label: (
                                                        <Space size={6}>
                                                            {t('createContent.generalTab', 'Geral')}
                                                            <Badge count={selectedItemLinks.size} overflowCount={99} />
                                                        </Space>
                                                    ),
                                                    closable: false,
                                                } as any,
                                                ...sections.map((s, idx) => ({
                                                    key: s.id!,
                                                    label: (
                                                        <Space size={6}>
                                                            {s.title || `${t('createContent.section', 'Seção')} ${idx + 1}`}
                                                            <Badge count={(s.rssItems || []).length} overflowCount={99} />
                                                        </Space>
                                                    ),
                                                    closable: true,
                                                } as any)),
                                            ]}
                                        />
                                        {getFieldValue('newsletter') && activeSectionIndex >= 0 && sections[activeSectionIndex] && (
                                            <div style={{ marginBottom: 8 }}>
                                                <Input
                                                    placeholder={t('createContent.sectionTitlePlaceholder', 'Título da seção') as string}
                                                    value={sections[activeSectionIndex]?.title}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setSections((prev) => {
                                                            const next = [...prev];
                                                            next[activeSectionIndex] = { ...next[activeSectionIndex], title: v };
                                                            return next;
                                                        });
                                                    }}
                                                    style={{ marginBottom: 6 }}
                                                />
                                                <Input.TextArea
                                                    rows={2}
                                                    placeholder={
                                                        t(
                                                            'createContent.sectionDescriptionPlaceholder',
                                                            'Descrição (opcional) da seção',
                                                        ) as string
                                                    }
                                                    value={sections[activeSectionIndex]?.description}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setSections((prev) => {
                                                            const next = [...prev];
                                                            next[activeSectionIndex] = { ...next[activeSectionIndex], description: v };
                                                            return next;
                                                        });
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div style={{ marginBottom: 4 }}>
                                            <Typography.Text>
                                                {activeSectionIndex >= 0 && sections[activeSectionIndex]
                                                    ? t('createContent.selectingForSection', {
                                                          title:
                                                              sections[activeSectionIndex].title ||
                                                              `${t('createContent.section', 'Seção')} ${activeSectionIndex + 1}`,
                                                      })
                                                    : t('createContent.selectingForGeneral', 'Selecionando para: Geral')}
                                            </Typography.Text>
                                        </div>
                                    </div>
                                    );
                                }}
                            </Form.Item>
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
                                        <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
                                            <List
                                                dataSource={rssItems}
                                                locale={{ emptyText: t('createContent.listEmpty') }}
                                                renderItem={(it) => {
                                        const linkKey = it.link || it.title || '';
                                        // General selection or section-specific selection
                                        let checked = linkKey ? selectedItemLinks.has(linkKey) : true;
                                        const newsletterChecked = (() => {
                                            if (activeSectionIndex < 0 || !sections[activeSectionIndex]) return undefined;
                                            const current = sections[activeSectionIndex];
                                            const exists = current.rssItems.find((r) => (r.link || r.title) === (it.link || it.title));
                                            return !!exists;
                                        })();
                                        if (newsletterChecked !== undefined) checked = newsletterChecked;
                                        return (
                                            <List.Item
                                                onClick={() => {
                                                    if (!linkKey) return;
                                                    // If a newsletter section is active, toggle within that section. Otherwise toggle general selection
                                                    if (activeSectionIndex >= 0 && sections[activeSectionIndex]) {
                                                        setSections((prev) => {
                                                            const next = [...prev];
                                                            const s = next[activeSectionIndex];
                                                            const existsIdx = s.rssItems.findIndex(
                                                                (r) => (r.link || r.title) === (it.link || it.title),
                                                            );
                                                            if (existsIdx >= 0) s.rssItems.splice(existsIdx, 1);
                                                            else s.rssItems.push(it);
                                                            next[activeSectionIndex] = { ...s };
                                                            return next;
                                                        });
                                                    } else {
                                                        setSelectedItemLinks((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(linkKey)) next.delete(linkKey);
                                                            else next.add(linkKey);
                                                            return next;
                                                        });
                                                    }
                                                }}
                                            >
                                                <List.Item.Meta
                                                    title={
                                                        <Space>
                                                            {linkKey && (
                                                                <Checkbox
                                                                    checked={checked}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        const isC = e.target.checked;
                                                                        if (activeSectionIndex >= 0 && sections[activeSectionIndex]) {
                                                                            setSections((prev) => {
                                                                                const next = [...prev];
                                                                                const s = next[activeSectionIndex];
                                                                                const existsIdx = s.rssItems.findIndex(
                                                                                    (r) => (r.link || r.title) === (it.link || it.title),
                                                                                );
                                                                                const present = existsIdx >= 0;
                                                                                if (isC && !present) s.rssItems.push(it);
                                                                                if (!isC && present) s.rssItems.splice(existsIdx, 1);
                                                                                next[activeSectionIndex] = { ...s };
                                                                                return next;
                                                                            });
                                                                        } else {
                                                                            setSelectedItemLinks((prev) => {
                                                                                const next = new Set(prev);
                                                                                if (isC) next.add(linkKey);
                                                                                else next.delete(linkKey);
                                                                                return next;
                                                                            });
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                            {it.link ? (
                                                                <a href={it.link} target="_blank" rel="noreferrer">
                                                                    {it.title || it.link}
                                                                </a>
                                                            ) : (
                                                                it.title || 'Sem título'
                                                            )}
                                                        </Space>
                                                    }
                                                    description={it.contentSnippet}
                                                />
                                            </List.Item>
                                        );
                                                }}
                                            />
                                        </div>
                                    );
                                }}
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ marginTop: 16 }}>
                        <Button type="primary" icon={<SendOutlined />} onClick={handleSave} loading={loading}>
                            {t('createContent.generate')}
                        </Button>
                    </div>
                </Form>
            </Card>
        </Space>
    );
};

export default CreateContentPage;

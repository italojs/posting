import { AppstoreAddOutlined, AppstoreOutlined, CheckSquareOutlined, GlobalOutlined, ReadOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Empty, Form, Input, List, Row, Segmented, Select, Space, Spin, Typography, message } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { BasicSiteProps } from '../App';
import { RssItem } from '/app/api/contents/models';
import { useTranslation } from 'react-i18next';
import { AddRssSourceResult, GetRssSourcesListInput, RssSource } from '/app/api/rssSources/models';

type FeedPageProps = BasicSiteProps;

type RssCategory = 'technology' | 'business' | 'science' | 'sports' | 'entertainment' | 'general' | string;

const ALL_CATEGORIES: { key: RssCategory | 'all'; labelKey: string; icon?: React.ReactNode }[] = [
    { key: 'all', labelKey: 'feed.categoriesAll', icon: <AppstoreOutlined /> },
    { key: 'technology', labelKey: 'feed.categoriesTechnology' },
    { key: 'business', labelKey: 'feed.categoriesBusiness' },
    { key: 'science', labelKey: 'feed.categoriesScience' },
    { key: 'sports', labelKey: 'feed.categoriesSports' },
    { key: 'entertainment', labelKey: 'feed.categoriesEntertainment' },
    { key: 'general', labelKey: 'feed.categoriesGeneral' },
];

const FeedPage: React.FC<FeedPageProps> = () => {
    const { t } = useTranslation('common');

    const [category, setCategory] = useState<RssCategory | 'all'>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<RssItem[]>([]);
    const [sources, setSources] = useState<RssSource[]>([]);
    const [favoriteUrls, setFavoriteUrls] = useState<string[]>([]);
    const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
    const [sourcesLoading, setSourcesLoading] = useState(false);
    const [addingFeed, setAddingFeed] = useState(false);
    const [addForm] = Form.useForm();
    const categoryOptions = useMemo(() => ALL_CATEGORIES.filter((c) => c.key !== 'all'), []);

    const loadSourcesData = useCallback(async (): Promise<RssSource[]> => {
        const payload: GetRssSourcesListInput = {
            category: category === 'all' ? undefined : (category as string),
            enabledOnly: true,
        };
        setSourcesLoading(true);
        let list: RssSource[] = [];
        try {
            const res = (await Meteor.callAsync('get.rssSources.list', payload)) as { sources: RssSource[] };
            list = res.sources || [];
            setSources(list);
            setSelectedIds((prev) => {
                const validPrev = prev.filter((id) => list.some((s) => (s._id || s.url) === id));
                if (validPrev.length > 0) return validPrev;
                if (list.length > 0) {
                    return [list[0]._id || list[0].url];
                }
                return [];
            });
        } catch (e) {
            // ignore: keep previous sources if request fails
        } finally {
            setSourcesLoading(false);
        }
        try {
            const fav = (await Meteor.callAsync('get.userProfiles.rssFavorites')) as { urls: string[] };
            setFavoriteUrls(fav.urls || []);
        } catch (e) {
            // ignore favorites load errors
        }
        return list;
    }, [category]);

    // Load sources from server when category changes (or initial)
    useEffect(() => {
        loadSourcesData();
    }, [loadSourcesData]);

    const handleAddFeed = async (values: { name?: string; url: string; category: string }) => {
        const trimmedUrl = values.url?.trim();
        if (!trimmedUrl) {
            message.error(t('feed.addSourceUrlRequired'));
            return;
        }
        setAddingFeed(true);
        try {
            const payload = {
                name: values.name?.trim() || undefined,
                url: trimmedUrl,
                category: values.category,
            };
            const res = (await Meteor.callAsync('set.rssSources.addManual', payload)) as AddRssSourceResult;
            const sourceId = res?.source ? res.source._id || res.source.url : undefined;
            message.success(t('feed.addSourceSuccess'));
            addForm.resetFields();
            setShowOnlyFavorites(false);
            await loadSourcesData();
            if (sourceId) {
                setSelectedIds((prev) => (prev.includes(sourceId) ? prev : [...prev, sourceId]));
            }
        } catch (error: any) {
            if (error?.error === 'rssSource.exists') {
                message.warning(t('feed.addSourceAlreadyExists'));
            } else if (error?.error === 'rssSource.invalidUrl') {
                message.error(t('feed.addSourceInvalidUrl'));
            } else {
                message.error(t('feed.addSourceError'));
            }
        } finally {
            setAddingFeed(false);
        }
    };

    const filteredSources = useMemo(() => {
        if (!showOnlyFavorites) return sources;
        const favSet = new Set(favoriteUrls);
        return sources.filter((s) => favSet.has(s.url));
    }, [sources, showOnlyFavorites, favoriteUrls]);

    const selectedUrls = useMemo(() => {
        const idSet = new Set(selectedIds);
        return filteredSources
            .filter((s) => idSet.has(s._id || s.url))
            .map((s) => s.url);
    }, [selectedIds, filteredSources]);

    // Fetch feed whenever selected sources change
    useEffect(() => {
        const fetch = async () => {
            if (selectedUrls.length === 0) {
                setItems([]);
                return;
            }
            setLoading(true);
            try {
                const res = (await Meteor.callAsync('get.contents.fetchRss', { urls: selectedUrls })) as {
                    items: RssItem[];
                };
                // Sort by isoDate/pubDate desc if available
                const sorted = [...(res.items || [])].sort((a, b) => {
                    const da = Date.parse(a.isoDate || a.pubDate || '');
                    const db = Date.parse(b.isoDate || b.pubDate || '');
                    return isNaN(db) || isNaN(da) ? 0 : db - da;
                });
                setItems(sorted);
            } catch (e) {
                message.error(t('feed.loadError'));
            }
            setLoading(false);
        };
        fetch();
    }, [selectedUrls, t]);

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredSources.map((s) => s._id || s.url));
        } else {
            setSelectedIds((prev) => prev.filter((id) => !filteredSources.find((s) => (s._id || s.url) === id)));
        }
    };

    const isFavorited = (url: string) => favoriteUrls.includes(url);
    const toggleFavorite = async (url: string) => {
        try {
            if (isFavorited(url)) {
                await Meteor.callAsync('set.userProfile.removeRssFavorites', { urls: [url] });
                setFavoriteUrls((prev) => prev.filter((u) => u !== url));
                message.success(t('feed.favoritesRemoved'));
            } else {
                await Meteor.callAsync('set.userProfile.addRssFavorites', { urls: [url] });
                setFavoriteUrls((prev) => Array.from(new Set([...
                    prev,
                    url,
                ])));
                message.success(t('feed.favoritesAdded'));
            }
        } catch (e) {
            message.error(t('feed.favoritesError'));
        }
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Typography.Title level={3} style={{ marginBottom: 0 }}>
                    {t('feed.title')}
                </Typography.Title>
                <Typography.Text type="secondary">{t('feed.subtitle')}</Typography.Text>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={10} lg={8}>
                    <Card title={<span><GlobalOutlined />&nbsp;{t('feed.categories')}</span>} size="small">
                        <Segmented
                            block
                            options={ALL_CATEGORIES.map((c) => ({
                                label: (
                                    <span>
                                        {c.icon}
                                        {c.icon ? ' ' : ''}
                                        {t(c.labelKey as any)}
                                    </span>
                                ),
                                value: c.key,
                            }))}
                            value={category}
                            onChange={(val) => setCategory(val as any)}
                        />
                    </Card>

                    <Card
                        title={<span><ReadOutlined />&nbsp;{t('feed.sources')}</span>}
                        size="small"
                        style={{ marginTop: 12 }}
                        extra={
                            <Space>
                                <Checkbox
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredSources.length}
                                    checked={filteredSources.length > 0 && selectedIds.length >= filteredSources.length}
                                    onChange={(e) => toggleSelectAll(e.target.checked)}
                                >
                                    {t('feed.selectAll')}
                                </Checkbox>
                                <Button size="small" type={showOnlyFavorites ? 'primary' : 'default'} onClick={() => setShowOnlyFavorites((v) => !v)}>
                                    {showOnlyFavorites ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                                    &nbsp;{t('feed.onlyFavorites')}
                                </Button>
                            </Space>
                        }
                    >
                        <div style={{ maxHeight: 360, overflow: 'auto' }}>
                            {sourcesLoading ? (
                                <div style={{ padding: 24, textAlign: 'center' }}>
                                    <Spin />
                                </div>
                            ) : (
                                <Checkbox.Group
                                    style={{ width: '100%' }}
                                    value={selectedIds}
                                    onChange={(vals) => setSelectedIds(vals as string[])}
                                >
                                    <List
                                        dataSource={filteredSources}
                                        renderItem={(s) => (
                                            <List.Item style={{ paddingInline: 8 }}>
                                                <Space>
                                                    <Checkbox value={s._id || s.url}>{s.name}</Checkbox>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        onClick={() => toggleFavorite(s.url)}
                                                        icon={isFavorited(s.url) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                                                    />
                                                </Space>
                                            </List.Item>
                                        )}
                                    />
                                </Checkbox.Group>
                            )}
                        </div>
                        <Typography.Text type="secondary">
                            {t('feed.sourcesCount', { count: filteredSources.length })}
                        </Typography.Text>
                    </Card>

                    <Card
                        title={<span><AppstoreAddOutlined />&nbsp;{t('feed.addSourceTitle')}</span>}
                        size="small"
                        style={{ marginTop: 12 }}
                    >
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                            {t('feed.addSourceDescription')}
                        </Typography.Paragraph>
                        <Form
                            form={addForm}
                            layout="vertical"
                            initialValues={{ category: 'general' }}
                            onFinish={handleAddFeed}
                        >
                            <Form.Item name="name" label={t('feed.addSourceNameLabel')}>
                                <Input placeholder={t('feed.addSourceNamePlaceholder')} />
                            </Form.Item>
                            <Form.Item
                                name="url"
                                label={t('feed.addSourceUrlLabel')}
                                rules={[
                                    { required: true, message: t('feed.addSourceUrlRequired') },
                                    { type: 'url', message: t('feed.addSourceUrlInvalid') },
                                ]}
                            >
                                <Input placeholder={t('feed.addSourceUrlPlaceholder')} />
                            </Form.Item>
                            <Form.Item
                                name="category"
                                label={t('feed.addSourceCategoryLabel')}
                                rules={[{ required: true, message: t('feed.addSourceCategoryRequired') }]}
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    options={categoryOptions.map((c) => ({
                                        label: t(c.labelKey as any),
                                        value: c.key,
                                    }))}
                                />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button type="primary" htmlType="submit" loading={addingFeed} block>
                                    {t('feed.addSourceSubmit')}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} md={14} lg={16}>
                    <Card
                        title={
                            <span>
                                <CheckSquareOutlined />&nbsp;{t('feed.feedTitle')} ({selectedUrls.length})
                            </span>
                        }
                        size="small"
                    >
                        {selectedUrls.length === 0 ? (
                            <Empty description={t('feed.selectAtLeastOne')} />
                        ) : loading ? (
                            <div style={{ padding: 24, textAlign: 'center' }}>
                                <Spin />
                            </div>
                        ) : items.length === 0 ? (
                            <Empty description={t('feed.empty')} />
                        ) : (
                            <List
                                itemLayout="vertical"
                                dataSource={items}
                                renderItem={(it) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={
                                                it.link ? (
                                                    <a href={it.link} target="_blank" rel="noreferrer">
                                                        {it.title || it.link}
                                                    </a>
                                                ) : (
                                                    it.title || '—'
                                                )
                                            }
                                            description={it.contentSnippet}
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </Space>
    );
};

export default FeedPage;

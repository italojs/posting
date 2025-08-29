import { AppstoreOutlined, CheckSquareOutlined, GlobalOutlined, ReadOutlined } from '@ant-design/icons';
import { Card, Checkbox, Col, Empty, List, Row, Segmented, Space, Spin, Typography, message } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { BasicSiteProps } from '../App';
import { RssItemModel } from '/app/api/contents/models';
import { useTranslation } from 'react-i18next';
import { MethodGetRssSourcesListModel, RssSourceModel } from '/app/api/rssSources/models';

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
    const [items, setItems] = useState<RssItemModel[]>([]);
    const [sources, setSources] = useState<RssSourceModel[]>([]);

    // Load sources from server when category changes (or initial)
    useEffect(() => {
        const run = async () => {
            const payload: MethodGetRssSourcesListModel = {
                category: category === 'all' ? undefined : (category as string),
                enabledOnly: true,
            };
            try {
                const res = (await Meteor.callAsync('get.rssSources.list', payload)) as { sources: RssSourceModel[] };
                setSources(res.sources || []);
                // If selection is empty, optionally preselect first one
                if ((res.sources || []).length > 0 && selectedIds.length === 0) {
                    setSelectedIds([res.sources[0]._id || res.sources[0].url]);
                }
            } catch (e) {
                // silently ignore
            }
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category]);

    const filteredSources = useMemo(() => sources, [sources]);

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
                    items: RssItemModel[];
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
    if (checked) setSelectedIds(filteredSources.map((s) => s._id || s.url));
    else setSelectedIds((prev) => prev.filter((id) => !filteredSources.find((s) => (s._id || s.url) === id)));
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
                            <Checkbox
                                indeterminate={selectedIds.length > 0 && selectedIds.length < filteredSources.length}
                                checked={filteredSources.length > 0 && selectedIds.length >= filteredSources.length}
                                onChange={(e) => toggleSelectAll(e.target.checked)}
                            >
                                {t('feed.selectAll')}
                            </Checkbox>
                        }
                    >
                        <div style={{ maxHeight: 360, overflow: 'auto' }}>
                            <Checkbox.Group
                                style={{ width: '100%' }}
                                value={selectedIds}
                                onChange={(vals) => setSelectedIds(vals as string[])}
                            >
                                <List
                                    dataSource={filteredSources}
                                    renderItem={(s) => (
                                        <List.Item style={{ paddingInline: 8 }}>
                                            <Checkbox value={s._id || s.url}>{s.name}</Checkbox>
                                        </List.Item>
                                    )}
                                />
                            </Checkbox.Group>
                        </div>
                        <Typography.Text type="secondary">
                            {t('feed.sourcesCount', { count: filteredSources.length })}
                        </Typography.Text>
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

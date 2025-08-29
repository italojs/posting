import { LoadingOutlined, SendOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Divider, Form, Input, List, Row, Space, Tag, Typography, message } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { BasicSiteProps } from '../App';
import { RssItem } from '/app/api/contents/models';
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
                    initialValues={{ newsletter: true, instagram: false, twitter: false, tiktok: false, linkedin: false }}
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

                            {selectableFavorites.length > 0 && (
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
                                                    // no closable; manual input removed
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
                            )}
                        </Col>
                        <Col xs={24} md={12}>
                <Typography.Text type="secondary">{t('createContent.itemsFound', { count: rssCount })}</Typography.Text>
                            <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
                                <List
                                    dataSource={rssItems}
                    locale={{ emptyText: t('createContent.listEmpty') }}
                                    renderItem={(it) => {
                                        const linkKey = it.link || it.title || '';
                                        const checked = linkKey ? selectedItemLinks.has(linkKey) : true; // items without link default selected
                                        return (
                                            <List.Item
                                                onClick={() => {
                                                    if (!linkKey) return;
                                                    setSelectedItemLinks((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(linkKey)) next.delete(linkKey); else next.add(linkKey);
                                                        return next;
                                                    });
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
                                                                        setSelectedItemLinks((prev) => {
                                                                            const next = new Set(prev);
                                                                            if (isC) next.add(linkKey); else next.delete(linkKey);
                                                                            return next;
                                                                        });
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

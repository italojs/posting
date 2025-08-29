import { LoadingOutlined, SendOutlined, StarFilled, StarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Divider, Form, Input, List, Row, Space, Tag, Typography, message } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { BasicSiteProps } from '../App';
import { RssItemModel } from '/app/api/contents/models';
import { publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';

type CreateContentPageProps = BasicSiteProps;

const CreateContentPage: React.FC<CreateContentPageProps> = ({ userId }) => {
    const [form] = Form.useForm();
    const { t } = useTranslation('common');
    const [, navigate] = useLocation();
    const [loading, setLoading] = useState(false);
    const [rssItems, setRssItems] = useState<RssItemModel[]>([]);
    const [favoriteUrls, setFavoriteUrls] = useState<string[]>([]);
    const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);

    const rssCount = rssItems?.length ?? 0;

    useEffect(() => {
        const run = async () => {
            try {
                const res = (await Meteor.callAsync('get.userProfiles.rssFavorites')) as { urls: string[] };
                setFavoriteUrls(res.urls || []);
            } catch (err) {
                // ignore
            }
        };
        run();
    }, []);

    const getUrlsFromForm = (): string[] => {
        const raw: string = (form.getFieldValue('rss') || '') as string;
        return raw
            .split(/\n|\r|,|;|\s+/)
            .map((s) => s.trim())
            .filter((s) => s)
            .filter((v, i, a) => a.indexOf(v) === i);
    };

    const handleFetchRss = async () => {
        const urls = getUrlsFromForm();
        // also include selected favorites (avoid duplicates)
        const merged = Array.from(new Set([...
            urls,
            ...selectedFavorites,
        ]));
        if (merged.length === 0) {
            message.warning(t('createContent.needAtLeastOneUrl'));
            return;
        }
        setLoading(true);
        try {
            const res = (await Meteor.callAsync('get.contents.fetchRss', { urls: merged })) as { items: RssItemModel[] };
            setRssItems(res.items || []);
            if ((res.items || []).length === 0) message.info(t('createContent.listEmpty'));
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.loadError'));
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const urls = Array.from(new Set([...
                getUrlsFromForm(),
                ...selectedFavorites,
            ]));
            setLoading(true);
            await Meteor.callAsync('set.contents.create', {
                name: values.name,
                rssUrls: urls,
                rssItems,
                networks: { newsletter: values.newsletter ?? true },
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
                message.success(t('createContent.favoritesRemoved'));
            } else {
                await Meteor.callAsync('set.userProfile.addRssFavorites', { urls: [url] });
                setFavoriteUrls((prev) => Array.from(new Set([...
                    prev,
                    url,
                ])));
                message.success(t('createContent.favoritesAdded'));
            }
        } catch (error) {
            errorResponse(error as Meteor.Error, t('createContent.favoritesError'));
        }
    };

    const addFavoriteToInput = (url: string) => {
        const cur = (form.getFieldValue('rss') || '') as string;
        const lines = cur ? cur.split('\n') : [];
        if (!lines.includes(url)) {
            lines.push(url);
            form.setFieldsValue({ rss: lines.join('\n') });
        }
    };

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
                <Form form={form} layout="vertical" initialValues={{ newsletter: true }}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="name" label={t('createContent.nameLabel')} rules={[{ required: true }]}> 
                                <Input placeholder="Newsletter" allowClear />
                            </Form.Item>

                            <Form.Item name="rss" label={t('createContent.rssLabel')}>
                                <Input.TextArea rows={6} placeholder="https://example.com/feed.xml\nhttps://another.com/rss" />
                            </Form.Item>

                            <Space>
                <Button type="primary" icon={<UnorderedListOutlined />} onClick={handleFetchRss} loading={loading}>
                    {t('createContent.loadRss')}
                                </Button>
                                <Form.Item name="newsletter" valuePropName="checked" noStyle>
                    <Checkbox>{t('createContent.newsletter')}</Checkbox>
                                </Form.Item>
                            </Space>

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
                                                    closable
                                                    onClose={(e) => {
                                                        e.preventDefault();
                                                        addFavoriteToInput(url);
                                                    }}
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
                                    renderItem={(it) => (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={
                                                    it.link ? (
                                                        <a href={it.link} target="_blank" rel="noreferrer">
                                                            {it.title || it.link}
                                                        </a>
                                                    ) : (
                                                        it.title || 'Sem título'
                                                    )
                                                }
                                                description={it.contentSnippet}
                                            />
                                        </List.Item>
                                    )}
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

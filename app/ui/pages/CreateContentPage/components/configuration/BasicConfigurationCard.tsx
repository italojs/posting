import { AppstoreAddOutlined } from '@ant-design/icons';
import { Card, Checkbox, Form, Input, Select, Space, Typography, Button } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type {
    GeneratedNewsletterPreview,
    NewsletterSection,
    RssItem,
} from '/app/api/contents/models';
import type { BrandSummary } from '/app/api/brands/models';
import { protectedRoutes } from '/app/utils/constants/routes';

interface BasicConfigurationCardProps {
    form: FormInstance;
    t: TFunction<'common'>;
    brandOptions: { value: string; label: string }[];
    brands: BrandSummary[];
    brandsLoading: boolean;
    selectedBrandSummary?: BrandSummary;
    isBrandMissing: boolean;
    sections: NewsletterSection[];
    setSections: Dispatch<SetStateAction<NewsletterSection[]>>;
    setActiveSectionIndex: Dispatch<SetStateAction<number>>;
    handleFetchRss: (auto?: boolean) => Promise<void>;
    setRssItems: Dispatch<SetStateAction<RssItem[]>>;
    setSelectedItemLinks: Dispatch<SetStateAction<Set<string>>>;
    setNewsletterPreview: Dispatch<SetStateAction<GeneratedNewsletterPreview | null>>;
    navigate: (path: string) => void;
}

const BasicConfigurationCard: React.FC<BasicConfigurationCardProps> = ({
    form,
    t,
    brandOptions,
    brands,
    brandsLoading,
    selectedBrandSummary,
    isBrandMissing,
    sections,
    setSections,
    setActiveSectionIndex,
    handleFetchRss,
    setRssItems,
    setSelectedItemLinks,
    setNewsletterPreview,
    navigate,
}) => (
    <Card
        title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                    style={{
                        backgroundColor: '#5B5BD6',
                        color: 'white',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                    }}
                >
                    1
                </div>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                    {t('createContent.card1Tittle')}
                </span>
            </div>
        }
        styles={{
            header: { borderBottom: 'none' },
            body: { paddingTop: 0 },
        }}
    >
        <Form
            form={form}
            layout="vertical"
            initialValues={{
                brandId: undefined,
                newsletter: false,
                instagram: false,
                twitter: false,
                tiktok: false,
                linkedin: false,
            }}
            style={{ padding: '8px 0' }}
            onValuesChange={(_, all) => {
                const any = !!(
                    all?.newsletter ||
                    all?.instagram ||
                    all?.twitter ||
                    all?.tiktok ||
                    all?.linkedin
                );
                if (all?.newsletter) {
                    if (all?.instagram || all?.twitter || all?.tiktok || all?.linkedin) {
                        form.setFieldsValue({
                            instagram: false,
                            twitter: false,
                            tiktok: false,
                            linkedin: false,
                        });
                    }
                    if (!sections.length) {
                        const first = {
                            id: Math.random().toString(36).slice(2, 9),
                            title: '',
                            description: '',
                            rssItems: [],
                            newsArticles: [],
                        };
                        setSections([first]);
                        setActiveSectionIndex(0);
                    }
                }
                if (
                    !all?.newsletter &&
                    !(all?.instagram || all?.twitter || all?.tiktok || all?.linkedin)
                ) {
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
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>
                            {t('createContent.brandLabel')}
                        </span>
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
                                    <strong>{t('createContent.brandTone')}:</strong>{' '}
                                    {selectedBrandSummary.tone}
                                </Typography.Text>
                            )}
                            {selectedBrandSummary.audience && (
                                <Typography.Text style={{ fontSize: 12 }}>
                                    <strong>{t('createContent.brandAudience')}:</strong>{' '}
                                    {selectedBrandSummary.audience}
                                </Typography.Text>
                            )}
                            {selectedBrandSummary.differentiators && (
                                <Typography.Text style={{ fontSize: 12 }}>
                                    <strong>{t('createContent.brandDifferentiators')}:</strong>{' '}
                                    {selectedBrandSummary.differentiators}
                                </Typography.Text>
                            )}
                            {selectedBrandSummary.keywords &&
                                selectedBrandSummary.keywords.length > 0 && (
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
                label={
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                        {t('createContent.nameLabel')}
                    </span>
                }
                rules={[{ required: true }]}
            >
                <Input
                    placeholder="Newsletter"
                    allowClear
                    style={{
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '14px',
                    }}
                />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                    name="audience"
                    label={
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>
                            {t('createContent.audienceLabel')}
                        </span>
                    }
                >
                    <Input
                        placeholder={t('createContent.audiencePlaceholder') as string}
                        allowClear
                        style={{
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                        }}
                    />
                </Form.Item>

                <Form.Item
                    name="goal"
                    label={
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>
                            {t('createContent.goalLabel')}
                        </span>
                    }
                >
                    <Input.TextArea
                        rows={3}
                        placeholder={t('createContent.goalPlaceholder') as string}
                        style={{
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            resize: 'none',
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
                        display: 'block',
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
                                            padding: '4px 8px',
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
                                            padding: '4px 2px',
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
                                            padding: '4px 2px',
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
                                            padding: '4px 2px',
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
                                            padding: '4px 2px',
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
);

export default BasicConfigurationCard;

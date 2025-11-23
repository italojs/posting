import { AppstoreAddOutlined } from '@ant-design/icons';
import { Card, Form, Input, Select, Space, Typography, Button } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React from 'react';
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
    navigate: (path: string) => void;
    onValuesChange?: (changedValues: any, allValues: any) => void;
    initialValues?: any;
}

const BasicConfigurationCard: React.FC<BasicConfigurationCardProps> = ({
    form,
    t,
    brandOptions,
    brands,
    brandsLoading,
    selectedBrandSummary,
    isBrandMissing,
    navigate,
    onValuesChange,
    initialValues,
}) => {
    return (
    <>
        <style>
            {`
                .basic-config-card .ant-form-item {
                    margin-bottom: 40px;
                }
                .basic-config-card .ant-form-item-label {
                    padding-bottom: 0 !important;
                    margin-bottom: 10px !important;
                    line-height: 1.4 !important;
                }
                .basic-config-card .ant-form-item-label > label {
                    margin-bottom: 0 !important;
                    height: auto !important;
                    line-height: 1.4 !important;
                }
                .basic-config-card .ant-form-item-control {
                    margin-top: 0 !important;
                }
                .basic-config-card .ant-form-item-control-input {
                    min-height: auto !important;
                }
            `}
        </style>
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
        style={{
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            marginBottom: 0
        }}
        className="basic-config-card"
    >
        <Form
            form={form}
            layout="vertical"
            initialValues={initialValues || {
                brandId: undefined,
            }}
            style={{ 
                padding: '16px 0',
                width: '100%',
                maxWidth: '100%'
            }}
            onValuesChange={onValuesChange}
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
                style={{ marginBottom: '24px' }}
            >
                <Select
                    allowClear
                    showSearch
                    placeholder={t('createContent.brandPlaceholder') as string}
                    loading={brandsLoading}
                    options={brandOptions}
                    optionFilterProp="label"
                    style={{ width: '100%' }}
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
                style={{ marginBottom: '45px' }}
            >
                <Input
                    placeholder="Newsletter"
                    allowClear
                    style={{
                        width: '100%',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '14px',
                    }}
                />
            </Form.Item>

            <div style={{ 
                display: 'flex', 
                gap: '20px', 
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: '45px'
            }}>
                <div style={{ flex: '1', minWidth: '250px' }}>
                    <Form.Item
                        name="audience"
                        label={
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                {t('createContent.audienceLabel')}
                            </span>
                        }
                        style={{ marginBottom: '0' }}
                    >
                        <Input
                            placeholder={t('createContent.audiencePlaceholder') as string}
                            allowClear
                            style={{
                                width: '100%',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '14px',
                            }}
                        />
                    </Form.Item>
                </div>

                <div style={{ flex: '1', minWidth: '250px' }}>
                    <Form.Item
                        name="goal"
                        label={
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                {t('createContent.goalLabel')}
                            </span>
                        }
                        style={{ marginBottom: '0' }}
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder={t('createContent.goalPlaceholder') as string}
                            style={{
                                width: '100%',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '14px',
                                resize: 'none',
                            }}
                        />
                    </Form.Item>
                </div>
            </div>

            <div>
                <Typography.Text
                    strong
                    style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: '8px'
                    }}
                >
                    Configurações Básicas
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Configure as informações básicas do seu conteúdo
                </Typography.Text>
            </div>
        </Form>
    </Card>
    </>
    );
};

export default BasicConfigurationCard;

import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { Meteor } from 'meteor/meteor';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Button,
    Card,
    Empty,
    Form,
    Input,
    Popconfirm,
    Select,
    Space,
    Tag,
    Typography,
    message,
} from 'antd';
import { BasicSiteProps } from '../App';
import { BrandSummary } from '/app/api/brands/models';
import { errorResponse } from '/app/utils/errors';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

type BrandManagementPageProps = BasicSiteProps;

type BrandFormValues = {
    name: string;
    description?: string;
    tone?: string;
    audience?: string;
    differentiators?: string;
    keywords?: string[];
};

const BrandManagementPage: React.FC<BrandManagementPageProps> = ({ userId }) => {
    const { t } = useTranslation('common');
    const [form] = Form.useForm<BrandFormValues>();
    const [brands, setBrands] = useState<BrandSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingBrand, setEditingBrand] = useState<BrandSummary | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const formInitialValues = useMemo<BrandFormValues>(() => ({
        name: '',
        description: '',
        tone: '',
        audience: '',
        differentiators: '',
        keywords: [],
    }), []);

    const resetForm = useCallback(() => {
        form.resetFields();
        setEditingBrand(null);
        setShowForm(false);
    }, [form]);

    const fetchBrands = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const result = (await Meteor.callAsync('get.brands.mine')) as BrandSummary[];
            setBrands(result || []);
        } catch (error) {
            errorResponse(error as Meteor.Error, t('brands.notifications.loadError'));
        } finally {
            setLoading(false);
        }
    }, [t, userId]);

    useEffect(() => {
        if (userId) {
            fetchBrands();
            resetForm();
        }
    }, [fetchBrands, resetForm, userId]);

    const handleSubmit = async () => {
        let values: BrandFormValues;
        try {
            values = await form.validateFields();
        } catch (error) {
            return;
        }

        const sanitizedKeywords = (values.keywords || [])
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter((entry) => entry.length > 0);

        const payload = {
            name: values.name,
            description: values.description,
            tone: values.tone,
            audience: values.audience,
            differentiators: values.differentiators,
            keywords: sanitizedKeywords,
        };

        setSaving(true);
        try {
            if (editingBrand?._id) {
                await Meteor.callAsync('set.brands.update', { _id: editingBrand._id, ...payload });
                message.success(t('brands.notifications.updateSuccess'));
            } else {
                await Meteor.callAsync('set.brands.create', payload);
                message.success(t('brands.notifications.createSuccess'));
            }
            await fetchBrands();
            resetForm();
        } catch (error) {
            errorResponse(error as Meteor.Error, t('brands.notifications.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (brand: BrandSummary) => {
        setEditingBrand(brand);
        setShowForm(true);
        form.setFieldsValue({
            name: brand.name,
            description: brand.description,
            tone: brand.tone,
            audience: brand.audience,
            differentiators: brand.differentiators,
            keywords: brand.keywords || [],
        });
    };

    const handleDelete = async (_id: string) => {
        setDeletingId(_id);
        try {
            await Meteor.callAsync('set.brands.delete', { _id });
            message.success(t('brands.notifications.deleteSuccess'));
            if (editingBrand?._id === _id) {
                resetForm();
            }
            await fetchBrands();
        } catch (error) {
            errorResponse(error as Meteor.Error, t('brands.notifications.deleteError'));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
                <Title level={3}>{t('brands.title')}</Title>
                <Paragraph type="secondary">{t('brands.subtitle')}</Paragraph>
                <Space>
                    <Button icon={<PlusOutlined />} onClick={() => setShowForm(true)} disabled={saving}>
                        {t('brands.actions.new')}
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchBrands} loading={loading}>
                        {t('brands.actions.refresh')}
                    </Button>
                </Space>
            </div>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card
                    title={t('brands.list.title')}
                    loading={loading}
                >
                    {brands.length === 0 ? (
                        <div style={{ padding: 24 }}>
                            <Empty
                                description={
                                    <Space direction="vertical" size={4}>
                                        <Text strong>{t('brands.empty.title')}</Text>
                                        <Text type="secondary">{t('brands.empty.description')}</Text>
                                    </Space>
                                }
                            />
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                            gap: '16px',
                            padding: '16px 0'
                        }}>
                            {brands.map((brand) => (
                                <Card
                                    key={brand._id}
                                    size="small"
                                    title={brand.name}
                                    extra={
                                        <Space size="small">
                                            <Button
                                                type="text"
                                                icon={<EditOutlined />}
                                                onClick={() => handleEdit(brand)}
                                                size="small"
                                            />
                                            <Popconfirm
                                                title={t('brands.confirmDelete.title')}
                                                description={t('brands.confirmDelete.description')}
                                                okText={t('brands.confirmDelete.ok')}
                                                cancelText={t('brands.confirmDelete.cancel')}
                                                onConfirm={() => handleDelete(brand._id)}
                                            >
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    loading={deletingId === brand._id}
                                                    size="small"
                                                />
                                            </Popconfirm>
                                        </Space>
                                    }
                                    style={{ height: 'fit-content' }}
                                    hoverable
                                >
                                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                {brand.description || t('brands.list.noDescription')}
                                            </Text>
                                        </div>
                                        {brand.tone && (
                                            <div style={{ marginBottom: '6px' }}>
                                                <Text strong style={{ fontSize: '11px', color: '#666' }}>
                                                    {t('brands.list.tone')}:
                                                </Text>
                                                <div style={{ fontSize: '12px' }}>{brand.tone}</div>
                                            </div>
                                        )}
                                        {brand.audience && (
                                            <div style={{ marginBottom: '6px' }}>
                                                <Text strong style={{ fontSize: '11px', color: '#666' }}>
                                                    {t('brands.list.audience')}:
                                                </Text>
                                                <div style={{ fontSize: '12px' }}>{brand.audience}</div>
                                            </div>
                                        )}
                                        {brand.differentiators && (
                                            <div style={{ marginBottom: '6px' }}>
                                                <Text strong style={{ fontSize: '11px', color: '#666' }}>
                                                    {t('brands.list.differentiators')}:
                                                </Text>
                                                <div style={{ fontSize: '12px' }}>{brand.differentiators}</div>
                                            </div>
                                        )}
                                        {brand.keywords && brand.keywords.length > 0 && (
                                            <div>
                                                <Text strong style={{ fontSize: '11px', color: '#666' }}>
                                                    Keywords:
                                                </Text>
                                                <div style={{ marginTop: '4px' }}>
                                                    {brand.keywords.slice(0, 3).map((keyword) => (
                                                        <Tag key={keyword} style={{ fontSize: '10px', marginBottom: '2px' }}>
                                                            {keyword}
                                                        </Tag>
                                                    ))}
                                                    {brand.keywords.length > 3 && (
                                                        <Tag style={{ fontSize: '10px' }}>
                                                            +{brand.keywords.length - 3}
                                                        </Tag>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </Card>

                {showForm && (
                    <Card
                        title={editingBrand ? t('brands.form.editTitle', { name: editingBrand.name }) : t('brands.form.newTitle')}
                        extra={
                            <Button 
                                type="text" 
                                onClick={resetForm}
                                style={{ color: '#666' }}
                            >
                                ✕
                            </Button>
                        }
                    >
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={formInitialValues}
                        onFinish={handleSubmit}
                        autoComplete="off"
                    >
                        <Form.Item
                            label={t('brands.form.name')}
                            name="name"
                            rules={[{ required: true, message: t('brands.validation.nameRequired') }]}
                        >
                            <Input 
                                placeholder={t('brands.form.namePlaceholder') ?? ''} 
                                style={{ height: '40px' }}
                            />
                        </Form.Item>

                        <Form.Item label={t('brands.form.description')} name="description">
                            <TextArea 
                                rows={2} 
                                placeholder={t('brands.form.descriptionPlaceholder') ?? ''} 
                                allowClear 
                                style={{ resize: 'none' }}
                            />
                        </Form.Item>

                        <Form.Item label={t('brands.form.tone')} name="tone">
                            <Input 
                                placeholder={t('brands.form.tonePlaceholder') ?? ''} 
                                allowClear 
                                style={{ height: '40px' }}
                            />
                        </Form.Item>

                        <Form.Item label={t('brands.form.audience')} name="audience">
                            <Input 
                                placeholder={t('brands.form.audiencePlaceholder') ?? ''} 
                                allowClear 
                                style={{ height: '40px' }}
                            />
                        </Form.Item>

                        <Form.Item label={t('brands.form.differentiators')} name="differentiators">
                            <Input 
                                placeholder={t('brands.form.differentiatorsPlaceholder') ?? ''} 
                                allowClear 
                                style={{ height: '40px' }}
                            />
                        </Form.Item>

                        <Form.Item label={t('brands.form.keywords')} name="keywords">
                            <Select
                                mode="tags"
                                placeholder={t('brands.form.keywordsPlaceholder') ?? ''}
                                open={false}
                                style={{ minHeight: '40px' }}
                            />
                        </Form.Item>

                        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={resetForm} disabled={saving}>
                                {t('brands.actions.cancel')}
                            </Button>
                            <Button type="primary" htmlType="submit" loading={saving}>
                                {editingBrand ? t('brands.actions.update') : t('brands.actions.save')}
                            </Button>
                        </Space>
                    </Form>
                </Card>
                )}
            </Space>
        </Space>
    );
};

export default BrandManagementPage;

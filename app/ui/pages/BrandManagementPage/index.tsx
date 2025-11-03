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
    List,
    Popconfirm,
    Select,
    Space,
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
                    <Button icon={<PlusOutlined />} onClick={resetForm} disabled={saving}>
                        {t('brands.actions.new')}
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchBrands} loading={loading}>
                        {t('brands.actions.refresh')}
                    </Button>
                </Space>
            </div>

            <Space direction="horizontal" size="large" style={{ width: '100%', flexWrap: 'wrap' }}>
                <Card
                    title={t('brands.list.title')}
                    style={{ flex: '1 1 360px', maxWidth: 480 }}
                    loading={loading}
                    bodyStyle={{ padding: 0 }}
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
                        <List
                            itemLayout="vertical"
                            dataSource={brands}
                            renderItem={(brand) => (
                                <List.Item
                                    key={brand._id}
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="link"
                                            icon={<EditOutlined />}
                                            onClick={() => handleEdit(brand)}
                                        >
                                            {t('brands.actions.edit')}
                                        </Button>,
                                        <Popconfirm
                                            key="delete"
                                            title={t('brands.confirmDelete.title')}
                                            description={t('brands.confirmDelete.description')}
                                            okText={t('brands.confirmDelete.ok')}
                                            cancelText={t('brands.confirmDelete.cancel')}
                                            onConfirm={() => handleDelete(brand._id)}
                                        >
                                            <Button
                                                type="link"
                                                danger
                                                icon={<DeleteOutlined />}
                                                loading={deletingId === brand._id}
                                            >
                                                {t('brands.actions.delete')}
                                            </Button>
                                        </Popconfirm>,
                                    ]}
                                    style={{ padding: '16px 24px' }}
                                >
                                    <List.Item.Meta
                                        title={brand.name}
                                        description={brand.description || t('brands.list.noDescription')}
                                    />
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                        {brand.tone && (
                                            <Text type="secondary">
                                                <strong>{t('brands.list.tone')}:</strong> {brand.tone}
                                            </Text>
                                        )}
                                        {brand.audience && (
                                            <Text type="secondary">
                                                <strong>{t('brands.list.audience')}:</strong> {brand.audience}
                                            </Text>
                                        )}
                                        {brand.differentiators && (
                                            <Text type="secondary">
                                                <strong>{t('brands.list.differentiators')}:</strong> {brand.differentiators}
                                            </Text>
                                        )}
                                        {brand.keywords && brand.keywords.length > 0 && (
                                            <Space size={[4, 4]} wrap>
                                                {brand.keywords.map((keyword) => (
                                                    <Text key={keyword} code>
                                                        {keyword}
                                                    </Text>
                                                ))}
                                            </Space>
                                        )}
                                    </Space>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>

                <Card
                    title={editingBrand ? t('brands.form.editTitle', { name: editingBrand.name }) : t('brands.form.newTitle')}
                    style={{ flex: '1 1 420px', maxWidth: 560 }}
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
                            <Input placeholder={t('brands.form.namePlaceholder') ?? ''} />
                        </Form.Item>

                        <Form.Item label={t('brands.form.description')} name="description">
                            <TextArea rows={3} placeholder={t('brands.form.descriptionPlaceholder') ?? ''} allowClear />
                        </Form.Item>

                        <Form.Item label={t('brands.form.tone')} name="tone">
                            <TextArea rows={2} placeholder={t('brands.form.tonePlaceholder') ?? ''} allowClear />
                        </Form.Item>

                        <Form.Item label={t('brands.form.audience')} name="audience">
                            <TextArea rows={2} placeholder={t('brands.form.audiencePlaceholder') ?? ''} allowClear />
                        </Form.Item>

                        <Form.Item label={t('brands.form.differentiators')} name="differentiators">
                            <TextArea rows={2} placeholder={t('brands.form.differentiatorsPlaceholder') ?? ''} allowClear />
                        </Form.Item>

                        <Form.Item label={t('brands.form.keywords')} name="keywords">
                            <Select
                                mode="tags"
                                placeholder={t('brands.form.keywordsPlaceholder') ?? ''}
                                open={false}
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
            </Space>
        </Space>
    );
};

export default BrandManagementPage;

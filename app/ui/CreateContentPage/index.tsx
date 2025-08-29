import { LoadingOutlined, SendOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Form, Input, List, Row, Space, Typography, message } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { BasicSiteProps } from '../App';
import { RssItemModel } from '/app/api/contents/models';
import { publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';

type CreateContentPageProps = BasicSiteProps;

const CreateContentPage: React.FC<CreateContentPageProps> = ({ userId }) => {
    const [form] = Form.useForm();
    const [, navigate] = useLocation();
    const [loading, setLoading] = useState(false);
    const [rssItems, setRssItems] = useState<RssItemModel[]>([]);

    const rssCount = rssItems?.length ?? 0;

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
        if (urls.length === 0) {
            message.warning('Informe pelo menos um URL de RSS');
            return;
        }
        setLoading(true);
        try {
            const res = (await Meteor.callAsync('get.contents.fetchRss', { urls })) as { items: RssItemModel[] };
            setRssItems(res.items || []);
            if ((res.items || []).length === 0) message.info('Nenhum item encontrado neste(s) RSS');
        } catch (error) {
            errorResponse(error as Meteor.Error, 'Falha ao carregar RSS');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const urls = getUrlsFromForm();
            setLoading(true);
            await Meteor.callAsync('set.contents.create', {
                name: values.name,
                rssUrls: urls,
                rssItems,
                networks: { newsletter: values.newsletter ?? true },
            });
            message.success('Conteúdo salvo');
            navigate(publicRoutes.home.path);
        } catch (error) {
            errorResponse(error as Meteor.Error, 'Não foi possível salvar o conteúdo');
        }
        setLoading(false);
    };

    if (!userId) {
        // fallback guard
        navigate(protectedRoutes.createContent.path);
        return <LoadingOutlined />;
    }

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Typography.Title level={3} style={{ marginBottom: 0 }}>
                    Criar conteúdo
                </Typography.Title>
                <Typography.Text type="secondary">
                    Defina um nome, adicione URL(s) de RSS e visualize os itens. Por enquanto, salvaremos como rascunho
                    para sua newsletter.
                </Typography.Text>
            </div>

            <Card>
                <Form form={form} layout="vertical" initialValues={{ newsletter: true }}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="name" label="Nome do conteúdo" rules={[{ required: true }]}> 
                                <Input placeholder="Ex.: Newsletter semanal de tecnologia" allowClear />
                            </Form.Item>

                            <Form.Item name="rss" label="URLs de RSS (uma por linha)">
                                <Input.TextArea rows={6} placeholder="https://exemplo.com/feed.xml\nhttps://outro.com/rss" />
                            </Form.Item>

                            <Space>
                                <Button type="primary" icon={<UnorderedListOutlined />} onClick={handleFetchRss} loading={loading}>
                                    Carregar RSS
                                </Button>
                                <Form.Item name="newsletter" valuePropName="checked" noStyle>
                                    <Checkbox>Newsletter</Checkbox>
                                </Form.Item>
                            </Space>
                        </Col>
                        <Col xs={24} md={12}>
                            <Typography.Text type="secondary">Itens encontrados: {rssCount}</Typography.Text>
                            <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
                                <List
                                    dataSource={rssItems}
                                    locale={{ emptyText: 'Nenhum item' }}
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
                            Gerar news letter (salvar)
                        </Button>
                    </div>
                </Form>
            </Card>
        </Space>
    );
};

export default CreateContentPage;

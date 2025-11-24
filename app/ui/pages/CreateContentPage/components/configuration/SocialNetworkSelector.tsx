import { Card, Checkbox, Form, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import React from 'react';

interface SocialNetworkSelectorProps {
    t: TFunction<'common'>;
    handleFetchRss: (auto?: boolean) => Promise<void>;
}

const SocialNetworkSelector: React.FC<SocialNetworkSelectorProps> = ({ 
    t, 
    handleFetchRss 
}) => {
    return (
        <Card
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                        style={{
                            backgroundColor: '#52c41a',
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
                        2
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: '600' }}>
                        Selecione as Redes Sociais
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
        >
            <div style={{ padding: '8px 0' }}>
                <Typography.Text type="secondary" style={{ marginBottom: '16px', display: 'block' }}>
                    Escolha as redes sociais para as quais deseja criar conteúdo
                </Typography.Text>
                
                <Form.Item
                    label={
                        <Typography.Text strong style={{ fontSize: '14px', fontWeight: '600' }}>
                            Redes Sociais
                        </Typography.Text>
                    }
                >
                    <Space size={[8, 8]} wrap>
                        <Form.Item name="twitter" valuePropName="checked" noStyle>
                            <Checkbox
                                style={{ fontSize: '13px', padding: '4px 8px' }}
                                onChange={(e) => {
                                    console.log('Twitter checkbox changed:', e.target.checked);
                                    setTimeout(() => handleFetchRss(true), 100);
                                }}
                            >
                                {t('createContent.twitter')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="linkedin" valuePropName="checked" noStyle>
                            <Checkbox
                                style={{ fontSize: '13px', padding: '4px 8px' }}
                                onChange={(e) => {
                                    console.log('LinkedIn checkbox changed:', e.target.checked);
                                    setTimeout(() => handleFetchRss(true), 100);
                                }}
                            >
                                {t('createContent.linkedin')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="instagram" valuePropName="checked" noStyle>
                            <Checkbox
                                style={{ fontSize: '13px', padding: '4px 8px' }}
                                onChange={() => setTimeout(() => handleFetchRss(true), 100)}
                            >
                                {t('createContent.instagram')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="tiktok" valuePropName="checked" noStyle>
                            <Checkbox
                                style={{ fontSize: '13px', padding: '4px 8px' }}
                                onChange={() => setTimeout(() => handleFetchRss(true), 100)}
                            >
                                {t('createContent.tiktok')}
                            </Checkbox>
                        </Form.Item>
                    </Space>
                </Form.Item>
            </div>
        </Card>
    );
};

export default SocialNetworkSelector;
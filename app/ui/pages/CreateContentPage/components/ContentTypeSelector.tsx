import { Card, Typography } from 'antd';
import { FileTextOutlined, ShareAltOutlined } from '@ant-design/icons';
import React from 'react';

interface ContentTypeSelectorProps {
    onSelectType: (type: 'newsletter' | 'social') => void;
}

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({ onSelectType }) => (
    <Card style={{ marginTop: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Typography.Title level={4} style={{ marginBottom: '24px' }}>
                Que tipo de conteúdo você quer criar?
            </Typography.Title>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '24px',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <Card 
                    hoverable 
                    onClick={() => onSelectType('newsletter')}
                    style={{ cursor: 'pointer', borderColor: '#1890ff' }}
                >
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                        <Typography.Title level={5}>Newsletter</Typography.Title>
                        <Typography.Text type="secondary">
                            Crie newsletters completas com múltiplas seções e conteúdo estruturado
                        </Typography.Text>
                    </div>
                </Card>
                <Card 
                    hoverable 
                    onClick={() => onSelectType('social')}
                    style={{ cursor: 'pointer', borderColor: '#1890ff' }}
                >
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <ShareAltOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                        <Typography.Title level={5}>Redes Sociais</Typography.Title>
                        <Typography.Text type="secondary">
                            Crie conteúdo otimizado para redes sociais como Twitter, LinkedIn e Instagram
                        </Typography.Text>
                    </div>
                </Card>
            </div>
        </div>
    </Card>
);

export default ContentTypeSelector;
import { CopyOutlined } from '@ant-design/icons';
import { Button, Card, List, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import React from 'react';
import type { GeneratedNewsletterPreview } from '/app/api/contents/models';

interface NewsletterPreviewCardProps {
    t: TFunction<'common'>;
    newsletterPreview: GeneratedNewsletterPreview | null;
    handleCopyPreviewMarkdown: () => Promise<void>;
    clearPreview: () => void;
}

const NewsletterPreviewCard: React.FC<NewsletterPreviewCardProps> = ({
    t,
    newsletterPreview,
    handleCopyPreviewMarkdown,
    clearPreview,
}) => {
    if (!newsletterPreview) return null;

    return (
        <Card
            style={{
                marginTop: 24,
                borderRadius: 12,
                borderColor: '#c7d2fe',
                background: '#eef2ff',
            }}
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('createContent.newsletterPreviewCardTitle')}</span>
                    <Space>
                        <Button type="text" icon={<CopyOutlined />} onClick={handleCopyPreviewMarkdown}>
                            {t('createContent.newsletterPreviewCopy')}
                        </Button>
                        <Button type="text" onClick={clearPreview} style={{ color: '#ef4444' }}>
                            {t('createContent.newsletterPreviewClear')}
                        </Button>
                    </Space>
                </div>
            }
        >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                    <Typography.Title level={4} style={{ marginBottom: 4 }}>
                        {newsletterPreview.title}
                    </Typography.Title>
                    {newsletterPreview.goal && (
                        <Typography.Text style={{ color: '#4b5563' }}>
                            <strong>{t('createContent.newsletterPreviewGoal')}:</strong> {newsletterPreview.goal}
                        </Typography.Text>
                    )}
                    {newsletterPreview.audience && (
                        <Typography.Text style={{ marginLeft: 12, color: '#4b5563' }}>
                            <strong>{t('createContent.newsletterPreviewAudience')}:</strong>{' '}
                            {newsletterPreview.audience}
                        </Typography.Text>
                    )}
                </div>

                <List
                    dataSource={newsletterPreview.sections}
                    itemLayout="vertical"
                    renderItem={(section) => (
                        <List.Item
                            style={{
                                background: '#fff',
                                borderRadius: 10,
                                border: '1px solid #e5e7eb',
                                padding: 16,
                            }}
                        >
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <Typography.Title level={5} style={{ marginBottom: 0 }}>
                                    {section.generatedTitle}
                                </Typography.Title>
                                <Typography.Text style={{ color: '#4b5563' }}>{section.summary}</Typography.Text>
                                {section.originalDescription && (
                                    <Typography.Text type="secondary">
                                        {t('createContent.newsletterPreviewOriginalTitle', {
                                            title: section.originalTitle,
                                        })}
                                    </Typography.Text>
                                )}
                                {section.articleSummaries.length > 0 && (
                                    <div>
                                        <Typography.Text strong>
                                            {t('createContent.newsletterPreviewArticlesTitle')}
                                        </Typography.Text>
                                        <List
                                            dataSource={section.articleSummaries}
                                            style={{ marginTop: 4 }}
                                            split={false}
                                            renderItem={(articleSummary) => (
                                                <List.Item style={{ padding: '4px 0' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {articleSummary.url ? (
                                                            <a href={articleSummary.url} target="_blank" rel="noreferrer">
                                                                {articleSummary.title}
                                                            </a>
                                                        ) : (
                                                            <Typography.Text strong>{articleSummary.title}</Typography.Text>
                                                        )}
                                                        <Typography.Text style={{ color: '#6b7280', fontSize: 12 }}>
                                                            {articleSummary.summary}
                                                        </Typography.Text>
                                                    </div>
                                                </List.Item>
                                            )}
                                        />
                                    </div>
                                )}
                                <Typography.Paragraph style={{ marginBottom: 0 }}>
                                    {section.body}
                                </Typography.Paragraph>
                                {section.callToAction && (
                                    <Typography.Text strong style={{ color: '#2563eb' }}>
                                        {t('createContent.newsletterPreviewCallToAction', {
                                            cta: section.callToAction,
                                        })}
                                    </Typography.Text>
                                )}
                            </Space>
                        </List.Item>
                    )}
                />

                {newsletterPreview.compiledMarkdown && (
                    <div>
                        <Typography.Text strong>
                            {t('createContent.newsletterPreviewMarkdownTitle')}
                        </Typography.Text>
                        <pre
                            style={{
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: 16,
                                marginTop: 8,
                                maxHeight: 300,
                                overflow: 'auto',
                                fontSize: 12,
                            }}
                        >
                            {newsletterPreview.compiledMarkdown}
                        </pre>
                    </div>
                )}
            </Space>
        </Card>
    );
};

export default NewsletterPreviewCard;

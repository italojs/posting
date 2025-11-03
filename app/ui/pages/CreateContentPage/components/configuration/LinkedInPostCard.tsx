import { CopyOutlined, RobotOutlined } from '@ant-design/icons';
import { Button, Card, Form, Radio, Space, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type { LinkedInPost, RssItem } from '/app/api/contents/models';
import { groupRssItemsBySource } from '/app/ui/pages/CreateContentPage/utils/rss';
import RssSourceCollapse from '../common/RssSourceCollapse';

interface LinkedInPostCardProps {
    form: FormInstance;
    t: TFunction<'common'>;
    rssItems: RssItem[];
    selectedLinkedInArticle: RssItem | null;
    setSelectedLinkedInArticle: Dispatch<SetStateAction<RssItem | null>>;
    generatingLinkedInPost: boolean;
    generatedLinkedInPost: LinkedInPost | null;
    setGeneratedLinkedInPost: Dispatch<SetStateAction<LinkedInPost | null>>;
    handleGenerateLinkedInPost: () => Promise<void>;
    handleCopyLinkedInPost: () => Promise<void>;
    handleResetLinkedInPost: () => void;
}

const LinkedInPostCard: React.FC<LinkedInPostCardProps> = ({
    form,
    t,
    rssItems,
    selectedLinkedInArticle,
    setSelectedLinkedInArticle,
    generatingLinkedInPost,
    generatedLinkedInPost,
    setGeneratedLinkedInPost,
    handleGenerateLinkedInPost,
    handleCopyLinkedInPost,
    handleResetLinkedInPost,
}) => (
    <Form form={form}>
        <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
                const isLinkedIn = !!getFieldValue('linkedin');
                if (!isLinkedIn) return null;

                return (
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    style={{
                                        backgroundColor: '#0077B5',
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
                                    {t('createContent.linkedinPostTitle')}
                                </span>
                            </div>
                        }
                        styles={{
                            header: { borderBottom: 'none' },
                            body: { paddingTop: 0 },
                        }}
                    >
                        <div style={{ padding: '8px 0' }}>
                            <Typography.Text
                                type="secondary"
                                style={{ marginBottom: '16px', display: 'block' }}
                            >
                                {t('createContent.linkedinPostHelp')}
                            </Typography.Text>

                            {rssItems.length > 0 && (
                                <div style={{ margin: '0 0 16px' }}>
                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                        {t('createContent.selectArticleForLinkedin')} ({rssItems.length}{' '}
                                        {t('createContent.itemsFound', { count: rssItems.length })})
                                    </Typography.Text>

                                    <div style={{ marginTop: 12 }}>
                                        {(() => {
                                            const groupedArticles = groupRssItemsBySource(rssItems);

                                            return (
                                                <RssSourceCollapse
                                                    groups={groupedArticles}
                                                    badgeColor="#0077B5"
                                                    renderItem={(item) => {
                                                        const linkKey = item.link || item.title || '';
                                                        const isSelected =
                                                            !!selectedLinkedInArticle &&
                                                            (selectedLinkedInArticle.link === item.link ||
                                                                (!selectedLinkedInArticle.link &&
                                                                    selectedLinkedInArticle.title === item.title));

                                                        const baseStyles = {
                                                            background: isSelected ? '#e6f7ff' : 'transparent',
                                                            border: isSelected
                                                                ? '2px solid #0077B5'
                                                                : '1px solid transparent',
                                                            borderRadius: '6px',
                                                            marginBottom: '8px',
                                                            padding: '12px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'flex-start' as const,
                                                            gap: 12,
                                                        };

                                                        return (
                                                            <div
                                                                style={baseStyles}
                                                                onClick={() => {
                                                                    if (!linkKey) return;
                                                                    if (isSelected) {
                                                                        setSelectedLinkedInArticle(null);
                                                                        setGeneratedLinkedInPost(null);
                                                                    } else {
                                                                        setSelectedLinkedInArticle(item);
                                                                        setGeneratedLinkedInPost(null);
                                                                    }
                                                                }}
                                                            >
                                                                <Radio
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        if (e.target.checked) {
                                                                            setSelectedLinkedInArticle(item);
                                                                            setGeneratedLinkedInPost(null);
                                                                        } else {
                                                                            setSelectedLinkedInArticle(null);
                                                                            setGeneratedLinkedInPost(null);
                                                                        }
                                                                    }}
                                                                />
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                                                                        {item.link ? (
                                                                            <a
                                                                                href={item.link}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                style={{ color: '#1d4ed8', textDecoration: 'none' }}
                                                                            >
                                                                                {item.title || item.link}
                                                                            </a>
                                                                        ) : (
                                                                            item.title || 'No title'
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                                        {item.contentSnippet && (
                                                                            <div>
                                                                                {item.contentSnippet.substring(0, 150)}
                                                                                {item.contentSnippet.length > 150 && '...'}
                                                                            </div>
                                                                        )}
                                                                        {item.pubDate && (
                                                                            <div style={{ marginTop: '4px' }}>
                                                                                {new Date(item.pubDate).toLocaleDateString()}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<RobotOutlined />}
                                        onClick={handleGenerateLinkedInPost}
                                        loading={generatingLinkedInPost}
                                        disabled={!selectedLinkedInArticle || rssItems.length === 0}
                                    >
                                        {t('createContent.generateLinkedinPost')}
                                    </Button>
                                    {generatedLinkedInPost && (
                                        <Button icon={<CopyOutlined />} onClick={handleCopyLinkedInPost}>
                                            {t('createContent.copyLinkedinPost')}
                                        </Button>
                                    )}
                                </Space>
                            </div>

                            {generatedLinkedInPost && (
                                <Card
                                    size="small"
                                    style={{
                                        background: '#f0f9ff',
                                        borderColor: '#bae6fd',
                                    }}
                                    actions={[
                                        <Button
                                            key="reset-linkedin"
                                            type="text"
                                            onClick={handleResetLinkedInPost}
                                        >
                                            {t('createContent.resetLinkedinPost')}
                                        </Button>,
                                    ]}
                                >
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                        <Typography.Text strong>
                                            {generatedLinkedInPost.title || t('createContent.linkedinPost')}
                                        </Typography.Text>
                                        <Typography.Paragraph style={{ marginBottom: 0 }}>
                                            {generatedLinkedInPost.content}
                                        </Typography.Paragraph>
                                        {generatedLinkedInPost.hashtags?.length ? (
                                            <Space size={[4, 4]} wrap>
                                                {generatedLinkedInPost.hashtags.map((tag) => (
                                                    <Typography.Text key={tag} code>
                                                        {tag}
                                                    </Typography.Text>
                                                ))}
                                            </Space>
                                        ) : null}
                                    </Space>
                                </Card>
                            )}
                        </div>
                    </Card>
                );
            }}
        </Form.Item>
    </Form>
);

export default LinkedInPostCard;

import { CopyOutlined, RobotOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Collapse, Form, List, Radio, Space, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type { LinkedInPost, RssItem } from '/app/api/contents/models';

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
                                            const getKey = (it: RssItem) => it.link || it.title || '';
                                            const groups: Record<string, RssItem[]> = {};
                                            rssItems.forEach((item) => {
                                                const sourceName = item.source || 'Unknown';
                                                if (!groups[sourceName]) groups[sourceName] = [];
                                                groups[sourceName].push(item);
                                            });
                                            const groupedArticles = Object.entries(groups).map(([name, items]) => ({
                                                name,
                                                items,
                                            }));

                                            return (
                                                <Collapse
                                                    className="custom-collapse"
                                                    items={groupedArticles.map((group) => ({
                                                        key: group.name,
                                                        label: (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    width: '100%',
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontWeight: '600',
                                                                        fontSize: '15px',
                                                                        color: '#1f2937',
                                                                    }}
                                                                >
                                                                    {group.name}
                                                                </span>
                                                                <Badge
                                                                    count={group.items.length}
                                                                    overflowCount={99}
                                                                    style={{ backgroundColor: '#0077B5' }}
                                                                />
                                                            </div>
                                                        ),
                                                        children: (
                                                            <List
                                                                dataSource={group.items}
                                                                split={false}
                                                                className="rss-articles-scroll"
                                                                style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 8 }}
                                                                renderItem={(it) => {
                                                                    const linkKey = it.link || it.title || '';
                                                                    const isSelected =
                                                                        !!selectedLinkedInArticle &&
                                                                        (selectedLinkedInArticle.link === it.link ||
                                                                            (!selectedLinkedInArticle.link &&
                                                                                selectedLinkedInArticle.title === it.title));

                                                                    return (
                                                                        <List.Item
                                                                            style={{
                                                                                background: isSelected ? '#e6f7ff' : 'transparent',
                                                                                border: isSelected
                                                                                    ? '2px solid #0077B5'
                                                                                    : '1px solid transparent',
                                                                                borderRadius: '6px',
                                                                                marginBottom: '8px',
                                                                                padding: '12px',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.2s ease',
                                                                            }}
                                                                            onClick={() => {
                                                                                if (!linkKey) return;
                                                                                if (isSelected) {
                                                                                    setSelectedLinkedInArticle(null);
                                                                                    setGeneratedLinkedInPost(null);
                                                                                } else {
                                                                                    setSelectedLinkedInArticle(it);
                                                                                    setGeneratedLinkedInPost(null);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <List.Item.Meta
                                                                                avatar={
                                                                                    <Radio
                                                                                        checked={isSelected}
                                                                                        onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (e.target.checked) {
                                                                                                setSelectedLinkedInArticle(it);
                                                                                                setGeneratedLinkedInPost(null);
                                                                                            } else {
                                                                                                setSelectedLinkedInArticle(null);
                                                                                                setGeneratedLinkedInPost(null);
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                }
                                                                                title={
                                                                                    <div
                                                                                        style={{
                                                                                            fontSize: '14px',
                                                                                            fontWeight: '500',
                                                                                            color: '#1f2937',
                                                                                        }}
                                                                                    >
                                                                                        {it.link ? (
                                                                                            <a
                                                                                                href={it.link}
                                                                                                target="_blank"
                                                                                                rel="noreferrer"
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                                style={{ color: '#1d4ed8', textDecoration: 'none' }}
                                                                                            >
                                                                                                {it.title || it.link}
                                                                                            </a>
                                                                                        ) : (
                                                                                            it.title || 'No title'
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                                description={
                                                                                    <div
                                                                                        style={{
                                                                                            fontSize: '12px',
                                                                                            color: '#6b7280',
                                                                                            marginTop: '4px',
                                                                                        }}
                                                                                    >
                                                                                        {it.contentSnippet && (
                                                                                            <div>
                                                                                                {it.contentSnippet.substring(0, 150)}
                                                                                                {it.contentSnippet.length > 150 && '...'}
                                                                                            </div>
                                                                                        )}
                                                                                        {it.pubDate && (
                                                                                            <div style={{ marginTop: '4px' }}>
                                                                                                {new Date(it.pubDate).toLocaleDateString()}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                            />
                                                                        </List.Item>
                                                                    );
                                                                }}
                                                            />
                                                        ),
                                                    }))}
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

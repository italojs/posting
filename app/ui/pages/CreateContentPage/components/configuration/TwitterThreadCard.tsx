import { CopyOutlined, RobotOutlined, TwitterOutlined } from '@ant-design/icons';
import { Button, Card, Form, Space, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type { RssItem, TwitterThread } from '/app/api/contents/models';
import { groupRssItemsBySource } from '/app/ui/pages/CreateContentPage/utils/rss';
import RssSourceCollapse from '../common/RssSourceCollapse';

interface TwitterThreadCardProps {
    form: FormInstance;
    t: TFunction<'common'>;
    rssItems: RssItem[];
    selectedTwitterArticle: RssItem | null;
    setSelectedTwitterArticle: Dispatch<SetStateAction<RssItem | null>>;
    generatingThread: boolean;
    generatedThread: TwitterThread | null;
    setGeneratedThread: Dispatch<SetStateAction<TwitterThread | null>>;
    handleGenerateTwitterThread: () => Promise<void>;
    handleCopyIndividualTweet: (tweet: string, index: number) => Promise<void>;
    handleResetTwitterThread: () => void;
}

const TwitterThreadCard: React.FC<TwitterThreadCardProps> = ({
    form,
    t,
    rssItems,
    selectedTwitterArticle,
    setSelectedTwitterArticle,
    generatingThread,
    generatedThread,
    setGeneratedThread,
    handleGenerateTwitterThread,
    handleCopyIndividualTweet,
    handleResetTwitterThread,
}) => (
    <Form form={form}>
        <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
                const isTwitter = !!getFieldValue('twitter');
                if (!isTwitter) return null;

                return (
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    style={{
                                        backgroundColor: '#1DA1F2',
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
                                    {t('createContent.twitterThreadTitle')}
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
                                {t('createContent.twitterThreadHelp')}
                            </Typography.Text>

                            {rssItems.length > 0 && (
                                <div style={{ margin: '0 0 16px' }}>
                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                        {t('createContent.selectArticlePrompt')} ({rssItems.length}{' '}
                                        {t('createContent.itemsFound', { count: rssItems.length })})
                                    </Typography.Text>

                                    <div style={{ marginTop: 12 }}>
                                        {(() => {
                                            const groupedArticles = groupRssItemsBySource(rssItems);

                                            return (
                                                <RssSourceCollapse
                                                    groups={groupedArticles}
                                                    badgeColor="#1DA1F2"
                                                    renderItem={(item) => {
                                                        const linkKey = item.link || item.title || '';
                                                        const isSelected =
                                                            !!selectedTwitterArticle &&
                                                            (selectedTwitterArticle.link === item.link ||
                                                                (!selectedTwitterArticle.link &&
                                                                    selectedTwitterArticle.title === item.title));
                                                        return (
                                                            <div
                                                                style={{
                                                                    padding: '8px 0',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'flex-start',
                                                                    gap: 12,
                                                                }}
                                                                onClick={() => {
                                                                    if (!linkKey) return;
                                                                    if (
                                                                        selectedTwitterArticle &&
                                                                        (selectedTwitterArticle.link ||
                                                                            selectedTwitterArticle.title) === linkKey
                                                                    ) {
                                                                        setSelectedTwitterArticle(null);
                                                                        setGeneratedThread(null);
                                                                    } else {
                                                                        setSelectedTwitterArticle(item);
                                                                        setGeneratedThread(null);
                                                                    }
                                                                }}
                                                            >
                                                                <Radio
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        if (e.target.checked) {
                                                                            setSelectedTwitterArticle(item);
                                                                            setGeneratedThread(null);
                                                                        } else {
                                                                            setSelectedTwitterArticle(null);
                                                                            setGeneratedThread(null);
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
                                        icon={<TwitterOutlined />}
                                        onClick={handleGenerateTwitterThread}
                                        loading={generatingThread}
                                        disabled={!selectedTwitterArticle || rssItems.length === 0}
                                    >
                                        {t('createContent.generateTwitterThread')}
                                    </Button>
                                    {generatedThread && (
                                        <Button icon={<CopyOutlined />} onClick={handleResetTwitterThread}>
                                            {t('createContent.resetThread')}
                                        </Button>
                                    )}
                                </Space>
                            </div>

                            {generatedThread && (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {generatedThread.tweets.map((tweet, index) => (
                                        <Card
                                            key={index}
                                            size="small"
                                            style={{
                                                background: '#f8fafc',
                                                borderColor: '#e2e8f0',
                                            }}
                                            actions={[
                                                <Button
                                                    key="copy"
                                                    type="text"
                                                    icon={<CopyOutlined />}
                                                    onClick={() => handleCopyIndividualTweet(tweet, index + 1)}
                                                >
                                                    {t('createContent.copyTweet')}
                                                </Button>,
                                            ]}
                                        >
                                            <Typography.Paragraph style={{ marginBottom: 0 }}>
                                                {tweet}
                                            </Typography.Paragraph>
                                        </Card>
                                    ))}

                                    <Card
                                        size="small"
                                        style={{
                                            borderColor: '#c7d2fe',
                                            background: '#eef2ff',
                                        }}
                                    >
                                        <Typography.Text strong>
                                            {t('createContent.threadSummaryTitle')}
                                        </Typography.Text>
                                        <Typography.Paragraph style={{ marginTop: 8 }}>
                                            {generatedThread.summary}
                                        </Typography.Paragraph>
                                        <Space wrap>
                                            {generatedThread.callToActions.map((cta, idx) => (
                                                <Button
                                                    key={idx}
                                                    size="small"
                                                    icon={<RobotOutlined />}
                                                    style={{
                                                        background: '#1DA1F2',
                                                        borderColor: '#1DA1F2',
                                                        color: 'white',
                                                    }}
                                                >
                                                    {cta}
                                                </Button>
                                            ))}
                                        </Space>

                                        {generatedThread.articleUrl && (
                                            <div
                                                style={{
                                                    marginTop: '16px',
                                                    padding: '12px',
                                                    background: '#f0f8ff',
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                <Typography.Text style={{ fontSize: '12px', color: '#1890ff' }}>
                                                    <strong>Fonte:</strong>{' '}
                                                    <a
                                                        href={generatedThread.articleUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {generatedThread.articleTitle}
                                                    </a>
                                                </Typography.Text>
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            }}
        </Form.Item>
    </Form>
);

export default TwitterThreadCard;

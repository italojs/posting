import {
    DeleteOutlined,
    EditOutlined,
    RobotOutlined,
    SaveOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Checkbox,
    Form,
    Input,
    List,
    Space,
    Tag,
    Typography,
} from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type {
    NewsletterSection,
    RssItem,
    SearchNewsResult,
} from '/app/api/contents/models';
import type { SectionGenerationEntry } from '../../types';
import { groupRssItemsBySource, rssItemKey } from '/app/ui/pages/CreateContentPage/utils/rss';
import RssSourceCollapse from '../common/RssSourceCollapse';

interface NewsletterSectionsCardProps {
    form: FormInstance;
    t: TFunction<'common'>;
    sections: NewsletterSection[];
    setSections: Dispatch<SetStateAction<NewsletterSection[]>>;
    activeSectionIndex: number;
    setActiveSectionIndex: Dispatch<SetStateAction<number>>;
    sectionGenerations: Record<string, SectionGenerationEntry>;
    handleRefreshSectionQueries: (section: NewsletterSection) => Promise<void>;
    handleFetchNewsForSection: (section: NewsletterSection) => Promise<void>;
    handleGenerateSectionContent: (section: NewsletterSection) => Promise<void>;
    currentSection?: NewsletterSection;
    currentSectionId: string;
    currentSectionQueries: string[];
    currentSectionNewsResults: SearchNewsResult[];
    currentSectionQueriesLoading: boolean;
    currentSectionNewsLoading: boolean;
    currentSectionGeneration?: SectionGenerationEntry;
    currentSectionGenerationLoading: boolean;
    favoriteUrls: string[];
    rssItems: RssItem[];
    handleGenerateAISuggestion: () => void;
    AILoading: boolean;
}

const NewsletterSectionsCard: React.FC<NewsletterSectionsCardProps> = ({
    form,
    t,
    sections,
    setSections,
    activeSectionIndex,
    setActiveSectionIndex,
    sectionGenerations,
    handleRefreshSectionQueries,
    handleFetchNewsForSection,
    handleGenerateSectionContent,
    currentSection,
    currentSectionId,
    currentSectionQueries,
    currentSectionNewsResults,
    currentSectionQueriesLoading,
    currentSectionNewsLoading,
    currentSectionGeneration,
    currentSectionGenerationLoading,
    favoriteUrls,
    rssItems,
    handleGenerateAISuggestion,
    AILoading,
}) => (
    <Form form={form}>
        <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
                const isNewsletter = !!getFieldValue('newsletter');
                if (!isNewsletter) return null;

                return (
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
                                        2
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: '600' }}>
                                        Seções da Newsletter
                                    </span>
                                </div>
                                <Button
                                    type="primary"
                                    icon={<RobotOutlined />}
                                    onClick={handleGenerateAISuggestion}
                                    loading={AILoading}
                                >
                                    {t('createContent.generateAISuggestion')}
                                </Button>
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
                            <div style={{ marginBottom: '16px' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px',
                                    }}
                                >
                                    <Typography.Text
                                        strong
                                        style={{
                                            fontWeight: '600',
                                            fontSize: '14px',
                                        }}
                                    >
                                        Seções da Newsletter:
                                    </Typography.Text>
                                    <Button
                                        type="link"
                                        style={{
                                            color: '#5B5BD6',
                                            fontSize: '14px',
                                            padding: 0,
                                            height: 'auto',
                                        }}
                                        onClick={() => {
                                            const newSection: NewsletterSection = {
                                                id: Math.random().toString(36).slice(2, 9),
                                                title: '',
                                                description: '',
                                                rssItems: [],
                                                newsArticles: [],
                                            };
                                            setSections((prev) => [...prev, newSection]);
                                            setActiveSectionIndex(sections.length);
                                        }}
                                    >
                                        + Adicionar Seção
                                    </Button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sections.map((section, idx) => {
                                    if (!section.title && !section.description) return null;
                                    const sectionGenerated = !!(section.id && sectionGenerations[section.id]);

                                    return (
                                        <div
                                            key={section.id}
                                            style={{
                                                backgroundColor: '#f8f9fa',
                                                border: '1px solid #e9ecef',
                                                borderRadius: '8px',
                                                padding: '12px 16px',
                                                position: 'relative',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '4px',
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <Typography.Text
                                                        strong
                                                        style={{
                                                            fontSize: '14px',
                                                            color: '#1a1a1a',
                                                            display: 'block',
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        {section.title}
                                                    </Typography.Text>
                                                    <Typography.Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: '12px',
                                                            lineHeight: '1.4',
                                                        }}
                                                    >
                                                        {section.description}
                                                    </Typography.Text>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <div
                                                        style={{
                                                            backgroundColor: '#5B5BD6',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            width: '20px',
                                                            height: '20px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {idx + 1}
                                                    </div>
                                                    {sectionGenerated && (
                                                        <Tag color="green" style={{ marginLeft: 4 }}>
                                                            {t('createContent.sectionGeneratedBadge')}
                                                        </Tag>
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: 8,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => setActiveSectionIndex(idx)}
                                                >
                                                    {t('createContent.sectionEdit')}
                                                </Button>
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    danger
                                                    onClick={() => {
                                                        setSections((prev) => {
                                                            const next = prev.filter((_, sIdx) => sIdx !== idx);
                                                            if (activeSectionIndex >= next.length) {
                                                                setActiveSectionIndex(next.length - 1);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    {t('createContent.sectionRemove')}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {activeSectionIndex >= 0 && sections[activeSectionIndex] && (
                                <div
                                    style={{
                                        marginTop: 24,
                                        padding: 16,
                                        borderRadius: 12,
                                        border: '1px solid #e0e7ff',
                                        background: '#f8faff',
                                    }}
                                >
                                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                        <Typography.Text strong style={{ fontSize: 15 }}>
                                            {t('createContent.sectionEditorTitle', {
                                                number: activeSectionIndex + 1,
                                            })}
                                        </Typography.Text>

                                        <Input
                                            value={sections[activeSectionIndex]?.title}
                                            placeholder={t('createContent.sectionTitlePlaceholder') as string}
                                            onChange={(e) =>
                                                setSections((prev) => {
                                                    const next = [...prev];
                                                    next[activeSectionIndex] = {
                                                        ...next[activeSectionIndex],
                                                        title: e.target.value,
                                                    };
                                                    return next;
                                                })
                                            }
                                        />
                                        <Input.TextArea
                                            value={sections[activeSectionIndex]?.description}
                                            placeholder={t('createContent.sectionDescriptionPlaceholder') as string}
                                            onChange={(e) =>
                                                setSections((prev) => {
                                                    const next = [...prev];
                                                    next[activeSectionIndex] = {
                                                        ...next[activeSectionIndex],
                                                        description: e.target.value,
                                                    };
                                                    return next;
                                                })
                                            }
                                            rows={3}
                                        />

                                        <Space wrap>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                onClick={() =>
                                                    currentSection && handleGenerateSectionContent(currentSection)
                                                }
                                                loading={currentSectionGenerationLoading}
                                                disabled={
                                                    !currentSection ||
                                                    !currentSection.title ||
                                                    currentSection.title.trim().length < 3
                                                }
                                            >
                                                {t('createContent.sectionGenerateContent')}
                                            </Button>
                                            <Button
                                                icon={<RobotOutlined />}
                                                onClick={() =>
                                                    currentSection && handleRefreshSectionQueries(currentSection)
                                                }
                                                loading={currentSectionQueriesLoading}
                                                disabled={
                                                    !currentSection ||
                                                    !currentSection.title ||
                                                    currentSection.title.trim().length < 3
                                                }
                                            >
                                                {t('createContent.sectionRegenerateQueries')}
                                            </Button>
                                            <Button
                                                icon={<SearchOutlined />}
                                                onClick={() =>
                                                    currentSection && handleFetchNewsForSection(currentSection)
                                                }
                                                loading={currentSectionNewsLoading}
                                                disabled={!currentSectionId}
                                            >
                                                {t('createContent.sectionFetchNews')}
                                            </Button>
                                        </Space>

                                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                                            <Typography.Text strong style={{ fontSize: 13 }}>
                                                {t('createContent.sectionSuggestedQueries')}
                                            </Typography.Text>
                                            {currentSectionQueries.length > 0 ? (
                                                <Space size={[6, 6]} wrap style={{ marginTop: 8 }}>
                                                    {currentSectionQueries.map((query) => (
                                                        <span
                                                            key={query}
                                                            style={{
                                                                backgroundColor: '#eef2ff',
                                                                color: '#312e81',
                                                                borderRadius: '999px',
                                                                padding: '4px 10px',
                                                                fontSize: 12,
                                                                lineHeight: 1.2,
                                                            }}
                                                        >
                                                            {query}
                                                        </span>
                                                    ))}
                                                </Space>
                                            ) : (
                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                    {t('createContent.sectionSearchSuggestionsEmpty')}
                                                </Typography.Text>
                                            )}
                                        </div>
                                        {currentSectionNewsLoading && (
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                {t('createContent.sectionSearchNewsLoading')}
                                            </div>
                                        )}
                                        {!currentSectionNewsLoading && currentSectionNewsResults.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {currentSectionNewsResults.map((group) => (
                                                    <div
                                                        key={group.query}
                                                        style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}
                                                    >
                                                        <Typography.Text strong style={{ fontSize: 13 }}>
                                                            {t('createContent.sectionSearchNewsGroupTitle', {
                                                                query: group.query,
                                                            })}
                                                        </Typography.Text>
                                                        {group.articles.length === 0 ? (
                                                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                                {t('createContent.sectionSearchNewsGroupEmpty')}
                                                            </Typography.Text>
                                                        ) : (
                                                            <List
                                                                dataSource={group.articles}
                                                                split={false}
                                                                style={{ marginTop: 8 }}
                                                                renderItem={(article) => {
                                                                    const isSelected = !!currentSection?.newsArticles?.some(
                                                                        (item) =>
                                                                            item.link === article.link ||
                                                                            (!item.link && item.title === article.title),
                                                                    );
                                                                    return (
                                                                        <List.Item
                                                                            style={{
                                                                                alignItems: 'flex-start',
                                                                                padding: '8px 0',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                            onClick={() =>
                                                                                setSections((prev) => {
                                                                                    const next = [...prev];
                                                                                    const current = next[activeSectionIndex];
                                                                                    if (!current.newsArticles) {
                                                                                        current.newsArticles = [];
                                                                                    }
                                                                                    const exists = current.newsArticles.find(
                                                                                        (item) =>
                                                                                            item.link === article.link ||
                                                                                            (!item.link && item.title === article.title),
                                                                                    );
                                                                                    if (exists) {
                                                                                        current.newsArticles = current.newsArticles.filter(
                                                                                            (item) =>
                                                                                                item.link !== article.link ||
                                                                                                (!item.link && item.title !== article.title),
                                                                                        );
                                                                                    } else {
                                                                                        current.newsArticles.push(article);
                                                                                    }
                                                                                    next[activeSectionIndex] = { ...current };
                                                                                    return next;
                                                                                })
                                                                            }
                                                                        >
                                                                            <List.Item.Meta
                                                                                title={
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                        <span style={{ fontWeight: 500 }}>
                                                                                            {article.title}
                                                                                        </span>
                                                                                        <Checkbox checked={isSelected} />
                                                                                    </div>
                                                                                }
                                                                                description={
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                                        {(article.source || article.date) && (
                                                                                            <span style={{ fontSize: 11, color: '#6b7280' }}>
                                                                                                {[article.source, article.date]
                                                                                                    .filter(Boolean)
                                                                                                    .join(' • ')}
                                                                                            </span>
                                                                                        )}
                                                                                        {article.snippet && (
                                                                                            <Typography.Paragraph style={{ margin: 0, fontSize: 12, color: '#374151' }}>
                                                                                                {article.snippet}
                                                                                            </Typography.Paragraph>
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                            />
                                                                        </List.Item>
                                                                    );
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                                {(() => {
            const selectedInOthers = new Set<string>(
                sections
                    .filter((_, idx) => idx !== activeSectionIndex)
                    .flatMap((s) => (s.rssItems || []).map(rssItemKey)),
            );

            const availableItems = rssItems.filter((item) => {
                const key = rssItemKey(item);
                return key && !selectedInOthers.has(key);
            });

            const groupedAvailable = groupRssItemsBySource(availableItems);

            return (
                <>
                    <div style={{ margin: '8px 0 12px' }}>
                        <Typography.Text strong style={{ fontSize: 13 }}>
                            Fontes favoritas ({favoriteUrls.length})
                        </Typography.Text>
                        <div
                            style={{
                                display: 'flex',
                                gap: 8,
                                flexWrap: 'wrap',
                                marginTop: 8,
                            }}
                        >
                            {favoriteUrls.map((url) => (
                                <Tag key={url} color="blue">
                                    {url}
                                </Tag>
                            ))}
                        </div>
                    </div>
                    <RssSourceCollapse
                        groups={groupedAvailable}
                        badgeColor="#5B5BD6"
                        renderItem={(item) => {
                            const linkKey = rssItemKey(item);
                            const checked =
                                !!sections[activeSectionIndex]?.rssItems?.some((r) => rssItemKey(r) === linkKey);

                            return (
                                <div
                                    style={{
                                        alignItems: 'flex-start',
                                        padding: '8px 0',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        gap: 12,
                                    }}
                                    onClick={() =>
                                        setSections((prev) => {
                                            const next = [...prev];
                                            const section = next[activeSectionIndex];
                                            if (!section.rssItems) section.rssItems = [];
                                            const existsIdx = section.rssItems.findIndex((r) => rssItemKey(r) === linkKey);
                                            const present = existsIdx >= 0;
                                            if (!present) {
                                                section.rssItems.push(item);
                                                next.forEach((sec, idx) => {
                                                    if (idx !== activeSectionIndex && sec.rssItems) {
                                                        const ri = sec.rssItems.findIndex((r) => rssItemKey(r) === linkKey);
                                                        if (ri >= 0) sec.rssItems.splice(ri, 1);
                                                    }
                                                });
                                            } else {
                                                section.rssItems.splice(existsIdx, 1);
                                            }
                                            next[activeSectionIndex] = { ...section };
                                            return next;
                                        })
                                    }
                                >
                                    <Checkbox
                                        checked={checked}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            const isChecked = e.target.checked;
                                            setSections((prev) => {
                                                const next = [...prev];
                                                const section = next[activeSectionIndex];
                                                if (!section.rssItems) section.rssItems = [];
                                                const existsIdx = section.rssItems.findIndex((r) => rssItemKey(r) === linkKey);
                                                const present = existsIdx >= 0;
                                                if (isChecked && !present) {
                                                    section.rssItems.push(item);
                                                    next.forEach((sec, idx) => {
                                                        if (idx !== activeSectionIndex && sec.rssItems) {
                                                            const ri = sec.rssItems.findIndex((r) => rssItemKey(r) === linkKey);
                                                            if (ri >= 0) sec.rssItems.splice(ri, 1);
                                                        }
                                                    });
                                                }
                                                if (!isChecked && present) section.rssItems.splice(existsIdx, 1);
                                                next[activeSectionIndex] = { ...section };
                                                return next;
                                            });
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        {item.link ? (
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {item.title || item.link}
                                            </a>
                                        ) : (
                                            item.title || 'No title'
                                        )}
                                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                            {item.pubDate && (
                                                <div>{new Date(item.pubDate).toLocaleDateString()}</div>
                                            )}
                                            {item.contentSnippet && (
                                                <div>{item.contentSnippet.substring(0, 120)}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                    />
                </>
            );
        })()}

                                        {currentSectionGeneration && (
                                            <Card
                                                size="small"
                                                title={t('createContent.sectionPreviewTitle')}
                                                style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
                                            >
                                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                        {t('createContent.newsletterPreviewOriginalTitle', {
                                                            title: currentSectionGeneration.preview.originalTitle,
                                                        })}
                                                    </Typography.Text>
                                                    <Typography.Title level={5} style={{ marginBottom: 4 }}>
                                                        {currentSectionGeneration.preview.generatedTitle}
                                                    </Typography.Title>
                                                    <Typography.Text style={{ color: '#4b5563' }}>
                                                        {currentSectionGeneration.preview.summary}
                                                    </Typography.Text>
                                                    <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                                                        {currentSectionGeneration.preview.body}
                                                    </Typography.Paragraph>
                                                    {currentSectionGeneration.preview.callToAction && (
                                                        <Typography.Text strong style={{ color: '#2563eb' }}>
                                                            {t('createContent.newsletterPreviewCallToAction', {
                                                                cta: currentSectionGeneration.preview.callToAction,
                                                            })}
                                                        </Typography.Text>
                                                    )}
                                                    <div>
                                                        <Typography.Text strong style={{ fontSize: 13 }}>
                                                            {t('createContent.newsletterPreviewArticlesTitle')}
                                                        </Typography.Text>
                                                        <List
                                                            dataSource={currentSectionGeneration.preview.articleSummaries}
                                                            split={false}
                                                            style={{ marginTop: 6 }}
                                                            renderItem={(article) => (
                                                                <List.Item style={{ padding: '4px 0' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                        {article.url ? (
                                                                            <a href={article.url} target="_blank" rel="noreferrer">
                                                                                {article.title}
                                                                            </a>
                                                                        ) : (
                                                                            <Typography.Text strong>{article.title}</Typography.Text>
                                                                        )}
                                                                        <Typography.Text style={{ fontSize: 12, color: '#6b7280' }}>
                                                                            {article.summary}
                                                                        </Typography.Text>
                                                                    </div>
                                                                </List.Item>
                                                            )}
                                                        />
                                                    </div>
                                                </Space>
                                            </Card>
                                        )}
                                    </Space>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            }}
        </Form.Item>
    </Form>
);

export default NewsletterSectionsCard;

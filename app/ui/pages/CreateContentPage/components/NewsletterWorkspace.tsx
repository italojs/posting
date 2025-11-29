import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type {
    GeneratedNewsletterPreview,
    NewsletterSection,
    RssItem,
    SearchNewsResult,
} from '/app/api/contents/models';
import type { SectionGenerationEntry } from '../types';
import NewsletterSectionsCard from './newsletter/NewsletterSectionsCard';
import NewsletterPreviewCard from './newsletter/NewsletterPreviewCard';

interface NewsletterWorkspaceProps {
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
    currentSectionQueries: string[];
    currentSectionNewsResults: SearchNewsResult[];
    currentSectionQueriesLoading: boolean;
    currentSectionNewsLoading: boolean;
    favoriteUrls: string[];
    rssItems: RssItem[];
    newsletterPreview: GeneratedNewsletterPreview | null;
    handleCopyPreviewMarkdown: () => Promise<void>;
    setNewsletterPreview: Dispatch<SetStateAction<GeneratedNewsletterPreview | null>>;
    handleGenerateAISuggestion: () => void;
    AILoading: boolean;
}

const NewsletterWorkspace: React.FC<NewsletterWorkspaceProps> = (props) => {
    const {
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
        currentSectionQueries,
        currentSectionNewsResults,
        currentSectionQueriesLoading,
        currentSectionNewsLoading,
        favoriteUrls,
        rssItems,
        newsletterPreview,
        handleCopyPreviewMarkdown,
        setNewsletterPreview,
        handleGenerateAISuggestion,
        AILoading,
    } = props;

    return (
        <div>
            <NewsletterSectionsCard
                form={form}
                t={t}
                sections={sections}
                setSections={setSections}
                activeSectionIndex={activeSectionIndex}
                setActiveSectionIndex={setActiveSectionIndex}
                sectionGenerations={sectionGenerations}
                handleRefreshSectionQueries={handleRefreshSectionQueries}
                handleFetchNewsForSection={handleFetchNewsForSection}
                handleGenerateSectionContent={handleGenerateSectionContent}
                currentSection={currentSection}
                currentSectionQueries={currentSectionQueries}
                currentSectionNewsResults={currentSectionNewsResults}
                currentSectionQueriesLoading={currentSectionQueriesLoading}
                currentSectionNewsLoading={currentSectionNewsLoading}
                favoriteUrls={favoriteUrls}
                rssItems={rssItems}
                handleGenerateAISuggestion={handleGenerateAISuggestion}
                AILoading={AILoading}
            />

            <NewsletterPreviewCard
                t={t}
                newsletterPreview={newsletterPreview}
                handleCopyPreviewMarkdown={handleCopyPreviewMarkdown}
                clearPreview={() => setNewsletterPreview(null)}
            />
        </div>
    );
};

export default NewsletterWorkspace;

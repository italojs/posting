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
    sectionGenerationLoading: Record<string, boolean>;
    sectionNewsResults: Record<string, SearchNewsResult[]>;
    sectionNewsLoading: Record<string, boolean>;
    sectionQueryLoading: Record<string, boolean>;
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
    newsletterPreview: GeneratedNewsletterPreview | null;
    handleCopyPreviewMarkdown: () => Promise<void>;
    setNewsletterPreview: Dispatch<SetStateAction<GeneratedNewsletterPreview | null>>;
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
        sectionGenerationLoading,
        sectionNewsResults,
        sectionNewsLoading,
        sectionQueryLoading,
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
        newsletterPreview,
        handleCopyPreviewMarkdown,
        setNewsletterPreview,
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
                sectionGenerationLoading={sectionGenerationLoading}
                sectionNewsResults={sectionNewsResults}
                sectionNewsLoading={sectionNewsLoading}
                sectionQueryLoading={sectionQueryLoading}
                handleRefreshSectionQueries={handleRefreshSectionQueries}
                handleFetchNewsForSection={handleFetchNewsForSection}
                handleGenerateSectionContent={handleGenerateSectionContent}
                currentSection={currentSection}
                currentSectionId={currentSectionId}
                currentSectionQueries={currentSectionQueries}
                currentSectionNewsResults={currentSectionNewsResults}
                currentSectionQueriesLoading={currentSectionQueriesLoading}
                currentSectionNewsLoading={currentSectionNewsLoading}
                currentSectionGeneration={currentSectionGeneration}
                currentSectionGenerationLoading={currentSectionGenerationLoading}
                favoriteUrls={favoriteUrls}
                rssItems={rssItems}
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

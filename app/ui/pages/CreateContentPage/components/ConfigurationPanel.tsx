import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type {
    GeneratedNewsletterPreview,
    LinkedInPost,
    NewsletterSection,
    RssItem,
    TwitterThread,
} from '/app/api/contents/models';
import type { BrandSummary } from '/app/api/brands/models';
import BasicConfigurationCard from './configuration/BasicConfigurationCard';
import TwitterThreadCard from './configuration/TwitterThreadCard';
import LinkedInPostCard from './configuration/LinkedInPostCard';

interface ConfigurationPanelProps {
    form: FormInstance;
    t: TFunction<'common'>;
    brandOptions: { value: string; label: string }[];
    brands: BrandSummary[];
    brandsLoading: boolean;
    selectedBrandSummary?: BrandSummary;
    isBrandMissing: boolean;
    sections: NewsletterSection[];
    setSections: Dispatch<SetStateAction<NewsletterSection[]>>;
    setActiveSectionIndex: Dispatch<SetStateAction<number>>;
    handleFetchRss: (auto?: boolean) => Promise<void>;
    setRssItems: Dispatch<SetStateAction<RssItem[]>>;
    setSelectedItemLinks: Dispatch<SetStateAction<Set<string>>>;
    setNewsletterPreview: Dispatch<SetStateAction<GeneratedNewsletterPreview | null>>;
    navigate: (path: string) => void;
    rssItems: RssItem[];
    selectedTwitterArticle: RssItem | null;
    setSelectedTwitterArticle: Dispatch<SetStateAction<RssItem | null>>;
    generatingThread: boolean;
    generatedThread: TwitterThread | null;
    setGeneratedThread: Dispatch<SetStateAction<TwitterThread | null>>;
    handleGenerateTwitterThread: () => Promise<void>;
    handleCopyIndividualTweet: (tweet: string, index: number) => Promise<void>;
    handleResetTwitterThread: () => void;
    selectedLinkedInArticle: RssItem | null;
    setSelectedLinkedInArticle: Dispatch<SetStateAction<RssItem | null>>;
    generatingLinkedInPost: boolean;
    generatedLinkedInPost: LinkedInPost | null;
    setGeneratedLinkedInPost: Dispatch<SetStateAction<LinkedInPost | null>>;
    handleGenerateLinkedInPost: () => Promise<void>;
    handleCopyLinkedInPost: () => Promise<void>;
    handleResetLinkedInPost: () => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
    form,
    t,
    brandOptions,
    brands,
    brandsLoading,
    selectedBrandSummary,
    isBrandMissing,
    sections,
    setSections,
    setActiveSectionIndex,
    handleFetchRss,
    setRssItems,
    setSelectedItemLinks,
    setNewsletterPreview,
    navigate,
    rssItems,
    selectedTwitterArticle,
    setSelectedTwitterArticle,
    generatingThread,
    generatedThread,
    setGeneratedThread,
    handleGenerateTwitterThread,
    handleCopyIndividualTweet,
    handleResetTwitterThread,
    selectedLinkedInArticle,
    setSelectedLinkedInArticle,
    generatingLinkedInPost,
    generatedLinkedInPost,
    setGeneratedLinkedInPost,
    handleGenerateLinkedInPost,
    handleCopyLinkedInPost,
    handleResetLinkedInPost,
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '600px' }}>
        <BasicConfigurationCard
            form={form}
            t={t}
            brandOptions={brandOptions}
            brands={brands}
            brandsLoading={brandsLoading}
            selectedBrandSummary={selectedBrandSummary}
            isBrandMissing={isBrandMissing}
            sections={sections}
            setSections={setSections}
            setActiveSectionIndex={setActiveSectionIndex}
            handleFetchRss={handleFetchRss}
            setRssItems={setRssItems}
            setSelectedItemLinks={setSelectedItemLinks}
            setNewsletterPreview={setNewsletterPreview}
            navigate={navigate}
        />

        <TwitterThreadCard
            form={form}
            t={t}
            rssItems={rssItems}
            selectedTwitterArticle={selectedTwitterArticle}
            setSelectedTwitterArticle={setSelectedTwitterArticle}
            generatingThread={generatingThread}
            generatedThread={generatedThread}
            setGeneratedThread={setGeneratedThread}
            handleGenerateTwitterThread={handleGenerateTwitterThread}
            handleCopyIndividualTweet={handleCopyIndividualTweet}
            handleResetTwitterThread={handleResetTwitterThread}
        />

        <LinkedInPostCard
            form={form}
            t={t}
            rssItems={rssItems}
            selectedLinkedInArticle={selectedLinkedInArticle}
            setSelectedLinkedInArticle={setSelectedLinkedInArticle}
            generatingLinkedInPost={generatingLinkedInPost}
            generatedLinkedInPost={generatedLinkedInPost}
            setGeneratedLinkedInPost={setGeneratedLinkedInPost}
            handleGenerateLinkedInPost={handleGenerateLinkedInPost}
            handleCopyLinkedInPost={handleCopyLinkedInPost}
            handleResetLinkedInPost={handleResetLinkedInPost}
        />
    </div>
);

export default ConfigurationPanel;

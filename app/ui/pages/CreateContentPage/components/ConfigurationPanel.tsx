import { Form } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { TFunction } from 'i18next';
import React, { type Dispatch, type SetStateAction } from 'react';
import type {
    LinkedInPost,
    RssItem,
    TwitterThread,
} from '/app/api/contents/models';
import type { BrandSummary } from '/app/api/brands/models';
import BasicConfigurationCard from './configuration/BasicConfigurationCard';
import SocialNetworkSelector from './configuration/SocialNetworkSelector';
import TwitterThreadCard from './configuration/TwitterThreadCard';
import LinkedInPostCard from './configuration/LinkedInPostCard';

interface ConfigurationPanelProps {
    contentType: 'newsletter' | 'social';
    form: FormInstance;
    t: TFunction<'common'>;
    brandOptions: { value: string; label: string }[];
    brands: BrandSummary[];
    brandsLoading: boolean;
    selectedBrandSummary?: BrandSummary;
    isBrandMissing: boolean;
    handleFetchRss: (auto?: boolean) => Promise<void>;
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
    contentType,
    form,
    t,
    brandOptions,
    brands,
    brandsLoading,
    selectedBrandSummary,
    isBrandMissing,
    handleFetchRss,
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
    <Form form={form}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <BasicConfigurationCard
                form={form}
                t={t}
                brandOptions={brandOptions}
                brands={brands}
                brandsLoading={brandsLoading}
                selectedBrandSummary={selectedBrandSummary}
                isBrandMissing={isBrandMissing}
                navigate={navigate}
            />

            {contentType === 'social' && (
                <>
                    <SocialNetworkSelector
                        t={t}
                        handleFetchRss={handleFetchRss}
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
                </>
            )}
        </div>
    </Form>
);

export default ConfigurationPanel;

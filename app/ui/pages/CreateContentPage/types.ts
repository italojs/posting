import type { GeneratedNewsletterSectionPreview } from '/app/api/contents/models';

export interface SectionGenerationEntry {
    preview: GeneratedNewsletterSectionPreview;
    fingerprint: string;
    generatedAt: string;
}

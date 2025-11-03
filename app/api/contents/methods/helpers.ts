import { check, Match } from 'meteor/check';
import {
    CreateContentInput,
    NewsletterGenerationContext,
    NewsletterSection,
    RssItem,
} from '../models';
import { BrandContextForAI } from '/app/api/brands/models';
import { clientContentError } from '/app/utils/serverErrors';

const NETWORK_KEYS = ['newsletter', 'instagram', 'twitter', 'tiktok', 'linkedin'] as const;
type NetworkKey = (typeof NETWORK_KEYS)[number];

export type NormalizedNetworks = Record<NetworkKey, boolean>;

export type LanguageInfo = {
    name: string;
    tag: string;
    labels: {
        goal: string;
        audience: string;
        callToAction: string;
    };
};

const LANGUAGE_INFO_MAP: Record<string, LanguageInfo> = {
    pt: { name: 'Portuguese', tag: 'pt-BR', labels: { goal: 'Objetivo', audience: 'Audiência', callToAction: 'Chamada para ação' } },
    'pt-br': { name: 'Portuguese', tag: 'pt-BR', labels: { goal: 'Objetivo', audience: 'Audiência', callToAction: 'Chamada para ação' } },
    pt_br: { name: 'Portuguese', tag: 'pt-BR', labels: { goal: 'Objetivo', audience: 'Audiência', callToAction: 'Chamada para ação' } },
    es: { name: 'Spanish', tag: 'es', labels: { goal: 'Objetivo', audience: 'Audiencia', callToAction: 'Llamado a la acción' } },
    'es-es': { name: 'Spanish', tag: 'es-ES', labels: { goal: 'Objetivo', audience: 'Audiencia', callToAction: 'Llamado a la acción' } },
    es_es: { name: 'Spanish', tag: 'es-ES', labels: { goal: 'Objetivo', audience: 'Audiencia', callToAction: 'Llamado a la acción' } },
    en: { name: 'English', tag: 'en', labels: { goal: 'Goal', audience: 'Audience', callToAction: 'Call to action' } },
    'en-us': { name: 'English', tag: 'en-US', labels: { goal: 'Goal', audience: 'Audience', callToAction: 'Call to action' } },
    'en-gb': { name: 'English', tag: 'en-GB', labels: { goal: 'Goal', audience: 'Audience', callToAction: 'Call to action' } },
};

export function validateNetworkFlags(networks: CreateContentInput['networks']): void {
    check(networks, Object);
    NETWORK_KEYS.forEach((key) => {
        check((networks as any)[key], Match.Maybe(Boolean));
    });
}

export function normalizeNetworkFlags(networks: CreateContentInput['networks']): NormalizedNetworks {
    return NETWORK_KEYS.reduce(
        (acc, key) => {
            acc[key] = !!networks?.[key];
            return acc;
        },
        {} as NormalizedNetworks,
    );
}

export function validateContentInput(payload: CreateContentInput): void {
    check(payload.name, String);
    check(payload.audience, Match.Maybe(String));
    check(payload.goal, Match.Maybe(String));
    check(payload.rssUrls, [String]);
    check(payload.rssItems, [Object]);
    validateNetworkFlags(payload.networks);
    check(payload.newsletterSections, Match.Maybe([Object]));
    check(payload.brandId, Match.Maybe(String));
}

export type NormalizedContentInput = {
    name: string;
    audience?: string;
    goal?: string;
    rssUrls: string[];
    rssItems: RssItem[];
    networks: NormalizedNetworks;
    newsletterSections?: NewsletterSection[];
};

export function normalizeContentInput(payload: CreateContentInput): NormalizedContentInput {
    validateContentInput(payload);

    const cleanedName = payload.name.trim();
    const cleanedAudience = (payload.audience ?? '').trim();
    const cleanedGoal = (payload.goal ?? '').trim();

    if (!cleanedName) {
        throw clientContentError('Nome do conteúdo é obrigatório');
    }

    const cleanedUrls = payload.rssUrls.map((url) => url.trim()).filter(Boolean);
    if (cleanedUrls.length === 0) {
        throw clientContentError('Informe pelo menos um RSS');
    }

    return {
        name: cleanedName,
        audience: cleanedAudience || undefined,
        goal: cleanedGoal || undefined,
        rssUrls: cleanedUrls,
        rssItems: Array.isArray(payload.rssItems) ? payload.rssItems : [],
        networks: normalizeNetworkFlags(payload.networks),
        newsletterSections:
            Array.isArray(payload.newsletterSections) && payload.newsletterSections.length > 0
                ? payload.newsletterSections
                : undefined,
    };
}

export function resolveLanguageInfo(language?: string): LanguageInfo {
    if (!language) {
        return LANGUAGE_INFO_MAP['pt-br'];
    }

    const lowered = language.toLowerCase();
    if (LANGUAGE_INFO_MAP[lowered]) {
        return LANGUAGE_INFO_MAP[lowered];
    }

    const base = lowered.split(/[-_]/)[0];
    if (base && LANGUAGE_INFO_MAP[base]) {
        return LANGUAGE_INFO_MAP[base];
    }

    const capitalized = language.charAt(0).toUpperCase() + language.slice(1);
    return {
        name: capitalized,
        tag: language,
        labels: {
            goal: 'Goal',
            audience: 'Audience',
            callToAction: 'Call to action',
        },
    };
}

export function buildNewsletterContext({
    title,
    goal,
    audience,
    brand,
    language,
}: {
    title: string;
    goal?: string;
    audience?: string;
    brand?: BrandContextForAI;
    language?: string;
}): NewsletterGenerationContext {
    const resolvedLanguage = resolveLanguageInfo(language?.trim());

    return {
        title,
        goal,
        audience,
        brand,
        languageName: resolvedLanguage.name,
        languageTag: resolvedLanguage.tag,
        currentDate: new Date().toISOString().split('T')[0],
        labels: resolvedLanguage.labels,
    };
}

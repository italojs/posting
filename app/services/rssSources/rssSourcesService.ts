import { Meteor } from 'meteor/meteor';
import RssSourcesCollection from '../../api/rssSources/rssSources';
import {
  AddRssSourceInput,
  AddRssSourceResult,
  BulkUpsertRssSourcesInput,
  GetRssSourcesListInput,
  GetRssSourcesListResult,
  RssSource,
} from '../../api/rssSources/models';

function prepareUrl(input: string) {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return { normalized: '' };
  }
  try {
    const parsed = new URL(trimmed);
    const sanitized = new URL(trimmed);
    sanitized.hash = '';
    if (sanitized.pathname === '/') {
      sanitized.pathname = '';
    }
    return {
      normalized: sanitized.toString(),
      hostname: parsed.hostname,
      siteUrl: `${parsed.protocol}//${parsed.host}`,
    };
  } catch {
    return { normalized: trimmed };
  }
}

function fallbackNameFromUrl(url: string, hostname?: string) {
  if (hostname) {
    return hostname.replace(/^www\./i, '');
  }
  return url;
}

export class RssSourcesService {
  async list(params: GetRssSourcesListInput): Promise<GetRssSourcesListResult> {
    const { category, enabledOnly = true } = params;
    const query: any = {};
    if (category && category !== 'all') query.category = category;
    if (enabledOnly) query.enabled = { $ne: false };
    const sources = await RssSourcesCollection.find(query, { sort: { name: 1 } }).fetchAsync();
    return { sources };
  }

  async bulkUpsert(input: BulkUpsertRssSourcesInput) {
    const { sources } = input;
    for (const s of sources) {
      const now = new Date();
      const doc: RssSource = {
        name: s.name,
        url: s.url,
        category: s.category,
        categories: s.categories,
        description: s.description,
        siteUrl: s.siteUrl,
        imageUrl: s.imageUrl,
        language: s.language,
        generator: s.generator,
        copyright: s.copyright,
        enabled: s.enabled !== false,
        updatedAt: now,
      };
      const existing = await RssSourcesCollection.findOneAsync({ url: s.url });
      if (existing?._id) {
        await RssSourcesCollection.updateAsync(existing._id, { $set: doc });
      } else {
        await RssSourcesCollection.insertAsync({ ...doc, createdAt: now });
      }
    }
    return { ok: true };
  }

  async addManual(input: AddRssSourceInput): Promise<AddRssSourceResult> {
    const { normalized: normalizedUrl, hostname, siteUrl } = prepareUrl(input.url);
    if (!normalizedUrl) {
      throw new Meteor.Error('rssSource.invalidUrl', 'URL do feed é obrigatória.');
    }

    const existing = await RssSourcesCollection.findOneAsync({ url: normalizedUrl });
    if (existing) {
      throw new Meteor.Error('rssSource.exists', 'Esse feed RSS já está cadastrado.');
    }

    const now = new Date();
    const providedCategory =
      typeof input.category === 'string' && input.category.trim() ? (input.category.trim() as RssSource['category']) : undefined;
    const finalCategory = providedCategory || ('general' as RssSource['category']);
    const finalName = input.name?.trim() || fallbackNameFromUrl(normalizedUrl, hostname);
    const description = input.description?.trim();

    const doc: RssSource = {
      name: finalName,
      url: normalizedUrl,
      category: finalCategory,
      categories: [finalCategory],
      description: description || undefined,
      ...(siteUrl ? { siteUrl } : {}),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    const _id = await RssSourcesCollection.insertAsync(doc);
    const source = (await RssSourcesCollection.findOneAsync(_id)) as RssSource;
    return { source };
  }
}

export const rssSourcesService = new RssSourcesService();

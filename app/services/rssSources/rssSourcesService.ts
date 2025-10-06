import RssSourcesCollection from '../../api/rssSources/rssSources';
import { BulkUpsertRssSourcesInput, GetRssSourcesListInput, GetRssSourcesListResult, RssSource } from '../../api/rssSources/models';

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
}

export const rssSourcesService = new RssSourcesService();

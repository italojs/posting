import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import RssSourcesCollection from '../rssSources';
import { BulkUpsertRssSourcesInput, RssSource } from '../models';

Meteor.methods({
    'set.rssSources.bulkUpsert': async ({ sources }: BulkUpsertRssSourcesInput) => {
        check(sources, [Object]);

        for (const s of sources) {
            const now = new Date();
            const doc: RssSource = {
                name: s.name,
                url: s.url,
                category: s.category,
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
    },
});

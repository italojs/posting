import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import ContentsCollection from '../contents';
import { Content, CreateContentInput } from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';

Meteor.methods({
    'set.contents.create': async ({ name, rssUrls, rssItems, networks }: CreateContentInput) => {
        check(name, String);
        check(rssUrls, [String]);
        check(rssItems, [Object]);
        check(networks, Object);
        check((networks as any).newsletter, Match.Maybe(Boolean));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const cleanedName = name.trim();
        if (!cleanedName) return clientContentError('Nome do conteúdo é obrigatório');
        const cleanedUrls = rssUrls.map((u) => u.trim()).filter(Boolean);
        if (cleanedUrls.length === 0) return clientContentError('Informe pelo menos um RSS');

    const doc: Omit<Content, '_id'> = {
            userId: user._id,
            name: cleanedName,
            rssUrls: cleanedUrls,
            rssItems: rssItems ?? [],
            networks: { newsletter: !!networks.newsletter },
            createdAt: new Date(),
        };

        const _id = await ContentsCollection.insertAsync(doc as any);
        return { _id };
    },
});

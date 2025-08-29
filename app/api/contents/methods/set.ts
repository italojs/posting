import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import ContentsCollection from '../contents';
import { Content, CreateContentInput } from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';

Meteor.methods({
    'set.contents.create': async ({ name, audience, goal, rssUrls, rssItems, networks }: CreateContentInput) => {
        check(name, String);
        check(audience, Match.Maybe(String));
        check(goal, Match.Maybe(String));
        check(rssUrls, [String]);
        check(rssItems, [Object]);
        check(networks, Object);
    check((networks as any).newsletter, Match.Maybe(Boolean));
    check((networks as any).instagram, Match.Maybe(Boolean));
    check((networks as any).twitter, Match.Maybe(Boolean));
    check((networks as any).tiktok, Match.Maybe(Boolean));
    check((networks as any).linkedin, Match.Maybe(Boolean));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

    const cleanedName = name.trim();
    const cleanedAudience = (audience ?? '').trim();
    const cleanedGoal = (goal ?? '').trim();
        if (!cleanedName) return clientContentError('Nome do conteúdo é obrigatório');
        const cleanedUrls = rssUrls.map((u) => u.trim()).filter(Boolean);
        if (cleanedUrls.length === 0) return clientContentError('Informe pelo menos um RSS');

    const doc: Omit<Content, '_id'> = {
            userId: user._id,
            name: cleanedName,
            audience: cleanedAudience || undefined,
            goal: cleanedGoal || undefined,
            rssUrls: cleanedUrls,
            rssItems: rssItems ?? [],
            networks: {
                newsletter: !!networks.newsletter,
                instagram: !!(networks as any).instagram,
                twitter: !!(networks as any).twitter,
                tiktok: !!(networks as any).tiktok,
                linkedin: !!(networks as any).linkedin,
            },
            createdAt: new Date(),
        };

        const _id = await ContentsCollection.insertAsync(doc as any);
        return { _id };
    },
});

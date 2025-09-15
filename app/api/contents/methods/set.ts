import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { CreateContentInput } from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';
import { contentsService } from '/app/services/contents/contentsService';

Meteor.methods({
    'set.contents.create': async (input: CreateContentInput) => {
        const { name, audience, goal, rssUrls, rssItems, networks, newsletterSections } = input;
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
        check(newsletterSections, Match.Maybe([Object]));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        try {
            return await contentsService.create(user._id, input, newsletterSections);
        } catch (e: any) {
            if (e instanceof Meteor.Error) return clientContentError(e.reason || e.message);
            throw e;
        }
    },
    'set.contents.updateBasic': async ({ _id, name, audience, goal }: { _id: string; name: string; audience?: string; goal?: string }) => {
        check(_id, String);
        check(name, String);
        check(audience, Match.Maybe(String));
        check(goal, Match.Maybe(String));

        const user = await currentUserAsync();
        if (!user) return noAuthError();
        try {
            return await contentsService.updateBasic(user._id, _id, { name, audience, goal });
        } catch (e: any) {
            if (e instanceof Meteor.Error) return clientContentError(e.reason || e.message);
            throw e;
        }
    },
    'set.contents.delete': async ({ _id }: { _id: string }) => {
        check(_id, String);
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        try {
            return await contentsService.delete(user._id, _id);
        } catch (e: any) {
            if (e instanceof Meteor.Error) return clientContentError(e.reason || e.message);
            throw e;
        }
    },
    'set.contents.update': async (input: CreateContentInput & { _id: string }) => {
        const { _id, name, audience, goal, rssUrls, rssItems, networks, newsletterSections } = input;
        check(_id, String);
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
        check(newsletterSections, Match.Maybe([Object]));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        try {
            return await contentsService.update(user._id, input);
        } catch (e: any) {
            if (e instanceof Meteor.Error) return clientContentError(e.reason || e.message);
            throw e;
        }
    },
});

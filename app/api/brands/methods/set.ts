import { check, Match } from 'meteor/check';
import { brandsService } from '/app/services';
import { currentUserAsync } from '/server/utils/meteor';
import { noAuthError } from '/app/utils/serverErrors';

Meteor.methods({
    'set.brands.create': async ({ name, description, tone, audience, differentiators, keywords }: {
        name: string;
        description?: string;
        tone?: string;
        audience?: string;
        differentiators?: string;
        keywords?: string[];
    }) => {
        check(name, String);
        check(description, Match.Maybe(String));
        check(tone, Match.Maybe(String));
        check(audience, Match.Maybe(String));
        check(differentiators, Match.Maybe(String));
        check(keywords, Match.Maybe([String]));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        return brandsService.create(user._id, {
            name,
            description,
            tone,
            audience,
            differentiators,
            keywords,
        });
    },
    'set.brands.update': async ({ _id, name, description, tone, audience, differentiators, keywords }: {
        _id: string;
        name: string;
        description?: string;
        tone?: string;
        audience?: string;
        differentiators?: string;
        keywords?: string[];
    }) => {
        check(_id, String);
        check(name, String);
        check(description, Match.Maybe(String));
        check(tone, Match.Maybe(String));
        check(audience, Match.Maybe(String));
        check(differentiators, Match.Maybe(String));
        check(keywords, Match.Maybe([String]));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        return brandsService.update(user._id, {
            _id,
            name,
            description,
            tone,
            audience,
            differentiators,
            keywords,
        });
    },
    'set.brands.delete': async ({ _id }: { _id: string }) => {
        check(_id, String);
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        return brandsService.remove(user._id, { _id });
    },
});

import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { brandsService } from '/app/services';
import { currentUserAsync } from '/server/utils/meteor';
import { noAuthError } from '/app/utils/serverErrors';

Meteor.methods({
    'get.brands.mine': async () => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        return brandsService.listForUser(user._id);
    },
    'get.brands.byId': async ({ _id }: { _id: string }) => {
        check(_id, String);
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        return brandsService.getByIdForUser(_id, user._id);
    },
});

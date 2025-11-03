import { LoadingOutlined } from '@ant-design/icons';
import { ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';
import enUS from 'antd/es/locale/en_US';
import ptBR from 'antd/es/locale/pt_BR';
import esES from 'antd/es/locale/es_ES';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import { Route, Switch } from 'wouter';
import '/app/i18n';
import { useTranslation } from 'react-i18next';
import { GetAwsFileInput } from '/app/api/aws/models';
import { AvailableUserRoles, GetUserRolesInput, GetUserRolesResult } from '/app/api/users/models';
import UserProfile from '/app/api/userProfile/models';
import { AvailableCollectionNames, FindCollectionParams } from '/app/api/utils/models';
import { BaseProps } from '/app/types/interfaces';
import { adminRoutes, protectedRoutes, publicRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import RouteRenderer from '/app/ui/components/RouteRenderer';

export interface MiniAppUserProfile extends Pick<UserProfile, '_id' | 'username' | 'photo'> {}

const miniAppUserProfileFields = {
    _id: 1,
    username: 1,
    photo: 1,
};

/**
 * Defines the type for a userId on login
 *
 * null - not logged in
 * undefined - loading data
 * string - logged in (user id)
 */
export type AppUserId = string | undefined | null;

export interface BasicSiteProps extends BaseProps {
    userId?: string;
    userProfile?: MiniAppUserProfile;
    userRoles?: AvailableUserRoles[];
    profilePhoto?: string | undefined;
}

const App: React.FC = () => {
    const { i18n, t } = useTranslation('common');
    const userId: AppUserId = useTracker(() => Meteor.userId());
    /**
     * Basic public profile data that is required by most pages (reduces fetch requests)
     */
    const [userProfile, setUserProfile] = useState<MiniAppUserProfile | undefined>();
    const [userRoles, setUserRoles] = useState<AvailableUserRoles[]>([]);
    const [profilePhoto, setProfilePhoto] = useState<string | undefined>();

    const fetchUserRole = async () => {
        if (!userId) return;

        try {
            const findData: GetUserRolesInput = {
                userIds: [userId],
            };

            const res: GetUserRolesResult = await Meteor.callAsync('get.users.roles', findData);

            setUserRoles(res.result.find((r) => r.userId === userId)?.roles ?? []);

            return res;
        } catch (error) {
            errorResponse(error as Meteor.Error, t('errors.couldNotGetRoles'));
        }

        return undefined;
    };

    const fetchUserProfile = async () => {
        if (!userId) return;

        try {
            const findData: FindCollectionParams = {
                collection: AvailableCollectionNames.USER_PROFILE,
                selector: {
                    userId,
                },
                options: {
                    fields: miniAppUserProfileFields,
                },
                onlyOne: true,
            };

            const res: MiniAppUserProfile | undefined = await Meteor.callAsync(
                'utilMethods.findCollection',
                findData,
            );

            setUserProfile(res);

            return res;
        } catch (error) {
            errorResponse(error as Meteor.Error, t('errors.couldNotGetUsers'));
        }

        return undefined;
    };

    const fetchProfilePhoto = async (key: string) => {
        try {
            const data: GetAwsFileInput = {
                key: key,
            };

            const res: string | undefined = await Meteor.callAsync('get.aws.fileFromS3', data);

            setProfilePhoto(res);
        } catch (error) {
            errorResponse(error as Meteor.Error, t('errors.couldNotGetImages'));
        }
    };

    const fetchData = async () => {

        if (userId) {
            const profile = await fetchUserProfile();
            await fetchUserRole();
            // allow to lazy load
            if (profile?.photo?.key) fetchProfilePhoto(profile?.photo?.key);
        }

    // no-op
    };

    useEffect(() => {
        if (userId) {
            fetchData();
        } else {
            setUserProfile(undefined);
            // no-op
        }
    }, [userId]);

    const antdLocale = i18n.language.startsWith('pt') ? ptBR : i18n.language.startsWith('es') ? esES : enUS;

    const themeConfig: ThemeConfig = {
        algorithm: theme.defaultAlgorithm,
        token: {
            colorPrimary: '#3b82f6',
            colorInfo: '#2563eb',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            colorBgLayout: 'transparent',
            colorText: '#0f172a',
            colorTextSecondary: '#475569',
            colorBorder: 'rgba(148,163,184,0.4)',
            borderRadius: 12,
            borderRadiusLG: 18,
            borderRadiusSM: 10,
            fontFamily:
                "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
        },
        components: {
            Button: {
                controlHeightLG: 48,
                borderRadius: 999,
            },
            Layout: {
                bodyBg: 'transparent',
                siderBg: 'rgba(255,255,255,0.88)',
                headerBg: 'transparent',
            },
            Menu: {
                itemBorderRadius: 10,
                itemHoverBg: 'rgba(15,23,42,0.05)',
                itemSelectedBg: 'rgba(59,130,246,0.16)',
                itemSelectedColor: '#0f172a',
            },
            Card: {
                borderRadiusLG: 18,
            },
        },
    };

    // user is not logged in
    if (userId === null) {
        // you can add any config providers here to cover all public routes
        return (
            <ConfigProvider
                locale={antdLocale}
                theme={themeConfig}
            >
                <Switch>
                    {Object.values(publicRoutes).map((route) => (
                        <Route key={route.path} path={route.path}>
                            <RouteRenderer>{route.element}</RouteRenderer>
                        </Route>
                    ))}
                </Switch>
            </ConfigProvider>
        );
    }

    // still loading data from backend
    if (userId === undefined) return <LoadingOutlined />;

    // you can add any config providers here to cover all protected routes
    return (
        <ConfigProvider
            locale={antdLocale}
            theme={themeConfig}
        >
            <Switch>
                {userRoles.includes(AvailableUserRoles.ADMIN) &&
                    Object.values(adminRoutes).map((route) => (
                        <Route key={route.path} path={route.path}>
                            <RouteRenderer
                                profilePhoto={profilePhoto}
                                userId={userId}
                                userProfile={userProfile}
                                userRoles={userRoles}
                            >
                                {React.cloneElement(route.element, { userId, userProfile, userRoles, profilePhoto })}
                            </RouteRenderer>
                        </Route>
                    ))}

                {Object.values(protectedRoutes).map((route: any) => (
                    <Route key={route.path} path={route.path}>
                        <RouteRenderer
                            profilePhoto={profilePhoto}
                            userId={userId}
                            userProfile={userProfile}
                            userRoles={userRoles}
                        >
                            {React.cloneElement(route.element, { userId, userProfile, userRoles, profilePhoto })}
                        </RouteRenderer>
                    </Route>
                ))}

                {/* since public routes contains the home routes, they need to be placed last */}
                {Object.values(publicRoutes).map((route) => (
                    <Route key={route.path} path={route.path}>
                        <RouteRenderer
                            profilePhoto={profilePhoto}
                            userId={userId}
                            userProfile={userProfile}
                            userRoles={userRoles}
                        >
                            {React.cloneElement(route.element, { userId, userProfile, userRoles, profilePhoto })}
                        </RouteRenderer>
                    </Route>
                ))}
            </Switch>
        </ConfigProvider>
    );
};

export default App;

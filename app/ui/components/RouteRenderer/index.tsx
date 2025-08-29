import { AreaChartOutlined, HomeOutlined, LoginOutlined, LogoutOutlined, PlusOutlined, ProfileOutlined, ReadOutlined } from '@ant-design/icons';
import { limitText, removeUndefinedFromArray } from '@netsu/js-utils';
import { Avatar, Dropdown, Image, Layout, Menu, Select, theme } from 'antd';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import { MenuItemType } from 'antd/es/menu/interface';
import { Meteor } from 'meteor/meteor';
import React from 'react';
import { useLocation } from 'wouter';
import { BasicSiteProps } from '../../App';
import { AvailableUserRoles } from '/app/api/roles/models';
import { SITE_NAME } from '/app/utils/constants';
import { adminRoutes, publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { useTranslation } from 'react-i18next';

interface RouteRendererProps extends BasicSiteProps {}

interface RouteRenderMenuItem extends MenuItemType {
    label: string | React.JSX.Element;
}

const RouteRenderer: React.FC<RouteRendererProps> = ({ children, userId, userProfile, userRoles, profilePhoto }) => {
    const { token } = theme.useToken();
    const { i18n, t } = useTranslation('common');
    const [, navigate] = useLocation();

    const items: (RouteRenderMenuItem | undefined)[] = [
        {
            key: 'logo',
            label: <Image src="/logo.png" width={50} preview={false} />,
            onClick: () => navigate(publicRoutes.home.path),
        },
        {
            key: 'home',
            icon: <HomeOutlined />,
            label: t('app.home'),
            onClick: () => navigate(publicRoutes.home.path),
        },
        {
            key: 'feed',
            icon: <ReadOutlined />,
            label: t('app.feed'),
            onClick: () => navigate(publicRoutes.feed.path),
        },
    ];

    if (userRoles?.includes(AvailableUserRoles.ADMIN)) {
        items.push({
            key: 'logs',
            icon: <AreaChartOutlined />,
            label: t('app.logs'),
            onClick: () => navigate(adminRoutes.logs.path),
        });
    }

    if (userId && userProfile) {
        items.push({
            key: 'create-content',
            icon: <PlusOutlined />,
            label: t('app.createContent'),
            onClick: () => navigate(protectedRoutes.createContent.path),
        });
        items.push({
            key: 'login',
            style: { marginLeft: 'auto' },
            label: (
                <Dropdown
                    menu={{
                        items: [
                            {
                                label: t('app.yourProfile'),
                                key: 'your-profile',
                                icon: <ProfileOutlined />,
                                onClick: () =>
                                    navigate(publicRoutes.userProfile.path.replace(':username', userProfile.username)),
                            },
                            {
                                label: t('app.logout'),
                                key: 'logout',
                                icon: <LogoutOutlined />,
                                onClick: () =>
                                    Meteor.logout(() => {
                                        navigate(publicRoutes.home.path);
                                    }),
                            },
                        ],
                    }}
                    trigger={['click']}
                >
                    {profilePhoto ? (
                        <Avatar
                            src={profilePhoto}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: 40, maxHeight: 40 }}
                            alt="avatar"
                            size={'large'}
                        />
                    ) : (
                        <Avatar style={{ backgroundColor: '#ff98ad', verticalAlign: 'middle' }} size="large" gap={4}>
                            {limitText(userProfile.username, 7)}
                        </Avatar>
                    )}
                </Dropdown>
            ),
        });
    } else {
        items.push({
            key: 'login',
            icon: <LoginOutlined />,
            label: t('app.login'),
            onClick: () => navigate(publicRoutes.login.path),
            style: { marginLeft: 'auto' },
        });
    }

    return (
        <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
            <Header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    borderBottom: `1px solid ${token.colorSplit}`,
                    paddingInline: 24,
                }}
            >
                <Menu
                    mode="horizontal"
                    selectable={false}
                    items={removeUndefinedFromArray(items)}
                    style={{ flex: 1, minWidth: 0, background: 'transparent' }}
                />
                <div style={{ marginLeft: 12 }}>
                    <Select
                        size="small"
                        value={i18n.language.startsWith('pt') ? 'pt' : i18n.language.startsWith('es') ? 'es' : 'en'}
                        onChange={(lng) => i18n.changeLanguage(lng)}
                        options={[
                            { label: 'PT', value: 'pt' },
                            { label: 'EN', value: 'en' },
                            { label: 'ES', value: 'es' },
                        ]}
                        style={{ width: 80 }}
                    />
                </div>
            </Header>

            <Content style={{ padding: '32px 24px' }}>
                <div
                    style={{
                        maxWidth: 1040,
                        margin: '0 auto',
                        width: '100%',
                    }}
                >
                    {children}
                </div>
            </Content>

            <Footer style={{ textAlign: 'center', background: 'transparent' }}>
                {SITE_NAME} © {new Date().getFullYear()}
            </Footer>
        </Layout>
    );
};

export default RouteRenderer;

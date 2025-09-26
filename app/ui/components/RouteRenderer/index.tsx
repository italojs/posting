import {
    AreaChartOutlined,
    HomeOutlined,
    LoginOutlined,
    LogoutOutlined,
    PlusOutlined,
    ProfileOutlined,
    ReadOutlined,
    TrademarkCircleOutlined,
} from '@ant-design/icons';
import { limitText, removeUndefinedFromArray } from '@netsu/js-utils';
import { Avatar, Button, Dropdown, Image, Layout, Menu, Select, theme } from 'antd';
import { Content, Footer } from 'antd/es/layout/layout';
import { MenuItemType } from 'antd/es/menu/interface';
import { Meteor } from 'meteor/meteor';
import React from 'react';
import { useLocation } from 'wouter';
import { BasicSiteProps } from '../../App';
import { AvailableUserRoles } from '/app/api/users/models';
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

    const navigationItems: (RouteRenderMenuItem | undefined)[] = [
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
        navigationItems.push({
            key: 'logs',
            icon: <AreaChartOutlined />,
            label: t('app.logs'),
            onClick: () => navigate(adminRoutes.logs.path),
        });
    }

    if (userId && userProfile) {
        navigationItems.push({
            key: 'brands',
            icon: <TrademarkCircleOutlined />,
            label: t('app.brands'),
            onClick: () => navigate(protectedRoutes.brands.path),
        });
        navigationItems.push({
            key: 'create-content',
            icon: <PlusOutlined />,
            label: t('app.createContent'),
            onClick: () => navigate(protectedRoutes.createContent.path),
        });
    }

    const menuItems = removeUndefinedFromArray(navigationItems);

    const logo = (
        <div
            onClick={() => navigate(publicRoutes.home.path)}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
        >
            <Image src="/logo.png" width={120} preview={false} alt="logo" />
        </div>
    );

    const userControls = userId && userProfile ? (
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
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                }}
            >
                {profilePhoto ? (
                    <Avatar
                        src={profilePhoto}
                        style={{ width: 40, height: 40, objectFit: 'cover' }}
                        alt="avatar"
                        size={'large'}
                    />
                ) : (
                    <Avatar style={{ backgroundColor: '#ff98ad', verticalAlign: 'middle' }} size="large" gap={4}>
                        {limitText(userProfile.username, 7)}
                    </Avatar>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span style={{ fontWeight: 600 }}>{limitText(userProfile.username, 12)}</span>
                    <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>{t('app.yourProfile')}</span>
                </div>
            </div>
        </Dropdown>
    ) : (
        <Button
            icon={<LoginOutlined />}
            type="default"
            block
            onClick={() => navigate(publicRoutes.login.path)}
        >
            {t('app.login')}
        </Button>
    );

    return (
        <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
            <Layout.Sider
                width={260}
                theme="light"
                style={{
                    background: '#ffffff',
                    borderInlineEnd: `1px solid ${token.colorSplit}`,
                    padding: '24px 16px',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 24 }}>
                    {logo}
                    <Menu
                        mode="inline"
                        selectable={false}
                        items={menuItems}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            borderInlineEnd: 'none',
                            paddingInline: 4,
                        }}
                    />
                    <div style={{ display: 'grid', gap: 12 }}>
                        {userControls}
                        <Select
                            size="small"
                            value={i18n.language.startsWith('pt') ? 'pt' : i18n.language.startsWith('es') ? 'es' : 'en'}
                            onChange={(lng) => i18n.changeLanguage(lng)}
                            options={[
                                { label: 'PT', value: 'pt' },
                                { label: 'EN', value: 'en' },
                                { label: 'ES', value: 'es' },
                            ]}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </Layout.Sider>

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

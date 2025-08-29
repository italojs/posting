import { AreaChartOutlined, HomeOutlined, LoginOutlined, LogoutOutlined, ProfileOutlined } from '@ant-design/icons';
import { limitText, removeUndefinedFromArray } from '@netsu/js-utils';
import { Avatar, Dropdown, Image, Layout, Menu, theme } from 'antd';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import { MenuItemType } from 'antd/es/menu/interface';
import { Meteor } from 'meteor/meteor';
import React from 'react';
import { useLocation } from 'wouter';
import { BasicSiteProps } from '../../App';
import { AvailableUserRoles } from '/app/api/roles/models';
import { SITE_NAME } from '/app/utils/constants';
import { adminRoutes, publicRoutes } from '/app/utils/constants/routes';

interface RouteRendererProps extends BasicSiteProps {}

interface RouteRenderMenuItem extends MenuItemType {
    label: string | React.JSX.Element;
}

const RouteRenderer: React.FC<RouteRendererProps> = ({ children, userId, userProfile, userRoles, profilePhoto }) => {
    const { token } = theme.useToken();
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
            label: 'Home',
            onClick: () => navigate(publicRoutes.home.path),
        },
    ];

    if (userRoles?.includes(AvailableUserRoles.ADMIN)) {
        items.push({
            key: 'logs',
            icon: <AreaChartOutlined />,
            label: 'Logs',
            onClick: () => navigate(adminRoutes.logs.path),
        });
    }

    if (userId && userProfile) {
        items.push({
            key: 'login',
            style: { marginLeft: 'auto' },
            label: (
                <Dropdown
                    menu={{
                        items: [
                            {
                                label: 'Your Profile',
                                key: 'your-profile',
                                icon: <ProfileOutlined />,
                                onClick: () =>
                                    navigate(publicRoutes.userProfile.path.replace(':username', userProfile.username)),
                            },
                            {
                                label: 'Logout',
                                key: 'logout',
                                icon: <LogoutOutlined />,
                                onClick: () => Meteor.logout(),
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
            label: 'Login',
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

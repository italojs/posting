import { checkStrEmpty, emailRegex } from '@netsu/js-utils';
import { Button, Card, Input, message, Space, Typography } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { CreateUserInput } from '/app/api/users/models';
import { publicRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';

const SignupPage: React.FC = () => {
    const { t } = useTranslation('common');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [, navigate] = useLocation();

    const handleSubmit = async () => {
        const cleanedEmail = email.trim();
        const cleanedUsername = username.trim();
        const cleanedFirstName = firstName.trim();
        const cleanedLastName = lastName.trim();

        if (!emailRegex.test(cleanedEmail)) return message.error(t('auth.emailInvalid'));
        if (password.length < 8) return message.error(t('auth.passwordTooShort'));
        if (cleanedUsername.length < 3) return message.error(t('auth.usernameTooShort'));
        if (checkStrEmpty(cleanedFirstName)) return message.error(t('auth.firstNameRequired'));

        setLoggingIn(true);

        try {
            const data: CreateUserInput = {
                email: cleanedEmail,
                firstName: cleanedFirstName,
                lastName: cleanedLastName,
                password,
                username: cleanedUsername,
            };

            await Meteor.callAsync('set.user.create', data);
        } catch (error) {
            setLoggingIn(false);
            return errorResponse(error as Meteor.Error, t('auth.createAccountError'));
        }

        Meteor.loginWithPassword(cleanedEmail, password, (error: Meteor.Error) => {
            setLoggingIn(false);
            if (error) return errorResponse(error, t('auth.loginError'));
            navigate(publicRoutes.home.path);
        });
    };

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <Card style={{ width: 420 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Typography.Title level={3} style={{ marginBottom: 8 }}>
                            {t('auth.createAccountTitle')}
                        </Typography.Title>
                        <Typography.Text type="secondary">{t('auth.createAccountSubtitle')}</Typography.Text>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} />
                        <Input
                            addonBefore="@"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t('auth.usernamePlaceholder')}
                        />
                        <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder={t('auth.firstNamePlaceholder')}
                        />
                        <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder={t('auth.lastNamePlaceholder')}
                        />
                        <Input.Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('auth.passwordPlaceholder')}
                        />
                    </Space>

                    <Button type="primary" onClick={handleSubmit} loading={loggingIn} block>
                        {t('auth.signUp')}
                    </Button>

                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                        {t('auth.alreadyHaveAccount')}{' '}
                        <Button type="link" onClick={() => navigate(publicRoutes.login.path)}>
                            {t('auth.logIn')}
                        </Button>
                    </Typography.Paragraph>
                </Space>
            </Card>
        </div>
    );
};

export default SignupPage;

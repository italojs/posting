import { emailRegex } from '@netsu/js-utils';
import { Button, Card, Input, message, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Meteor } from 'meteor/meteor';
import React, { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { publicRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';
import i18n from '/app/i18n';

const ForgotPasswordPage: React.FC = () => {
    const { t } = useTranslation('common');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [, navigate] = useLocation();

    const handleSubmit = useCallback(() => {
        const cleanedEmail = email.trim();

        if (!emailRegex.test(cleanedEmail)) {
            message.error(t('auth.emailInvalid'));
            return;
        }

        setLoading(true);

        const currentLanguage = i18n.language as 'pt' | 'en' | 'es';
        
        Meteor.callAsync('users.forgotPassword', { 
            email: cleanedEmail, 
            language: currentLanguage 
        })
            .then(() => {
                setEmailSent(true);
                message.success(t('auth.resetLinkSent'));
                setLoading(false);
            })
            .catch((error: Meteor.Error) => {
                setLoading(false);
                errorResponse(error, t('auth.forgotPasswordError'));
            });
    }, [email, t]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && email.trim() && !loading) {
            handleSubmit();
        }
    }, [handleSubmit, email, loading]);

    if (emailSent) {
        return (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
                <Card style={{ width: 400, textAlign: 'center' }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Typography.Title level={3} style={{ marginBottom: 8, color: '#52c41a' }}>
                            ✓ {t('auth.resetLinkSent')}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            Verifique sua caixa de entrada e spam. O link expira em 3 dias.
                        </Typography.Text>
                        <Button 
                            onClick={() => navigate(publicRoutes.login.path)}
                            icon={<ArrowLeftOutlined />}
                            block
                        >
                            {t('auth.backToLogin')}
                        </Button>
                    </Space>
                </Card>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <Card style={{ width: 400 }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Typography.Title level={3} style={{ marginBottom: 8 }}>
                        {t('auth.forgotPasswordTitle')}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                        {t('auth.forgotPasswordSubtitle')}
                    </Typography.Text>
                    
                    <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        autoComplete="email"
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                    />
                    
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Button
                            type="primary"
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={!email.trim()}
                            block
                        >
                            {t('auth.sendResetLink')}
                        </Button>
                        
                        <Button 
                            type="link" 
                            onClick={() => navigate(publicRoutes.login.path)}
                            icon={<ArrowLeftOutlined />}
                            block
                        >
                            {t('auth.backToLogin')}
                        </Button>
                    </Space>
                </Space>
            </Card>
        </div>
    );
};

export default ForgotPasswordPage;
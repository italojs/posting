import { Button, Card, Input, message, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';
import React, { useState, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { publicRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';
import { useTranslation } from 'react-i18next';

const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation('common');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [, navigate] = useLocation();
    const [, params] = useRoute('/reset-password/:token');

    const token = params?.token;

    const handleSubmit = useCallback(() => {
        if (password.length < 8) return message.error(t('auth.passwordTooShort'));
        if (password !== confirmPassword) return message.error(t('auth.passwordsDoNotMatch'));

        setLoading(true);

        Accounts.resetPassword(token!, password, (error: Meteor.Error) => {
            setLoading(false);
            
            if (error) {
                const isTokenError = error.reason?.includes('expired') || 
                                   error.reason?.includes('invalid') || 
                                   error.reason?.includes('Token not found');
                
                if (isTokenError) {
                    message.error(t('auth.invalidResetToken'));
                    setTimeout(() => navigate(publicRoutes.forgotPassword.path), 2000);
                    return;
                }
                
                return errorResponse(error, t('auth.resetPasswordError'));
            }

            message.success(t('auth.passwordResetSuccess'));
            setTimeout(() => navigate(publicRoutes.home.path), 1500);
        });
    }, [password, confirmPassword, token, t, navigate]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && password.trim() && confirmPassword.trim()) {
            handleSubmit();
        }
    }, [handleSubmit, password, confirmPassword]);

    if (!token) {
        navigate(publicRoutes.login.path);
        return null;
    }

    const isFormValid = password.trim() && confirmPassword.trim();

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <Card style={{ width: 400 }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Typography.Title level={3} style={{ marginBottom: 8 }}>
                            {t('auth.resetPasswordTitle')}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            {t('auth.resetPasswordSubtitle')}
                        </Typography.Text>
                    </div>

                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Input.Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('auth.newPassword')}
                            autoComplete="new-password"
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                        />
                        
                        <Input.Password
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('auth.confirmPassword')}
                            autoComplete="new-password"
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                        />
                        
                        <Button
                            type="primary"
                            onClick={handleSubmit}
                            loading={loading}
                            block
                            disabled={!isFormValid}
                        >
                            {t('auth.resetPassword')}
                        </Button>
                    </Space>

                    <Button 
                        type="link" 
                        onClick={() => navigate(publicRoutes.login.path)}
                        icon={<ArrowLeftOutlined />}
                        disabled={loading}
                        style={{ alignSelf: 'center' }}
                    >
                        {t('auth.backToLogin')}
                    </Button>
                </Space>
            </Card>
        </div>
    );
};

export default ResetPasswordPage;
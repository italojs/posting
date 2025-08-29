import { emailRegex } from '@netsu/js-utils';
import { Button, Card, Input, message, Space, Typography } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { publicRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // display loader while logging in
    const [loggingIn, setLoggingIn] = useState(false);
    const [, navigate] = useLocation();

    const handleSubmit = async () => {
        const cleanedEmail = email.trim();

        if (!emailRegex.test(cleanedEmail)) {
            return message.error('Email is invalid');
        }

        if (password.length < 8) {
            return message.error('Password is too short');
        }

        setLoggingIn(true);

        Meteor.loginWithPassword(cleanedEmail, password, (error: Meteor.Error) => {
            setLoggingIn(false);

            if (error) {
                return errorResponse(error, 'Could not log in');
            }

            navigate(publicRoutes.home.path);
        });
    };

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <Card style={{ width: 360 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Typography.Title level={3} style={{ marginBottom: 8 }}>
                            Welcome back
                        </Typography.Title>
                        <Typography.Text type="secondary">Sign in to your account</Typography.Text>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            autoComplete="email"
                        />
                        <Input.Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            autoComplete="current-password"
                        />
                    </Space>

                    <Button type="primary" onClick={handleSubmit} loading={loggingIn} block>
                        Log in
                    </Button>

                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                        Don't have an account?{' '}
                        <Button type="link" onClick={() => navigate(publicRoutes.signup.path)}>
                            Create one
                        </Button>
                    </Typography.Paragraph>
                </Space>
            </Card>
        </div>
    );
};

export default LoginPage;

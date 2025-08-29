import { checkStrEmpty, emailRegex } from '@netsu/js-utils';
import { Button, Card, Input, message, Space, Typography } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { CreateUserInput } from '/app/api/users/models';
import { publicRoutes } from '/app/utils/constants/routes';
import { errorResponse } from '/app/utils/errors';

const SignupPage: React.FC = () => {
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

        if (!emailRegex.test(cleanedEmail)) return message.error('Email is invalid');
        if (password.length < 8) return message.error('Password is too short');
        if (cleanedUsername.length < 3) return message.error('Username is too short');
        if (checkStrEmpty(cleanedFirstName)) return message.error('First name is required');

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
            return errorResponse(error as Meteor.Error, 'Could not create account');
        }

        Meteor.loginWithPassword(cleanedEmail, password, (error: Meteor.Error) => {
            setLoggingIn(false);
            if (error) return errorResponse(error, 'Could not log in');
            navigate(publicRoutes.home.path);
        });
    };

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <Card style={{ width: 420 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Typography.Title level={3} style={{ marginBottom: 8 }}>
                            Create your account
                        </Typography.Title>
                        <Typography.Text type="secondary">Join the community in a few steps</Typography.Text>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                        <Input
                            addonBefore="@"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                        />
                        <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                        />
                        <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name (optional)"
                        />
                        <Input.Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                        />
                    </Space>

                    <Button type="primary" onClick={handleSubmit} loading={loggingIn} block>
                        Sign up
                    </Button>

                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                        Already have an account?{' '}
                        <Button type="link" onClick={() => navigate(publicRoutes.login.path)}>
                            Log in
                        </Button>
                    </Typography.Paragraph>
                </Space>
            </Card>
        </div>
    );
};

export default SignupPage;

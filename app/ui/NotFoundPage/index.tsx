import { Button, Result } from 'antd';
import { useLocation } from 'wouter';
import React from 'react';

interface NotFoundPageProps {
    message?: string;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ message }) => {
    const [, navigate] = useLocation();
    return (
        <Result
            status="404"
            title="Page not found"
            subTitle={message ?? 'The page you were looking for was not found.'}
            extra={<Button onClick={() => navigate('/')}>Go Home</Button>}
        />
    );
};

export default NotFoundPage;

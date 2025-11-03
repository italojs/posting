import { LoadingOutlined, ThunderboltOutlined, ReadOutlined, LinkOutlined, ClockCircleOutlined, CheckCircleOutlined, SafetyCertificateOutlined, ArrowRightOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Col, Empty, Image, List, Row, Space, Tag, Typography, Popconfirm, message, Segmented } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { BasicSiteProps } from '../App';
import { Content } from '/app/api/contents/models';
import UserProfile from '/app/api/userProfile/models';
import { AvailableCollectionNames, FindCollectionParams } from '/app/api/utils/models';
import { errorResponse } from '/app/utils/errors';
import { useLocation } from 'wouter';
import { publicRoutes, protectedRoutes } from '/app/utils/constants/routes';
import { useTranslation } from 'react-i18next';

export interface MiniMainPageUserProfile
  extends Pick<UserProfile, '_id' | 'username' | 'userId' | 'photo'> {}

const miniMainPageUserProfileFields = {
  _id: 1,
  username: 1,
  userId: 1,
  photo: 1,
};

type MainPageProps = BasicSiteProps;

export type FetchDataType = (silent?: boolean) => Promise<void>;

// Landing page para visitantes (não logados)
type LandingPageProps = { onPrimaryCta: () => void; onSecondaryCta: () => void };
function LandingPageContent({ onPrimaryCta, onSecondaryCta }: LandingPageProps) {
  const { t } = useTranslation('common');
  
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Hero */}
      <Card
        bordered={false}
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(79,70,229,0.02) 100%)',
        }}
        bodyStyle={{ padding: 32 }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={14}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Typography.Title style={{ margin: 0 }}>
                {t('landing.heroTitle')}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 16 }}>
                {t('landing.heroSubtitle')}
              </Typography.Paragraph>
              <Space size="middle" wrap>
                <Button type="primary" size="large" onClick={onPrimaryCta} icon={<ArrowRightOutlined />}>
                  {t('landing.primaryCta')}
                </Button>
                <Button size="large" onClick={onSecondaryCta}>{t('landing.secondaryCta')}</Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <Card hoverable style={{ borderRadius: 12 }} bodyStyle={{ padding: 0, overflow: 'hidden' }}>
              {/* Mockup simples usando o logo como placeholder */}
              <Image src="/logo.png" alt={t('landing.platformPreview')} preview={false} style={{ width: '100%', display: 'block' }} />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Como funciona */}
      <div id="como-funciona" />
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              {t('landing.howItWorksTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('landing.howItWorksSubtitle')}</Typography.Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <ReadOutlined style={{ fontSize: 28, color: '#4f46e5' }} />
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {t('landing.step1Title')}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {t('landing.step1Description')}
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <LinkOutlined style={{ fontSize: 28, color: '#4f46e5' }} />
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {t('landing.step2Title')}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {t('landing.step2Description')}
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <ThunderboltOutlined style={{ fontSize: 28, color: '#4f46e5' }} />
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {t('landing.step3Title')}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {t('landing.step3Description')}
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Benefícios */}
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              {t('landing.benefitsTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('landing.benefitsSubtitle')}</Typography.Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <ClockCircleOutlined style={{ fontSize: 26, color: '#4f46e5' }} />
                  <Typography.Text strong>{t('landing.benefit1Title')}</Typography.Text>
                  <Typography.Text type="secondary">{t('landing.benefit1Description')}</Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <CheckCircleOutlined style={{ fontSize: 26, color: '#4f46e5' }} />
                  <Typography.Text strong>{t('landing.benefit2Title')}</Typography.Text>
                  <Typography.Text type="secondary">{t('landing.benefit2Description')}</Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <SafetyCertificateOutlined style={{ fontSize: 26, color: '#4f46e5' }} />
                  <Typography.Text strong>{t('landing.benefit3Title')}</Typography.Text>
                  <Typography.Text type="secondary">{t('landing.benefit3Description')}</Typography.Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Social Proof (placeholder) */}
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              {t('landing.socialProofTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('landing.socialProofSubtitle')}</Typography.Text>
          </div>
          <Space size="small" wrap>
            <Tag color="geekblue">TechCrunch</Tag>
            <Tag color="purple">Hacker News</Tag>
            <Tag color="magenta">Dev.to</Tag>
            <Tag color="gold">Product Hunt</Tag>
          </Space>
        </Space>
      </Card>

      {/* CTA final */}
      <Card bordered style={{ background: 'rgba(79,70,229,0.06)', borderColor: 'rgba(79,70,229,0.15)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {t('landing.finalCtaTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('landing.finalCtaSubtitle')}</Typography.Text>
          </Col>
          <Col xs={24} md="auto">
            <Button type="primary" size="large" onClick={onPrimaryCta} icon={<ArrowRightOutlined />}>
              {t('landing.finalCtaButton')}
            </Button>
          </Col>
        </Row>
      </Card>
    </Space>
  );
}

const MainPage: React.FC<MainPageProps> = ({ userId }) => {
  const { t } = useTranslation('common');
  // Para visitantes, não mostrar loading nem buscar dados
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [userProfiles, setUserProfiles] = useState<MiniMainPageUserProfile[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [historyViewMode, setHistoryViewMode] = useState<'cards' | 'list'>('cards');
  
  const [, navigate] = useLocation();

  const fetchData: FetchDataType = async (silent) => {
    setLoading(!silent);
    try {
      const findData: FindCollectionParams = {
        collection: AvailableCollectionNames.USER_PROFILE,
        selector: {},
        options: {
          fields: miniMainPageUserProfileFields,
          limit: 100,
        },
      };

      const res: MiniMainPageUserProfile[] = await Meteor.callAsync(
        'utilMethods.findCollection',
        findData,
      );
      setUserProfiles(res);

      if (userId) {
        const contentFind: FindCollectionParams = {
          collection: AvailableCollectionNames.CONTENTS,
          selector: { userId },
          options: { sort: { createdAt: -1 }, limit: 12 },
        };
        const c: Content[] = await Meteor.callAsync('utilMethods.findCollection', contentFind);
        setContents(c);
      } else {
        setContents([]);
      }
    } catch (error) {
      errorResponse(error as Meteor.Error, t('errors.couldNotGetUsers'));
    }
    setLoading(false);
  };

  const buildContentActions = (contentItem: Content): React.ReactNode[] => [
    <Button
      key="edit"
      size="small"
      onClick={() =>
        navigate(`${protectedRoutes.editContent.path.replace(':id', contentItem._id)}`)
      }
    >
      {t('content.edit')}
    </Button>,
    <Popconfirm
      key="delete"
      title={t('content.deleteConfirm')}
      okText={t('content.delete')}
      okButtonProps={{ danger: true }}
      cancelText={t('content.cancel')}
      onConfirm={async () => {
        try {
          await Meteor.callAsync('set.contents.delete', { _id: contentItem._id });
          message.success(t('content.deleteSuccess'));
          fetchData(true);
        } catch (e) {
          errorResponse(e as Meteor.Error, t('content.deleteError'));
        }
      }}
    >
      <Button size="small" danger>
        {t('content.delete')}
      </Button>
    </Popconfirm>,
  ];

  useEffect(() => {
    if (userId) fetchData();
    else setLoading(false);
  }, [userId]);

  // Visitante: renderiza landing page
  if (!userId) {
    return (
      <LandingPageContent
        onPrimaryCta={() => navigate(publicRoutes.signup.path)}
        onSecondaryCta={() => {
          const el = document.getElementById('como-funciona');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    );
  }

  if (loading) return <LoadingOutlined />;

  return (
    <>
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {userId && (
        <Card>
          <Button type="primary" onClick={() => navigate(protectedRoutes.createContent.path)}>
            {t('home.createCta')}
          </Button>
        </Card>
      )}

      {userId && (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <Typography.Title level={4} style={{ marginBottom: 0 }}>
                  {t('home.historyTitle')}
                </Typography.Title>
                <Typography.Text type="secondary">{t('home.recentSaved')}</Typography.Text>
              </div>
              {contents.length > 0 && (
                <Segmented
                  value={historyViewMode}
                  onChange={(value) => setHistoryViewMode(value as 'cards' | 'list')}
                  options={[
                    {
                      label: (
                        <Space size={4}>
                          <AppstoreOutlined />
                          {t('home.historyViewCards')}
                        </Space>
                      ),
                      value: 'cards',
                    },
                    {
                      label: (
                        <Space size={4}>
                          <UnorderedListOutlined />
                          {t('home.historyViewList')}
                        </Space>
                      ),
                      value: 'list',
                    },
                  ]}
                  size="small"
                />
              )}
            </div>
            {contents.length === 0 ? (
              <Empty description={t('createContent.listEmpty')} />
            ) : historyViewMode === 'cards' ? (
              <Row gutter={[16, 16]}>
                {contents.map((c) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={c._id}>
                    <Card hoverable actions={buildContentActions(c)}>
                      <Typography.Text strong>{c.name}</Typography.Text>
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">
                          {new Date(c.createdAt).toLocaleString()}
                        </Typography.Text>
                      </div>
                      {c.audience && (
                        <div style={{ marginTop: 8 }}>
                          <Typography.Text type="secondary">
                            {t('content.audience')}: {c.audience}
                          </Typography.Text>
                        </div>
                      )}
                      {c.goal && (
                        <div style={{ marginTop: 4 }}>
                          <Typography.Text type="secondary">
                            {t('content.goal')}: {c.goal}
                          </Typography.Text>
                        </div>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">
                          RSS: {c.rssUrls.length} • {t('content.items')}: {c.rssItems?.length ?? 0}
                        </Typography.Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <List
                itemLayout="vertical"
                dataSource={contents}
                renderItem={(contentItem) => (
                  <List.Item key={contentItem._id} actions={buildContentActions(contentItem)}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Typography.Text strong>{contentItem.name}</Typography.Text>
                      <Typography.Text type="secondary">
                        {new Date(contentItem.createdAt).toLocaleString()}
                      </Typography.Text>
                      {contentItem.audience && (
                        <Typography.Text type="secondary">
                          {t('content.audience')}: {contentItem.audience}
                        </Typography.Text>
                      )}
                      {contentItem.goal && (
                        <Typography.Text type="secondary">
                          {t('content.goal')}: {contentItem.goal}
                        </Typography.Text>
                      )}
                      <Typography.Text type="secondary">
                        RSS: {contentItem.rssUrls.length} • {t('content.items')}:
                        {' '}
                        {contentItem.rssItems?.length ?? 0}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Space>
        </Card>
      )}
  </Space>
    
  </>
  );
};

export default MainPage;

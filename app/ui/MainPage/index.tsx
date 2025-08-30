import { LoadingOutlined, ThunderboltOutlined, ReadOutlined, LinkOutlined, ClockCircleOutlined, CheckCircleOutlined, SafetyCertificateOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Button, Card, Col, Empty, Image, List, Row, Space, Tag, Typography, Popconfirm, message } from 'antd';
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
                Crie newsletters profissionais em minutos, não horas
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 16 }}>
                Transforme qualquer tema em conteúdo estruturado usando suas fontes favoritas.
                Automatize a pesquisa, a curadoria e a geração para manter consistência e qualidade.
              </Typography.Paragraph>
              <Space size="middle" wrap>
                <Button type="primary" size="large" onClick={onPrimaryCta} icon={<ArrowRightOutlined />}>
                  Criar Minha Primeira Newsletter
                </Button>
                <Button size="large" onClick={onSecondaryCta}>Ver como funciona</Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <Card hoverable style={{ borderRadius: 12 }} bodyStyle={{ padding: 0, overflow: 'hidden' }}>
              {/* Mockup simples usando o logo como placeholder */}
              <Image src="/logo.png" alt="Prévia da plataforma" preview={false} style={{ width: '100%', display: 'block' }} />
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
              Como funciona (3 passos)
            </Typography.Title>
            <Typography.Text type="secondary">Simples, rápido e eficaz para o seu fluxo de conteúdo</Typography.Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <ReadOutlined style={{ fontSize: 28, color: '#4f46e5' }} />
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    1. Escolha seu tema
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Defina o assunto e o tom da sua newsletter para guiar a geração.
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <LinkOutlined style={{ fontSize: 28, color: '#4f46e5' }} />
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    2. Selecione suas fontes RSS
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Conecte feeds confiáveis e deixe a plataforma buscar os melhores conteúdos.
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <ThunderboltOutlined style={{ fontSize: 28, color: '#4f46e5' }} />
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    3. Gere conteúdo automaticamente
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Receba um rascunho estruturado pronto para ajustes e envio.
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
              Benefícios
            </Typography.Title>
            <Typography.Text type="secondary">Feito para criadores, marketeiros e pequenas empresas</Typography.Text>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <ClockCircleOutlined style={{ fontSize: 26, color: '#4f46e5' }} />
                  <Typography.Text strong>Economize horas de pesquisa e escrita</Typography.Text>
                  <Typography.Text type="secondary">Reduza o trabalho manual repetitivo e foque no que importa.</Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <CheckCircleOutlined style={{ fontSize: 26, color: '#4f46e5' }} />
                  <Typography.Text strong>Mantenha consistência no seu conteúdo</Typography.Text>
                  <Typography.Text type="secondary">Linguagem alinhada ao seu estilo e cadência previsível.</Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable>
                <Space direction="vertical">
                  <SafetyCertificateOutlined style={{ fontSize: 26, color: '#4f46e5' }} />
                  <Typography.Text strong>Use suas fontes de confiança</Typography.Text>
                  <Typography.Text type="secondary">Conecte os feeds e sites que você já acompanha.</Typography.Text>
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
              O que estão dizendo
            </Typography.Title>
            <Typography.Text type="secondary">Em breve: depoimentos de usuários e estudos de caso</Typography.Text>
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
              Comece Gratuitamente
            </Typography.Title>
            <Typography.Text type="secondary">Experimente agora e crie sua primeira newsletter em minutos.</Typography.Text>
          </Col>
          <Col xs={24} md="auto">
            <Button type="primary" size="large" onClick={onPrimaryCta} icon={<ArrowRightOutlined />}>
              Experimente Agora
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
      errorResponse(error as Meteor.Error, 'Could not get users');
    }
    setLoading(false);
  };

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
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {t('home.historyTitle')}
              </Typography.Title>
              <Typography.Text type="secondary">{t('home.recentSaved')}</Typography.Text>
            </div>
            {contents.length === 0 ? (
              <Empty description={t('createContent.listEmpty')} />
            ) : (
              <Row gutter={[16, 16]}>
                {contents.map((c) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={c._id}>
                    <Card hoverable actions={[
                      <Button key="edit" size="small" onClick={() => navigate(`${protectedRoutes.editContent.path.replace(':id', c._id)}`)}>Editar</Button>,
                      <Popconfirm
                        key="delete"
                        title="Excluir este conteúdo?"
                        okText="Excluir"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancelar"
                        onConfirm={async () => {
                          try {
                            await Meteor.callAsync('set.contents.delete', { _id: c._id });
                            message.success('Conteúdo excluído');
                            fetchData(true);
                          } catch (e) {
                            errorResponse(e as Meteor.Error, 'Falha ao excluir');
                          }
                        }}
                      >
                        <Button size="small" danger>Excluir</Button>
                      </Popconfirm>
                    ]}>
                      <Typography.Text strong>{c.name}</Typography.Text>
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">
                          {new Date(c.createdAt).toLocaleString()}
                        </Typography.Text>
                      </div>
                      {c.audience && (
                        <div style={{ marginTop: 8 }}>
                          <Typography.Text type="secondary">Público: {c.audience}</Typography.Text>
                        </div>
                      )}
                      {c.goal && (
                        <div style={{ marginTop: 4 }}>
                          <Typography.Text type="secondary">Objetivo: {c.goal}</Typography.Text>
                        </div>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">RSS: {c.rssUrls.length} • Itens: {c.rssItems?.length ?? 0}</Typography.Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Space>
        </Card>
      )}

  <Card>
  <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>
            {t('browse.communityTitle')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('browse.communitySubtitle')}</Typography.Text>
        </div>

        {userProfiles.length === 0 ? (
          <Empty description={t('browse.noUsers')} />
        ) : (
          <List
            dataSource={userProfiles}
            renderItem={(up) => (
              <List.Item key={up._id}>@{up.username.replace(/^@/, '')}</List.Item>
            )}
          />
        )}
      </Space>
      </Card>
  </Space>
    
  </>
  );
};

export default MainPage;

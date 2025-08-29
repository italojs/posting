import { LoadingOutlined } from '@ant-design/icons';
import { Button, Card, Col, Empty, List, Row, Space, Typography } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { BasicSiteProps } from '../App';
import { ContentModel } from '/app/api/contents/models';
import UserProfileModel from '/app/api/userProfile/models';
import { AvailableCollectionNames, MethodUtilMethodsFindCollectionModel } from '/app/api/utils/models';
import { errorResponse } from '/app/utils/errors';
import { useLocation } from 'wouter';
import { protectedRoutes } from '/app/utils/constants/routes';

export interface MiniBrowsePageUserProfileModel
  extends Pick<UserProfileModel, '_id' | 'username' | 'userId' | 'photo'> {}

const miniBrowsePageUserProfileFields = {
  _id: 1,
  username: 1,
  userId: 1,
  photo: 1,
};

type BrowsePageProps = BasicSiteProps;

export type FetchDataType = (silent?: boolean) => Promise<void>;

const BrowsePage: React.FC<BrowsePageProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<MiniBrowsePageUserProfileModel[]>([]);
  const [contents, setContents] = useState<ContentModel[]>([]);
  const [, navigate] = useLocation();

  const fetchData: FetchDataType = async (silent) => {
    setLoading(!silent);
    try {
      const findData: MethodUtilMethodsFindCollectionModel = {
        collection: AvailableCollectionNames.USER_PROFILE,
        selector: {},
        options: {
          fields: miniBrowsePageUserProfileFields,
          limit: 100,
        },
      };

      const res: MiniBrowsePageUserProfileModel[] = await Meteor.callAsync(
        'utilMethods.findCollection',
        findData,
      );
      setUserProfiles(res);

      if (userId) {
        const contentFind: MethodUtilMethodsFindCollectionModel = {
          collection: AvailableCollectionNames.CONTENTS,
          selector: { userId },
          options: { sort: { createdAt: -1 }, limit: 12 },
        };
        const c: ContentModel[] = await Meteor.callAsync('utilMethods.findCollection', contentFind);
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
    fetchData();
  }, []);

  if (loading) return <LoadingOutlined />;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {userId && (
        <Card>
          <Button type="primary" onClick={() => navigate(protectedRoutes.createContent.path)}>
            Criar conteúdo
          </Button>
        </Card>
      )}

      {userId && (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                Seu histórico
              </Typography.Title>
              <Typography.Text type="secondary">Conteúdos salvos recentemente</Typography.Text>
            </div>
            {contents.length === 0 ? (
              <Empty description="Nenhum conteúdo salvo" />
            ) : (
              <Row gutter={[16, 16]}>
                {contents.map((c) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={c._id}>
                    <Card hoverable>
                      <Typography.Text strong>{c.name}</Typography.Text>
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">
                          {new Date(c.createdAt).toLocaleString()}
                        </Typography.Text>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">RSS: {c.rssUrls.length}</Typography.Text>
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
            Community
          </Typography.Title>
          <Typography.Text type="secondary">Browse user profiles</Typography.Text>
        </div>

        {userProfiles.length === 0 ? (
          <Empty description="No users yet" />
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
  );
};

export default BrowsePage;

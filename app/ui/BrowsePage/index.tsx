import { LoadingOutlined } from '@ant-design/icons';
import { Card, Empty, List, Space, Typography } from 'antd';
import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { BasicSiteProps } from '../App';
import UserProfileModel from '/app/api/userProfile/models';
import { AvailableCollectionNames, MethodUtilMethodsFindCollectionModel } from '/app/api/utils/models';
import { errorResponse } from '/app/utils/errors';

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

const BrowsePage: React.FC<BrowsePageProps> = () => {
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<MiniBrowsePageUserProfileModel[]>([]);

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
  );
};

export default BrowsePage;

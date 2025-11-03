import { Badge, Collapse, List } from 'antd';
import type { CollapseProps } from 'antd';
import React from 'react';
import type { RssItem } from '/app/api/contents/models';
import type { GroupedRssArticles } from '../../utils/rss';

interface RssSourceCollapseProps {
    groups: GroupedRssArticles[];
    badgeColor: string;
    renderItem: (item: RssItem) => React.ReactNode;
    collapseProps?: CollapseProps;
}

const RssSourceCollapse: React.FC<RssSourceCollapseProps> = ({
    groups,
    badgeColor,
    renderItem,
    collapseProps,
}) => (
    <Collapse
        className="custom-collapse"
        items={groups.map((group) => ({
            key: group.name,
            label: (
                <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                >
                    <span style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937' }}>{group.name}</span>
                    <Badge count={group.items.length} overflowCount={99} style={{ backgroundColor: badgeColor }} />
                </div>
            ),
            children: (
                <List
                    dataSource={group.items}
                    split={false}
                    className="rss-articles-scroll"
                    style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 8 }}
                    renderItem={renderItem}
                />
            ),
        }))}
        {...collapseProps}
    />
);

export default RssSourceCollapse;

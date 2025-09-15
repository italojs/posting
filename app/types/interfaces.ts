import { Mongo } from 'meteor/mongo';
import { ReactNode } from 'react';

export interface BaseProps {
    history?: any;
    location?: any;
    /**
     * @deprecated in newer react versions use `useParams()` instead
     */
    match?: {
        params?: any;
        path: string;
    };
    staticContext?: any;
    children?: ReactNode;
}

export interface AnyMap {
    [index: string]: any;
}

export interface QueryOptions {
    sort?: Mongo.SortSpecifier | undefined;
    skip?: number | undefined;
    limit?: number | undefined;
    fields?: Mongo.FieldSpecifier | undefined;
    reactive?: boolean | undefined;
    transform?: Function | undefined;
}

export type MongoDBSelector = string | Mongo.Selector<any> | Mongo.ObjectID;

export interface SearchParams {
    selector?: MongoDBSelector;
    options?: QueryOptions;
    /**
     * Should only one value be returned
     */
    onlyOne?: boolean;
}

export enum AvailableAwsSnsDetailTypes {
    HEALTH_STATUS_CHANGE = 'Health status change',
    OTHER_RESOURCE_STATUS_CHANGE = 'Other resource status change',
}

export enum AvailableAwsSnsDetailStatuses {
    ENVIRONMENT_HEALTH_CHANGED = 'Environment health changed',
    INSTANCE_ADDED = 'Instance added',
    INSTANCE_REMOVED = 'Instance removed',
}

export interface FroalaEditor {
    image: {
        insert: any;
        get: any;
    };
    popups: {
        hideAll: () => void;
    };
}
export interface FroalaFile extends Blob {
    lastModified: number;
    lastModifiedDate: Date;
    name: string;
    /**
     * Side, probably in KB
     */
    size: number;
    type: string;
    webkitRelativePath: string;
}

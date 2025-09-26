import { Mongo } from 'meteor/mongo';
import { AvailableCollectionNames } from '../utils/models';
import { Brand } from './models';

const BrandsCollection = new Mongo.Collection<Brand>(AvailableCollectionNames.BRANDS);

export default BrandsCollection;

export interface Brand {
    _id: string;
    userId: string;
    name: string;
    description?: string;
    tone?: string;
    audience?: string;
    differentiators?: string;
    keywords?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface BrandInput {
    name: string;
    description?: string;
    tone?: string;
    audience?: string;
    differentiators?: string;
    keywords?: string[];
}

export interface CreateBrandInput extends BrandInput {}

export interface UpdateBrandInput extends BrandInput {
    _id: string;
}

export interface DeleteBrandInput {
    _id: string;
}

export interface BrandSummary
    extends Pick<Brand, '_id' | 'name' | 'description' | 'tone' | 'audience' | 'differentiators' | 'keywords'> {}

export interface BrandContextForAI
    extends Pick<Brand, 'name' | 'description' | 'tone' | 'audience' | 'differentiators' | 'keywords'> {}

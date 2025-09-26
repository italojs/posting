import { Meteor } from 'meteor/meteor';
import BrandsCollection from '../../api/brands/brands';
import { Brand, BrandInput, BrandSummary, CreateBrandInput, UpdateBrandInput } from '../../api/brands/models';
import { clientContentError, noAuthError, notFoundError } from '/app/utils/serverErrors';

function sanitizeText(value?: string): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeKeywords(value?: string[] | string): string[] | undefined {
    if (!value) return undefined;
    const source = Array.isArray(value) ? value : value.split(',');
    const cleaned = source
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
        .slice(0, 20);
    return cleaned.length > 0 ? cleaned : undefined;
}

class BrandsService {
    private normalizeInput(input: BrandInput): Required<Pick<Brand, 'name'>> & Partial<BrandSummary> {
        const name = sanitizeText(input.name);
        if (!name) {
            throw clientContentError('Nome da marca é obrigatório');
        }

        return {
            name,
            description: sanitizeText(input.description),
            tone: sanitizeText(input.tone),
            audience: sanitizeText(input.audience),
            differentiators: sanitizeText(input.differentiators),
            keywords: sanitizeKeywords(input.keywords),
        };
    }

    async listForUser(userId: string): Promise<BrandSummary[]> {
        if (!userId) return noAuthError();
        const cursor = BrandsCollection.find(
            { userId },
            { sort: { createdAt: -1 } },
        );
        const result = await cursor.fetchAsync();
        return result.map(({ _id, name, description, tone, audience, differentiators, keywords }) => ({
            _id,
            name,
            description,
            tone,
            audience,
            differentiators,
            keywords,
        }));
    }

    async getByIdForUser(_id: string, userId: string): Promise<Brand | undefined> {
        if (!userId) return noAuthError();
        if (!_id) return clientContentError('ID da marca é obrigatório');
        return (await BrandsCollection.findOneAsync({ _id, userId })) as Brand | undefined;
    }

    async create(userId: string, input: CreateBrandInput): Promise<Brand> {
        if (!userId) return noAuthError();
        const normalized = this.normalizeInput(input);

        const duplicate = await BrandsCollection.findOneAsync({ userId, name: normalized.name });
        if (duplicate) {
            return clientContentError('Você já possui uma marca com esse nome');
        }

        const now = new Date();
        const _id = await BrandsCollection.insertAsync({
            userId,
            name: normalized.name,
            description: normalized.description,
            tone: normalized.tone,
            audience: normalized.audience,
            differentiators: normalized.differentiators,
            keywords: normalized.keywords,
            createdAt: now,
            updatedAt: now,
        } as unknown as Brand);

        const created = await BrandsCollection.findOneAsync({ _id, userId });
        if (!created) {
            throw new Meteor.Error('brand-create-failed', 'Falha ao criar marca');
        }
        return created as Brand;
    }

    async update(userId: string, input: UpdateBrandInput): Promise<Brand> {
        if (!userId) return noAuthError();
        const { _id } = input;
        if (!_id) return clientContentError('ID da marca é obrigatório');

        const existing = await BrandsCollection.findOneAsync({ _id, userId });
        if (!existing) return notFoundError('marca');

        const normalized = this.normalizeInput(input);

        const duplicate = await BrandsCollection.findOneAsync({
            userId,
            name: normalized.name,
            _id: { $ne: _id },
        });
        if (duplicate) {
            return clientContentError('Você já possui uma marca com esse nome');
        }

        const update = {
            name: normalized.name,
            description: normalized.description,
            tone: normalized.tone,
            audience: normalized.audience,
            differentiators: normalized.differentiators,
            keywords: normalized.keywords,
            updatedAt: new Date(),
        };

        await BrandsCollection.updateAsync({ _id, userId }, { $set: update });
        const updated = await BrandsCollection.findOneAsync({ _id, userId });
        if (!updated) {
            throw new Meteor.Error('brand-update-failed', 'Falha ao atualizar marca');
        }
        return updated as Brand;
    }

    async remove(userId: string, { _id }: { _id: string }) {
        if (!userId) return noAuthError();
        if (!_id) return clientContentError('ID da marca é obrigatório');

        const existing = await BrandsCollection.findOneAsync({ _id, userId });
        if (!existing) return notFoundError('marca');

        await BrandsCollection.removeAsync({ _id, userId });
        return { _id };
    }
}

export const brandsService = new BrandsService();

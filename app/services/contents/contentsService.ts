import ContentsCollection from '../../api/contents/contents';
import { Content, CreateContentInput, NewsletterSection, RssItem } from '../../api/contents/models';
import { Meteor } from 'meteor/meteor';

export class ContentsService {
  async getByIdForUser(_id: string, userId: string) {
    return (await ContentsCollection.findOneAsync({ _id, userId })) as Content | undefined;
  }

  normalizeSections(raw: any[]): NewsletterSection[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const sections = raw
      .map((s: any) => ({
        id: typeof s.id === 'string' ? s.id : undefined,
        title: typeof s.title === 'string' ? s.title.trim() : '',
        description: typeof s.description === 'string' ? s.description.trim() : undefined,
        rssItems: Array.isArray(s.rssItems) ? (s.rssItems as RssItem[]) : [],
      }))
      .filter((s) => !!s.title);
    return sections.length > 0 ? sections : undefined;
  }

  buildDoc(userId: string, input: CreateContentInput, sections?: NewsletterSection[]): Omit<Content, '_id'> {
    const { name, audience, goal, rssUrls, rssItems, networks } = input;
    return {
      userId,
      name: name.trim(),
      audience: (audience ?? '').trim() || undefined,
      goal: (goal ?? '').trim() || undefined,
      rssUrls: rssUrls.map((u) => u.trim()).filter(Boolean),
      rssItems: rssItems ?? [],
      networks: {
        newsletter: !!networks.newsletter,
        instagram: !!(networks as any).instagram,
        twitter: !!(networks as any).twitter,
        tiktok: !!(networks as any).tiktok,
        linkedin: !!(networks as any).linkedin,
      },
      newsletterSections: sections,
      createdAt: new Date(),
    };
  }

  async create(userId: string, input: CreateContentInput, rawSections?: any[]) {
    const sections = this.normalizeSections(rawSections || input.newsletterSections || []);
    const doc = this.buildDoc(userId, input, sections);
    if (!doc.name) throw new Meteor.Error('validation', 'Nome do conteúdo é obrigatório');
    if (doc.rssUrls.length === 0) throw new Meteor.Error('validation', 'Informe pelo menos um RSS');
    const _id = await ContentsCollection.insertAsync(doc as any);
    return { _id };
  }

  async updateBasic(userId: string, _id: string, fields: { name: string; audience?: string; goal?: string }) {
    const existing = await this.getByIdForUser(_id, userId);
    if (!existing) throw new Meteor.Error('not-found', 'Conteúdo não encontrado');
    const name = fields.name.trim();
    const audience = (fields.audience ?? '').trim();
    const goal = (fields.goal ?? '').trim();
    if (!name) throw new Meteor.Error('validation', 'Nome do conteúdo é obrigatório');
    await ContentsCollection.updateAsync({ _id, userId }, { $set: { name, audience: audience || undefined, goal: goal || undefined } });
    return { _id };
  }

  async delete(userId: string, _id: string) {
    const existing = await this.getByIdForUser(_id, userId);
    if (!existing) throw new Meteor.Error('not-found', 'Conteúdo não encontrado');
    await ContentsCollection.removeAsync({ _id, userId });
    return { _id };
  }

  async update(userId: string, input: CreateContentInput & { _id: string }) {
    const { _id } = input;
    const existing = await this.getByIdForUser(_id, userId);
    if (!existing) throw new Meteor.Error('not-found', 'Conteúdo não encontrado');
    const sections = this.normalizeSections((input as any).newsletterSections || []);
    const doc = this.buildDoc(userId, input, sections);
    if (!doc.name) throw new Meteor.Error('validation', 'Nome do conteúdo é obrigatório');
    if (doc.rssUrls.length === 0) throw new Meteor.Error('validation', 'Informe pelo menos um RSS');
    await ContentsCollection.updateAsync(
      { _id, userId },
      {
        $set: {
          name: doc.name,
          audience: doc.audience,
          goal: doc.goal,
          rssUrls: doc.rssUrls,
          rssItems: doc.rssItems,
          networks: doc.networks,
          newsletterSections: doc.newsletterSections,
        },
      }
    );
    return { _id };
  }
}

export const contentsService = new ContentsService();

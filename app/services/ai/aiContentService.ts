import { Meteor } from 'meteor/meteor';
import {
  GenerateSectionSearchInput,
  GenerateSectionSearchResult,
  GenerateSuggestionInput,
  GenerateSuggestionResult,
} from '../../api/contents/models';

export class AiContentService {
  buildPrompt({ contentTemplate, numberOfSections, language }: GenerateSuggestionInput) {
    const { name, audience, goal } = contentTemplate;
    return `Based on the following content:
- Name: ${name}
- Target audience: ${audience || 'not specified'}
- Goal: ${goal || 'not specified'}

Generate ${numberOfSections} sections for a newsletter, each with:
1. A creative and attractive title
2. A brief description (maximum 30 words)
3. Exactly three Google search queries that could surface fresh news about the section topic. The queries must be written in ${language} and focus on the most recent updates (last week).

Generate all answers in ${language} language. All titles and descriptions must be in ${language}.

Respond only in JSON format with this structure:
{
  "title": "suggested newsletter title",
  "sections": [
    {"title": "section title", "description": "brief description", "newsSearchQueries": ["query 1", "query 2", "query 3"]}
  ]
}`;
  }

  buildSectionSearchPrompt({ newsletter, section, language }: GenerateSectionSearchInput) {
    const { name, audience, goal } = newsletter;
    return `You are an assistant helping a marketer curate a newsletter.
Newsletter:
- Title: ${name || 'not provided'}
- Goal: ${goal || 'not provided'}
- Audience: ${audience || 'not provided'}

Section details:
- Title: ${section.title}
- Description: ${section.description || 'not provided'}

Return exactly three Google News search queries (focused on the last week) that could surface timely articles about this section. All queries must be written in ${language}.

Respond only in JSON with this structure:
{
  "queries": ["query 1", "query 2", "query 3"]
}`;
  }

  private getApiKey() {
    const openaiApiKey = Meteor.settings.private?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Meteor.Error('api-key-missing', 'OpenAI API key not configured');
    return openaiApiKey;
  }

  private async sendChatRequest(
    messages: { role: 'system' | 'user'; content: string }[],
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string> {
    const openaiApiKey = this.getApiKey();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: options?.maxTokens ?? 500,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      console.error('OpenAI request failed', payload);
      throw new Meteor.Error('ai-request-failed', 'Failed to communicate with AI service');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('OpenAI response missing content', data);
      throw new Meteor.Error('ai-response-empty', 'Empty response from AI service');
    }

    return content;
  }

  private cleanAiJsonResponse(value: string): string {
    return value.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  }

  private sanitizeQueries(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[])
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry || '').trim()))
      .filter((entry) => !!entry)
      .slice(0, 3);
  }

  private fallbackQueries(sectionTitle: string, language: string): string[] {
    const title = sectionTitle?.trim();
    if (!title) return [];
    const lang = language.toLowerCase();
    if (lang.startsWith('pt')) {
      return [title, `${title} notícias`, `${title} novidades`];
    }
    if (lang.startsWith('es')) {
      return [title, `${title} noticias`, `${title} últimas novedades`];
    }
    return [title, `${title} news`, `${title} latest updates`];
  }

  async generateSuggestion(input: GenerateSuggestionInput): Promise<GenerateSuggestionResult> {
    const prompt = this.buildPrompt(input);

    const aiResponse = await this.sendChatRequest([{ role: 'user', content: prompt }], {
      maxTokens: 700,
      temperature: 0.6,
    });
    const cleanedResponse = this.cleanAiJsonResponse(aiResponse);

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse);
      throw new Meteor.Error('ai-response-invalid', 'Invalid response from AI service');
    }

    const rawSections = Array.isArray(parsedResponse.sections) ? parsedResponse.sections : [];
    const sections = rawSections.map((section: any) => {
      const title = typeof section.title === 'string' ? section.title.trim() : '';
      const description = typeof section.description === 'string' ? section.description.trim() : '';
      const queries = this.sanitizeQueries(section.newsSearchQueries);
      return {
        title,
        description,
        newsSearchQueries: queries.length ? queries : undefined,
      };
    });

    return {
      title:
        typeof parsedResponse.title === 'string' && parsedResponse.title.trim()
          ? parsedResponse.title.trim()
          : `${input.contentTemplate.name} - Edição Especial`,
      sections,
    };
  }

  async generateSectionSearchQueries(
    input: GenerateSectionSearchInput,
  ): Promise<GenerateSectionSearchResult> {
    const prompt = this.buildSectionSearchPrompt(input);
    const aiResponse = await this.sendChatRequest([{ role: 'user', content: prompt }], {
      maxTokens: 200,
      temperature: 0.4,
    });
    const cleanedResponse = this.cleanAiJsonResponse(aiResponse);

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI section search response:', cleanedResponse);
      throw new Meteor.Error('ai-response-invalid', 'Invalid response from AI service');
    }

    const sanitized = this.sanitizeQueries(parsedResponse.queries);
    const queries = sanitized.length
      ? sanitized
      : this.fallbackQueries(input.section.title, input.language);

    return {
      queries: Array.from(new Set(queries)).slice(0, 3),
    };
  }
}

export const aiContentService = new AiContentService();

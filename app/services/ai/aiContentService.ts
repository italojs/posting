import { Meteor } from 'meteor/meteor';
import {
  GenerateSectionSearchInput,
  GenerateSectionSearchResult,
  GenerateSuggestionInput,
  GenerateSuggestionResult,
  NewsletterGenerationContext,
  NewsletterArticleSummary,
  NewsletterSectionGenerationResult,
  ProcessedArticle,
  GenerateTwitterThreadInput,
  GenerateTwitterThreadResult,
  TwitterThread,
  GenerateLinkedInPostInput,
  GenerateLinkedInPostResult,
  LinkedInPost,
} from '../../api/contents/models';
import { BrandContextForAI } from '../../api/brands/models';
import { extractArticleText } from '../../api/contents/methods/set';

const ARTICLE_TEXT_SUMMARY_LIMIT = 8000;

export class AiContentService {
  private formatBrandDetails(brand?: BrandContextForAI): string | undefined {
    if (!brand || !brand.name) return undefined;
    const details: string[] = [`Name: ${brand.name}`];
    if (brand.description) details.push(`Description: ${brand.description}`);
    if (brand.tone) details.push(`Tone of voice: ${brand.tone}`);
    if (brand.audience) details.push(`Primary audience: ${brand.audience}`);
    if (brand.differentiators) details.push(`Differentiators: ${brand.differentiators}`);
    if (brand.keywords && brand.keywords.length > 0) {
      details.push(`Keywords: ${brand.keywords.join(', ')}`);
    }
    return details.join('\n');
  }

  buildPrompt({ contentTemplate, numberOfSections, language, brand }: GenerateSuggestionInput) {
    const { name, audience, goal } = contentTemplate;
    const brandDetails = this.formatBrandDetails(brand);
    const brandSection = brandDetails
      ? `Brand guidelines:\n${brandDetails}`
      : 'Brand guidelines:\nNot specified';

    return `Based on the following content:
- Name: ${name}
- Target audience: ${audience || 'not specified'}
- Goal: ${goal || 'not specified'}

${brandSection}

Generate ${numberOfSections} sections for a newsletter, each with:
1. A creative and attractive title
2. A brief description (maximum 30 words)
3. Exactly three Google search queries that could surface fresh news about the section topic. The queries must be written in ${language}, avoid uses date in the queries.

Generate all answers in ${language} language. All titles and descriptions must be in ${language}.

Respond only in JSON format with this structure:
{
  "title": "suggested newsletter title",
  "sections": [
    {"title": "section title", "description": "brief description", "newsSearchQueries": ["query 1", "query 2", "query 3"]}
  ]
}`;
  }

  buildSectionSearchPrompt({ newsletter, section, language, brand }: GenerateSectionSearchInput) {
    const { name, audience, goal } = newsletter;
    const brandDetails = this.formatBrandDetails(brand);
    const brandSection = brandDetails
      ? `\nBrand guidelines:\n${brandDetails}\n`
      : '\n';
    return `You are an assistant helping a marketer curate a newsletter.
Newsletter:
- Title: ${name || 'not provided'}
- Goal: ${goal || 'not provided'}
- Audience: ${audience || 'not provided'}
${brandSection}

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
    const settingsKey = Meteor.settings.private?.OPENAI_API_KEY;
    const envKey = process.env.OPENAI_API_KEY;
    const openaiApiKey = settingsKey || envKey;
    
    if (!openaiApiKey) {
      console.error('OpenAI API key not found in Meteor.settings.private or environment variables');
      throw new Meteor.Error('api-key-missing', 'OpenAI API key not configured');
    }
    
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

  async summarizeNewsletterArticle({
    article,
    context,
    maxLength = ARTICLE_TEXT_SUMMARY_LIMIT,
  }: {
    article: ProcessedArticle;
    context: NewsletterGenerationContext;
    maxLength?: number;
  }): Promise<string> {
    const truncatedText =
      article.text.length > maxLength ? `${article.text.slice(0, maxLength)}...` : article.text;

    const brandDetails = this.formatBrandDetails(context.brand);
    const systemPrompt = `You are a marketing assistant who summarizes articles for a curated newsletter. The current date is ${context.currentDate}. Always respond in ${context.languageName} (${context.languageTag}). Keep the tone informative and clear.${
      brandDetails ? `\nRespect the following brand guidelines:\n${brandDetails}` : ''
    }`;

    const userPrompt = `Newsletter:
- Title: ${context.title || 'not provided'}
- Goal: ${context.goal || 'not provided'}
- Audience: ${context.audience || 'not provided'}
${brandDetails ? `- Brand voice: ${context.brand?.tone || 'not provided'}` : ''}

Article:
- Title: ${article.title}
- Link: ${article.url}

Content:
"""
${truncatedText}
"""

Summarize the article in up to five sentences, highlighting why it matters to the newsletter audience. Reply with a single paragraph written in ${context.languageName}.`;

    const response = await this.sendChatRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 220, temperature: 0.4 },
    );

    return response.trim();
  }

  async generateNewsletterSection({
    newsletter,
    section,
    articleSummaries,
  }: {
    newsletter: NewsletterGenerationContext;
    section: { title: string; description?: string };
    articleSummaries: NewsletterArticleSummary[];
  }): Promise<NewsletterSectionGenerationResult> {
    const insights = articleSummaries
      .map((item, index) => `${index + 1}. ${item.title}: ${item.summary}`)
      .join('\n');

    const brandDetails = this.formatBrandDetails(newsletter.brand);
    const systemPrompt = `You are a copywriter who crafts engaging marketing newsletter sections. The current date is ${newsletter.currentDate}. All content must be written in ${newsletter.languageName} (${newsletter.languageTag}). Use a professional but warm tone.${
      brandDetails ? `\nMatch these brand guidelines:\n${brandDetails}` : ''
    }`;

    const userPrompt = `Newsletter context:
- Title: ${newsletter.title || 'not provided'}
- Goal: ${newsletter.goal || 'not provided'}
- Audience: ${newsletter.audience || 'not provided'}
${brandDetails ? `- Brand tone: ${newsletter.brand?.tone || 'not provided'}` : ''}

${brandDetails ? `Brand guidelines to follow:\n${brandDetails}\n` : ''}

Target section:
- Suggested title: ${section.title}
- Description: ${section.description || 'no description provided'}

Article insights for this section:
${insights}

Tasks:
- Create a short, catchy title.
- Write a 1-2 sentence summary that connects the insights.
- Produce a Markdown body with up to two paragraphs and add a short bullet list or call to action if appropriate.
- Adapt the language to the described audience.

Reply **only** in JSON with this structure (content in ${newsletter.languageName}):
{
  "title": "",
  "summary": "",
  "body": "",
  "callToAction": "optional, leave empty if not needed"
}`;

    const aiResponse = await this.sendChatRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 500, temperature: 0.6 },
    );

    const cleanedResponse = this.cleanAiJsonResponse(aiResponse);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse AI response for section generation', cleanedResponse, error);
      throw new Meteor.Error('ai-response-invalid', 'Invalid response from AI service');
    }

    const generatedTitle =
      typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : section.title;
    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : articleSummaries[0]?.summary;
    const body = typeof parsed.body === 'string' && parsed.body.trim() ? parsed.body.trim() : insights;
    const callToActionValue =
      typeof parsed.callToAction === 'string' && parsed.callToAction.trim()
        ? parsed.callToAction.trim()
        : undefined;

    return {
      title: generatedTitle,
      summary,
      body,
      callToAction: callToActionValue,
    };
  }

  /**
   * Otimized Twitter thread generation - Single AI call approach
   */
  async generateTwitterThread(input: GenerateTwitterThreadInput): Promise<GenerateTwitterThreadResult> {
    const prompt = await this.buildOptimizedTwitterPrompt(input);
    
    const aiResponse = await this.sendChatRequest([{ role: 'user', content: prompt }], {
      maxTokens: 800,
      temperature: 0.7,
    });

    const cleanedResponse = this.cleanAiJsonResponse(aiResponse);
    const parsedResponse = JSON.parse(cleanedResponse);

    if (!Array.isArray(parsedResponse.tweets)) {
      throw new Meteor.Error('ai-response-invalid', 'AI response missing tweets array');
    }

    const tweets = parsedResponse.tweets
      .filter((tweet: any) => typeof tweet === 'string' && tweet.trim())
      .map((tweet: string) => tweet.trim())
      .slice(0, 5);

    if (tweets.length === 0) {
      throw new Meteor.Error('ai-response-invalid', 'No valid tweets generated');
    }

    const thread: TwitterThread = {
      tweets,
      articleTitle: input.article.title || 'No title',
      articleUrl: input.article.link,
      source: input.article.source,
    };

    return { thread };
  }

  /**
   * Optimized single-prompt approach for Twitter threads
   */
  private async buildOptimizedTwitterPrompt({ article, language, brand }: GenerateTwitterThreadInput): Promise<string> {
    const brandDetails = this.formatBrandDetails(brand);
    const brandSection = brandDetails
      ? `\nBrand guidelines to follow:\n${brandDetails}\n`
      : '\n';

    const articleContent = await extractArticleText(article);

    return `You are a social media expert creating an engaging Twitter thread directly from an article.

Article details:
- Title: ${article.title || 'No title'}
- Source: ${article.source || 'Unknown source'}
- URL: ${article.link || 'No URL'}

Article content:
"""
${articleContent}
"""
${brandSection}

Create a Twitter thread with 3-5 tweets in ${language} that:

1. **Tweet 1 (Hook)**: Attention-grabbing opener based on the most compelling insight (max 260 characters)
2. **Tweets 2-4 (Content)**: Break down key points into digestible, valuable insights (max 260 characters each)
3. **Tweet 5 (Optional CTA)**: Thought-provoking conclusion or call-to-action (max 260 characters)

Requirements:
- DO NOT include thread numbering (1/, 2/, 3/, etc.) - interface handles numbering
- Each tweet MUST be under 260 characters (leaves room for "1/ ", "2/ " prefix)
- Write all content in ${language}
- Maintain ${brand?.tone || 'professional and engaging'} tone
- Extract the most valuable insights directly from the article content
- Make each tweet standalone but connected to the thread
- Use emojis sparingly and strategically

Respond only in JSON format:
{
  "tweets": ["Tweet content...", "Tweet content...", "Tweet content..."]
}`;

  }
  
   /* Generate LinkedIn post from article - Single AI call approach*/
    async generateLinkedInPost(input: GenerateLinkedInPostInput): Promise<GenerateLinkedInPostResult> {
    const prompt = await this.buildLinkedInPrompt(input);
    
    const aiResponse = await this.sendChatRequest([{ role: 'user', content: prompt }], {
      maxTokens: 600,
      temperature: 0.7,
    });

    const cleanedResponse = this.cleanAiJsonResponse(aiResponse);
    const parsedResponse = JSON.parse(cleanedResponse);

    if (!parsedResponse.content || typeof parsedResponse.content !== 'string') {
      throw new Meteor.Error('ai-response-invalid', 'AI response missing content');
    }

    const post: LinkedInPost = {
      content: parsedResponse.content.trim(),
      articleTitle: input.article.title || 'No title',
      articleUrl: input.article.link,
      source: input.article.source,
    };

    return { post };
  }

  /*   Build LinkedIn post prompt optimized for professional content */
  private async buildLinkedInPrompt({ article, language, brand }: GenerateLinkedInPostInput): Promise<string> {
    const brandDetails = this.formatBrandDetails(brand);
    const brandSection = brandDetails
      ? `\nBrand guidelines to follow:\n${brandDetails}\n`
      : '\n';

    const articleContent = await extractArticleText(article);

    return `You are a professional content creator specializing in LinkedIn posts that drive engagement and add value.

Article details:
- Title: ${article.title || 'No title'}
- Source: ${article.source || 'Unknown source'}
- URL: ${article.link || 'No URL'}

Article content:
"""
${articleContent}
"""
${brandSection}

Create a LinkedIn post in ${language} that:

**Structure:**
1. **Hook (1-2 lines)**: Start with a compelling insight or question that makes professionals want to read more
2. **Value (2-3 paragraphs)**: Share key insights from the article in a way that adds professional value
3. **Call to Action**: End with a thought-provoking question or invitation for discussion

**Requirements:**
- Write entirely in ${language}
- Keep total length between 300-500 words (LinkedIn sweet spot)
- Use professional but conversational tone (${brand?.tone || 'professional and engaging'})
- Include 2-3 relevant emojis strategically placed
- Add line breaks for readability
- Focus on business insights, industry trends, or professional growth
- Make it valuable for business professionals and decision-makers
- Include the article source naturally in the content
- End with an engaging question to drive comments

**Style notes:**
- Avoid overly promotional language
- Share genuine insights rather than just summarizing
- Use first-person perspective when appropriate
- Make it feel authentic and conversational
- Include actionable takeaways when possible

Respond only in JSON format:
{
  "content": "Full LinkedIn post content..."
}`;
  }

}

export const aiContentService = new AiContentService();

import { Meteor } from 'meteor/meteor';
import { NewsArticle, SearchNewsInput, SearchNewsResult } from '../../api/contents/models';

class NewsSearchService {
  private getApiKey() {
    const apiKey = Meteor.settings.private?.SERPER_API_KEY || process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Meteor.Error('api-key-missing', 'SERPER API key not configured');
    }
    return apiKey;
  }

  private normalizeLanguage(language?: string) {
    if (!language) return 'pt-br';
    const lower = language.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-br';
    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('en')) return 'en';
    return lower;
  }

  private inferCountry(language?: string, country?: string) {
    if (country) return country.toLowerCase();
    if (!language) return 'br';
    const lower = language.toLowerCase();
    if (lower.startsWith('pt')) return 'br';
    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('en')) return 'us';
    return 'us';
  }

  private mapResponse(newsItems: any[]): NewsArticle[] {
    return newsItems
      .map((item) => {
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        const link = typeof item.link === 'string' ? item.link.trim() : typeof item.url === 'string' ? item.url.trim() : '';
        if (!title || !link) return null;
        return {
          title,
          link,
          source: typeof item.source === 'string' ? item.source : typeof item.publisher === 'string' ? item.publisher : undefined,
          snippet: typeof item.snippet === 'string' ? item.snippet : typeof item.description === 'string' ? item.description : undefined,
          date: typeof item.date === 'string' ? item.date : typeof item.timeAgo === 'string' ? item.timeAgo : undefined,
        } as NewsArticle;
      })
      .filter((article): article is NewsArticle => !!article);
  }

  async search({ query, language, country }: SearchNewsInput): Promise<SearchNewsResult> {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      throw new Meteor.Error('validation', 'Query is required to search news');
    }

    const apiKey = this.getApiKey();
    const hl = this.normalizeLanguage(language);
    const gl = this.inferCountry(language, country);

    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: trimmedQuery,
        hl,
        gl,
        tbs: 'qdr:w',
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      console.error('Serper request failed', payload);
      throw new Meteor.Error('news-search-failed', 'Failed to fetch news from provider');
    }

    const data = await response.json();
    const news = Array.isArray(data.news) ? data.news : [];

    return {
      query: trimmedQuery,
      articles: this.mapResponse(news),
    };
  }
}

export const newsSearchService = new NewsSearchService();

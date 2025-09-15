import { Meteor } from 'meteor/meteor';
import { GenerateSuggestionInput, GenerateSuggestionResult } from '../../api/contents/models';

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

Generate all answers in ${language} language. All titles and descriptions must be in ${language}.

Respond only in JSON format with this structure:
{
  "title": "suggested newsletter title",
  "sections": [
    {"title": "section title", "description": "brief description"}
  ]
}`;
  }

  async generateSuggestion(input: GenerateSuggestionInput): Promise<GenerateSuggestionResult> {
    const openaiApiKey = Meteor.settings.private?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Meteor.Error('api-key-missing', 'OpenAI API key not configured');
    const prompt = this.buildPrompt(input);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    const cleanedResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse);
      throw new Meteor.Error('ai-response-invalid', 'Invalid response from AI service');
    }

    return {
      title: parsedResponse.title || `${input.contentTemplate.name} - Edição Especial`,
      sections: parsedResponse.sections || [],
    };
  }
}

export const aiContentService = new AiContentService();

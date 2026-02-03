/**
 * AI Agent Service
 * AI代理服务
 */

export type AIProvider = 'openai' | 'anthropic' | 'azure' | 'bedrock' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  isEnabled: boolean;
  settings?: Record<string, any>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface RFQAnalysisResult {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
  suggestedPrice?: {
    min: number;
    max: number;
    recommended: number;
  };
  competitorAnalysis?: string;
}

// Default models for each provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  azure: 'gpt-4o',
  bedrock: 'anthropic.claude-3-sonnet-20240229-v1:0',
  custom: '',
};

class AIAgentService {
  private config: AIConfig | null = null;

  setConfig(config: AIConfig) {
    this.config = config;
  }

  getConfig(): AIConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.isEnabled && !!this.config.apiKey;
  }

  getDefaultModel(provider: AIProvider): string {
    return DEFAULT_MODELS[provider] || '';
  }

  async chat(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw new Error('AI service is not configured');
    }

    const config = this.config!;

    switch (config.provider) {
      case 'openai':
        return this.chatOpenAI(messages, config);
      case 'anthropic':
        return this.chatAnthropic(messages, config);
      default:
        throw new Error(`Provider ${config.provider} is not supported yet`);
    }
  }

  private async chatOpenAI(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    const endpoint = config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const model = config.model || DEFAULT_MODELS.openai;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.settings?.temperature || 0.7,
        max_tokens: config.settings?.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  private async chatAnthropic(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    const endpoint = config.apiEndpoint || 'https://api.anthropic.com/v1/messages';
    const model = config.model || DEFAULT_MODELS.anthropic;

    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemMessage,
        messages: chatMessages,
        max_tokens: config.settings?.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Anthropic API request failed');
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }

  async analyzeRFQ(rfqData: {
    productName: string;
    quantity: number;
    specifications?: string;
    supplierQuotes?: Array<{ supplier: string; price: number; leadTime?: string }>;
    targetPrice?: number;
    currency?: string;
  }): Promise<RFQAnalysisResult> {
    const systemPrompt = `You are an expert procurement analyst for international trade. 
Analyze the RFQ (Request for Quotation) data and provide insights.
Respond in JSON format with the following structure:
{
  "summary": "Brief summary of the RFQ analysis",
  "recommendations": ["List of actionable recommendations"],
  "riskFactors": ["List of potential risks to consider"],
  "suggestedPrice": { "min": number, "max": number, "recommended": number },
  "competitorAnalysis": "Analysis of supplier quotes if available"
}`;

    const userPrompt = `Analyze this RFQ:
Product: ${rfqData.productName}
Quantity: ${rfqData.quantity}
${rfqData.specifications ? `Specifications: ${rfqData.specifications}` : ''}
${rfqData.targetPrice ? `Target Price: ${rfqData.currency || 'USD'} ${rfqData.targetPrice}` : ''}
${rfqData.supplierQuotes?.length ? `
Supplier Quotes:
${rfqData.supplierQuotes.map(q => `- ${q.supplier}: ${rfqData.currency || 'USD'} ${q.price}${q.leadTime ? ` (Lead time: ${q.leadTime})` : ''}`).join('\n')}
` : ''}

Provide your analysis in JSON format.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid response format');
    } catch (e) {
      // Return a basic result if parsing fails
      return {
        summary: response.content,
        recommendations: [],
        riskFactors: [],
      };
    }
  }
}

export const aiAgentService = new AIAgentService();
export default aiAgentService;

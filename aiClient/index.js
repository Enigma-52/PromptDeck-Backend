import OpenAI from 'openai';
import config from '../config/index.js';

/**
 * OpenAI Client Class
 * Provides comprehensive OpenAI API operations with error handling and logging
 */
class OpenAIClient {
  constructor(config = {}) {
    const { apiKey, organization } = config;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey,
      organization,
    });

    this.config = config;
    this.isInitialized = true;
    
    console.log('🤖 OpenAI Client initialized successfully');
    if (organization) {
      console.log(`🏢 Organization: ${organization}`);
    }
  }

  /**
   * Chat Completions - For conversational AI (GPT-3.5, GPT-4, etc.)
   * @param {Object} options - Chat completion options
   * @param {Array} options.messages - Array of message objects
   * @param {string} options.model - Model to use (default: gpt-3.5-turbo)
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Creativity level (0-2)
   * @param {number} options.topP - Nucleus sampling parameter
   * @param {number} options.frequencyPenalty - Frequency penalty (-2 to 2)
   * @param {number} options.presencePenalty - Presence penalty (-2 to 2)
   * @param {Array} options.stop - Stop sequences
   * @param {boolean} options.stream - Enable streaming
   * @returns {Object} Chat completion response
   */
  async chatCompletion(messages , options = {}) {
    try {

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages array is required and cannot be empty');
      }

    const requestParams = {
      model: options.model || 'gpt-5-nano',
      messages,
    };

    if (options.maxTokens) {
      requestParams.max_completion_tokens = options.maxTokens;
    }

      const response = await this.client.chat.completions.create(requestParams);

      console.log(`✅ Chat Completion Success - Tokens used: ${response.usage?.total_tokens || 'N/A'}`);
      return response;

    } catch (error) {
      console.error('❌ Chat Completion Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Text Completions - For text completion (legacy models like text-davinci-003)
   * @param {Object} options - Completion options
   * @param {string} options.prompt - Input prompt
   * @param {string} options.model - Model to use
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Creativity level
   * @returns {Object} Completion response
   */
  async textCompletion(options = {}) {
    try {
      const {
        prompt,
        model = 'gpt-3.5-turbo-instruct',
        maxTokens = 1000,
        temperature = 0.7,
        topP = 1,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stop = null,
        n = 1
      } = options;

      if (!prompt) {
        throw new Error('Prompt is required for text completion');
      }

      console.log(`📝 Text Completion Request - Model: ${model}, Prompt length: ${prompt.length}`);

      const requestParams = {
        model,
        prompt,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        n
      };

      if (stop) requestParams.stop = stop;

      const response = await this.client.completions.create(requestParams);

      console.log(`✅ Text Completion Success - Tokens used: ${response.usage?.total_tokens || 'N/A'}`);
      return response;

    } catch (error) {
      console.error('❌ Text Completion Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Image Generation - Create images from text descriptions
   * @param {Object} options - Image generation options
   * @param {string} options.prompt - Image description
   * @param {string} options.model - Model to use (dall-e-2, dall-e-3)
   * @param {number} options.n - Number of images to generate
   * @param {string} options.size - Image size
   * @param {string} options.quality - Image quality (standard, hd)
   * @param {string} options.style - Image style (vivid, natural)
   * @returns {Object} Image generation response
   */
  async generateImage(options = {}) {
    try {
      const {
        prompt,
        model = 'dall-e-2',
        n = 1,
        size = '1024x1024',
        quality = 'standard',
        style = 'vivid',
        responseFormat = 'url'
      } = options;

      if (!prompt) {
        throw new Error('Prompt is required for image generation');
      }

      console.log(`🎨 Image Generation Request - Model: ${model}, Prompt: "${prompt.substring(0, 50)}..."`);

      const requestParams = {
        prompt,
        model,
        n,
        size,
        response_format: responseFormat
      };

      // DALL-E 3 specific parameters
      if (model === 'dall-e-3') {
        requestParams.quality = quality;
        requestParams.style = style;
      }

      const response = await this.client.images.generate(requestParams);

      console.log(`✅ Image Generation Success - Generated ${response.data.length} image(s)`);
      return response;

    } catch (error) {
      console.error('❌ Image Generation Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Audio Transcription - Convert audio to text
   * @param {Object} options - Transcription options
   * @param {File|Buffer} options.file - Audio file
   * @param {string} options.model - Model to use (whisper-1)
   * @param {string} options.language - Language code
   * @param {string} options.responseFormat - Response format
   * @returns {Object} Transcription response
   */
  async transcribeAudio(options = {}) {
    try {
      const {
        file,
        model = 'whisper-1',
        language = null,
        prompt = null,
        responseFormat = 'json',
        temperature = 0
      } = options;

      if (!file) {
        throw new Error('Audio file is required for transcription');
      }

      console.log(`🎵 Audio Transcription Request - Model: ${model}`);

      const requestParams = {
        file,
        model,
        response_format: responseFormat,
        temperature
      };

      if (language) requestParams.language = language;
      if (prompt) requestParams.prompt = prompt;

      const response = await this.client.audio.transcriptions.create(requestParams);

      console.log(`✅ Audio Transcription Success`);
      return response;

    } catch (error) {
      console.error('❌ Audio Transcription Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Audio Translation - Translate audio to English text
   * @param {Object} options - Translation options
   * @param {File|Buffer} options.file - Audio file
   * @param {string} options.model - Model to use (whisper-1)
   * @returns {Object} Translation response
   */
  async translateAudio(options = {}) {
    try {
      const {
        file,
        model = 'whisper-1',
        prompt = null,
        responseFormat = 'json',
        temperature = 0
      } = options;

      if (!file) {
        throw new Error('Audio file is required for translation');
      }

      console.log(`🌐 Audio Translation Request - Model: ${model}`);

      const requestParams = {
        file,
        model,
        response_format: responseFormat,
        temperature
      };

      if (prompt) requestParams.prompt = prompt;

      const response = await this.client.audio.translations.create(requestParams);

      console.log(`✅ Audio Translation Success`);
      return response;

    } catch (error) {
      console.error('❌ Audio Translation Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Text-to-Speech - Convert text to spoken audio
   * @param {Object} options - TTS options
   * @param {string} options.input - Text to convert
   * @param {string} options.model - Model to use (tts-1, tts-1-hd)
   * @param {string} options.voice - Voice to use
   * @param {string} options.responseFormat - Audio format
   * @returns {Object} Audio response
   */
  async textToSpeech(options = {}) {
    try {
      const {
        input,
        model = 'tts-1',
        voice = 'alloy',
        responseFormat = 'mp3',
        speed = 1.0
      } = options;

      if (!input) {
        throw new Error('Input text is required for text-to-speech');
      }

      console.log(`🔊 Text-to-Speech Request - Model: ${model}, Voice: ${voice}`);

      const response = await this.client.audio.speech.create({
        model,
        voice,
        input,
        response_format: responseFormat,
        speed
      });

      console.log(`✅ Text-to-Speech Success`);
      return response;

    } catch (error) {
      console.error('❌ Text-to-Speech Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Create Embeddings - Get vector representations of text
   * @param {Object} options - Embedding options
   * @param {string|Array} options.input - Text input(s)
   * @param {string} options.model - Model to use
   * @returns {Object} Embeddings response
   */
  async createEmbeddings(options = {}) {
    try {
      const {
        input,
        model = 'text-embedding-ada-002',
        encodingFormat = 'float'
      } = options;

      if (!input) {
        throw new Error('Input is required for embeddings');
      }

      console.log(`🔢 Embeddings Request - Model: ${model}, Input type: ${Array.isArray(input) ? 'array' : 'string'}`);

      const response = await this.client.embeddings.create({
        model,
        input,
        encoding_format: encodingFormat
      });

      console.log(`✅ Embeddings Success - Generated ${response.data.length} embedding(s)`);
      return response;

    } catch (error) {
      console.error('❌ Embeddings Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * List Available Models
   * @returns {Object} Available models response
   */
  async listModels() {
    try {
      console.log('📋 Fetching available models...');
      const response = await this.client.models.list();
      console.log(`✅ Found ${response.data.length} available models`);
      return response;
    } catch (error) {
      console.error('❌ List Models Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get Model Details
   * @param {string} modelId - Model ID to retrieve
   * @returns {Object} Model details
   */
  async getModel(modelId) {
    try {
      if (!modelId) {
        throw new Error('Model ID is required');
      }

      console.log(`🔍 Fetching model details for: ${modelId}`);
      const response = await this.client.models.retrieve(modelId);
      console.log(`✅ Retrieved model details for: ${modelId}`);
      return response;
    } catch (error) {
      console.error('❌ Get Model Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Streaming Chat Completion
   * @param {Object} options - Same as chatCompletion but with stream: true
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise} Resolves when stream completes
   */
  async streamChatCompletion(options = {}, onChunk) {
    try {
      const streamOptions = { ...options, stream: true };
      console.log(`🌊 Starting streaming chat completion - Model: ${options.model || 'gpt-3.5-turbo'}`);

      const stream = await this.client.chat.completions.create(streamOptions);

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          if (onChunk) {
            onChunk(content, fullContent, chunk);
          }
        }
      }

      console.log(`✅ Streaming completed - Total content length: ${fullContent.length}`);
      return { content: fullContent };

    } catch (error) {
      console.error('❌ Streaming Chat Error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get client configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      organization: this.config.organization,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Test connection to OpenAI API
   * @returns {boolean} Connection status
   */
  async testConnection() {
    try {
      console.log('🧪 Testing OpenAI connection...');
      await this.listModels();
      console.log('✅ OpenAI connection test successful');
      return true;
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  _handleError(error) {
    if (error.response?.data) {
      return new Error(`OpenAI API Error: ${error.response.data.error?.message || 'Unknown error'}`);
    }
    return error;
  }
}

/**
 * AI Client Factory - Creates instances of different AI providers
 */
class AIClientFactory {
  /**
   * Create OpenAI client instance
   * @param {Object} config - OpenAI configuration
   * @returns {OpenAIClient} OpenAI client instance
   */
  static createOpenAIClient(config) {
    return new OpenAIClient(config);
  }

  // Future: Add other AI providers
  // static createAnthropicClient(config) { ... }
  // static createGoogleClient(config) { ... }
}

// Create and initialize the default OpenAI client instance
let defaultOpenAIClient = null;

// Initialize the default client only if API key is available
if (config.openai.apiKey) {
  try {
    defaultOpenAIClient = AIClientFactory.createOpenAIClient({
      apiKey: config.openai.apiKey,
      organization: config.openai.organization,
    });
    console.log('🤖 Default OpenAI client initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize default OpenAI client:', error.message);
    console.warn('💡 Make sure OPENAI_API_KEY is set in your environment variables');
  }
} else {
  console.warn('⚠️ OpenAI API key not found in configuration');
  console.warn('💡 Set OPENAI_API_KEY in your .env file to use the default client');
}

// Export classes and default instance
export { OpenAIClient, AIClientFactory, defaultOpenAIClient };
export default defaultOpenAIClient;

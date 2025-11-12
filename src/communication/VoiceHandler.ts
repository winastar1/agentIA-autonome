import logger from '../utils/logger';
import { config } from '../utils/config';

export class VoiceHandler {
  private enabled: boolean = false;

  constructor() {
    this.enabled = !!(config.voice.elevenlabs || config.voice.deepgram);
    if (this.enabled) {
      logger.info('Voice handler initialized');
    } else {
      logger.info('Voice handler disabled (no API keys configured)');
    }
  }

  async textToSpeech(text: string): Promise<Buffer | null> {
    if (!this.enabled) {
      logger.warn('Voice handler not enabled');
      return null;
    }

    logger.info('Converting text to speech', { textLength: text.length });

    try {
      if (config.voice.elevenlabs) {
        return await this.elevenLabsTTS(text);
      }
      
      logger.warn('No TTS provider available');
      return null;
    } catch (error: any) {
      logger.error('Text-to-speech failed', { error: error.message });
      return null;
    }
  }

  async speechToText(audioBuffer: Buffer): Promise<string | null> {
    if (!this.enabled) {
      logger.warn('Voice handler not enabled');
      return null;
    }

    logger.info('Converting speech to text', { bufferSize: audioBuffer.length });

    try {
      if (config.voice.deepgram) {
        return await this.deepgramSTT(audioBuffer);
      }

      logger.warn('No STT provider available');
      return null;
    } catch (error: any) {
      logger.error('Speech-to-text failed', { error: error.message });
      return null;
    }
  }

  private async elevenLabsTTS(text: string): Promise<Buffer> {
    const axios = require('axios');
    
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      {
        headers: {
          'xi-api-key': config.voice.elevenlabs,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }

  private async deepgramSTT(audioBuffer: Buffer): Promise<string> {
    const axios = require('axios');

    const response = await axios.post(
      'https://api.deepgram.com/v1/listen',
      audioBuffer,
      {
        headers: {
          Authorization: `Token ${config.voice.deepgram}`,
          'Content-Type': 'audio/wav',
        },
      }
    );

    const transcript = response.data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    return transcript || '';
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

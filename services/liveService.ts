
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { PRIYANKA_SYSTEM_INSTRUCTION } from "../types";
import { generateImage } from "./geminiService";

// Helper: Convert Float32 to Int16 PCM (Little Endian)
function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const generateRoastImageTool: FunctionDeclaration = {
  name: "generate_roast_image",
  description: "Generates a funny, caricature-style image of the user to roast them.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "Visual description of the funny/roast image.",
      },
    },
    required: ["description"],
  },
};

export class LiveClient {
  private client: GoogleGenAI;
  private audioContext: AudioContext | null = null;
  private workletNode: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private nextStartTime: number = 0;
  private isConnected: boolean = false;
  private videoInterval: number | null = null;
  
  public onAudioData: (isPlaying: boolean) => void = () => {};
  public onImageGenerated: (url: string) => void = () => {};
  public onTextReceived: (text: string, isUser: boolean) => void = () => {};
  public onVolumeLevel: (level: number) => void = () => {};

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(mediaStream: MediaStream, videoElement?: HTMLVideoElement) {
    if (this.isConnected) return;

    // Use standard AudioContext with native sample rate
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume context immediately to bypass browser autoplay restrictions
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        systemInstruction: PRIYANKA_SYSTEM_INSTRUCTION,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, 
        },
        tools: [{ functionDeclarations: [generateRoastImageTool] }],
      },
    };

    const sessionPromise = this.client.live.connect({
      model: config.model,
      config: config.config,
      callbacks: {
        onopen: () => {
          console.log("Live Session Connected");
          this.isConnected = true;
          this.startAudioInput(mediaStream, sessionPromise);
          
          if (videoElement) {
            this.startVideoInput(videoElement, sessionPromise);
          }
        },
        onmessage: async (msg: LiveServerMessage) => {
          this.handleMessage(msg, sessionPromise);
        },
        onclose: () => {
          console.log("Live Session Closed");
          this.cleanup();
        },
        onerror: (err) => {
          console.error("Live Session Error", err);
          this.cleanup();
        }
      }
    });
  }

  private startAudioInput(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.audioContext) return;

    this.inputSource = this.audioContext.createMediaStreamSource(stream);
    
    // 4096 is a safe buffer size for most devices
    this.workletNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.workletNode.onaudioprocess = (e) => {
      if (!this.isConnected || !this.audioContext) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for UI visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeLevel(rms);

      // Convert to PCM
      const pcm16 = floatTo16BitPCM(inputData);
      const base64Data = arrayBufferToBase64(pcm16);

      // Send with correct sample rate header so Gemini understands the speed
      const mimeType = `audio/pcm;rate=${this.audioContext.sampleRate}`;

      sessionPromise.then(session => {
        session.sendRealtimeInput({
          media: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      });
    };

    this.inputSource.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  private startVideoInput(videoEl: HTMLVideoElement, sessionPromise: Promise<any>) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const FPS = 1; // Send 1 frame per second to save tokens but allow face detection

    this.videoInterval = window.setInterval(() => {
        if (!this.isConnected || !ctx) return;

        // Draw video frame to canvas
        canvas.width = videoEl.videoWidth / 4; // Downscale for performance
        canvas.height = videoEl.videoHeight / 4;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        // Get base64 data
        const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        
        sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            });
        });
    }, 1000 / FPS);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // 1. Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.audioContext) {
      this.playAudio(audioData);
    }

    // 2. Tool Calls
    const toolCall = message.toolCall;
    if (toolCall) {
      for (const fc of toolCall.functionCalls) {
        if (fc.name === 'generate_roast_image') {
          const prompt = (fc.args as any).description;
          console.log("Generating image for:", prompt);
          
          const imageUrl = await generateImage(prompt + ", funny caricature style, distorted, roast");
          if (imageUrl) {
            this.onImageGenerated(imageUrl);
          }

          // Follow the official guideline structure: object, not array
          sessionPromise.then(session => {
            session.sendToolResponse({
              functionResponses: {
                id: fc.id,
                name: fc.name,
                response: { result: "Image generated successfully." }
              } as any // Cast to any to bypass potential array type check in SDK if it conflicts with guidelines
            });
          });
        }
      }
    }
  }

  private async playAudio(base64Data: string) {
    if (!this.audioContext) return;
    
    this.onAudioData(true);

    const binary = base64ToUint8Array(base64Data);
    const dataInt16 = new Int16Array(binary.buffer);
    
    // Gemini Output is typically 24000Hz
    const buffer = this.audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;

    source.onended = () => {
      if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.2) {
        this.onAudioData(false);
      }
    };
  }

  private cleanup() {
    this.isConnected = false;
    this.onAudioData(false);
    
    if (this.videoInterval) {
        clearInterval(this.videoInterval);
        this.videoInterval = null;
    }

    this.workletNode?.disconnect();
    this.inputSource?.disconnect();
    this.audioContext?.close();
    this.audioContext = null;
  }

  public disconnect() {
    this.cleanup();
  }
}

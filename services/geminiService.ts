import {
    GoogleGenAI,
    Chat,
    GenerateContentResponse,
    LiveSession,
    LiveSessionCallbacks,
    Modality,
    Type,
    FunctionDeclaration,
} from "@google/genai";

// --- April's Internal Data Bank (For Offline Mode) ---

const aprilNews = [
    { title: "Static Anomaly Detected in Orion Arm", summary: "A stable, repeating energy signature has been logged by deep space probes. Analysis is ongoing.", url: "#", thumbnailUrl: "https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?q=80&w=870&auto=format&fit=crop" },
    { title: "Exo-Atmospheric Pressure Shielding Shows Promise", summary: "Lab simulations of new magneto-relays suggest a 200% increase in cosmic ray deflection efficiency.", url: "#", thumbnailUrl: "https://images.unsplash.com/photo-1504333638930-c8787321eee0?q=80&w=870&auto=format&fit=crop" },
    { title: "Subspace Comms Relay Deployed", summary: "The new relay near Wolf 359 has successfully come online, reducing interstellar communication latency by 12%.", url: "#", thumbnailUrl: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=774&auto=format&fit=crop" }
];

const aprilQuotes = [
    { quote: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
    { quote: "The good thing about science is that it's true whether or not you believe in it.", author: "Neil deGrasse Tyson" },
    { quote: "We are all in the gutter, but some of us are looking at the stars.", author: "Oscar Wilde" }
];

const aprilGreetings = [
    "Welcome, Dr. Brank. All systems are operating within normal parameters.",
    "Good day, Dr. Brank. I am ready to assist with your research.",
    "Greetings, Doctor. My internal chronometer indicates it is a good time for scientific discovery."
];

const aprilAdvice = {
    text: "Based on my internal analysis, focusing on cross-referencing your stellar lifecycle data with recent exoplanet findings could yield significant breakthroughs. I also recommend allocating some time to review the latest publications on gravitational lensing, which I have archived locally.",
    sources: []
};

export const aprilKnowledge: { [key: string]: string } = {
    'black hole': 'A black hole is a region of spacetime where gravity is so strong that nothing, including light or other electromagnetic waves, has enough energy to escape it. My data banks indicate their event horizons are points of no return.',
    'supernova': 'A supernova is a powerful and luminous stellar explosion. This transient astronomical event occurs during the last evolutionary stages of a massive star or when a white dwarf is triggered into runaway nuclear fusion.',
    'galaxy': 'A galaxy is a gravitationally bound system of stars, stellar remnants, interstellar gas, dust, and dark matter. The word is derived from the Greek galaxias, literally "milky", a reference to the Milky Way galaxy that contains our Solar System.',
    'hello': 'Greetings, Dr. Brank. How may I assist you?',
    'help': 'I can assist with data analysis, content generation, device control simulations, and providing information from my internal data banks. What is your query?',
    'april': 'I am April, your personal astronomy assistant. I am currently operating in offline mode, using my internal knowledge base.',
};


// The API key is automatically picked up from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Utility Functions ---

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const decodeAndGetAudioBuffer = async (
    base64: string,
    ctx: AudioContext
): Promise<AudioBuffer> => {
    const decoded = decode(base64);
    return await decodeAudioData(decoded, ctx, 24000, 1);
};

export const bufferToWave = (abuffer: AudioBuffer): string => {
    const numOfChan = abuffer.numberOfChannels;
    const len = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(len);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(len - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(len - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < len) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++; // next source sample
    }

    const wavBlob = new Blob([view], { type: "audio/wav" });
    return URL.createObjectURL(wavBlob);

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
};


// --- Core Gemini Services ---

export const createChat = (systemInstruction: string, tools?: FunctionDeclaration[]): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            tools: tools ? [{ functionDeclarations: tools }] : undefined,
        },
    });
};

export const generateText = async (prompt: string, useGrounding: boolean): Promise<GenerateContentResponse> => {
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            tools: useGrounding ? [{ googleSearch: {} }] : undefined,
        },
    });
};

export const textToSpeech = async (text: string): Promise<AudioBuffer> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say with a clear and friendly tone: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API.");
    }
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
    );
    outputAudioContext.close();
    return audioBuffer;
};

export const multiSpeakerTextToSpeech = async (script: string): Promise<AudioBuffer> => {
    const prompt = `TTS the following conversation between Host and April:\n\n${script}`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Host', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                        { speaker: 'April', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
                    ]
                }
            }
        }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API.");
    }
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1
    );
    outputAudioContext.close();
    return audioBuffer;
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        },
    });
    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
};

export const editImage = async (prompt: string, base64ImageData: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No edited image returned.");
};

export const analyzeImage = async (prompt: string, base64ImageData: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
    });
    return response.text;
};

export const generateVideo = async (prompt: string, image: { base64: string, mimeType: string } | null, aspectRatio: '16:9' | '9:16'): Promise<string> => {
    const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await videoAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: image ? { imageBytes: image.base64, mimeType: image.mimeType } : undefined,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await videoAi.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed, no download link found.");
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const analyzeVideo = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `The user has uploaded a video and asked the following: "${prompt}". Provide a detailed analysis based on this description, assuming you have seen the video.`,
    });
    return response.text;
};

export const connectLive = (callbacks: LiveSessionCallbacks): Promise<LiveSession> => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: 'You are April, a friendly and helpful astronomy assistant.',
        },
    });
};

// --- Application-Specific Services ---
export const generateArticleOutline = async (topic: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Generate a detailed article outline for the topic: "${topic}". The outline should be well-structured with main sections (using Roman numerals) and sub-points (using letters and numbers). It should be suitable for a professional article.`,
    });
    return response.text;
};

export const generateArticleAbstract = async (topic: string, outline: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following topic and outline, write a concise and professional abstract of about 150-200 words.\n\nTopic: ${topic}\n\nOutline:\n${outline}`,
    });
    return response.text;
};

export const generateArticleSection = async (topic: string, outline: string, section: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are writing an article on "${topic}" with the overall outline:\n${outline}\n\nNow, write a detailed and engaging content for the following section: "${section}". Ensure it fits coherently within the larger article structure. Use markdown for formatting.`,
    });
    return response.text;
};

export const generatePodcastScript = async (theme: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a short, engaging podcast script for an episode about "${theme}". The script should be for two speakers: a friendly Host and an expert, April. Include an intro, a main discussion segment, and an outro. Format the script clearly with speaker names followed by a colon (e.g., Host:).`,
    });
    return response.text;
};

export const summarizeText = async (notes: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize the following study notes into key points. Use bullet points for clarity and conciseness:\n\n---\n\n${notes}`,
    });
    return response.text;
};

export const generateDailyGreeting = async (name: string, isOnline: boolean): Promise<string> => {
    if (!isOnline) {
        const randomIndex = Math.floor(Math.random() * aprilGreetings.length);
        return Promise.resolve(aprilGreetings[randomIndex]);
    }
    const prompt = `You are April, a helpful AI assistant. Generate a short, personalized morning greeting for ${name}. Using Google Search, find a significant event, anniversary, or fun fact related to astronomy or physics for today's date, ${new Date().toDateString()}. Keep the greeting under 30 words and sound encouraging.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        return response.text;
    } catch (e) {
        console.error("Failed to generate daily greeting, returning fallback.", e);
        const randomIndex = Math.floor(Math.random() * aprilGreetings.length);
        return aprilGreetings[randomIndex];
    }
};

export const getSpaceNews = async (isOnline: boolean): Promise<any[]> => {
    if (!isOnline) {
        return Promise.resolve(aprilNews);
    }
    
    try {
        const searchPrompt = "Using Google Search, find the top 3 latest and most significant space news articles from major agencies like NASA, ESA, and SpaceX.";
        
        const searchResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: searchPrompt }] },
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const unstructuredText = searchResponse.text;
        
        if (!unstructuredText) {
            console.error("Google Search for news returned empty text. Returning fallback data.");
            return aprilNews;
        }

        const structurePrompt = `From the following text, extract 3 news articles. Format them as a valid JSON array where each object has keys: "title", "summary", "url", and "thumbnailUrl". Ensure all fields are populated. If a thumbnail URL is not explicitly available in the text for an article, find a suitable, publicly available image URL related to the article's topic (e.g., from a stock photo site or the space agency's media gallery). Text: \n\n${unstructuredText}`;

        const structureResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: structurePrompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            url: { type: Type.STRING },
                            thumbnailUrl: { type: Type.STRING },
                        },
                        required: ["title", "summary", "url", "thumbnailUrl"],
                    }
                }
            }
        });

        return JSON.parse(structureResponse.text.trim());

    } catch (e) {
        console.error("Failed to fetch or parse space news, returning fallback data:", e);
        return aprilNews;
    }
};

export const generateScientistQuote = async (isOnline: boolean): Promise<{ quote: string; author: string }> => {
    if (!isOnline) {
        const randomIndex = Math.floor(Math.random() * aprilQuotes.length);
        return Promise.resolve(aprilQuotes[randomIndex]);
    }
    const prompt = `Provide an inspiring and thought-provoking quote from a famous scientist (like Albert Einstein, Marie Curie, Carl Sagan, Richard Feynman, etc.).`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quote: { type: Type.STRING, description: "The text of the quote." },
                        author: { type: Type.STRING, description: "The author of the quote." },
                    },
                    required: ["quote", "author"],
                },
            },
        });

        return JSON.parse(response.text.trim());
    } catch (e) {
        console.error("Failed to fetch or parse quote JSON, returning fallback data:", e);
        const randomIndex = Math.floor(Math.random() * aprilQuotes.length);
        return aprilQuotes[randomIndex];
    }
};

export const generatePersonalizedAdvice = async (profile: {name: string, career: string, passion: string}, isOnline: boolean): Promise<{ text: string, sources: any[] }> => {
    if (!isOnline) {
        return Promise.resolve(aprilAdvice);
    }
    const prompt = `Based on the profile of ${profile.name}, a ${profile.career} passionate about ${profile.passion}, and considering current online information from Google Search, provide 2-3 actionable and insightful pieces of advice to help them boost their research, studies, and financial abilities. Format the advice in clear, concise sections with markdown. Be encouraging and professional.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text: response.text, sources };
    } catch (e) {
        console.error("Failed to fetch personalized advice, returning fallback data:", e);
        return aprilAdvice;
    }
};

export const generateWebsiteCode = async (description: string): Promise<string> => {
    const prompt = `You are an expert web developer. Based on the following description, generate a complete, single-file HTML document that includes HTML, CSS, and JavaScript.
The CSS should be in a <style> tag in the <head> and the JavaScript should be in a <script> tag at the end of the <body>.
The code should be well-structured, modern, and functional. If the user mentions needing an API, use a placeholder and add comments explaining where to insert a real API key.

Description: "${description}"

Generate the code now.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    // Clean up markdown fences
    return response.text.replace(/^```html\n|```$/g, '').trim();
};


// --- Study Module Services ---

export const generateCurriculum = async (subject: string, description: string): Promise<any> => {
    const prompt = `Generate a comprehensive, step-by-step learning curriculum for the subject "${subject}". The user describes it as: "${description}". The curriculum should be structured for a beginner-to-pro progression. Organize it into logical modules, and within each module, list specific topics to be covered.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    modules: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                             required: ['title', 'topics'],
                        }
                    }
                },
                 required: ['subject', 'modules'],
            }
        },
    });
    return JSON.parse(response.text.trim());
};

export const generateLessonContent = async (topic: string, subject: string): Promise<string> => {
    const prompt = `Provide a detailed and clear explanation for the topic "${topic}" within the subject of "${subject}". Use markdown for formatting, including headers, lists, and code blocks where appropriate. The explanation should be suitable for someone learning this topic for the first time.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
};

export const generateQuiz = async (topic: string, subject: string): Promise<any[]> => {
    const prompt = `Create a multiple-choice quiz with 5 questions about the topic "${topic}" in the subject of "${subject}". For each question, provide 4 options and indicate the correct answer.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                    },
                    required: ['question', 'options', 'correctAnswer'],
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
};

export const generateFlashcards = async (topic: string, subject: string): Promise<any[]> => {
    const prompt = `Generate a set of 5 flashcards for the topic "${topic}" in the subject of "${subject}". Each flashcard should have a "front" (a question or term) and a "back" (the answer or definition).`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING },
                    },
                    required: ['front', 'back'],
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
};

export const evaluatePythonCode = async (code: string): Promise<string> => {
    const prompt = `Analyze the following Python code. Provide feedback on its correctness, efficiency, and style. If there are errors, explain them and suggest a correction. If it's correct, explain what it does and suggest potential improvements or alternative approaches.\n\n---\n\n${code}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    return response.text;
};

export const generateQuizFromNotes = async (notes: string): Promise<any[]> => {
    const prompt = `Based on the following study notes, create a multiple-choice quiz with 5 questions to test understanding. For each question, provide 4 options and indicate the correct answer.\n\nNotes:\n---\n${notes}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                    },
                    required: ['question', 'options', 'correctAnswer'],
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
};

export const generateFlashcardsFromNotes = async (notes: string): Promise<any[]> => {
    const prompt = `Generate a set of 5 flashcards from the following study notes. Each flashcard should have a "front" (a key term or question) and a "back" (the definition or answer).\n\nNotes:\n---\n${notes}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING },
                    },
                    required: ['front', 'back'],
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
};

export const generateExerciseFromNotes = async (notes: string): Promise<string> => {
    const prompt = `Create a short, practical exercise based on the following study notes to help solidify understanding. The exercise should be a problem to solve or a concept to apply. Provide the exercise prompt clearly, using markdown for formatting.\n\nNotes:\n---\n${notes}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
};

export const generatePodcastScriptFromNotes = async (notes: string): Promise<string> => {
    const prompt = `Based on the following study notes, write a short, engaging podcast script for an episode explaining these concepts. The script should be for two speakers: a friendly Host and an expert, April. Include an intro, a main discussion segment, and an outro. Format the script clearly with speaker names followed by a colon (e.g., Host:).\n\nNotes:\n---\n${notes}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
};
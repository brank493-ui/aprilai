import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, UserProfile, Project } from '../types';
import * as geminiService from '../services/geminiService';
import type { LiveServerMessage, FunctionDeclaration } from "@google/genai";
import { Chat, Type } from "@google/genai";

// --- Utility Functions ---
const triggerHapticFeedback = (duration: number = 5) => {
    if (navigator.vibrate) navigator.vibrate(duration);
};

// --- SVG Icons (Component) ---
const Icons: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
    const icons: { [key: string]: React.ReactNode } = {
        chat: <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
        image: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
        video: <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />,
        audio: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
        send: <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
        sound: <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />,
        upload: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
        record: <path fill="currentColor" d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
        stop: <path fill="currentColor" d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />,
        mic: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
        paperclip: <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />,
        x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    };
    return <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{icons[name]}</svg>;
};

// --- Reusable UI Components ---
const Loader: React.FC<{ text?: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
        <p className="text-cyan-300 font-orbitron">{text || 'Processing...'}</p>
    </div>
);

// --- Feature Components ---
const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'sendEmail',
        description: 'Sends an email to a specified recipient.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                recipient: { type: Type.STRING, description: 'Email address of the recipient.' },
                subject: { type: Type.STRING, description: 'The subject of the email.' },
                body: { type: Type.STRING, description: 'The content of the email.' },
            },
            required: ['recipient', 'subject', 'body'],
        },
    },
    {
        name: 'makeCall',
        description: 'Makes a phone call or a social media call to a contact.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                contactName: { type: Type.STRING, description: 'The name of the person or contact to call.' },
                callType: { type: Type.STRING, description: 'The type of call, e.g., "phone", "WhatsApp", "FaceTime".', enum: ['phone', 'WhatsApp', 'FaceTime', 'Telegram'] },
            },
            required: ['contactName', 'callType'],
        },
    },
    {
        name: 'sendSocialMediaMessage',
        description: 'Sends a message on a social media platform.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                platform: { type: Type.STRING, description: 'The social media platform, e.g., "WhatsApp", "Twitter", "Instagram".' },
                recipient: { type: Type.STRING, description: 'The username or contact name of the recipient.' },
                message: { type: Type.STRING, description: 'The content of the message.' },
            },
            required: ['platform', 'recipient', 'message'],
        },
    },
    {
        name: 'openApp',
        description: 'Opens an application on the user\'s device.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                appName: { type: Type.STRING, description: 'The name of the app to open, e.g., "Gallery", "Spotify", "Google Maps".' },
            },
            required: ['appName'],
        },
    },
];

const StarshipChat: React.FC<{ profile: UserProfile, projects: Project[] }> = ({ profile, projects }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const defaultMessage: ChatMessage = {
            id: '1',
            role: 'model',
            text: `Greetings, Dr. Brank! I am April. I see you're working on a few projects. How can I assist you and your research today?`
        };
        try {
            const savedMessages = localStorage.getItem('starshipChatHistory');
            if (savedMessages) {
                const parsedMessages = JSON.parse(savedMessages);
                if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                    return parsedMessages;
                }
            }
            return [defaultMessage];
        } catch (error) {
            console.error("Failed to load messages from localStorage. Clearing corrupted data.", error);
            localStorage.removeItem('starshipChatHistory');
            return [defaultMessage];
        }
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatInstance, setChatInstance] = useState<Chat | null>(null);
    const [useGrounding, setUseGrounding] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            const projectSummary = projects.length > 0
                ? `Their current projects are: ${projects.map(p => `"${p.title}" (Status: ${p.status})`).join(', ')}. You should naturally inquire about their progress on these projects when relevant.`
                : "They currently have no active projects listed.";

            const systemInstruction = `You are April, an expert astronomy assistant with device control capabilities. You are speaking with Dr. Brank, a renowned ${profile.career}. You must always address them as Dr. Brank.
            Their profile is: ${JSON.stringify({ passion: profile.passion, bio: profile.bio, university: profile.university })}.
            ${projectSummary}
            When asked to perform an action, use the provided tools. If the user provides an image, you must acknowledge it and incorporate it into your response.`;

            try {
                setChatInstance(geminiService.createChat(systemInstruction, functionDeclarations));
            } catch (error) {
                console.error("Failed to initialize StarshipChat (likely missing API Key):", error);
                setMessages(prev => [...prev, { id: 'error-init', role: 'model', text: "Warning: API Key missing or invalid. Chat features may be unavailable." }]);
            }
        }
    }, [profile, projects]);

    useEffect(() => {
        try {
            localStorage.setItem('starshipChatHistory', JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save messages to localStorage", error);
        }
    }, [messages]);
    
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setInput(input + finalTranscript + interimTranscript);
            };
            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, [input]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const playTTS = async (text: string) => {
        triggerHapticFeedback();
        try {
            const audioBuffer = await geminiService.textToSpeech(text);
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        } catch (error) {
            console.error("TTS Error:", error);
        }
    };

    const handleConversationTurn = async (request: string | { message: any }) => {
        if (!chatInstance) return;
        
        const stream = await chatInstance.sendMessageStream(
             typeof request === 'string' ? { message: request } : request
        );

        let responseText = '';
        const functionCalls: any[] = [];
        const modelMessageId = (Date.now() + 1).toString();
        let hasAddedModelMessage = false;

        for await (const chunk of stream) {
            responseText += chunk.text;
            if (chunk.functionCalls) {
                functionCalls.push(...chunk.functionCalls);
            }

            if (!hasAddedModelMessage) {
                setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: responseText }]);
                hasAddedModelMessage = true;
            } else {
                setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: responseText } : m));
            }
        }

        if (functionCalls.length > 0) {
            const functionCallText = functionCalls.map(fc => `Executing: ${fc.name}(${JSON.stringify(fc.args)})`).join('\n');
            const systemMessage: ChatMessage = { id: Date.now().toString(), role: 'model', text: `*[Simulating Action]*\n> ${functionCallText}` };
            setMessages(prev => [...prev, systemMessage]);

            const functionResponseParts = functionCalls.map(fc => ({
                functionResponse: {
                    id: fc.id,
                    name: fc.name,
                    response: { result: `Action '${fc.name}' was simulated successfully.` }
                }
            }));
            
            await handleConversationTurn({ message: functionResponseParts });
        }
    };
    
    const sendMessage = async () => {
        if (!input.trim() && !imageFile) return;
        if (!chatInstance) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Chat unavailable. Please check API Key.' }]);
            return;
        }

        triggerHapticFeedback();

        const userMessage: ChatMessage = { 
            id: Date.now().toString(), 
            role: 'user', 
            text: input, 
            image: imagePreview || undefined 
        };
        setMessages(prev => [...prev, userMessage]);
        
        const currentInput = input;
        const currentImageFile = imageFile;
        setInput('');
        setImageFile(null);
        setImagePreview(null);
        setIsLoading(true);

        try {
            if (useGrounding) {
                 const response = await geminiService.generateText(currentInput, true);
                 const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                 const modelMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response.text, groundingChunks };
                 setMessages(prev => [...prev, modelMessage]);
            } else if (currentImageFile) {
                const base64 = await geminiService.fileToBase64(currentImageFile);
                const imagePart = { inlineData: { data: base64, mimeType: currentImageFile.type }};
                const textPart = { text: currentInput };
                const parts = [textPart, imagePart];
                await handleConversationTurn({ message: parts });
            } else {
                 await handleConversationTurn(currentInput);
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { id: 'error', role: 'model', text: "Apologies, I've encountered a cosmic anomaly. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleRecording = () => {
        triggerHapticFeedback();
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            if (e.target) e.target.value = ''; // Reset file input
        }
    };

    return (
      <div className="h-full flex flex-col bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-orbitron text-black flex-shrink-0">A</div>}
              <div className={`max-w-md lg:max-w-2xl p-4 rounded-xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                {msg.image && <img src={msg.image} alt="User upload" className="max-w-xs rounded-lg mb-2" />}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-gray-600">
                        <h4 className="text-sm font-bold text-cyan-400 mb-2">Sources:</h4>
                        <ul className="text-xs space-y-1">
                            {msg.groundingChunks.map((chunk, index) => (
                                <li key={index}>
                                    <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline break-all">
                                        {index + 1}. {chunk.web.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {msg.role === 'model' && !isLoading && msg.text && !msg.text.startsWith('*[Simulating Action]*') && (
                    <button onClick={() => playTTS(msg.text)} className="mt-2 text-cyan-400 hover:text-cyan-200">
                        <Icons name="sound" className="w-5 h-5" />
                    </button>
                )}
              </div>
              {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-orbitron text-white flex-shrink-0">U</div>}
            </div>
          ))}
          {isLoading && <div className="flex justify-start items-start gap-4"><div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-orbitron text-black flex-shrink-0">A</div><Loader text="Thinking..." /></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-gray-700 bg-gray-900/70 rounded-b-lg">
           {imagePreview && (
                <div className="relative w-24 h-24 mb-2 p-1 border border-gray-600 rounded">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded"/>
                    <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white">
                        <Icons name="x" className="w-4 h-4" />
                    </button>
                </div>
            )}
          <div className="flex items-center bg-gray-800 rounded-lg p-2">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-cyan-400 hover:bg-gray-700">
                <Icons name="paperclip" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Ask about the universe, or ask me to do something..."
              className="flex-1 bg-transparent focus:outline-none resize-none p-2 text-gray-200"
              rows={1}
            />
            <button onClick={toggleRecording} className={`p-2 rounded-full hover:bg-gray-700 ${isRecording ? 'text-red-500' : 'text-cyan-400'}`}>
                <Icons name="mic" />
            </button>
            <button onClick={sendMessage} disabled={isLoading || (!input.trim() && !imageFile)} className="p-2 rounded-full text-cyan-400 hover:bg-gray-700 disabled:text-gray-500">
              <Icons name="send" />
            </button>
          </div>
           <div className="flex items-center mt-2">
                <input type="checkbox" id="grounding-checkbox" checked={useGrounding} onChange={() => setUseGrounding(!useGrounding)} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                <label htmlFor="grounding-checkbox" className="ml-2 text-sm font-medium text-gray-300">Use Google Search</label>
            </div>
        </div>
      </div>
    );
};

const ImageNebula: React.FC = () => {
    const [mode, setMode] = useState<'generate' | 'edit' | 'analyze'>('generate');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setOriginalImage(URL.createObjectURL(file));
            setResultImage(null);
            setAnalysis('');
            setError(null);
        }
    };

    const handleSubmit = async () => {
        triggerHapticFeedback();
        setIsLoading(true);
        setError(null);
        setResultImage(null);
        setAnalysis('');
        try {
            if (mode === 'generate') {
                if (!prompt) { setError("Please enter a prompt."); setIsLoading(false); return; }
                const images = await geminiService.generateImage(prompt, aspectRatio);
                setResultImage(images[0]);
            } else if (imageFile && originalImage) {
                const base64 = await geminiService.fileToBase64(imageFile);
                if (mode === 'edit') {
                    if (!prompt) { setError("Please enter an editing instruction."); setIsLoading(false); return; }
                    const edited = await geminiService.editImage(prompt, base64, imageFile.type);
                    setResultImage(edited);
                } else if (mode === 'analyze') {
                    const analysisText = await geminiService.analyzeImage("Analyze this astronomical image in detail.", base64, imageFile.type);
                    setAnalysis(analysisText);
                }
            } else {
                setError("Please upload an image for this mode.");
            }
        } catch (err) {
            console.error("Image Nebula Error:", err);
            setError("Failed to process image. The cosmic rays might be interfering.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetState = () => {
        setPrompt('');
        setImageFile(null);
        setOriginalImage(null);
        setResultImage(null);
        setAnalysis('');
        setIsLoading(false);
        setError(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-4">
            <div className="lg:w-1/3 bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex flex-col">
                <div className="flex justify-center border-b border-gray-700 mb-4">
                    {(['generate', 'edit', 'analyze'] as const).map(m => (
                        <button key={m} onClick={() => { setMode(m); resetState(); }} className={`px-4 py-2 text-sm font-bold capitalize transition ${mode === m ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>
                            {m}
                        </button>
                    ))}
                </div>

                <div className="space-y-4 flex-1 flex flex-col">
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={
                        mode === 'generate' ? "e.g., A vibrant nebula with swirling clouds of gas and dust..." :
                        mode === 'edit' ? "e.g., Add a futuristic spaceship flying through..." :
                        "Analysis prompt is pre-set. Just upload an image."
                    } className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" disabled={mode === 'analyze'}/>

                    {mode === 'generate' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                            <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                <option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option>
                            </select>
                        </div>
                    )}

                    {(mode === 'edit' || mode === 'analyze') && (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                            <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="image-upload" />
                            <label htmlFor="image-upload" className="cursor-pointer">
                                <Icons name="upload" className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                                <p className="text-sm text-gray-400">{imageFile ? imageFile.name : 'Click to upload an image'}</p>
                            </label>
                            {originalImage && <img src={originalImage} alt="Uploaded preview" className="mt-4 max-h-32 rounded-lg" />}
                        </div>
                    )}
                </div>
                
                <button onClick={handleSubmit} disabled={isLoading} className="mt-4 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600">
                    {isLoading ? 'Processing...' : `Start ${mode}`}
                </button>
                {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
            </div>
            <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex items-center justify-center">
                {isLoading ? <Loader /> : (
                    <div className="w-full h-full flex items-center justify-center gap-4">
                        {mode === 'edit' && originalImage && <div className="w-1/2"><p className="text-center mb-2 font-orbitron">Original</p><img src={originalImage} alt="Original" className="max-w-full max-h-[80vh] object-contain rounded-lg"/></div>}
                        {(resultImage || analysis) && <div className={mode === 'edit' ? 'w-1/2 h-full flex flex-col' : 'w-full h-full flex flex-col'}>
                             <p className="text-center mb-2 font-orbitron">{mode === 'analyze' ? 'Analysis' : 'Result'}</p>
                             {resultImage && <img src={resultImage} alt="Generated" className="max-w-full max-h-[80vh] object-contain rounded-lg"/>}
                             {analysis && <div className="p-4 bg-gray-800 rounded-lg overflow-y-auto h-full"><p className="whitespace-pre-wrap">{analysis}</p></div>}
                         </div>}
                        {!resultImage && !analysis && !originalImage && <p className="text-gray-500">Your cosmic creation will appear here.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

const VideoCosmos: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');
    const [mode, setMode] = useState<'generate' | 'analyze'>('generate');
    const [error, setError] = useState<string | null>(null);

    const handleVideoGeneration = async () => {
        triggerHapticFeedback();
        if (!prompt && !imageFile) {
            setError("Please provide a prompt or an image.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        const messages = [
            "Initializing hyperspace jump...",
            "Calibrating nebula-renderer...",
            "Assembling star-stream... This may take a few minutes.",
            "Finalizing cosmic sequence..."
        ];
        let messageIndex = 0;
        setLoadingMessage(messages[messageIndex]);
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setLoadingMessage(messages[messageIndex]);
        }, 5000);

        try {
            let imagePayload: { base64: string; mimeType: string } | null = null;
            if (imageFile) {
                imagePayload = {
                    base64: await geminiService.fileToBase64(imageFile),
                    mimeType: imageFile.type,
                };
            }
            const url = await geminiService.generateVideo(prompt, imagePayload, aspectRatio);
            setVideoUrl(url);
        } catch (err) {
            console.error("Video Generation Error:", err);
            if(err instanceof Error && err.message.includes("Requested entity was not found")){
                setError("API Key not found or invalid. Please check your configuration.");
            } else {
                setError("Failed to generate video. An unknown cosmic event occurred.");
            }
        } finally {
            setIsLoading(false);
            clearInterval(interval);
        }
    };
    
    const handleVideoAnalysis = async () => {
        triggerHapticFeedback();
        if (!prompt) {
            setError("Please provide a prompt for analysis.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult('');
        try {
            const result = await geminiService.analyzeVideo(prompt);
            setAnalysisResult(result);
        } catch (err) {
            console.error("Video Analysis Error:", err);
            setError("Failed to analyze video.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="h-full flex flex-col lg:flex-row gap-4">
            <div className="lg:w-1/3 bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex flex-col">
                 <div className="flex justify-center border-b border-gray-700 mb-4">
                    <button onClick={() => { setMode('generate'); setError(null); }} className={`px-4 py-2 text-sm font-bold capitalize transition ${mode === 'generate' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>Generate</button>
                    <button onClick={() => { setMode('analyze'); setError(null); }} className={`px-4 py-2 text-sm font-bold capitalize transition ${mode === 'analyze' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>Analyze</button>
                </div>
                 <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={mode === 'generate' ? "e.g., A cinematic fly-through of Saturn's rings..." : "e.g., Describe the key events in this uploaded rocket launch video..."} className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"/>
                 
                 {mode === 'generate' && (
                     <>
                        <div className="my-4">
                             <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                             <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as '16:9' | '9:16')} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                 <option value="16:9">16:9 (Landscape)</option>
                                 <option value="9:16">9:16 (Portrait)</option>
                             </select>
                         </div>
                         <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} className="hidden" id="video-image-upload" />
                            <label htmlFor="video-image-upload" className="cursor-pointer">
                                <Icons name="upload" className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                                <p className="text-sm text-gray-400">{imageFile ? imageFile.name : '(Optional) Upload starting image'}</p>
                            </label>
                        </div>
                     </>
                 )}
                {mode === 'analyze' && (
                    <div className="my-4 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                         <p className="text-sm text-gray-400">Upload a video (UI only), then write a descriptive prompt for analysis. The video itself is not sent to the API in this demo.</p>
                         <input type="file" accept="video/*" className="mt-4 text-sm" />
                    </div>
                )}
                 <button onClick={mode === 'generate' ? handleVideoGeneration : handleVideoAnalysis} disabled={isLoading} className="mt-4 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600">
                    {isLoading ? 'Processing...' : `Start ${mode}`}
                 </button>
                 {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
            </div>
             <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex items-center justify-center">
                 {isLoading ? <Loader text={loadingMessage} /> : 
                  videoUrl ? <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-full rounded-lg" /> :
                  analysisResult ? <div className="p-4 bg-gray-800 rounded-lg overflow-y-auto h-full w-full"><p className="whitespace-pre-wrap">{analysisResult}</p></div> :
                  <p className="text-gray-500">Your cosmic video will appear here.</p>
                 }
             </div>
        </div>
    );
};

const AudioGalaxy: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [transcript, setTranscript] = useState<{ user: string, model: string }[]>([]);
    const currentUserTranscript = useRef('');
    const currentModelTranscript = useRef('');
    
    const sessionPromise = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);

    const startConversation = async () => {
        triggerHapticFeedback(20);
        setIsRecording(true);
        setStatus('Connecting...');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            sessionPromise.current = geminiService.connectLive({
                onopen: () => {
                    setStatus('Connected. Start speaking...');
                    mediaStreamSourceRef.current = audioContextRef.current!.createMediaStreamSource(stream);
                    scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const int16 = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const base64 = geminiService.encode(new Uint8Array(int16.buffer));
                        
                        sessionPromise.current?.then((session) => {
                            session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
                        });
                    };
                    
                    mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(audioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        currentUserTranscript.current += message.serverContent.inputTranscription.text;
                    }
                    if (message.serverContent?.outputTranscription) {
                        currentModelTranscript.current += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.turnComplete) {
                        const fullUserInput = currentUserTranscript.current.trim();
                        const fullModelOutput = currentModelTranscript.current.trim();
                        if (fullUserInput || fullModelOutput) {
                            setTranscript(prev => [...prev, { user: fullUserInput, model: fullModelOutput }]);
                        }
                        currentUserTranscript.current = '';
                        currentModelTranscript.current = '';
                    }

                    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64EncodedAudioString && outputAudioContextRef.current) {
                        nextStartTimeRef.current = Math.max(
                            nextStartTimeRef.current,
                            outputAudioContextRef.current.currentTime
                        );

                        const audioBuffer = await geminiService.decodeAndGetAudioBuffer(
                            base64EncodedAudioString,
                            outputAudioContextRef.current
                        );

                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        source.addEventListener('ended', () => {
                            sourcesRef.current.delete(source);
                        });

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
                        sourcesRef.current.add(source);
                    }

                    const interrupted = message.serverContent?.interrupted;
                    if (interrupted) {
                        for (const source of sourcesRef.current.values()) {
                            source.stop();
                            sourcesRef.current.delete(source);
                        }
                        nextStartTimeRef.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    setStatus(`Error: ${e.message}. Please try again.`);
                    stopConversation();
                },
                onclose: (e: CloseEvent) => {
                     setStatus('Connection closed.');
                     stopConversation(false);
                },
            });

        } catch (error) {
            console.error("AudioGalaxy Error:", error);
            setStatus("Error accessing microphone.");
            setIsRecording(false);
        }
    };
    
    const stopConversation = useCallback((closeSession = true) => {
        triggerHapticFeedback(20);
        setIsRecording(false);
        setStatus('Idle');
        
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        audioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);
        
        for (const source of sourcesRef.current.values()) {
          source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        if (closeSession) {
            sessionPromise.current?.then(session => session.close());
        }
        
        sessionPromise.current = null;
    }, []);

    return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-900/50 rounded-lg border border-gray-700 p-4 gap-6">
            <div className="text-center">
                <h2 className="text-3xl font-orbitron text-cyan-300">Live Conversation</h2>
                <p className="text-gray-400 mt-2">Speak with April in real-time about the wonders of space.</p>
                <p className="mt-4 px-4 py-2 bg-gray-800 rounded-full text-cyan-400">{status}</p>
            </div>
            
            <div className="w-full max-w-2xl h-64 bg-gray-800 rounded-lg p-4 overflow-y-auto border border-gray-700">
                {transcript.map((turn, index) => (
                    <div key={index} className="mb-4">
                        {turn.user && <p><strong className="text-indigo-400">You:</strong> {turn.user}</p>}
                        {turn.model && <p><strong className="text-cyan-400">April:</strong> {turn.model}</p>}
                    </div>
                ))}
            </div>

            <button
                onClick={isRecording ? () => stopConversation() : startConversation}
                className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'}`}
            >
                <span className="absolute w-full h-full rounded-full animate-ping-slow opacity-75" style={{ animationDuration: '2s', backgroundColor: isRecording ? '#ef4444' : '#06b6d4' }}></span>
                {isRecording ? <Icons name="stop" className="w-12 h-12 text-white" /> : <Icons name="audio" className="w-12 h-12 text-black" />}
            </button>
        </div>
    );
};

enum LabFeature {
    CHAT = 'Starship Chat',
    IMAGE = 'Image Nebula',
    VIDEO = 'Video Cosmos',
    AUDIO = 'Audio Galaxy',
}

interface AILabProps {
    profile: UserProfile;
    projects: Project[];
}

export const AILab: React.FC<AILabProps> = ({ profile, projects }) => {
    const [activeLab, setActiveLab] = useState<LabFeature>(LabFeature.CHAT);

    const handleTabClick = (lab: LabFeature) => {
        triggerHapticFeedback();
        setActiveLab(lab);
    };

    const renderLab = () => {
        switch (activeLab) {
            case LabFeature.CHAT: return <StarshipChat profile={profile} projects={projects} />;
            case LabFeature.IMAGE: return <ImageNebula />;
            case LabFeature.VIDEO: return <VideoCosmos />;
            case LabFeature.AUDIO: return <AudioGalaxy />;
            default: return <StarshipChat profile={profile} projects={projects} />;
        }
    };

    return (
        <div className="min-h-full flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-center p-2 rounded-t-lg">
                <div className="flex space-x-1 sm:space-x-2 bg-gray-900/50 p-1 rounded-full border border-gray-700">
                    {Object.values(LabFeature).map(lab => (
                        <button
                            key={lab}
                            onClick={() => handleTabClick(lab)}
                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors ${activeLab === lab ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:bg-gray-800'}`}
                        >
                            {lab.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 min-h-0">
                {renderLab()}
            </div>
        </div>
    );
};
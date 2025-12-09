import React, { useState, useEffect, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import { UserProfile } from '../types';
import { Chat, FunctionDeclaration, Type } from '@google/genai';

// --- Helper Types ---
interface AssistantMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    isAction?: boolean;
    code?: string;
    image?: string;
}

// --- Icon Components ---
const Icons: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        mic: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
        send: <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
        close: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
        paperclip: <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />,
        x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    };
    return <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{iconMap[name]}</svg>;
};

const functionDeclarations: FunctionDeclaration[] = [
    { name: 'addReminder', description: 'Adds a new reminder.', parameters: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, datetime: { type: Type.STRING } }, required: ['text', 'datetime'] } },
    { name: 'updateProfile', description: 'Updates the user\'s profile.', parameters: { type: Type.OBJECT, properties: { field: { type: Type.STRING, enum: ['name', 'college', 'university', 'career', 'passion', 'age', 'phone', 'email', 'country', 'city', 'bio'] }, value: { type: Type.STRING } }, required: ['field', 'value'] } },
    { name: 'addProject', description: 'Adds a new project.', parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ['title'] } },
    { name: 'makeCall', description: 'Simulates making a call.', parameters: { type: Type.OBJECT, properties: { contactName: { type: Type.STRING } }, required: ['contactName'] } },
    { name: 'generateCode', description: 'Generates website code.', parameters: { type: Type.OBJECT, properties: { description: { type: Type.STRING } }, required: ['description'] } },
    { name: 'uploadArticle', description: 'Publishes an article.', parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, platform: { type: Type.STRING } }, required: ['title', 'content'] } },
    { name: 'uploadPodcast', description: 'Publishes a podcast.', parameters: { type: Type.OBJECT, properties: { theme: { type: Type.STRING }, script: { type: Type.STRING }, platform: { type: Type.STRING } }, required: ['theme', 'script'] } }
];

// --- Main Component ---
interface AssistantPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onAddReminder: (text: string, datetime: string) => void;
    onAddProject: (title: string) => void;
    onUpdateProfile: (profile: UserProfile) => void;
    currentProfile: UserProfile;
}

export const FloatingAssistant: React.FC<AssistantPanelProps> = ({ isOpen, onClose, onAddReminder, onAddProject, onUpdateProfile, currentProfile }) => {
    const [isListening, setIsListening] = useState(false);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [input, setInput] = useState('');
    const [chatInstance, setChatInstance] = useState<Chat | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            const systemInstruction = `You are April, a global voice assistant. The user is Dr. Brank. Understand their commands and use the provided tools. Be concise in your spoken responses. If the user provides an image, acknowledge it and incorporate it into your response.`;
            setChatInstance(geminiService.createChat(systemInstruction, functionDeclarations));
        } catch (error) {
            console.error("Failed to initialize chat assistant (likely missing API Key):", error);
            setMessages([{ id: 'error', role: 'model', text: 'April is offline. Please check your API Key configuration.' }]);
        }
    }, []);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (event: any) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setInput(input + final + interim);
            };
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
    }, [input]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            if (e.target) e.target.value = '';
        }
    };

    const handleFunctionCall = async (call: any): Promise<{id: string, name: string, response: any}> => {
        let result: any;
        try {
            if (call.name === 'addReminder') { onAddReminder(call.args.text, call.args.datetime); result = { success: true, message: `Reminder set.` }; } 
            else if (call.name === 'updateProfile') { onUpdateProfile({ ...currentProfile, [call.args.field]: call.args.value }); result = { success: true, message: `${call.args.field} updated.` }; }
            else if (call.name === 'addProject') { onAddProject(call.args.title); result = { success: true, message: `Project added.`}; }
            else if (call.name === 'makeCall') { result = { success: true, message: `Simulating call to ${call.args.contactName}.` }; }
            else if (call.name === 'generateCode') { const code = await geminiService.generateWebsiteCode(call.args.description); setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Generated Code:', code }]); result = { success: true, message: 'Code generated.' }; }
            else if (call.name === 'uploadArticle') { result = { success: true, message: `Simulating publication of article "${call.args.title}".` }; }
            else if (call.name === 'uploadPodcast') { result = { success: true, message: `Simulating publication of podcast "${call.args.theme}".` }; }
            else { result = { success: false, message: `Unknown function: ${call.name}` }; }
        } catch (e) { result = { success: false, message: `Error executing ${call.name}.` }; }
        return { id: call.id, name: call.name, response: { result: JSON.stringify(result) }};
    };

    const sendMessage = async () => {
        if (!input.trim() && !imageFile) return;
        if (!chatInstance) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Error: Chat service is not initialized.' }]);
            return;
        }
        
        const text = input;
        const currentImageFile = imageFile;
        const currentImagePreview = imagePreview;

        setInput('');
        setImageFile(null);
        setImagePreview(null);

        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, image: currentImagePreview ?? undefined }]);
        
        let requestPayload: any;
        if (currentImageFile) {
            const base64 = await geminiService.fileToBase64(currentImageFile);
            const imagePart = { inlineData: { data: base64, mimeType: currentImageFile.type } };
            const textPart = { text };
            requestPayload = { contents: { parts: [textPart, imagePart] } };
        } else {
            requestPayload = { message: text };
        }
        
        try {
            const stream = await chatInstance.sendMessageStream(requestPayload);
            
            let responseText = '';
            let functionCalls: any[] = [];
            const modelMessageId = (Date.now() + 1).toString();
            let hasAddedModelMessage = false;

            for await (const chunk of stream) {
                responseText += chunk.text;
                if (chunk.functionCalls) functionCalls.push(...chunk.functionCalls);

                if (!hasAddedModelMessage) {
                    setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: responseText }]);
                    hasAddedModelMessage = true;
                } else {
                    setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: responseText } : m));
                }
            }

            if (functionCalls.length > 0) {
                const actionText = functionCalls.map(fc => `Executing: ${fc.name}(${JSON.stringify(fc.args)})`).join('\n');
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: actionText, isAction: true }]);
                
                const functionResponses = await Promise.all(functionCalls.map(handleFunctionCall));
                
                const responseParts = functionResponses.map(resp => ({
                    functionResponse: {
                        id: resp.id,
                        name: resp.name,
                        response: resp.response
                    }
                }));

                const functionResponseStream = await chatInstance.sendMessageStream({ message: responseParts });
                let finalResponseText = '';
                for await (const chunk of functionResponseStream) {
                    if (chunk.text) finalResponseText += chunk.text;
                }
                if(finalResponseText) {
                    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: finalResponseText }]);
                }
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting to my networks right now." }]);
        }
    };

    const toggleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
        setIsListening(!isListening);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-24 sm:right-24 w-[calc(100vw-2rem)] max-w-sm h-[60vh] max-h-[500px] bg-gray-900/80 backdrop-blur-md rounded-2xl border border-cyan-500/50 shadow-2xl flex flex-col z-40 animate-fade-in-up">
            <header className="flex items-center justify-between p-3 border-b border-gray-700">
                <h3 className="font-orbitron text-lg text-cyan-300">April Assistant</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><Icons name="close" /></button>
            </header>
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-xs text-black flex-shrink-0">A</div>}
                        <div className={`max-w-xs p-3 rounded-xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                            {msg.image && <img src={msg.image} alt="User upload" className="max-w-full rounded-lg mb-2" />}
                            <p className={`whitespace-pre-wrap text-sm ${msg.isAction ? 'font-mono text-xs text-cyan-300' : ''}`}>{msg.text}</p>
                            {msg.code && <pre className="mt-2 bg-gray-900 p-2 rounded-md overflow-x-auto"><code className="text-xs text-white">{msg.code.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1].trim()}</code></pre>}
                        </div>
                    </div>
                ))}
                    <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-700">
                 {imagePreview && (
                    <div className="relative w-20 h-20 mb-2 p-1 border border-gray-600 rounded">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded"/>
                        <button 
                            onClick={() => { setImageFile(null); setImagePreview(null); }} 
                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 text-white"
                        >
                            <Icons name="x" className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="flex items-center bg-gray-800 rounded-lg p-1">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-cyan-400 hover:bg-gray-700">
                        <Icons name="paperclip" className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask April..."
                        className="flex-1 bg-transparent focus:outline-none px-2 text-gray-200 text-sm"
                    />
                    <button onClick={toggleListen} className={`p-2 rounded-full ${isListening ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}><Icons name="mic" className="w-5 h-5" /></button>
                    <button onClick={sendMessage} disabled={!input.trim() && !imageFile} className="p-2 rounded-full text-cyan-400 disabled:text-gray-500"><Icons name="send" className="w-5 h-5" /></button>
                </div>
            </div>
        </div>
    );
};
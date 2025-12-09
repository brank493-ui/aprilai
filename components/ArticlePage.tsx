import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';

const triggerHapticFeedback = (duration: number = 5) => {
    if (navigator.vibrate) navigator.vibrate(duration);
};

const Loader: React.FC<{text?: string}> = ({text}) => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div>
        <span className="text-cyan-300">{text || "Generating..."}</span>
    </div>
);

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

export const ArticlePage: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [topic, setTopic] = useState('');
    const [outline, setOutline] = useState('');
    const [abstract, setAbstract] = useState('');
    const [sectionToDraft, setSectionToDraft] = useState('');
    const [draftedContent, setDraftedContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAbstract, setIsLoadingAbstract] = useState(false);
    const [isLoadingSection, setIsLoadingSection] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState('');
    const [publishUrl, setPublishUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const steps = [
        "Topic", "Outline", "Abstract", "Drafting", "Publish"
    ];

    const handleGenerateOutline = async () => {
        triggerHapticFeedback();
        if (!topic) {
            setError("Please enter a topic.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setOutline('');
        try {
            const result = await geminiService.generateArticleOutline(topic);
            setOutline(result);
            setActiveStep(1);
        } catch (err) {
            console.error("Outline Generation Error:", err);
            setError("Failed to generate outline. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAbstract = async () => {
        triggerHapticFeedback();
        setIsLoadingAbstract(true);
        setError(null);
        setAbstract('');
        try {
            const result = await geminiService.generateArticleAbstract(topic, outline);
            setAbstract(result);
            setActiveStep(2);
        } catch (err) {
            console.error("Abstract Generation Error:", err);
            setError("Failed to generate abstract. Please try again.");
        } finally {
            setIsLoadingAbstract(false);
        }
    };
    
    const handleGenerateSection = async () => {
        triggerHapticFeedback();
        if (!sectionToDraft) {
            setError("Please specify which section of the outline to draft.");
            return;
        }
        setIsLoadingSection(true);
        setError(null);
        setDraftedContent('');
        try {
            const result = await geminiService.generateArticleSection(topic, outline, sectionToDraft);
            setDraftedContent(result);
             if (activeStep < 3) setActiveStep(3);
        } catch (err) {
            console.error("Section Generation Error:", err);
            setError("Failed to generate section content. Please try again.");
        } finally {
            setIsLoadingSection(false);
        }
    };

    const handlePublish = async () => {
        triggerHapticFeedback();
        setIsPublishing(true);
        setError(null);
        setPublishUrl('');
        try {
            setPublishStatus('Packaging article for publication...');
            await new Promise(r => setTimeout(r, 1000));
            
            setPublishStatus('Connecting to AstroPublish.net...');
            await new Promise(r => setTimeout(r, 1500));

            setPublishStatus('Uploading encrypted manuscript...');
            await new Promise(r => setTimeout(r, 2000));
            
            setPublishStatus('Finalizing publication...');
            await new Promise(r => setTimeout(r, 1000));

            setPublishUrl(`https://astro-publish.net/dr-brank/articles/${topic.toLowerCase().replace(/\s+/g, '-')}`);
            setActiveStep(4);
        } catch (err) {
            console.error("Publishing error:", err);
            setError("Failed to publish article.");
        } finally {
            setIsPublishing(false);
            setPublishStatus('');
        }
    };

    const startOver = () => {
        triggerHapticFeedback();
        setActiveStep(0);
        setTopic('');
        setOutline('');
        setAbstract('');
        setSectionToDraft('');
        setDraftedContent('');
        setPublishUrl('');
        setError(null);
    };

    return (
        <div className="min-h-full flex flex-col gap-4 bg-gray-900/50 rounded-lg border border-gray-700 p-6">
            <h2 className="text-3xl font-orbitron text-cyan-300 text-center mb-4">Article Studio</h2>
            <p className="text-center text-gray-400 mb-6 max-w-2xl mx-auto">Let April guide you through the process of writing a professional article, from idea to publication.</p>

            <div className="flex items-start justify-center space-x-2 sm:space-x-4 mb-8">
                {steps.map((step, index) => (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center text-center w-20">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${index <= activeStep ? 'bg-cyan-500 border-cyan-400' : 'bg-gray-700 border-gray-500'}`}>
                                {index < activeStep ? <CheckIcon /> : <span className="font-bold text-lg">{index + 1}</span>}
                            </div>
                            <p className={`mt-2 text-xs sm:text-sm ${index <= activeStep ? 'text-cyan-300' : 'text-gray-500'}`}>{step}</p>
                        </div>
                        {index < steps.length - 1 && <div className={`flex-1 h-1 rounded-full mt-5 ${index < activeStep ? 'bg-cyan-500' : 'bg-gray-700'}`}></div>}
                    </React.Fragment>
                ))}
            </div>
            
            {error && <p className="text-red-400 bg-red-900/50 border border-red-500 rounded-md p-3 text-center mb-4">{error}</p>}

            <div className="flex-1 bg-gray-800 rounded-lg p-6 border border-gray-600">
                {activeStep === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <h3 className="text-2xl font-semibold text-white mb-4">Step 1: Choose Your Topic</h3>
                        <p className="text-gray-400 mb-6">What celestial subject do you want to write about?</p>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., The Formation of Super-Massive Black Holes"
                            className="w-full max-w-lg bg-gray-900 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                            onClick={handleGenerateOutline}
                            disabled={isLoading}
                            className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 flex items-center"
                        >
                            {isLoading ? <Loader /> : 'Generate Outline'}
                        </button>
                    </div>
                )}
                {activeStep > 0 && (
                     <div className="h-full flex flex-col gap-6">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Topic: <span className="text-cyan-400">{topic}</span></h3>
                            <button onClick={startOver} className="text-sm text-gray-400 hover:underline">Start Over with a New Topic</button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                             <div className="flex flex-col gap-4">
                                <div>
                                    <h4 className="text-lg font-semibold text-cyan-300 mb-2">1. Generated Outline</h4>
                                    <div className="bg-gray-900/50 p-3 rounded-md overflow-y-auto h-64">
                                        <pre className="whitespace-pre-wrap font-sans text-gray-300 text-sm">{outline}</pre>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-cyan-300 mb-2">2. Abstract</h4>
                                    {!abstract && !isLoadingAbstract && <button onClick={handleGenerateAbstract} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg">Generate Abstract</button>}
                                    {isLoadingAbstract && <Loader text="Generating Abstract..."/>}
                                    {abstract && <div className="bg-gray-900/50 p-3 rounded-md text-sm text-gray-300">{abstract}</div>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h4 className="text-lg font-semibold text-cyan-300 mb-2">3. Content Drafting</h4>
                                    <p className="text-sm text-gray-400 mb-2">Copy a section title from your outline to draft its content.</p>
                                    <input type="text" value={sectionToDraft} onChange={e => setSectionToDraft(e.target.value)} placeholder="e.g., II. Historical Context" className="w-full bg-gray-900 p-2 rounded-md border border-gray-600 mb-2" />
                                    <button onClick={handleGenerateSection} disabled={isLoadingSection || !sectionToDraft} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                                        {isLoadingSection ? 'Drafting...' : 'Draft Section Content'}
                                    </button>
                                </div>
                                <div className="flex-1 flex flex-col min-h-0">
                                    <h5 className="font-semibold text-white mb-2">Drafted Content:</h5>
                                    <div className="flex-1 bg-gray-900/50 p-3 rounded-md overflow-y-auto">
                                         {isLoadingSection && <Loader text="Drafting..."/>}
                                         {draftedContent && <pre className="whitespace-pre-wrap font-sans text-gray-300 text-sm">{draftedContent}</pre>}
                                    </div>
                                </div>
                                {activeStep >= 3 && (
                                    <div className="border-t border-gray-600 pt-4">
                                        <h4 className="text-lg font-semibold text-cyan-300 mb-2">4. Publish Article</h4>
                                        {publishUrl ? (
                                            <div className="bg-green-900/50 border border-green-500 p-3 rounded-md">
                                                <p className="text-green-300 font-bold">Published Successfully!</p>
                                                <a href={publishUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-300 hover:underline break-all">{publishUrl}</a>
                                            </div>
                                        ) : isPublishing ? (
                                            <div className="w-full">
                                                <Loader text={publishStatus} />
                                            </div>
                                        ) : (
                                            <button onClick={handlePublish} disabled={isPublishing} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                                                Publish to AstroPublish.net
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
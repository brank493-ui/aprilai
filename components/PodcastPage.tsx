import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';

const triggerHapticFeedback = (duration: number = 5) => {
    if (navigator.vibrate) navigator.vibrate(duration);
};

const Loader: React.FC<{text: string}> = ({text}) => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div>
        <span className="text-cyan-300">{text}</span>
    </div>
);

export const PodcastPage: React.FC = () => {
    const [theme, setTheme] = useState('');
    const [script, setScript] = useState('');
    const [isLoadingScript, setIsLoadingScript] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
    const [isGeneratingArt, setIsGeneratingArt] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState('');
    const [publishUrl, setPublishUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateScript = async () => {
        triggerHapticFeedback();
        if (!theme) {
            setError("Please enter a theme for your podcast.");
            return;
        }
        setIsLoadingScript(true);
        setError(null);
        setScript('');
        setAudioUrl(null);
        setCoverArtUrl(null);
        setPublishUrl(null);
        try {
            const result = await geminiService.generatePodcastScript(theme);
            setScript(result);
        } catch (err) {
            console.error("Script Generation Error:", err);
            setError("Failed to generate script. Please try again.");
        } finally {
            setIsLoadingScript(false);
        }
    };

    const handleGenerateAudio = async () => {
        triggerHapticFeedback();
        if (!script) {
            setError("Please generate a script first.");
            return;
        }
        setIsLoadingAudio(true);
        setError(null);
        setAudioUrl(null);
        try {
            const audioBuffer = await geminiService.multiSpeakerTextToSpeech(script);
            const url = geminiService.bufferToWave(audioBuffer);
            setAudioUrl(url);
        } catch (err) {
            console.error("Audio Generation Error:", err);
            setError("Failed to generate audio. Please try again.");
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const handlePublish = async () => {
        triggerHapticFeedback();
        if (!audioUrl) return;

        setIsGeneratingArt(true);
        setError(null);
        setPublishUrl(null);
        try {
            const artPrompt = `Professional podcast cover art for an episode about: "${theme}". Minimalist, cosmic, and visually striking.`;
            const images = await geminiService.generateImage(artPrompt, '1:1');
            setCoverArtUrl(images[0]);
            setIsGeneratingArt(false);
            
            setIsPublishing(true);
            
            setPublishStatus('Encoding audio to distribution format...');
            await new Promise(r => setTimeout(r, 1500));

            setPublishStatus('Packaging audio and cover art...');
            await new Promise(r => setTimeout(r, 1000));

            setPublishStatus('Uploading to CosmicCast.fm servers...');
            await new Promise(r => setTimeout(r, 2500));

            setPublishStatus('Registering new episode...');
            await new Promise(r => setTimeout(r, 1000));
            
            setPublishUrl(`https://cosmic-cast.fm/dr-brank/${theme.toLowerCase().replace(/\s+/g, '-')}`);

        } catch (err) {
            console.error("Publishing Error:", err);
            setError("Failed to publish podcast.");
        } finally {
            setIsGeneratingArt(false);
            setIsPublishing(false);
            setPublishStatus('');
        }
    };


    return (
        <div className="min-h-full flex flex-col lg:flex-row gap-4">
            <div className="lg:w-1/3 bg-gray-900/50 rounded-lg border border-gray-700 p-6 flex flex-col">
                <h2 className="text-2xl font-orbitron text-cyan-300 mb-4">Podcast Booth</h2>
                <p className="text-gray-400 mb-6">Create and publish your own astronomy podcast with April's help.</p>
                
                {error && <p className="text-red-400 bg-red-900/50 border border-red-500 rounded-md p-3 text-center mb-4">{error}</p>}
                
                <label htmlFor="podcast-theme" className="text-lg font-semibold text-white mb-2">1. Choose Your Theme</label>
                <input
                    id="podcast-theme"
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., The Moons of Jupiter"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />

                <button
                    onClick={handleGenerateScript}
                    disabled={isLoadingScript}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 flex items-center justify-center"
                >
                    {isLoadingScript ? <Loader text="Generating Script..."/> : '2. Generate Script'}
                </button>

                 <div className="mt-8 border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">3. Production & Publishing</h3>
                     {script && !audioUrl && (
                        <button
                            onClick={handleGenerateAudio}
                            disabled={isLoadingAudio}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 flex items-center justify-center"
                        >
                            {isLoadingAudio ? <Loader text="Generating Audio..."/> : 'Generate Audio'}
                        </button>
                     )}
                     {audioUrl && (
                         <div className="space-y-4">
                            <p className="text-sm text-green-400">Your podcast audio is ready!</p>
                             <audio controls src={audioUrl} className="w-full">
                                Your browser does not support the audio element.
                            </audio>
                             {publishUrl ? (
                                <div className="bg-green-900/50 border border-green-500 p-3 rounded-md text-center">
                                    <p className="text-green-300 font-bold mb-2">Published Successfully!</p>
                                    {coverArtUrl && <img src={coverArtUrl} alt="Podcast Cover Art" className="w-32 h-32 rounded-lg mx-auto mb-2" />}
                                    <a href={publishUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-300 hover:underline break-all">{publishUrl}</a>
                                </div>
                             ) : (
                                <button
                                    onClick={handlePublish}
                                    disabled={isGeneratingArt || isPublishing}
                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 flex items-center justify-center"
                                >
                                    {isGeneratingArt && <Loader text="Generating Cover Art..." />}
                                    {isPublishing && <Loader text={publishStatus} />}
                                    {!isGeneratingArt && !isPublishing && 'Publish Podcast'}
                                </button>
                             )}
                         </div>
                     )}
                     {!script && (
                         <p className="text-sm text-gray-500">Generate a script first to enable production.</p>
                     )}
                </div>

            </div>
            <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700 p-6 flex flex-col">
                <h3 className="text-2xl font-orbitron text-white mb-4">Generated Script</h3>
                <div className="flex-1 bg-gray-800 p-4 rounded-md overflow-y-auto border border-gray-600">
                     {script ? (
                        <pre className="whitespace-pre-wrap font-sans text-gray-300">{script}</pre>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Your podcast script will appear here...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
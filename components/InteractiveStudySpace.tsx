import React, { useState, useRef } from 'react';
import * as geminiService from '../services/geminiService';

// --- Type Definitions ---
interface InteractiveStudySpaceProps {
    subject: string;
    description: string;
    onBack: () => void;
}

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

interface Flashcard {
    front: string;
    back: string;
}

// --- Helper Components ---
const Loader: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-2 py-4 h-full">
        <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div>
        <p className="text-cyan-300 text-sm">{text}</p>
    </div>
);

const GenerationButton: React.FC<{ title: string; icon: string; onClick: () => void; isLoading: boolean; disabled: boolean; }> = ({ title, icon, onClick, isLoading, disabled }) => {
    const icons: { [key: string]: React.ReactNode } = {
        summary: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />,
        quiz: <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />,
        flashcards: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />,
        podcast: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    };
    return (
        <button onClick={onClick} disabled={disabled || isLoading} className="flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-cyan-900/50 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 disabled:hover:bg-gray-800 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{icons[icon]}</svg>
            <span className="text-xs font-semibold">{isLoading ? 'Generating...' : title}</span>
        </button>
    );
};

const QuizView: React.FC<{ quiz: QuizQuestion[] }> = ({ quiz }) => {
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    const handleAnswer = (answer: string) => {
        setSelectedAnswer(answer);
        if (answer === quiz[currentQ].correctAnswer) {
            setScore(s => s + 1);
        }
    };

    const handleNext = () => {
        setSelectedAnswer(null);
        if (currentQ < quiz.length - 1) {
            setCurrentQ(q => q + 1);
        } else {
            setShowResults(true);
        }
    };

    const handleRestart = () => {
        setCurrentQ(0);
        setSelectedAnswer(null);
        setScore(0);
        setShowResults(false);
    };

    if (showResults) {
        return (
            <div className="text-center p-6 bg-gray-800 rounded-lg">
                <h3 className="text-2xl font-bold text-cyan-300">Quiz Complete!</h3>
                <p className="text-xl mt-4">Your Score: <span className="font-orbitron">{score} / {quiz.length}</span></p>
                <button onClick={handleRestart} className="mt-6 bg-cyan-500 text-black font-bold py-2 px-6 rounded-lg">Retake Quiz</button>
            </div>
        );
    }
    
    const question = quiz[currentQ];
    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">Question {currentQ + 1} of {quiz.length}</p>
            <h4 className="text-lg font-semibold mb-4">{question.question}</h4>
            <div className="grid grid-cols-1 gap-3">
                {question.options.map(opt => {
                    const isCorrect = opt === question.correctAnswer;
                    let buttonClass = 'bg-gray-700 hover:bg-gray-600';
                    if (selectedAnswer) {
                        if (isCorrect) buttonClass = 'bg-green-500/50 border-green-500';
                        else if (selectedAnswer === opt) buttonClass = 'bg-red-500/50 border-red-500';
                        else buttonClass = 'bg-gray-700 opacity-50';
                    }
                    return <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!selectedAnswer} className={`p-3 rounded-lg text-left border-2 border-transparent transition-all ${buttonClass}`}>{opt}</button>
                })}
            </div>
            {selectedAnswer && <button onClick={handleNext} className="mt-6 w-full bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg">{currentQ < quiz.length - 1 ? 'Next Question' : 'Show Results'}</button>}
        </div>
    );
};

// --- Main Component ---
export const InteractiveStudySpace: React.FC<InteractiveStudySpaceProps> = ({ subject, onBack }) => {
    const [notes, setNotes] = useState('');
    const [generatedContent, setGeneratedContent] = useState<{
        summary: string | null;
        quiz: QuizQuestion[] | null;
        flashcards: Flashcard[] | null;
        podcast: { script: string; audioUrl?: string; isLoadingAudio: boolean } | null;
    }>({ summary: null, quiz: null, flashcards: null, podcast: null });

    const [activeView, setActiveView] = useState<'summary' | 'quiz' | 'flashcards' | 'podcast' | 'welcome'>('welcome');
    const [loading, setLoading] = useState({ summary: false, quiz: false, flashcards: false, podcast: false });
    const [error, setError] = useState('');
    const [flippedCard, setFlippedCard] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = async (type: 'summary' | 'quiz' | 'flashcards' | 'podcast') => {
        if (!notes.trim()) {
            setError('Please add some notes first.');
            return;
        }
        setError('');
        setLoading(prev => ({ ...prev, [type]: true }));
        setActiveView(type);
        
        try {
            switch (type) {
                case 'summary':
                    const summaryText = await geminiService.summarizeText(notes);
                    setGeneratedContent(prev => ({ ...prev, summary: summaryText }));
                    break;
                case 'quiz':
                    const quizData = await geminiService.generateQuizFromNotes(notes);
                    setGeneratedContent(prev => ({ ...prev, quiz: quizData }));
                    break;
                case 'flashcards':
                    const flashcardsData = await geminiService.generateFlashcardsFromNotes(notes);
                    setGeneratedContent(prev => ({ ...prev, flashcards: flashcardsData }));
                    break;
                case 'podcast':
                    setGeneratedContent(prev => ({ ...prev, podcast: { script: '', isLoadingAudio: true } }));
                    const script = await geminiService.generatePodcastScriptFromNotes(notes);
                    setGeneratedContent(prev => ({ ...prev, podcast: { script, isLoadingAudio: true } }));
                    const audioBuffer = await geminiService.multiSpeakerTextToSpeech(script);
                    const audioUrl = geminiService.bufferToWave(audioBuffer);
                    setGeneratedContent(prev => ({ ...prev, podcast: { script, audioUrl, isLoadingAudio: false } }));
                    break;
            }
        } catch (err) {
            console.error(`Error generating ${type}:`, err);
            setError(`Failed to generate ${type}. Please try again.`);
            setActiveView('welcome');
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };
    
    const renderContent = () => {
        const anyLoading = Object.values(loading).some(Boolean);
        if (anyLoading && !generatedContent[activeView]) return <Loader text={`Generating ${activeView}...`} />;

        switch (activeView) {
            case 'summary':
                return generatedContent.summary && <div className="prose prose-invert max-w-none prose-sm whitespace-pre-wrap p-2">{generatedContent.summary}</div>;
            case 'quiz':
                return generatedContent.quiz && <QuizView quiz={generatedContent.quiz} />;
            case 'flashcards':
                return generatedContent.flashcards && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {generatedContent.flashcards.map((card, index) => (
                            <div key={index} className="h-40 rounded-lg cursor-pointer [transform-style:preserve-3d] transition-transform duration-500" style={{ transform: flippedCard === index ? 'rotateY(180deg)' : '' }} onClick={() => setFlippedCard(flippedCard === index ? null : index)}>
                                <div className="absolute inset-0 bg-gray-700 p-4 rounded-lg flex items-center justify-center text-center [backface-visibility:hidden]">{card.front}</div>
                                <div className="absolute inset-0 bg-cyan-700 p-4 rounded-lg flex items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">{card.back}</div>
                            </div>
                        ))}
                    </div>
                );
            case 'podcast':
                return generatedContent.podcast && (
                    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                        <h4 className="font-orbitron text-cyan-400">Podcast Episode</h4>
                        {generatedContent.podcast.isLoadingAudio && <Loader text="Generating audio..." />}
                        {generatedContent.podcast.audioUrl && <audio controls src={generatedContent.podcast.audioUrl} className="w-full h-10"></audio>}
                        <div>
                            <h5 className="font-semibold text-sm mb-2">Script:</h5>
                            <pre className="whitespace-pre-wrap font-sans text-xs text-gray-300 bg-gray-900/50 p-2 rounded-md max-h-64 overflow-y-auto">{generatedContent.podcast.script}</pre>
                        </div>
                    </div>
                );
            case 'welcome':
                return <div className="flex items-center justify-center h-full text-center text-gray-500"><p>Add your notes and select a tool to begin.</p></div>;
            default:
                 return null;
        }
    };

    return (
        <div className="min-h-full flex flex-col gap-4">
            <div className="flex-shrink-0 flex items-center">
                <button onClick={onBack} className="mr-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-3xl font-orbitron text-cyan-300">{subject} Workspace</h2>
            </div>
            {error && <p className="text-red-400 bg-red-900/50 border border-red-500 rounded-md p-3 text-center">{error}</p>}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex flex-col">
                    <div className="flex-shrink-0 flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold text-white">Study Notes</h3>
                        <div>
                            <input type="file" accept=".pdf" ref={fileInputRef} onChange={() => alert("PDF parsing is not yet implemented. Please copy and paste the text from your PDF into the editor below.")} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md mr-2">Upload PDF</button>
                            <button onClick={() => setNotes('')} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md">Clear</button>
                        </div>
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={`Paste your study notes for ${subject} here...`} className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-3 w-full resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                </div>
                <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex flex-col">
                    <h3 className="text-xl font-semibold mb-2 text-white">April's Workspace</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <GenerationButton title="Summary" icon="summary" onClick={() => handleGenerate('summary')} isLoading={loading.summary} disabled={!notes} />
                        <GenerationButton title="Quiz" icon="quiz" onClick={() => handleGenerate('quiz')} isLoading={loading.quiz} disabled={!notes} />
                        <GenerationButton title="Flashcards" icon="flashcards" onClick={() => handleGenerate('flashcards')} isLoading={loading.flashcards} disabled={!notes} />
                        <GenerationButton title="Podcast" icon="podcast" onClick={() => handleGenerate('podcast')} isLoading={loading.podcast} disabled={!notes} />
                    </div>
                    <div className="flex-1 bg-gray-800 p-2 rounded-md border border-gray-600 overflow-y-auto">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

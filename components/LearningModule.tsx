import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiService';

interface LearningModuleProps {
    subject: string;
    description: string;
    onBack: () => void;
}

interface Curriculum {
    subject: string;
    modules: {
        title: string;
        topics: string[];
    }[];
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

const Loader: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-2 py-4 h-full">
        <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div>
        <p className="text-cyan-300 text-sm">{text}</p>
    </div>
);

const TabIcon: React.FC<{ name: string }> = ({ name }) => {
    const icons: { [key: string]: React.ReactNode } = {
        lesson: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
        flashcards: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />,
        quiz: <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />,
        workspace: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />,
    };
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{icons[name]}</svg>;
};

const PythonCodeEditor: React.FC<{ onEvaluate: (code: string) => void; isEvaluating: boolean; feedback: string; }> = ({ onEvaluate, isEvaluating, feedback }) => {
    const [code, setCode] = useState("print('Hello, Universe!')");
    return (
        <div className="h-full flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex flex-col">
                <h4 className="text-lg font-semibold text-cyan-400 mb-2">Python Practice Pad</h4>
                <p className="text-sm text-gray-400 mb-4">Write and test your Python code here. April will provide feedback.</p>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="print('Hello, Universe!')"
                    className="flex-1 bg-gray-900 font-mono text-sm border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
                <button
                    onClick={() => onEvaluate(code)}
                    disabled={isEvaluating || !code}
                    className="mt-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg disabled:bg-gray-600 w-full"
                >
                    {isEvaluating ? 'Evaluating...' : 'Evaluate Code'}
                </button>
            </div>
            <div className="flex-1 flex flex-col">
                <h5 className="font-semibold text-white mb-2">Feedback:</h5>
                <div className="flex-1 bg-gray-900 p-3 rounded-md border border-gray-700 min-h-[150px] lg:min-h-0 overflow-y-auto">
                    {isEvaluating ? <Loader text="Analyzing code..."/> : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-300 text-sm">{feedback || "Feedback will appear here."}</pre>
                    )}
                </div>
            </div>
        </div>
    );
};

const QuizView: React.FC<{ quiz: QuizQuestion[]; }> = ({ quiz }) => {
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
                <button onClick={handleRestart} className="mt-6 bg-cyan-500 text-black font-bold py-2 px-6 rounded-lg">
                    Retake Quiz
                </button>
            </div>
        );
    }
    
    const question = quiz[currentQ];
    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">Question {currentQ + 1} of {quiz.length}</p>
            <h4 className="text-lg font-semibold mb-4">{question.question}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {question.options.map(opt => {
                    const isCorrect = opt === question.correctAnswer;
                    let buttonClass = 'bg-gray-700 hover:bg-gray-600';
                    if (selectedAnswer) {
                        if (isCorrect) buttonClass = 'bg-green-500/50 border-green-500';
                        else if (selectedAnswer === opt) buttonClass = 'bg-red-500/50 border-red-500';
                        else buttonClass = 'bg-gray-700 opacity-50';
                    }
                    return (
                        <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!selectedAnswer} className={`p-3 rounded-lg text-left border-2 border-transparent transition-all ${buttonClass}`}>
                            {opt}
                        </button>
                    )
                })}
            </div>
            {selectedAnswer && (
                 <button onClick={handleNext} className="mt-6 w-full bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg">
                    {currentQ < quiz.length - 1 ? 'Next Question' : 'Show Results'}
                 </button>
            )}
        </div>
    );
};


export const LearningModule: React.FC<LearningModuleProps> = ({ subject, description, onBack }) => {
    const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
    const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);

    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'lesson' | 'flashcards' | 'quiz' | 'workspace'>('lesson');
    
    const [lessonContent, setLessonContent] = useState('');
    const [isLoadingLesson, setIsLoadingLesson] = useState(false);

    const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

    const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
    const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
    const [flippedCard, setFlippedCard] = useState<number | null>(null);

    const [codeFeedback, setCodeFeedback] = useState('');
    const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
    
    useEffect(() => {
        setIsLoadingCurriculum(true);
        geminiService.generateCurriculum(subject, description)
            .then(setCurriculum)
            .catch(err => console.error("Failed to load curriculum", err))
            .finally(() => setIsLoadingCurriculum(false));
    }, [subject, description]);

    const handleTopicSelect = (topic: string) => {
        setSelectedTopic(topic);
        setActiveTab('lesson');
        setLessonContent('');
        setQuiz(null);
        setFlashcards(null);
        setIsLoadingLesson(true);
        geminiService.generateLessonContent(topic, subject)
            .then(setLessonContent)
            .catch(err => setLessonContent("Could not load lesson content."))
            .finally(() => setIsLoadingLesson(false));
    };
    
    const handleGenerateQuiz = async () => {
        if (!selectedTopic) return;
        setIsLoadingQuiz(true);
        setQuiz(null);
        try {
            const data = await geminiService.generateQuiz(selectedTopic, subject);
            setQuiz(data);
        } catch (e) { console.error(e); }
        finally { setIsLoadingQuiz(false); }
    };
    
    const handleGenerateFlashcards = async () => {
        if (!selectedTopic) return;
        setIsLoadingFlashcards(true);
        setFlashcards(null);
        setFlippedCard(null);
        try {
            const data = await geminiService.generateFlashcards(selectedTopic, subject);
            setFlashcards(data);
        } catch (e) { console.error(e); }
        finally { setIsLoadingFlashcards(false); }
    };

    const handleEvaluateCode = async (code: string) => {
        if (!code) return;
        setIsEvaluatingCode(true);
        setCodeFeedback('');
        try {
            const feedback = await geminiService.evaluatePythonCode(code);
            setCodeFeedback(feedback);
        } catch (error) {
            console.error(error);
            setCodeFeedback('An error occurred while evaluating the code.');
        } finally {
            setIsEvaluatingCode(false);
        }
    };
    
    const tabs = [
        { id: 'lesson', name: 'Lesson', icon: 'lesson' },
        { id: 'flashcards', name: 'Flashcards', icon: 'flashcards' },
        { id: 'quiz', name: 'Quiz', icon: 'quiz' },
    ];
    if (subject === 'Python') {
        tabs.push({ id: 'workspace', name: 'Workspace', icon: 'workspace' });
    }

    const renderContent = () => {
        switch(activeTab) {
            case 'lesson':
                return isLoadingLesson ? <Loader text="Loading Lesson..." /> : (
                    <div className="prose prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: lessonContent.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/^(#+)\s*(.*)/gm, (_, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`) }}></div>
                );
            case 'flashcards':
                 if (isLoadingFlashcards) return <Loader text="Generating Flashcards..." />;
                 if (!flashcards) return <div className="text-center p-8"><button onClick={handleGenerateFlashcards} className="bg-cyan-500 text-black font-bold py-2 px-6 rounded-lg">Generate Flashcards</button></div>;
                 return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {flashcards.map((card, index) => (
                            <div key={index} className="h-40 rounded-lg cursor-pointer [transform-style:preserve-3d] transition-transform duration-500"
                                style={{ transform: flippedCard === index ? 'rotateY(180deg)' : '' }}
                                onClick={() => setFlippedCard(flippedCard === index ? null : index)}>
                                <div className="absolute inset-0 bg-gray-700 p-4 rounded-lg flex items-center justify-center text-center [backface-visibility:hidden]">{card.front}</div>
                                <div className="absolute inset-0 bg-cyan-700 p-4 rounded-lg flex items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">{card.back}</div>
                            </div>
                        ))}
                    </div>
                );
            case 'quiz':
                if (isLoadingQuiz) return <Loader text="Generating Quiz..." />;
                if (!quiz) return <div className="text-center p-8"><button onClick={handleGenerateQuiz} className="bg-cyan-500 text-black font-bold py-2 px-6 rounded-lg">Generate Quiz</button></div>;
                return <QuizView quiz={quiz} />;
            case 'workspace':
                return subject === 'Python' ? <PythonCodeEditor onEvaluate={handleEvaluateCode} isEvaluating={isEvaluatingCode} feedback={codeFeedback} /> : null;
        }
    }

    return (
        <div className="min-h-full flex flex-col gap-4">
            <div className="flex-shrink-0 flex items-center">
                <button onClick={onBack} className="mr-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-3xl font-orbitron text-cyan-300">{subject} Learning Module</h2>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                <div className="lg:col-span-1 bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex flex-col">
                    <h3 className="text-xl font-semibold mb-2 text-white">Curriculum</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {isLoadingCurriculum && <Loader text="Generating Curriculum..." />}
                        {curriculum?.modules.map((module, modIndex) => (
                            <div key={modIndex} className="mb-4">
                                <h4 className="font-bold text-cyan-400">{module.title}</h4>
                                <ul className="space-y-1 mt-1">
                                    {module.topics.map((topic, topIndex) => (
                                        <li key={topIndex}>
                                            <button
                                                onClick={() => handleTopicSelect(topic)}
                                                className={`w-full text-left cursor-pointer p-2 rounded transition-colors text-sm ${selectedTopic === topic ? 'text-white bg-cyan-900/50' : 'text-gray-300 hover:bg-gray-800/70'}`}
                                            >
                                                {topic}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-gray-900/50 rounded-lg border border-gray-700 p-4 flex flex-col">
                    {!selectedTopic ? (
                        <div className="flex items-center justify-center h-full text-gray-500 text-center">
                           <p>Select a topic from the curriculum to begin your lesson.</p>
                        </div>
                    ) : (
                        <>
                           <div className="flex-shrink-0 border-b border-gray-700 mb-4">
                               <h3 className="text-2xl font-semibold text-white mb-2">{selectedTopic}</h3>
                                <div className="flex space-x-2">
                                    {tabs.map(tab => (
                                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-gray-800 text-cyan-300' : 'text-gray-400 hover:text-white'}`}>
                                            <TabIcon name={tab.icon}/> {tab.name}
                                        </button>
                                    ))}
                               </div>
                           </div>
                           <div className="flex-1 overflow-y-auto pr-2">
                               {renderContent()}
                           </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

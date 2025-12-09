import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { LearningModule } from './LearningModule';
import { InteractiveStudySpace } from './InteractiveStudySpace';
import { CustomSubject } from '../types';

const defaultSubjects: { [key: string]: string } = {
    "Python": "Learn the Python programming language from fundamentals to advanced concepts, with a focus on scientific computing and data analysis.",
    "Physics": "Explore the fundamental principles of the universe, from classical mechanics to quantum physics and relativity.",
    "Maths": "Master mathematical concepts from algebra and calculus to differential equations and linear algebra.",
    "Chemistry": "Understand the composition, structure, properties, and change of matter at an atomic and molecular level.",
    "Biology": "Study life and living organisms, including their physical structure, chemical processes, and evolutionary development.",
    "Computer Science": "Learn about computation, automation, and information through theoretical and practical application.",
    "Astrophysics": "Apply the laws of physics and chemistry to understand the birth, life, and death of stars, planets, and galaxies.",
    "Cosmology": "Investigate the origin, evolution, and eventual fate of the universe as a whole.",
    "Planetary Science": "Delve into the study of planets, moons, and planetary systems, both in our solar system and beyond.",
    "Aeronautical Engineering": "Focus on the design, construction, and science of aircraft and spacecraft."
};

const AddSubjectModal: React.FC<{ onClose: () => void; onAdd: (subject: CustomSubject) => void; }> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (!name || !description) {
            alert("Please fill out both fields.");
            return;
        }
        onAdd({ id: `custom-${Date.now()}`, name, description });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-cyan-500 w-full max-w-lg p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
                <h2 className="font-orbitron text-2xl text-cyan-300 mb-6">Create New Subject</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Subject Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Quantum Mechanics" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of what you want to learn." rows={3} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"/>
                    </div>
                </div>
                <button onClick={handleSubmit} className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg">Create and Learn</button>
            </div>
        </div>
    );
};

export const StudyPage: React.FC = () => {
    const [activeSubject, setActiveSubject] = useState<{name: string, description: string} | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>(() => {
        const saved = localStorage.getItem('customSubjects');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('customSubjects', JSON.stringify(customSubjects));
    }, [customSubjects]);
    
    const addCustomSubject = (subject: CustomSubject) => {
        setCustomSubjects(prev => [...prev, subject]);
        handleSubjectSelect(subject.name); // Automatically select the new subject
    };

    const handleSubjectSelect = (subjectName: string) => {
        const defaultDescription = defaultSubjects[subjectName];
        if (defaultDescription) {
            setActiveSubject({ name: subjectName, description: defaultDescription });
        } else {
            const custom = customSubjects.find(s => s.name === subjectName);
            if (custom) {
                setActiveSubject({ name: custom.name, description: custom.description });
            }
        }
    };
    
    const goBackToDeck = () => {
        setActiveSubject(null);
    }
    
    if (activeSubject) {
        if (activeSubject.name === 'Python') {
             return <LearningModule subject={activeSubject.name} description={activeSubject.description} onBack={goBackToDeck} />;
        }
        return <InteractiveStudySpace subject={activeSubject.name} description={activeSubject.description} onBack={goBackToDeck} />;
    }

    const allSubjectNames = [...Object.keys(defaultSubjects), ...customSubjects.map(s => s.name)];

    return (
        <div className="min-h-full flex flex-col items-center">
            {isModalOpen && <AddSubjectModal onClose={() => setIsModalOpen(false)} onAdd={addCustomSubject} />}
            <h2 className="text-3xl font-orbitron text-cyan-300 mb-4">Study Deck</h2>
            <p className="text-gray-400 mb-8">Select a subject to enter your personal workspace, or create a new one.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
                {allSubjectNames.map(subject => (
                    <button
                        key={subject}
                        onClick={() => handleSubjectSelect(subject)}
                        className="p-6 bg-gray-900/50 rounded-lg border border-gray-700 text-center hover:bg-cyan-900/50 hover:border-cyan-500 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <p className="text-lg font-semibold">{subject}</p>
                    </button>
                ))}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-6 bg-cyan-900/30 rounded-lg border-2 border-dashed border-gray-600 text-center hover:bg-cyan-900/50 hover:border-cyan-500 transition-all duration-300 flex flex-col items-center justify-center"
                >
                    <span className="text-3xl text-cyan-400">+</span>
                    <p className="text-lg font-semibold mt-2">Create Subject</p>
                </button>
            </div>
        </div>
    );
};
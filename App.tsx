import React, { useState } from 'react';
import { Feature, UserProfile, Project, Reminder } from './types';
import { HomePage } from './components/HomePage';
import { StudyPage } from './components/StudyPage';
import { AILab } from './components/AILab';
import { ArticlePage } from './components/ArticlePage';
import { PodcastPage } from './components/PodcastPage';
import { FloatingAssistant } from './components/FloatingAssistant';

// --- Icon Components ---
const NavIcon: React.FC<{ name: string; isActive: boolean }> = ({ name, isActive }) => {
    const icons: { [key: string]: React.ReactNode } = {
        home: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
        study: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
        labs: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        article: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        podcast: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
        assistant: <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 transition-colors ${isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {icons[name]}
        </svg>
    );
};

// --- Main App Component ---
export default function App() {
    const [activeFeature, setActiveFeature] = useState<Feature>(Feature.HOME);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [profile, setProfile] = useState<UserProfile>({
        name: "Dr. Brank",
        college: "Starfleet Academy",
        university: "Vulcan Science Academy",
        career: "Astrophysicist",
        passion: "Exploring cosmic anomalies",
        age: "42",
        phone: "555-0100-STAR",
        email: "brank.astro@federation.net",
        country: "United Federation of Planets",
        city: "San Francisco",
        bio: "Dedicated to unraveling the mysteries of the universe, with a focus on dark matter and stellar evolution.",
        profilePicture: undefined
    });

    const [projects, setProjects] = useState<Project[]>([
        { id: 1, title: "Dark Matter Particle Analysis", description: "Analyzing sensor data from the Nebula sector to identify novel dark matter signatures.", status: "In Progress" },
        { id: 2, title: "Red Giant Stellar Lifecycle Model", description: "Developing a predictive model for the final stages of red giant stars.", status: "On Hold" },
    ]);
    
    const [reminders, setReminders] = useState<Reminder[]>([
        { id: 1, text: "Review James Webb Telescope data", datetime: "2024-08-15T09:00" },
        { id: 2, text: "Team meeting on stellar classification", datetime: "2024-08-15T14:30" },
    ]);

    const triggerHapticFeedback = (duration: number = 5) => {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    };

    const addReminder = (text: string, datetime: string) => {
        const newReminder: Reminder = { id: Date.now(), text, datetime };
        setReminders(prev => [...prev, newReminder]);
    };
    
     const addProject = (title: string) => {
        const newProject: Project = { id: Date.now(), title, description: "New project added by April.", status: "In Progress" };
        setProjects(prev => [...prev, newProject]);
    };

    const renderFeature = () => {
        switch (activeFeature) {
            case Feature.HOME: return <HomePage profile={profile} onProfileSave={setProfile} projects={projects} onProjectsUpdate={setProjects} reminders={reminders} setReminders={setReminders} />;
            case Feature.STUDY: return <StudyPage />;
            case Feature.LABS: return <AILab profile={profile} projects={projects} />;
            case Feature.ARTICLE: return <ArticlePage />;
            case Feature.PODCAST: return <PodcastPage />;
            default: return <HomePage profile={profile} onProfileSave={setProfile} projects={projects} onProjectsUpdate={setProjects} reminders={reminders} setReminders={setReminders} />;
        }
    };

     const navItems = [
        { name: Feature.HOME, icon: 'home', action: () => { setActiveFeature(Feature.HOME); setIsAssistantOpen(false); } },
        { name: Feature.STUDY, icon: 'study', action: () => { setActiveFeature(Feature.STUDY); setIsAssistantOpen(false); } },
        { name: Feature.LABS, icon: 'labs', action: () => { setActiveFeature(Feature.LABS); setIsAssistantOpen(false); } },
        { name: 'Assistant', icon: 'assistant', action: () => setIsAssistantOpen(true) },
        { name: Feature.ARTICLE, icon: 'article', action: () => { setActiveFeature(Feature.ARTICLE); setIsAssistantOpen(false); } },
        { name: Feature.PODCAST, icon: 'podcast', action: () => { setActiveFeature(Feature.PODCAST); setIsAssistantOpen(false); } },
    ];
    
    const isNavItemActive = (name: string) => {
        if (name === 'Assistant') return isAssistantOpen;
        return activeFeature === name && !isAssistantOpen;
    }

    return (
        <div className="h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto-format&fit=crop')" }}>
            <div className="h-screen bg-black/70 backdrop-blur-sm flex flex-col relative">
                
                <FloatingAssistant
                    isOpen={isAssistantOpen}
                    onClose={() => setIsAssistantOpen(false)}
                    onAddReminder={addReminder}
                    onAddProject={addProject}
                    onUpdateProfile={setProfile}
                    currentProfile={profile}
                />
                
                 {/* Sidebar Navigation for md and larger screens */}
                <nav className="hidden md:flex w-24 flex-col items-center py-6 bg-black/50 border-r border-gray-700 absolute inset-y-0 left-0">
                    <div className="text-4xl font-orbitron font-bold text-cyan-300" style={{ textShadow: '0 0 8px #67E8F9' }}>A</div>
                    <div className="flex flex-col items-center justify-center space-y-6 mt-16 flex-1">
                        {navItems.map(({ name, icon, action }) => (
                             <button 
                                key={name}
                                onClick={() => { triggerHapticFeedback(); action(); }}
                                title={name}
                                className={`p-3 rounded-lg group transition-colors relative ${isNavItemActive(name) ? 'bg-cyan-900/50' : 'hover:bg-gray-800'}`}
                            >
                                <NavIcon name={icon} isActive={isNavItemActive(name)} />
                                {isNavItemActive(name) && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-cyan-400 rounded-r-full"></div>}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content Wrapper */}
                <div className="flex-1 flex flex-col overflow-hidden md:pl-24">
                    <header className="flex-shrink-0 p-4 text-center border-b border-gray-700/50">
                        <h1 className="text-4xl font-orbitron font-bold text-white" style={{ textShadow: '0 0 10px #67E8F9' }}>April</h1>
                        <p className="text-md text-cyan-300">your personal Astronomy Assistant</p>
                    </header>
                    <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-y-auto pb-24 md:pb-4">
                        {renderFeature()}
                    </main>
                </div>

                {/* Bottom Navigation */}
                <nav className="absolute bottom-0 left-0 right-0 h-20 bg-black/50 backdrop-blur-md border-t border-gray-700 md:hidden">
                    <div className="flex justify-around items-center h-full">
                        {navItems.map(({ name, icon, action }) => (
                            <button 
                                key={name}
                                onClick={() => { triggerHapticFeedback(); action(); }}
                                className={`flex flex-col items-center justify-center w-full h-full text-center transition-colors group ${isNavItemActive(name) ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                <NavIcon name={icon} isActive={isNavItemActive(name)} />
                                <span className="text-xs mt-1 tracking-wider">{name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </nav>

            </div>
        </div>
    );
}
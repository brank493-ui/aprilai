import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { UserProfile, Project, Reminder } from '../types';

// --- Utility Functions ---
const triggerHapticFeedback = (duration: number = 5) => {
    if (navigator.vibrate) navigator.vibrate(duration);
};

// --- Type Definitions ---
type NewsArticle = {
    title: string;
    summary: string;
    url: string;
    thumbnailUrl: string;
};

type Advice = {
    text: string;
    sources: any[];
}

// --- Icon Components ---
const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-6 h-6' }) => {
    const icons: { [key: string]: React.ReactNode } = {
        user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
        watch: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
        bell: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
        news: <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h3m-3 4h3m-3 4h3m-6.75-17.25h1.5M5 17h4.75" />,
        heart: <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
        footsteps: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 21v-5.25A2.25 2.25 0 019 13.5h6a2.25 2.25 0 012.25 2.25V21M3 13.5h18" />,
        moon: <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />,
        plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
        edit: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />,
        trash: <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />,
        close: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
        quote: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
        brain: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a2.25 2.25 0 01-1.473-1.473L12.25 18l1.938-.648a2.25 2.25 0 011.473-1.473L17.75 14l.648 1.938a2.25 2.25 0 011.473 1.473L21.75 18l-1.938.648a2.25 2.25 0 01-1.473 1.473z" />,
        projects: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />,
    };
    return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{icons[name]}</svg>;
}

// --- Reusable Widget Component ---
const Widget: React.FC<{ title: string; icon: string; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex flex-col ${className}`}>
        <div className="flex items-center mb-3">
            <Icon name={icon} className="w-5 h-5 text-cyan-400 mr-2" />
            <h3 className="font-orbitron text-lg text-cyan-400">{title}</h3>
        </div>
        <div className="flex-1 text-gray-300">
            {children}
        </div>
    </div>
);

// --- Home Page Sub-components ---

const HeaderGreeting: React.FC<{ greeting: string }> = ({ greeting }) => (
    <div className="text-center p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
        <h1 className="text-2xl md:text-3xl font-orbitron text-white z-10 relative">{greeting}</h1>
    </div>
);

const ProfileModal: React.FC<{ profile: UserProfile; onSave: (newProfile: UserProfile) => void; onClose: () => void }> = ({ profile, onSave, onClose }) => {
    const [formData, setFormData] = useState(profile);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setFormData(prev => ({...prev, profilePicture: reader.result as string}));
            };
        }
    };
    
    const handleSave = () => {
        triggerHapticFeedback();
        onSave(formData);
        onClose();
    };

    const fields: (keyof UserProfile)[] = ['name', 'career', 'age', 'passion', 'college', 'university', 'country', 'city', 'phone', 'email'];
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-cyan-500 w-full max-w-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><Icon name="close" /></button>
                <h2 className="font-orbitron text-2xl text-cyan-300 mb-6">Edit Profile</h2>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0 flex flex-col items-center gap-4">
                        {formData.profilePicture ? (
                            <img src={formData.profilePicture} alt="Profile" className="w-32 h-32 rounded-full object-cover border-2 border-cyan-400"/>
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                                <Icon name="user" className="w-16 h-16 text-gray-500" />
                            </div>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">Change Picture</button>
                    </div>
                    <div className="flex-1 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map(field => (
                                <div key={field}>
                                    <label className="block text-sm font-bold text-gray-400 mb-1 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                                    <input
                                        type="text"
                                        name={field}
                                        value={formData[field as keyof typeof formData] as string}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-bold text-gray-400 mb-1">Bio / Research Interests</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                            />
                        </div>
                    </div>
                </div>
                <button onClick={handleSave} className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg">Save Changes</button>
            </div>
        </div>
    );
};

interface HomePageProps {
    profile: UserProfile;
    onProfileSave: (profile: UserProfile) => void;
    projects: Project[];
    onProjectsUpdate: (projects: Project[]) => void;
    reminders: Reminder[];
    setReminders: (reminders: Reminder[]) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ profile, onProfileSave, projects, onProjectsUpdate, reminders, setReminders }) => {
    const [greeting, setGreeting] = useState("Loading greeting...");
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null);
    const [advice, setAdvice] = useState<Advice | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [newReminderText, setNewReminderText] = useState('');
    
    // Watch State
    const [watchStatus, setWatchStatus] = useState('Disconnected');
    const [heartRate, setHeartRate] = useState<number | null>(null);

    useEffect(() => {
        setGreeting("Loading...");
        setNews([]);
        setQuote(null);
        setAdvice(null);
        
        geminiService.generateDailyGreeting(profile.name, true)
            .then(setGreeting)
            .catch(() => setGreeting(`Welcome, ${profile.name}. Ready for a day of discovery?`));
        
        geminiService.getSpaceNews(true)
            .then(setNews)
            .catch(() => console.error("Could not fetch space news."));

        geminiService.generateScientistQuote(true)
            .then(setQuote)
            .catch(() => console.error("Could not fetch daily quote."));
            
        geminiService.generatePersonalizedAdvice(profile, true)
            .then(setAdvice)
            .catch(() => console.error("Could not fetch personalized advice."));
    }, [profile]);
    
    const addReminder = () => {
        triggerHapticFeedback();
        if (!newReminderText.trim()) return;
        const newReminder: Reminder = {
            id: Date.now(),
            text: newReminderText.trim(),
            datetime: new Date().toISOString().slice(0, 16)
        };
        setReminders([...reminders, newReminder]);
        setNewReminderText('');
    };

    const deleteReminder = (id: number) => {
        triggerHapticFeedback();
        setReminders(reminders.filter(r => r.id !== id));
    };
    
    const handleConnectWatch = async () => {
        triggerHapticFeedback();
        if (!(navigator as any).bluetooth) {
            setWatchStatus("Unsupported");
            return;
        }
        try {
            setWatchStatus('Requesting device...');
            const device = await (navigator as any).bluetooth.requestDevice({
                filters: [{ services: ['heart_rate'] }],
                optionalServices: ['battery_service']
            });

            setWatchStatus(`Connecting to ${device.name}...`);
            const server = await device.gatt!.connect();

            setWatchStatus('Getting Heart Rate Service...');
            const service = await server.getPrimaryService('heart_rate');
            const characteristic = await service.getCharacteristic('heart_rate_measurement');
            
            await characteristic.startNotifications();
            setWatchStatus('Connected');

            characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
                const value = event.target.value;
                const rate = value.getUint8(1);
                setHeartRate(rate);
            });

        } catch (error) {
            console.error('Bluetooth connection failed:', error);
            setWatchStatus('Connection failed');
        }
    };

     const addProject = (title: string) => {
        triggerHapticFeedback();
        const newProject: Project = {
            id: Date.now(),
            title,
            description: "Newly added project.",
            status: "In Progress"
        };
        onProjectsUpdate([...projects, newProject]);
    };

    const deleteProject = (id: number) => {
        triggerHapticFeedback();
        onProjectsUpdate(projects.filter(p => p.id !== id));
    };

    // Renders markdown-like text from Gemini into styled HTML
    const renderBriefing = (text: string) => {
        const lines = text.split('\n');
        let html = '';
        let inList = false;

        const closeList = () => {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
        };

        for (const line of lines) {
            let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

            if (processedLine.startsWith('## ')) {
                closeList();
                html += `<h3 class="text-base font-orbitron text-cyan-400 mt-3 mb-1">${processedLine.substring(3)}</h3>`;
            } else if (processedLine.trim().startsWith('* ')) {
                if (!inList) {
                    html += '<ul class="space-y-1">';
                    inList = true;
                }
                html += `<li class="list-disc list-inside ml-4">${processedLine.trim().substring(2)}</li>`;
            } else if (processedLine.trim().length > 0) {
                closeList();
                html += `<p>${processedLine}</p>`;
            } else {
                closeList();
            }
        }
        closeList();
        return html;
    };


    return (
        <div className="space-y-4">
            {isProfileModalOpen && <ProfileModal profile={profile} onSave={onProfileSave} onClose={() => setIsProfileModalOpen(false)} />}
            
            <HeaderGreeting greeting={greeting} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <Widget title={profile.name} icon="user" className="lg:col-span-1">
                     <div className="flex items-center gap-4">
                        {profile.profilePicture ? (
                            <img src={profile.profilePicture} alt="Profile" className="w-16 h-16 rounded-full object-cover"/>
                        ) : (
                             <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <Icon name="user" className="w-8 h-8 text-gray-500" />
                            </div>
                        )}
                        <div>
                            <p className="font-semibold">{profile.career}</p>
                            <p className="text-sm text-gray-500">{profile.university}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsProfileModalOpen(true)} className="mt-3 text-sm text-cyan-400 hover:underline">View Full Profile</button>
                </Widget>
                
                <Widget title="Watch" icon="watch" className="lg:col-span-1">
                     <div className="space-y-3">
                        <div className="flex items-center justify-between"><span className="flex items-center"><Icon name="heart" className="w-5 h-5 mr-2 text-red-500"/>Heart Rate</span> <strong>{heartRate ? `${heartRate} bpm` : 'N/A'}</strong></div>
                        <div className="flex items-center justify-between"><span className="flex items-center"><Icon name="footsteps" className="w-5 h-5 mr-2 text-green-500"/>Steps</span> <strong>8,451</strong></div>
                        <div className="flex items-center justify-between"><span className="flex items-center"><Icon name="moon" className="w-5 h-5 mr-2 text-indigo-500"/>Sleep</span> <strong>7h 32m</strong></div>
                    </div>
                    <button 
                        onClick={handleConnectWatch}
                        disabled={watchStatus === 'Connected' || watchStatus.startsWith('Connecting')}
                        className="mt-3 w-full text-sm py-1 px-3 rounded-md transition-colors disabled:opacity-70 bg-gray-700 hover:bg-gray-600"
                    >
                        {watchStatus}
                    </button>
                </Widget>
                
                 <Widget title="Quote of the Day" icon="quote" className="md:col-span-2 lg:col-span-2">
                    {quote ? (
                        <div className="flex flex-col justify-center h-full">
                            <blockquote className="text-lg italic text-gray-300">"{quote.quote}"</blockquote>
                            <p className="text-right mt-2 font-orbitron text-cyan-400">- {quote.author}</p>
                        </div>
                    ) : (
                         <p className="text-sm text-gray-500">Fetching inspiration...</p>
                    )}
                </Widget>
                
                <Widget title="Research Projects" icon="projects" className="md:col-span-2 lg:col-span-2">
                    <div className="space-y-2 h-48 overflow-y-auto pr-2">
                        {projects.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-md group">
                                <div>
                                    <p className="text-sm font-semibold">{p.title}</p>
                                    <p className="text-xs text-cyan-400">{p.status}</p>
                                </div>
                                <button onClick={() => deleteProject(p.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="trash" className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>
                     <form onSubmit={(e) => { e.preventDefault(); addProject(e.currentTarget.projectTitle.value); e.currentTarget.reset(); }} className="flex mt-3 gap-2">
                        <input
                            type="text"
                            name="projectTitle"
                            placeholder="Add new project..."
                            className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <button type="submit" className="bg-cyan-500 text-black p-2 rounded hover:bg-cyan-400"><Icon name="plus" className="w-5 h-5"/></button>
                    </form>
                </Widget>
                
                <Widget title="Reminders" icon="bell" className="md:col-span-2 lg:col-span-2">
                     <div className="space-y-2 h-48 overflow-y-auto pr-2">
                        {reminders.map(r => (
                            <div key={r.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-md group">
                                <div>
                                    <p className="text-sm">{r.text}</p>
                                    <p className="text-xs text-cyan-400">{new Date(r.datetime).toLocaleString()}</p>
                                </div>
                                <button onClick={() => deleteReminder(r.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="trash" className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex mt-3 gap-2">
                        <input
                            type="text"
                            value={newReminderText}
                            onChange={e => setNewReminderText(e.target.value)}
                            placeholder="Add a new reminder..."
                            className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <button onClick={addReminder} className="bg-cyan-500 text-black p-2 rounded hover:bg-cyan-400"><Icon name="plus" className="w-5 h-5"/></button>
                    </div>
                </Widget>

                 <Widget title="Cosmic News" icon="news" className="md:col-span-2 lg:col-span-4">
                    <div className="space-y-3 h-full max-h-[400px] overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {news.length > 0 ? news.map(item => (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.title} className="block bg-gray-800 p-2 rounded-md hover:bg-gray-700 transition-colors group">
                                <img src={item.thumbnailUrl} alt={item.title} className="w-full h-24 object-cover rounded mb-2"/>
                                <h4 className="font-bold text-sm text-white group-hover:text-cyan-300">{item.title}</h4>
                                <p className="text-xs text-gray-400">{item.summary}</p>
                            </a>
                        )) : <p className="text-sm text-gray-500 col-span-full">Fetching latest news...</p>}
                    </div>
                </Widget>
                
                <Widget title="Personalized Briefing" icon="brain" className="md:col-span-2 lg:col-span-4">
                    {advice ? (
                         <div className="space-y-2">
                            <div
                                className="text-sm text-gray-300 space-y-2"
                                dangerouslySetInnerHTML={{ __html: renderBriefing(advice.text) }}
                            />
                            {advice.sources && advice.sources.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <h4 className="text-xs font-bold text-cyan-400 mb-2">Information Sourced From:</h4>
                                    <ul className="text-xs space-y-1">
                                        {advice.sources.map((chunk, index) => (
                                            <li key={index}>
                                                <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline break-all">
                                                    {index + 1}. {chunk.web.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Generating your daily briefing...</p>
                    )}
                </Widget>
            </div>
        </div>
    );
};
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  groundingChunks?: any[];
}

export enum Feature {
  HOME = 'Home',
  STUDY = 'Study',
  LABS = 'AI Labs',
  ARTICLE = 'Article Studio',
  PODCAST = 'Podcast Booth',
}

export type UserProfile = {
    name: string;
    college: string;
    university: string;
    career: string;
    passion: string;
    age: string;
    phone: string;
    email: string;
    country: string;
    city: string;
    bio: string;
    profilePicture?: string;
};

export interface Project {
    id: number;
    title: string;
    description: string;
    status: 'In Progress' | 'Completed' | 'On Hold';
}

export interface CustomSubject {
    id: string;
    name: string;
    description: string;
}

export type Reminder = {
    id: number;
    text: string;
    datetime: string;
};

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export type NewMessage = Omit<Message, 'id' | 'timestamp'>;

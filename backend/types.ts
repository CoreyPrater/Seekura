export interface Message {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

export interface Character {
  id: string;
  name: string;
  character_profile: string;
}

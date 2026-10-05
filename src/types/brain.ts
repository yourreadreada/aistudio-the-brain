export type AISource =
  | 'claude'
  | 'gpt'
  | 'gemini'
  | 'github'
  | 'moodle'
  | 'cursor'
  | 'local-ai';

export interface Fact {
  id: number;
  brain: string;
  content: string;
  source: AISource;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SourceMeta {
  id: AISource;
  name: string;
  color: string;
  dotColor: string;
  bgRgba: string;
  description: string;
}

export const SOURCE_PALETTE: Record<AISource, SourceMeta> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    color: '#D85A30', // Claude terracotta
    dotColor: '#E67048',
    bgRgba: 'rgba(216, 90, 48, 0.15)',
    description: 'Anthropic Claude conversations & reasoning exports',
  },
  gpt: {
    id: 'gpt',
    name: 'ChatGPT',
    color: '#378ADD', // OpenAI Blue
    dotColor: '#4A9DEC',
    bgRgba: 'rgba(55, 138, 221, 0.15)',
    description: 'OpenAI ChatGPT architectures & debugging chats',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    color: '#1D9E75', // Google Teal/Emerald
    dotColor: '#28B88B',
    bgRgba: 'rgba(29, 158, 117, 0.15)',
    description: 'Google Gemini multimodal analysis & code research',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    color: '#7F77DD', // GitHub Violet
    dotColor: '#968EF0',
    bgRgba: 'rgba(127, 119, 221, 0.15)',
    description: 'Git commits, PR reviews & issue comments',
  },
  moodle: {
    id: 'moodle',
    name: 'Moodle',
    color: '#D4537E', // Moodle Pink
    dotColor: '#E26D94',
    bgRgba: 'rgba(212, 83, 126, 0.15)',
    description: 'Coursework assignments, grades & syllabus materials',
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor / Antigravity',
    color: '#3D9BB8', // Cursor Cyan
    dotColor: '#53B3D0',
    bgRgba: 'rgba(61, 155, 184, 0.15)',
    description: 'IDE editor composer sessions & inline agent context',
  },
  'local-ai': {
    id: 'local-ai',
    name: 'Local AI / Ollama',
    color: '#B8923D', // Amber Gold
    dotColor: '#CDA54E',
    bgRgba: 'rgba(184, 146, 61, 0.15)',
    description: 'Offline local LLM generations & private runs',
  },
};

export const DEFAULT_BRAINS = ['coding', 'college', 'personal'];

export type ActivityAction = 'accessed' | 'modified' | 'created';

export interface RecentActivityItem {
  id: string; // unique event id
  factId: number;
  brain: string;
  source: AISource;
  snippet: string;
  action: ActivityAction;
  timestamp: string;
}

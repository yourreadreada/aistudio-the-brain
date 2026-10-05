import { Fact, AISource, DEFAULT_BRAINS } from '../types/brain';

const STORAGE_KEY_FACTS = 'apex_brain_facts_v1';
const STORAGE_KEY_BRAINS = 'apex_brain_list_v1';

// Seed initial memory facts based on user's real projects mentioned in conversation
const SEED_FACTS: Fact[] = [
  // "coding" brain
  {
    id: 1,
    brain: 'coding',
    source: 'claude',
    content: 'Dog translator project: Moved from heuristic regex audio rules to a real ML model. Preprocessing pipeline uses librosa for Mel-frequency cepstral coefficients (MFCCs) with PyTorch acoustic classifier.',
    created_at: '2026-10-02T14:22:00Z',
    updated_at: '2026-10-02T14:22:00Z',
  },
  {
    id: 2,
    brain: 'coding',
    source: 'gpt',
    content: 'Dog translator audio normalization: Target sampling rate is strictly 22050 Hz, mono channel, 3.5s sliding window to capture distinctive bark frequencies and whimpers.',
    created_at: '2026-10-03T09:15:00Z',
    updated_at: '2026-10-03T09:15:00Z',
  },
  {
    id: 3,
    brain: 'coding',
    source: 'cursor',
    content: 'Canteen system architecture: Built on FastAPI + React + Redis pub/sub for instant order status queue. Token collection counters refresh live without polling.',
    created_at: '2026-10-03T16:40:00Z',
    updated_at: '2026-10-03T16:40:00Z',
  },
  {
    id: 4,
    brain: 'coding',
    source: 'github',
    content: 'Canteen system commit 4f9a2c: Swapped SQLite locks for Postgres connection pooling with PgBouncer. Peak load test sustained 850 concurrent lunch requests.',
    created_at: '2026-10-04T11:05:00Z',
    updated_at: '2026-10-04T11:05:00Z',
  },
  {
    id: 5,
    brain: 'coding',
    source: 'claude',
    content: 'Preferred coding style: Always TypeScript strict mode, functional components, zero unnecessary abstractions, prefer early returns, no arbitrary try/catch swallowing errors. Use Tailwind for UI without CSS files.',
    created_at: '2026-10-04T13:30:00Z',
    updated_at: '2026-10-04T13:30:00Z',
  },
  {
    id: 6,
    brain: 'coding',
    source: 'gemini',
    content: 'Idea-builder-system: Context window optimization strategy. Store summaries in local vector cache and feed only the last 3 turns + top 5 relevant memory cards to preserve tokens.',
    created_at: '2026-10-04T15:10:00Z',
    updated_at: '2026-10-04T15:10:00Z',
  },
  {
    id: 7,
    brain: 'coding',
    source: 'local-ai',
    content: 'Local Ollama setup: Qwen 2.5 Coder 14B runs at 38 t/s on local GPU; used for quick boilerplate generation without exposing internal project tokens.',
    created_at: '2026-10-04T17:45:00Z',
    updated_at: '2026-10-04T17:45:00Z',
  },

  // "college" brain
  {
    id: 8,
    brain: 'college',
    source: 'moodle',
    content: 'Moodle extension: Automated scraper for attendance portal and lab submission notices. Uses DOM mutation observers to inject quick download buttons beside PDF links.',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 9,
    brain: 'college',
    source: 'moodle',
    content: 'Computer Networks Assignment 3: Implementation of distance vector routing algorithm and Bellman-Ford count-to-infinity mitigation. Deadline Friday 11:59 PM.',
    created_at: '2026-10-03T18:20:00Z',
    updated_at: '2026-10-03T18:20:00Z',
  },
  {
    id: 10,
    brain: 'college',
    source: 'claude',
    content: 'SIH (Smart India Hackathon) project: Edge AI system for offline agricultural disease detection on low-cost smartphones with quantized MobileNetV3.',
    created_at: '2026-10-04T10:12:00Z',
    updated_at: '2026-10-04T10:12:00Z',
  },
  {
    id: 11,
    brain: 'college',
    source: 'gpt',
    content: 'Research paper literature review: Surveying retrieval-augmented generation architectures for cross-session developer memory retention.',
    created_at: '2026-10-04T12:00:00Z',
    updated_at: '2026-10-04T12:00:00Z',
  },

  // "personal" brain
  {
    id: 12,
    brain: 'personal',
    source: 'claude',
    content: 'AI rotation workflow: Use Claude 3.7 for architectural planning and writing; Cursor for live codebase refactoring; ChatGPT for exploratory debugging and research.',
    created_at: '2026-10-03T20:00:00Z',
    updated_at: '2026-10-03T20:00:00Z',
  },
  {
    id: 13,
    brain: 'personal',
    source: 'gemini',
    content: 'Hardware setup: Primary dev machine has 32GB RAM, Apple Silicon, running local Ollama for fast zero-cost embeddings.',
    created_at: '2026-10-04T09:30:00Z',
    updated_at: '2026-10-04T09:30:00Z',
  },
];

class BrainStorageService {
  private facts: Fact[] = [];
  private brains: string[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedBrains = localStorage.getItem(STORAGE_KEY_BRAINS);
      if (storedBrains) {
        this.brains = JSON.parse(storedBrains);
      } else {
        this.brains = [...DEFAULT_BRAINS];
        this.saveBrains();
      }

      const storedFacts = localStorage.getItem(STORAGE_KEY_FACTS);
      if (storedFacts) {
        this.facts = JSON.parse(storedFacts);
      } else {
        this.facts = [...SEED_FACTS];
        this.saveFacts();
      }
    } catch {
      this.brains = [...DEFAULT_BRAINS];
      this.facts = [...SEED_FACTS];
    }
  }

  private saveBrains() {
    try {
      localStorage.setItem(STORAGE_KEY_BRAINS, JSON.stringify(this.brains));
    } catch {}
  }

  private saveFacts() {
    try {
      localStorage.setItem(STORAGE_KEY_FACTS, JSON.stringify(this.facts));
    } catch {}
  }

  public getBrains(): string[] {
    // Also include any brain tags currently used in facts
    const activeFromFacts = Array.from(new Set(this.facts.map((f) => f.brain)));
    const merged = Array.from(new Set([...this.brains, ...activeFromFacts]));
    return merged.length ? merged : ['coding'];
  }

  public createBrain(name: string): boolean {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    if (!this.brains.includes(trimmed)) {
      this.brains.push(trimmed);
      this.saveBrains();
    }
    return true;
  }

  public deleteBrain(name: string): boolean {
    this.brains = this.brains.filter((b) => b !== name);
    this.facts = this.facts.filter((f) => f.brain !== name);
    this.saveBrains();
    this.saveFacts();
    return true;
  }

  // Equivalent to db.recall() / db.list_facts()
  public recall(brain: string, query: string = '', sourceFilter: string | null = null): Fact[] {
    let list = this.facts.filter((f) => f.brain === brain);

    if (sourceFilter) {
      list = list.filter((f) => f.source === sourceFilter);
    }

    if (query.trim()) {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((fact) => {
        const text = (fact.content + ' ' + fact.source).toLowerCase();
        return terms.every((term) => text.includes(term));
      });
    }

    // Sort newest updated first
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  // Equivalent to db.remember()
  public remember(brain: string, content: string, source: AISource): Fact {
    const now = new Date().toISOString();
    const newId = this.facts.length > 0 ? Math.max(...this.facts.map((f) => f.id)) + 1 : 1;

    const fact: Fact = {
      id: newId,
      brain: brain.trim().toLowerCase(),
      content: content.trim(),
      source,
      created_at: now,
      updated_at: now,
    };

    this.facts.unshift(fact);
    this.createBrain(brain);
    this.saveFacts();
    return fact;
  }

  // Equivalent to db.correct()
  public correct(id: number, newContent: string): boolean {
    const fact = this.facts.find((f) => f.id === id);
    if (!fact) return false;

    fact.content = newContent.trim();
    fact.updated_at = new Date().toISOString();
    this.saveFacts();
    return true;
  }

  // Equivalent to db.forget()
  public forget(id: number): boolean {
    const initialLen = this.facts.length;
    this.facts = this.facts.filter((f) => f.id !== id);
    const deleted = this.facts.length < initialLen;
    if (deleted) this.saveFacts();
    return deleted;
  }

  // Ingest chat text matching chunk_text() in ingest.py
  public ingest(brain: string, source: AISource, rawText: string, chunkSize: number = 1200): number {
    const paragraphs = rawText
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      if (current && current.length + para.length + 2 > chunkSize) {
        chunks.push(current);
        current = para;
      } else {
        current = current ? `${current}\n\n${para}` : para;
      }
    }
    if (current) {
      chunks.push(current);
    }

    let count = 0;
    for (const chunk of chunks) {
      if (chunk.trim()) {
        this.remember(brain, chunk, source);
        count++;
      }
    }
    return count;
  }

  // Generate context snapshot to prime any AI tool (Claude, GPT, Gemini, Cursor)
  public exportContextSnapshot(brain: string): string {
    const facts = this.recall(brain);
    if (!facts.length) {
      return `# Context Memory: ${brain}\n\nNo facts recorded in this brain yet.`;
    }

    const lines = [
      `# Context Memory: ${brain.toUpperCase()}`,
      `Generated by Apex Brain · Total Stored Facts: ${facts.length}`,
      `--------------------------------------------------`,
      '',
    ];

    facts.forEach((f) => {
      lines.push(`- [${f.source.toUpperCase()} · #${f.id}] ${f.content}`);
    });

    lines.push('');
    lines.push(`Instructions for AI: Use the facts above as durable grounding context across turns. When the user updates or corrects any detail, acknowledge the change.`);
    return lines.join('\n');
  }

  // Reset to starter facts
  public resetToDefaults() {
    this.brains = [...DEFAULT_BRAINS];
    this.facts = [...SEED_FACTS];
    this.saveBrains();
    this.saveFacts();
  }
}

export const brainStore = new BrainStorageService();

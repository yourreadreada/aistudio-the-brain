import {
  Fact,
  AISource,
  FactFileType,
  IngestStrategy,
  MergeStrategy,
  ExistingFileNodeCheck,
  IngestOperationResult,
  SemanticSection,
  DEFAULT_BRAINS,
  RecentActivityItem,
  ActivityAction,
  inferFileTypeFromExtension,
  getFactFileType,
} from '../types/brain';
import {
  parseSemanticSections,
  detectIncrementalDiff,
} from './semanticChunker';

// Talks to the real Python backend (brain.web) when running, with
// automatic graceful offline fallback to local storage so the web preview
// remains immediately functional and interactive even before `python -m brain.web` is started.
const API_BASE = (import.meta as any).env?.VITE_BRAIN_API_URL || 'http://localhost:8787';

const STORAGE_KEY_FACTS = 'brain_local_facts_v1';
const STORAGE_KEY_BRAINS = 'brain_local_brains_v1';
const STORAGE_KEY_TAGS = 'brain_fact_tags_v1';
const STORAGE_KEY_ACTIVITIES = 'brain_recent_activity_v1';

// Seed initial memory facts based on user's real projects mentioned in conversation
const SEED_FACTS: Fact[] = [
  // "coding" brain
  {
    id: 1,
    brain: 'coding',
    source: 'claude',
    content: 'Dog translator project: Moved from heuristic regex audio rules to a real ML model. Preprocessing pipeline uses librosa for Mel-frequency cepstral coefficients (MFCCs) with PyTorch acoustic classifier.',
    tags: ['audio-ml', 'pytorch', 'dsp'],
    fileType: 'code',
    fileName: 'dog_translator_mfcc.py',
    created_at: '2026-10-02T14:22:00Z',
    updated_at: '2026-10-02T14:22:00Z',
  },
  {
    id: 2,
    brain: 'coding',
    source: 'gpt',
    content: 'Dog translator audio normalization: Target sampling rate is strictly 22050 Hz, mono channel, 3.5s sliding window to capture distinctive bark frequencies and whimpers.',
    tags: ['audio-ml', 'preprocessing', 'audio'],
    fileType: 'pdf',
    fileName: 'audio_normalization_spec.pdf',
    created_at: '2026-10-03T09:15:00Z',
    updated_at: '2026-10-03T09:15:00Z',
  },
  {
    id: 3,
    brain: 'coding',
    source: 'cursor',
    content: 'Canteen system architecture: Built on FastAPI + React + Redis pub/sub for instant order status queue. Token collection counters refresh live without polling.',
    tags: ['fastapi', 'redis', 'architecture'],
    fileType: 'docx',
    fileName: 'canteen_architecture_rfc.docx',
    created_at: '2026-10-03T16:40:00Z',
    updated_at: '2026-10-03T16:40:00Z',
  },
  {
    id: 4,
    brain: 'coding',
    source: 'github',
    content: 'Canteen system commit 4f9a2c: Swapped SQLite locks for Postgres connection pooling with PgBouncer. Peak load test sustained 850 concurrent lunch requests.',
    tags: ['postgres', 'performance', 'database'],
    fileType: 'xlsx',
    fileName: 'database_load_benchmarks.xlsx',
    created_at: '2026-10-04T11:05:00Z',
    updated_at: '2026-10-04T11:05:00Z',
  },
  {
    id: 5,
    brain: 'coding',
    source: 'claude',
    content: 'Preferred coding style: Always TypeScript strict mode, functional components, zero unnecessary abstractions, prefer early returns, no arbitrary try/catch swallowing errors. Use Tailwind for UI without CSS files.',
    tags: ['typescript', 'coding-style', 'frontend'],
    fileType: 'md',
    fileName: 'typescript_guidelines.md',
    created_at: '2026-10-04T13:30:00Z',
    updated_at: '2026-10-04T13:30:00Z',
  },
  {
    id: 6,
    brain: 'coding',
    source: 'gemini',
    content: 'Idea-builder-system: Context window optimization strategy. Store summaries in local vector cache and feed only the last 3 turns + top 5 relevant memory cards to preserve tokens.',
    tags: ['llm-context', 'vector-cache', 'optimization'],
    fileType: 'pptx',
    fileName: 'context_window_strategy.pptx',
    created_at: '2026-10-04T15:10:00Z',
    updated_at: '2026-10-04T15:10:00Z',
  },
  {
    id: 7,
    brain: 'coding',
    source: 'local-ai',
    content: 'Local Ollama setup: Qwen 2.5 Coder 14B runs at 38 t/s on local GPU; used for quick boilerplate generation without exposing internal project tokens.',
    tags: ['ollama', 'local-llm', 'gpu'],
    fileType: 'code',
    fileName: 'local_ollama_qwen.py',
    created_at: '2026-10-04T17:45:00Z',
    updated_at: '2026-10-04T17:45:00Z',
  },

  // "college" brain
  {
    id: 8,
    brain: 'college',
    source: 'moodle',
    content: 'Moodle extension: Automated scraper for attendance portal and lab submission notices. Uses DOM mutation observers to inject quick download buttons beside PDF links.',
    tags: ['moodle', 'scraping', 'extension'],
    fileType: 'code',
    fileName: 'moodle_scraper_extension.ts',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 9,
    brain: 'college',
    source: 'moodle',
    content: 'Computer Networks Assignment 3: Implementation of distance vector routing algorithm and Bellman-Ford count-to-infinity mitigation. Deadline Friday 11:59 PM.',
    tags: ['networks', 'assignment', 'algorithms'],
    fileType: 'pdf',
    fileName: 'cn_assignment3_routing.pdf',
    created_at: '2026-10-03T18:20:00Z',
    updated_at: '2026-10-03T18:20:00Z',
  },
  {
    id: 10,
    brain: 'college',
    source: 'claude',
    content: 'SIH (Smart India Hackathon) project: Edge AI system for offline agricultural disease detection on low-cost smartphones with quantized MobileNetV3.',
    tags: ['sih', 'edge-ai', 'hackathon'],
    fileType: 'pptx',
    fileName: 'sih_crop_disease_model.pptx',
    created_at: '2026-10-04T10:12:00Z',
    updated_at: '2026-10-04T10:12:00Z',
  },
  {
    id: 11,
    brain: 'college',
    source: 'gpt',
    content: 'Research paper literature review: Surveying retrieval-augmented generation architectures for cross-session developer memory retention.',
    tags: ['rag', 'research', 'paper'],
    fileType: 'pdf',
    fileName: 'rag_architectures_literature_review.pdf',
    created_at: '2026-10-04T12:00:00Z',
    updated_at: '2026-10-04T12:00:00Z',
  },
  {
    id: 12,
    brain: 'coding',
    source: 'claude',
    content: `# Project - The Brain

#### User
new project idea: build something which is like a centralised memory, like this: https://apex.host/

#### Assistant
That search pulled up web/Minecraft hosting companies, not what you're describing — let me check the actual site directly. Who is this centralized memory for? What should it pull together first? Should the AI just answer questions from it, or also act?

#### User
me and if its good, we will launch it. What should it pull together first? everything. but first all different ai chats and codes and moodle, drive, things etc. personal mein can say not yet now. Should the AI just answer questions from it, or also act? no idea. i just thought of such idea, not clear about this though.

#### Assistant
Okay, that actually makes a lot of sense given how much you've got running in parallel — moodle extension, dog translator, canteen system, idea-builder-system, a couple of papers, SIH... you're basically already living the problem apex.host is solving for businesses, just across tools instead of across a sales team.
One thing worth flagging before we go further: Claude and ChatGPT don't give you a live API to pull your own conversation history. You can export it, but there's no "connect and it auto-syncs". So "code and Moodle and Drive" are realistically connect-and-sync; "AI chats" would start as exports or manual paste.
Which tools are in your rotation where re-explaining happens?

#### User
i am switching between tools and context understanding wastes a lot of time and tokens, which is not optimised and efficient. Claude, GPT, Gemini, GLM, Github, Local AI and what not, can say everything 😂. By context explaining, i mean that if i am working on same project using different platforms, have to explain to each one of them, and not just that, a topic i need to understand, or just the way and style in which i code.

#### Assistant
That's a sharp, specific pain point — and honestly, you've got a live example of half this problem sitting right in front of you. What Claude is doing right now, reading those project files before answering you, is already a working mini-version of "context so I don't have to re-explain myself." The gap is that it's scoped to Claude only — if you move to ChatGPT or Cursor or Antigravity for the same project, none of that transfers.
Good catch — right now images inside a PDF or PPTX need OCR or Vision. Next up: a live GitHub connector to pull commits, issues and PRs in directly.`,
    tags: ['centralized-memory', 'multi-tool-context', 'apex-architecture'],
    fileType: 'md',
    fileName: 'Project - The Brain.md',
    filePath: 'exports/claude/Project - The Brain.md',
    isDocumentRoot: true,
    isUnifiedContextNode: true,
    documentTitle: 'Project - The Brain',
    semanticSectionCount: 6,
    mergeHistory: [
      {
        timestamp: '2026-10-06T09:50:00Z',
        action: 'created',
        summary: 'Unified context node initialized from Claude chat export (6 conversation turns)',
        newContentLength: 1740,
      },
    ],
    created_at: '2026-10-06T09:50:00Z',
    updated_at: '2026-10-06T09:50:00Z',
  },
];

type Listener = () => void;

class BrainStorageService {
  private facts: Fact[] = [];
  private brains: string[] = [];
  private activities: RecentActivityItem[] = [];
  private tagsByFactId: Record<number, string[]> = {};
  private listeners: Listener[] = [];
  private backendReachable = false;
  private backendChecked = false;

  constructor() {
    this.loadTagsFromLocalStorage();
    this.loadActivitiesFromLocalStorage();
    this.loadLocalFallback();
    this.loadFromBackend();
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private applyTags(facts: Fact[]): Fact[] {
    return facts.map((f) => (this.tagsByFactId[f.id]?.length ? { ...f, tags: this.tagsByFactId[f.id] } : f));
  }

  private loadLocalFallback() {
    try {
      const storedBrains = localStorage.getItem(STORAGE_KEY_BRAINS);
      this.brains = storedBrains ? JSON.parse(storedBrains) : [...DEFAULT_BRAINS];

      const storedFacts = localStorage.getItem(STORAGE_KEY_FACTS);
      if (storedFacts) {
        const parsed: Fact[] = JSON.parse(storedFacts);
        const existingIds = new Set(parsed.map((f) => f.id));
        const missingSeeds = SEED_FACTS.filter((sf) => !existingIds.has(sf.id));
        this.facts = this.applyTags([...parsed, ...missingSeeds]);
      } else {
        this.facts = [...SEED_FACTS];
        this.saveLocalFacts();
      }
    } catch {
      this.brains = [...DEFAULT_BRAINS];
      this.facts = [...SEED_FACTS];
    }
  }

  private saveLocalFacts() {
    try {
      localStorage.setItem(STORAGE_KEY_FACTS, JSON.stringify(this.facts));
    } catch {}
  }

  private saveLocalBrains() {
    try {
      localStorage.setItem(STORAGE_KEY_BRAINS, JSON.stringify(this.brains));
    } catch {}
  }

  public async loadFromBackend() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const brainsRes = await fetch(`${API_BASE}/api/brains`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!brainsRes.ok) throw new Error('Backend returned status ' + brainsRes.status);
      const backendBrains: string[] = await brainsRes.json();
      this.brains = Array.from(new Set([...DEFAULT_BRAINS, ...backendBrains, ...this.brains]));

      // Fetch all brains in parallel for high performance
      const brainFactsArrays = await Promise.all(
        backendBrains.map(async (brain) => {
          try {
            const factsRes = await fetch(`${API_BASE}/api/facts?brain=${encodeURIComponent(brain)}`);
            if (factsRes.ok) {
              const brainFacts: Fact[] = await factsRes.json();
              return brainFacts;
            }
          } catch {}
          return [];
        })
      );

      const allFacts = brainFactsArrays.flat();

      if (allFacts.length > 0) {
        this.facts = this.applyTags(allFacts);
        this.saveLocalFacts();
      }
      this.backendReachable = true;
      this.backendChecked = true;
      this.notify();
    } catch {
      this.backendReachable = false;
      this.backendChecked = true;
      // Ensure we keep local fallback active if backend is not currently running
      if (!this.facts.length) {
        this.loadLocalFallback();
      }
      this.notify();
    }
  }

  public isBackendReachable(): boolean {
    return this.backendReachable;
  }

  public isBackendChecked(): boolean {
    return this.backendChecked;
  }

  // --- Local tag layer ---
  private loadTagsFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TAGS);
      this.tagsByFactId = raw ? JSON.parse(raw) : {};
    } catch {
      this.tagsByFactId = {};
    }
  }

  private saveTagsToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify(this.tagsByFactId));
    } catch {}
  }

  // --- Local recent-activity log ---
  private loadActivitiesFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      if (raw) {
        this.activities = JSON.parse(raw);
      } else {
        this.activities = [
          {
            id: 'act-1',
            factId: 1,
            brain: 'coding',
            source: 'claude',
            snippet: 'Dog translator project: Moved from heuristic regex audio rules to a real ML model.',
            action: 'modified',
            timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          },
          {
            id: 'act-2',
            factId: 3,
            brain: 'coding',
            source: 'cursor',
            snippet: 'Canteen system architecture: Built on FastAPI + React + Redis pub/sub queue.',
            action: 'created',
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          },
          {
            id: 'act-3',
            factId: 5,
            brain: 'coding',
            source: 'claude',
            snippet: 'Preferred coding style: Always TypeScript strict mode, functional components.',
            action: 'accessed',
            timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          },
          {
            id: 'act-4',
            factId: 8,
            brain: 'college',
            source: 'moodle',
            snippet: 'Moodle extension: Automated scraper for attendance portal and lab notices.',
            action: 'created',
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          },
        ];
        this.saveActivitiesToLocalStorage();
      }
    } catch {
      this.activities = [];
    }
  }

  private saveActivitiesToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(this.activities.slice(0, 50)));
    } catch {}
  }

  public recordActivity(fact: Fact, action: ActivityAction) {
    const item: RecentActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      factId: fact.id,
      brain: fact.brain,
      source: fact.source,
      snippet: fact.content.length > 95 ? fact.content.substring(0, 95) + '…' : fact.content,
      action,
      timestamp: new Date().toISOString(),
    };
    this.activities = [item, ...this.activities.filter((a) => !(a.factId === fact.id && a.action === action))].slice(0, 40);
    this.saveActivitiesToLocalStorage();
  }

  public getRecentActivities(limit = 20): RecentActivityItem[] {
    return this.activities.slice(0, limit);
  }

  public getFactById(id: number): Fact | undefined {
    return this.facts.find((f) => f.id === id);
  }

  public globalSearch(query: string, preferredBrain?: string): Fact[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const isIdSearch = /^#?\d+$/.test(q);
    if (isIdSearch) {
      const numId = parseInt(q.replace('#', ''), 10);
      return this.facts.filter((f) => f.id === numId);
    }

    const terms = q.split(/\s+/).filter(Boolean);
    const scored: { fact: Fact; score: number }[] = [];

    for (let i = 0; i < this.facts.length; i++) {
      const fact = this.facts[i];
      let score = 0;
      const content = fact.content.toLowerCase();
      const source = fact.source.toLowerCase();
      const brain = fact.brain.toLowerCase();
      const fileName = (fact.fileName || '').toLowerCase();
      const fileType = (fact.fileType || getFactFileType(fact)).toLowerCase();
      const tagsText = (fact.tags || []).join(' ').toLowerCase();
      const fullText = `${content} ${source} ${brain} ${fileName} ${fileType} ${tagsText} #${fact.id}`;

      const allMatch = terms.every((t) => fullText.includes(t));
      if (!allMatch) continue;

      if (content.includes(q)) score += 10;
      if (fileName.includes(q)) score += 9;
      if (tagsText.includes(q)) score += 8;
      if (source.includes(q)) score += 6;
      if (fileType.includes(q)) score += 5;
      if (preferredBrain && fact.brain === preferredBrain) score += 3;

      score += 1;
      scored.push({ fact, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const results = new Array(scored.length);
    for (let i = 0; i < scored.length; i++) {
      results[i] = scored[i].fact;
    }
    return results;
  }

  public updateFactTags(id: number, tags: string[]): boolean {
    const fact = this.facts.find((f) => f.id === id);
    if (!fact) return false;
    fact.tags = tags;
    this.tagsByFactId[id] = tags;
    this.saveTagsToLocalStorage();
    this.saveLocalFacts();
    this.recordActivity(fact, 'modified');
    return true;
  }

  public getAllTags(brain?: string): string[] {
    const list = brain ? this.facts.filter((f) => f.brain === brain) : this.facts;
    const tagSet = new Set<string>();
    list.forEach((f) => {
      f.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }

  public getBrains(): string[] {
    const activeFromFacts = Array.from(new Set(this.facts.map((f) => f.brain)));
    const merged = Array.from(new Set([...this.brains, ...activeFromFacts]));
    return merged.length ? merged : ['coding'];
  }

  public createBrain(name: string): boolean {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    if (!this.brains.includes(trimmed)) {
      this.brains.push(trimmed);
      this.saveLocalBrains();
    }
    return true;
  }

  public deleteBrain(name: string): boolean {
    const toDelete = this.facts.filter((f) => f.brain === name);
    toDelete.forEach((f) => this.forget(f.id));
    this.brains = this.brains.filter((b) => b !== name);
    this.saveLocalBrains();
    return true;
  }

  public recall(brain: string, query: string = '', sourceFilter: string | null = null): Fact[] {
    let list = this.facts.filter((f) => f.brain === brain);

    if (sourceFilter) {
      list = list.filter((f) => f.source === sourceFilter);
    }

    if (query.trim()) {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((fact) => {
        const tags = (fact.tags || []).join(' ');
        const fileName = fact.fileName || '';
        const fileType = fact.fileType || getFactFileType(fact);
        const text = (fact.content + ' ' + fact.source + ' ' + fileName + ' ' + fileType + ' ' + tags + ' #' + fact.id).toLowerCase();
        return terms.every((term) => text.includes(term));
      });
    }

    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public remember(
    brain: string,
    content: string,
    source: AISource,
    fileName?: string,
    fileType?: FactFileType,
    tags?: string[]
  ): Fact {
    const now = new Date().toISOString();
    const tempId = this.facts.length > 0 ? Math.max(...this.facts.map((f) => f.id)) + 1 : 1;
    const resolvedFileType = fileType || (fileName ? inferFileTypeFromExtension(fileName) : undefined);

    const fact: Fact = {
      id: tempId,
      brain: brain.trim().toLowerCase(),
      content: content.trim(),
      source,
      fileName,
      fileType: resolvedFileType,
      tags: tags || [],
      created_at: now,
      updated_at: now,
    };

    this.facts.unshift(fact);
    this.createBrain(brain);
    this.saveLocalFacts();
    this.recordActivity(fact, 'created');

    // Asynchronously synchronize with Python backend if reachable
    fetch(`${API_BASE}/api/remember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brain: fact.brain, content: fact.content, source: fact.source }),
    })
      .then((r) => r.json())
      .then((saved: Fact) => {
        const idx = this.facts.findIndex((f) => f === fact);
        if (idx !== -1 && saved?.id) {
          this.facts[idx] = { ...this.facts[idx], id: saved.id };
          this.saveLocalFacts();
          this.notify();
        }
      })
      .catch(() => {
        // Safe offline mode
      });

    return fact;
  }

  public correct(id: number, newContent: string): boolean {
    const fact = this.facts.find((f) => f.id === id);
    if (!fact) return false;

    fact.content = newContent.trim();
    fact.updated_at = new Date().toISOString();
    this.saveLocalFacts();
    this.recordActivity(fact, 'modified');

    fetch(`${API_BASE}/api/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content: fact.content }),
    }).catch(() => {});

    return true;
  }

  public forget(id: number): boolean {
    const initialLen = this.facts.length;
    this.facts = this.facts.filter((f) => f.id !== id);
    const deleted = this.facts.length < initialLen;

    if (deleted) {
      this.saveLocalFacts();
      fetch(`${API_BASE}/api/forget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    }
    return deleted;
  }

  /**
   * Finds an existing fact node for a file path or file name in a specific brain.
   */
  public findNodeByFilePath(brain: string, filePathOrName: string): Fact | undefined {
    if (!filePathOrName) return undefined;
    const cleanTarget = filePathOrName.trim().toLowerCase();
    const targetBaseName = cleanTarget.split(/[\\/]/).pop() || cleanTarget;

    const bFacts = this.facts.filter((f) => f.brain === brain.trim().toLowerCase());

    // 1. Exact filePath match
    let match = bFacts.find((f) => f.filePath && f.filePath.toLowerCase() === cleanTarget);
    if (match) return match;

    // 2. Exact fileName match
    match = bFacts.find((f) => f.fileName && f.fileName.toLowerCase() === targetBaseName);
    if (match) return match;

    // 3. DocumentTitle match
    const titleWithoutExt = targetBaseName.replace(/\.[^/.]+$/, '');
    match = bFacts.find(
      (f) => f.documentTitle && f.documentTitle.toLowerCase() === titleWithoutExt
    );
    if (match) return match;

    return undefined;
  }

  /**
   * Checks if an incoming file matches an existing node, analyzing semantic diffs
   * for intelligent incremental updates without creating redundant split nodes.
   */
  public checkExistingFileNode(
    brain: string,
    fileName: string,
    content: string,
    filePath?: string
  ): ExistingFileNodeCheck {
    const existingFact = this.findNodeByFilePath(brain, filePath || fileName);
    if (!existingFact) {
      return {
        exists: false,
        hasDiff: false,
        isIdentical: false,
        newSectionsDetected: 0,
        recommendedAction: 'merge',
      };
    }

    const diff = detectIncrementalDiff(
      existingFact.content,
      content,
      existingFact.fileType,
      fileName
    );

    return {
      exists: true,
      existingFact,
      hasDiff: diff.hasNewContent,
      isIdentical: diff.isIdentical,
      newSectionsDetected: diff.newSections.length,
      existingSectionsCount: existingFact.semanticSectionCount || 1,
      summary: diff.summary,
      recommendedAction: diff.isIdentical ? 'skip' : 'merge',
    };
  }

  /**
   * Returns structured semantic sections for a fact node.
   */
  public getSemanticSections(fact: Fact): SemanticSection[] {
    return parseSemanticSections(fact.content, fact.fileType, fact.fileName).sections;
  }

  /**
   * Semantic File Ingestion API:
   * Treats large files as a unified, coherent context node in the brain visualization.
   * Detects existing nodes for the file path, and performs intelligent incremental updates
   * or deduplication rather than creating redundant or split nodes.
   */
  public ingestSemanticFile(
    brain: string,
    source: AISource,
    rawText: string,
    fileName?: string,
    filePath?: string,
    fileType?: FactFileType,
    tags?: string[],
    mergeStrategy: MergeStrategy = 'auto-merge'
  ): IngestOperationResult {
    const text = rawText.trim();
    if (!text) {
      throw new Error('Cannot ingest empty text');
    }

    const resolvedBrain = brain.trim().toLowerCase();
    const effectivePath = filePath || fileName || 'document.md';
    const effectiveFileName = fileName || effectivePath.split(/[\\/]/).pop() || 'document.md';
    const resolvedType = fileType || inferFileTypeFromExtension(effectiveFileName);

    // 1. Detect existing node for this file in the target brain
    const existingFact = this.findNodeByFilePath(resolvedBrain, effectivePath);

    if (existingFact) {
      // Analyze incremental diff between existing node and incoming file
      const diff = detectIncrementalDiff(existingFact.content, text, resolvedType, effectiveFileName);

      // Case A: Identical content -> preserve existing unified node, skip redundant creation!
      if (diff.isIdentical && mergeStrategy !== 'replace') {
        return {
          fact: existingFact,
          action: 'unchanged',
          message: `Identical content detected for "${effectiveFileName}". Preserved existing unified context node #${existingFact.id} without creating duplicate nodes.`,
          sectionsCount: existingFact.semanticSectionCount || 1,
          isExistingNode: true,
          previousId: existingFact.id,
        };
      }

      // Case B: Intelligent Incremental Merge (merge new conversation turns/sections)
      if (mergeStrategy === 'auto-merge') {
        const previousLen = existingFact.content.length;
        existingFact.content = diff.mergedContent;
        existingFact.updated_at = new Date().toISOString();
        existingFact.isUnifiedContextNode = true;
        existingFact.isDocumentRoot = true;
        existingFact.semanticSectionCount = diff.mergedSectionsCount;
        existingFact.fileName = existingFact.fileName || effectiveFileName;
        existingFact.filePath = existingFact.filePath || effectivePath;
        if (!existingFact.documentTitle) {
          existingFact.documentTitle = effectiveFileName.replace(/\.[^/.]+$/, '');
        }

        // Merge tags if provided
        if (tags && tags.length > 0) {
          existingFact.tags = Array.from(new Set([...(existingFact.tags || []), ...tags]));
        }

        // Append to merge history
        const mergeRecord = {
          timestamp: new Date().toISOString(),
          action: 'merged' as const,
          summary: diff.summary,
          previousContentLength: previousLen,
          newContentLength: diff.mergedContent.length,
        };
        existingFact.mergeHistory = [mergeRecord, ...(existingFact.mergeHistory || [])];

        this.saveLocalFacts();
        this.recordActivity(existingFact, 'modified');
        this.notify();

        // Sync with backend if available
        fetch(`${API_BASE}/api/correct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingFact.id, content: existingFact.content }),
        }).catch(() => {});

        return {
          fact: existingFact,
          action: 'merged',
          message: diff.summary,
          sectionsCount: diff.mergedSectionsCount,
          isExistingNode: true,
          previousId: existingFact.id,
        };
      }

      // Case C: Replace existing content
      if (mergeStrategy === 'replace') {
        const parsed = parseSemanticSections(text, resolvedType, effectiveFileName);
        const previousLen = existingFact.content.length;
        existingFact.content = text;
        existingFact.updated_at = new Date().toISOString();
        existingFact.semanticSectionCount = parsed.sections.length;
        existingFact.isUnifiedContextNode = true;
        existingFact.isDocumentRoot = true;

        const mergeRecord = {
          timestamp: new Date().toISOString(),
          action: 'updated' as const,
          summary: `Replaced content with updated file (${parsed.sections.length} semantic sections)`,
          previousContentLength: previousLen,
          newContentLength: text.length,
        };
        existingFact.mergeHistory = [mergeRecord, ...(existingFact.mergeHistory || [])];

        this.saveLocalFacts();
        this.recordActivity(existingFact, 'modified');
        this.notify();

        fetch(`${API_BASE}/api/correct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingFact.id, content: existingFact.content }),
        }).catch(() => {});

        return {
          fact: existingFact,
          action: 'updated',
          message: `Replaced content of node #${existingFact.id} with revised file context.`,
          sectionsCount: parsed.sections.length,
          isExistingNode: true,
          previousId: existingFact.id,
        };
      }
    }

    // 2. No existing node -> Create a unified coherent context node
    const parsed = parseSemanticSections(text, resolvedType, effectiveFileName);
    const cleanTitle = parsed.title || effectiveFileName.replace(/\.[^/.]+$/, '');

    const newFact = this.remember(
      resolvedBrain,
      text,
      source,
      effectiveFileName,
      resolvedType,
      tags
    );

    newFact.filePath = effectivePath;
    newFact.isDocumentRoot = true;
    newFact.isUnifiedContextNode = true;
    newFact.documentTitle = cleanTitle;
    newFact.semanticSectionCount = parsed.sections.length;
    newFact.mergeHistory = [
      {
        timestamp: newFact.created_at,
        action: 'created',
        summary: `Unified coherent context node initialized from ${effectiveFileName} (${parsed.sections.length} semantic sections)`,
        newContentLength: text.length,
      },
    ];

    this.saveLocalFacts();
    this.notify();

    return {
      fact: newFact,
      action: 'created',
      message: `Created unified coherent context node #${newFact.id} with ${parsed.sections.length} semantic sections.`,
      sectionsCount: parsed.sections.length,
      isExistingNode: false,
    };
  }

  public ingest(
    brain: string,
    source: AISource,
    rawText: string,
    chunkSize: number = 1200,
    fileName?: string,
    fileType?: FactFileType,
    tags?: string[],
    strategy: IngestStrategy = 'semantic'
  ): number {
    const text = rawText.trim();
    if (!text) return 0;

    // STRATEGY 1: SEMANTIC UNIFIED CONTEXT NODE (Default, robust semantic chunking & incremental file merge)
    if (strategy === 'semantic' || strategy === 'single') {
      const result = this.ingestSemanticFile(
        brain,
        source,
        text,
        fileName,
        fileName,
        fileType,
        tags,
        'auto-merge'
      );
      return result ? 1 : 0;
    }

    // STRATEGY 2: HIERARCHICAL DOCUMENT BRANCHING WITH SEMANTIC CHUNKING
    // Creates a primary Document Hub node for the file (the 3rd node under the source!),
    // and branches related sub-sections/turns out from that 3rd node.
    if (strategy === 'branching') {
      const cleanTitle = fileName
        ? fileName.replace(/\.[^/.]+$/, '')
        : 'Document';

      const parsed = parseSemanticSections(text, fileType, fileName);

      // First, create or locate the root document node
      let rootFact = this.findNodeByFilePath(brain, fileName || '');
      if (!rootFact) {
        const previewSnippet = text.length > 300 ? text.slice(0, 300) + '...' : text;
        rootFact = this.remember(
          brain,
          `[Document: ${cleanTitle}]\n${previewSnippet}`,
          source,
          fileName,
          fileType,
          [...(tags || []), 'document-hub']
        );
        rootFact.isDocumentRoot = true;
        rootFact.isUnifiedContextNode = true;
        rootFact.documentTitle = cleanTitle;
        rootFact.semanticSectionCount = parsed.sections.length;
      }

      // Branch semantic sections out from that 3rd node!
      let childCount = 0;
      for (const section of parsed.sections) {
        if (section.content.trim()) {
          const childFact = this.remember(
            brain,
            section.content.trim(),
            source,
            fileName,
            fileType,
            tags
          );
          childFact.parentId = rootFact.id;
          childCount++;
        }
      }
      this.saveLocalFacts();
      return 1 + childCount;
    }

    // STRATEGY 3: TRADITIONAL CHUNK SLICING
    const paragraphs = text
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
        this.remember(brain, chunk, source, fileName, fileType, tags);
        count++;
      }
    }
    return count;
  }

  private semanticSplit(text: string, maxLen: number = 1500): string[] {
    // If chat transcript with #### User / #### Assistant: split by conversation turns!
    if (text.includes('#### User') || text.includes('#### Assistant')) {
      const turns = text.split(/(?=#### (?:User|Assistant))/g).filter(Boolean);
      if (turns.length > 1) {
        return turns.map((t) => t.trim());
      }
    }

    // If markdown with headings (#, ##, ###): split by headings!
    if (/^#{1,3}\s+/m.test(text)) {
      const sections = text.split(/(?=^#{1,3}\s+)/m).filter(Boolean);
      if (sections.length > 1) {
        return sections.map((s) => s.trim());
      }
    }

    // Fallback to paragraph chunking
    const paragraphs = text.split('\n\n').filter(Boolean);
    const chunks: string[] = [];
    let current = '';
    for (const p of paragraphs) {
      if (current && current.length + p.length + 2 > maxLen) {
        chunks.push(current);
        current = p;
      } else {
        current = current ? `${current}\n\n${p}` : p;
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [text];
  }

  public exportContextSnapshot(brain: string): string {
    const facts = this.recall(brain);
    if (!facts.length) {
      return `# Context Memory: ${brain}\n\nNo facts recorded in this brain yet.`;
    }

    const lines = [
      `# Context Memory: ${brain.toUpperCase()}`,
      `Generated by Brain · Total Stored Facts: ${facts.length}`,
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

  public resetToDefaults() {
    this.loadFromBackend();
  }
}

export const brainStore = new BrainStorageService();

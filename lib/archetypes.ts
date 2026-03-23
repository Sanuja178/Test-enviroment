export type ArchetypeKey = 'elmo' | 'bigbird' | 'bert' | 'cookie' | 'oscar';

export interface Archetype {
  key: ArchetypeKey;
  character: string;
  archetype: string;
  belief: string;
  style: string;
  strengths: string;
  risks: string;
  question: string;
  color: string;
  bgColor: string;
  emoji: string;
  description: string;
}

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  elmo: {
    key: 'elmo',
    character: 'Elmo',
    archetype: 'Empathic Connector',
    belief: 'People come before systems',
    style: 'Emotionally intelligent, relationship-focused, inclusive',
    strengths: 'Builds trust quickly, resolves conflict, creates strong communities',
    risks: 'May avoid difficult decisions, prioritise harmony over change',
    question: 'How will this decision affect the people involved?',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    emoji: '❤️',
    description: 'You lead with your heart. Like Elmo, you believe that understanding and caring for the people around you is the foundation of everything. You create spaces where people feel truly seen.',
  },
  bigbird: {
    key: 'bigbird',
    character: 'Big Bird',
    archetype: 'Visionary Explorer',
    belief: 'The future belongs to those who imagine it first',
    style: 'Curious, optimistic, possibility-driven',
    strengths: 'Generates new ideas, inspires exploration, encourages learning',
    risks: 'May overlook practical limits, execution can be weaker',
    question: 'What could exist that doesn\'t exist yet?',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    emoji: '🌟',
    description: 'You lead with imagination. Like Big Bird, you see possibility where others see obstacles. Your curiosity and optimism open doors that haven\'t been built yet.',
  },
  bert: {
    key: 'bert',
    character: 'Bert',
    archetype: 'Systems Architect',
    belief: 'Strong systems create strong outcomes',
    style: 'Structured, organised, rule-oriented',
    strengths: 'Creates stability, ensures fairness, builds reliable systems',
    risks: 'Can become rigid, may resist innovation',
    question: 'What structure ensures this works long term?',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    emoji: '📋',
    description: 'You lead with structure. Like Bert, you believe that good systems make good outcomes possible. You create the frameworks that allow others to thrive.',
  },
  cookie: {
    key: 'cookie',
    character: 'Cookie Monster',
    archetype: 'Passion Driver',
    belief: 'Energy and drive create momentum',
    style: 'Action-oriented, enthusiastic, bold',
    strengths: 'Motivates teams, drives progress quickly, embraces risk',
    risks: 'Impulsive decisions, may prioritise short-term wins',
    question: 'What action moves us forward right now?',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    emoji: '🍪',
    description: 'You lead with energy. Like Cookie Monster, your enthusiasm is contagious. You get things moving, take bold risks, and remind your team that progress is possible.',
  },
  oscar: {
    key: 'oscar',
    character: 'Oscar the Grouch',
    archetype: 'Constructive Challenger',
    belief: 'Progress requires questioning the system',
    style: 'Critical thinker, skeptical, disruptor',
    strengths: 'Prevents groupthink, identifies ethical blind spots, challenges assumptions',
    risks: 'May appear negative, harder to build consensus',
    question: 'What are we missing or getting wrong?',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    emoji: '🗑️',
    description: 'You lead with honesty. Like Oscar, you\'re not afraid to say what others won\'t. Your willingness to challenge the status quo protects your team from blind spots.',
  },
};

export const ARCHETYPE_KEYS: ArchetypeKey[] = ['elmo', 'bigbird', 'bert', 'cookie', 'oscar'];

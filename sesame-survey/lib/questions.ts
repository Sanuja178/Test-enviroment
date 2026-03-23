import { ArchetypeKey } from './archetypes';

export interface QuestionOption {
  text: string;
  archetype: ArchetypeKey;
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
}

// Options are randomised per question but each maps to one archetype.
// Order within each question is shuffled so answers aren't predictable.
export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'When your team faces a conflict, your first instinct is to…',
    options: [
      { text: 'Listen to everyone\'s feelings and find common ground', archetype: 'elmo' },
      { text: 'Reimagine the situation — maybe there\'s a completely different approach', archetype: 'bigbird' },
      { text: 'Refer back to the agreed process and follow it step by step', archetype: 'bert' },
      { text: 'Take decisive action to move past it as quickly as possible', archetype: 'cookie' },
      { text: 'Ask whether the conflict is revealing a deeper, systemic problem', archetype: 'oscar' },
    ],
  },
  {
    id: 2,
    text: 'When making an important decision, the first question you ask is…',
    options: [
      { text: 'How will this affect the people involved?', archetype: 'elmo' },
      { text: 'What new possibilities does this open up?', archetype: 'bigbird' },
      { text: 'What process should we follow to get this right?', archetype: 'bert' },
      { text: 'How quickly can we make this happen?', archetype: 'cookie' },
      { text: 'What assumptions are we making that might be wrong?', archetype: 'oscar' },
    ],
  },
  {
    id: 3,
    text: 'You feel most energised and in your element when you\'re…',
    options: [
      { text: 'Building trust and deepening relationships', archetype: 'elmo' },
      { text: 'Exploring ideas that don\'t exist yet', archetype: 'bigbird' },
      { text: 'Designing systems and processes that work reliably', archetype: 'bert' },
      { text: 'Taking bold action and driving visible results', archetype: 'cookie' },
      { text: 'Challenging assumptions and exposing what\'s being overlooked', archetype: 'oscar' },
    ],
  },
  {
    id: 4,
    text: 'Your team hits a major obstacle. You…',
    options: [
      { text: 'Rally emotional support and make sure morale stays high', archetype: 'elmo' },
      { text: 'Reframe the goal entirely — maybe there\'s a better way', archetype: 'bigbird' },
      { text: 'Go back to the plan and pinpoint exactly where things went wrong', archetype: 'bert' },
      { text: 'Push harder and find a way to break through', archetype: 'cookie' },
      { text: 'Wonder if the obstacle is actually revealing a deeper problem', archetype: 'oscar' },
    ],
  },
  {
    id: 5,
    text: 'The people who know you best would describe you as…',
    options: [
      { text: 'Warm and deeply empathetic', archetype: 'elmo' },
      { text: 'Creative and relentlessly optimistic', archetype: 'bigbird' },
      { text: 'Reliable, organised, and thorough', archetype: 'bert' },
      { text: 'Energetic, bold, and action-oriented', archetype: 'cookie' },
      { text: 'Honest, direct, and not afraid to say the uncomfortable thing', archetype: 'oscar' },
    ],
  },
  {
    id: 6,
    text: 'When you witness an unfair system or injustice, you…',
    options: [
      { text: 'Focus on supporting and healing the people who\'ve been hurt', archetype: 'elmo' },
      { text: 'Start imagining what a fairer alternative could look like', archetype: 'bigbird' },
      { text: 'Work within the rules and proper channels to fix it correctly', archetype: 'bert' },
      { text: 'Take immediate, visible action to address it', archetype: 'cookie' },
      { text: 'Loudly call it out, even if it makes others uncomfortable', archetype: 'oscar' },
    ],
  },
  {
    id: 7,
    text: 'In a meeting, you\'re most likely to be the person who…',
    options: [
      { text: 'Checks in on how people are feeling before jumping to solutions', archetype: 'elmo' },
      { text: 'Asks "what if we tried something completely different?"', archetype: 'bigbird' },
      { text: 'Keeps things on track and captures clear action items', archetype: 'bert' },
      { text: 'Pushes the group to make a decision and move forward', archetype: 'cookie' },
      { text: 'Raises the uncomfortable question everyone else is avoiding', archetype: 'oscar' },
    ],
  },
  {
    id: 8,
    text: 'As a leader, your deepest fear is…',
    options: [
      { text: 'Hurting someone or permanently damaging a relationship', archetype: 'elmo' },
      { text: 'Getting trapped in the same old way of doing things', archetype: 'bigbird' },
      { text: 'Things falling apart because of poor planning or unclear process', archetype: 'bert' },
      { text: 'Missing a critical opportunity by moving too slowly', archetype: 'cookie' },
      { text: 'Being complicit in something that\'s fundamentally wrong', archetype: 'oscar' },
    ],
  },
  {
    id: 9,
    text: 'To you, the best kind of leadership looks like…',
    options: [
      { text: 'Creating psychological safety where everyone can truly thrive', archetype: 'elmo' },
      { text: 'Inspiring people to see possibilities they couldn\'t see before', archetype: 'bigbird' },
      { text: 'Building systems and structures that outlast any single leader', archetype: 'bert' },
      { text: 'Making things happen and relentlessly driving results', archetype: 'cookie' },
      { text: 'Holding power accountable and refusing to accept the status quo', archetype: 'oscar' },
    ],
  },
  {
    id: 10,
    text: 'When you disagree with a decision being made, you…',
    options: [
      { text: 'Try to understand every perspective fully before responding', archetype: 'elmo' },
      { text: 'Propose an alternative vision or a different way forward', archetype: 'bigbird' },
      { text: 'Reference the agreed principles or process that should guide the decision', archetype: 'bert' },
      { text: 'Voice your disagreement clearly and push hard for a different outcome', archetype: 'cookie' },
      { text: 'Refuse to stay silent, even if it creates tension', archetype: 'oscar' },
    ],
  },
];

export function calculateArchetype(answers: ArchetypeKey[]): {
  archetype: ArchetypeKey;
  scores: Record<ArchetypeKey, number>;
} {
  const scores: Record<ArchetypeKey, number> = {
    elmo: 0,
    bigbird: 0,
    bert: 0,
    cookie: 0,
    oscar: 0,
  };

  for (const answer of answers) {
    scores[answer]++;
  }

  const archetype = (Object.entries(scores) as [ArchetypeKey, number][]).reduce(
    (best, [key, score]) => (score > best[1] ? [key, score] : best),
    ['elmo', 0] as [ArchetypeKey, number]
  )[0];

  return { archetype, scores };
}

export interface ActivityQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface ActivityDefinition {
  id: string;
  title: string;
  description: string;
  questions: ActivityQuestion[];
}

const makeQuestions = (prefix: string) =>
  Array.from({ length: 10 }, (_, index) => ({
    id: `${prefix}-q${index + 1}`,
    prompt: `Question ${index + 1}: ${prefix} practice prompt`,
    options: ['A', 'B', 'C', 'D'],
  }));

export const activities: ActivityDefinition[] = [
  {
    id: 'energetics-basics',
    title: 'Energetics basics',
    description: 'Enthalpy changes and energy profiles.',
    questions: makeQuestions('energetics'),
  },
  {
    id: 'organic-hydrocarbons',
    title: 'Organic hydrocarbons',
    description: 'Alkanes, alkenes, and reaction conditions.',
    questions: makeQuestions('hydrocarbons'),
  },
  {
    id: 'kinetics-core',
    title: 'Kinetics core',
    description: 'Rates, orders, and collision theory.',
    questions: makeQuestions('kinetics'),
  },
];

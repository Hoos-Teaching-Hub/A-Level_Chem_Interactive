export type StudentActivity = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  objectives: string[];
  examTips: string[];
  estimatedMinutes: number;
};

export const mockActivities: StudentActivity[] = [
  {
    id: 'alcohol-oxidation',
    title: 'Alcohol oxidation pathways',
    topic: 'Hydroxy compounds',
    summary:
      'Trace primary, secondary, and tertiary alcohol outcomes with key reagents and conditions.',
    objectives: [
      'Match alcohol class to oxidation products.',
      'Recall common reagents and conditions.',
      'Identify when oxidation stops at aldehydes.',
    ],
    examTips: [
      'Primary alcohols can stop at aldehydes with distillation.',
      'Tertiary alcohols resist oxidation under normal conditions.',
    ],
    estimatedMinutes: 12,
  },
  {
    id: 'alkene-addition',
    title: 'Electrophilic addition to alkenes',
    topic: 'Hydrocarbons',
    summary:
      'Predict products for halogenation, hydration, and hydrogenation with common catalysts.',
    objectives: [
      'Recognize electrophilic addition mechanisms.',
      'Select catalysts for hydration and hydrogenation.',
      'Predict Markovnikov products.',
    ],
    examTips: [
      'Use H2SO4 / steam for hydration.',
      'Bromine water decolorizes with alkenes.',
    ],
    estimatedMinutes: 10,
  },
  {
    id: 'carbonyl-tests',
    title: 'Carbonyl test reactions',
    topic: 'Carbonyl compounds',
    summary:
      'Compare 2,4-DNPH, Tollens, and iodoform tests to identify aldehydes and methyl ketones.',
    objectives: [
      'Select the correct qualitative test.',
      'Explain expected observations.',
      'Differentiate aldehydes from ketones.',
    ],
    examTips: [
      'Tollens gives a silver mirror with aldehydes.',
      'Iodoform indicates a CH3CO group.',
    ],
    estimatedMinutes: 14,
  },
  {
    id: 'acyl-derivatives',
    title: 'Carboxylic acid derivatives',
    topic: 'Carboxylic acids',
    summary:
      'Map reactions between acyl chlorides, esters, and amides with ammonia and alcohols.',
    objectives: [
      'Order derivatives by reactivity.',
      'Predict products of nucleophilic substitution.',
      'Recall conditions for esterification.',
    ],
    examTips: [
      'Acyl chlorides react rapidly with water and alcohols.',
      'Amide formation requires heat with ammonia or amines.',
    ],
    estimatedMinutes: 16,
  },
];

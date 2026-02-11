export type StudentActivity = {
  id: string;
  title: string;
  level: 'AS' | 'A2';
  topic: string;
  summary: string;
  objectives: string[];
  examTips: string[];
  estimatedMinutes: number;
  metadata: {
    what: string;
    how: string;
    why: string;
    examTip: string;
  };
};

export const mockActivities: StudentActivity[] = [
  {
    id: 'alcohol-oxidation',
    title: 'Alcohol oxidation pathways',
    level: 'AS',
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
    metadata: {
      what: 'Classify alcohol oxidation outcomes for primary, secondary, and tertiary alcohols.',
      how: 'Apply reagent/condition rules and identify when distillation is needed to isolate aldehydes.',
      why: 'Exam questions often mix oxidation routes and conditions in multi-step synthesis paths.',
      examTip: 'Use acidified potassium dichromate(VI) and control distillation to prevent over-oxidation.',
    },
  },
  {
    id: 'alkene-addition',
    title: 'Electrophilic addition to alkenes',
    level: 'AS',
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
    metadata: {
      what: 'Track product outcomes for common electrophilic additions to C=C bonds.',
      how: 'Map reagent to product family, then apply orientation rules for unsymmetrical alkenes.',
      why: 'This is a high-frequency mechanism family used in both recall and synthesis questions.',
      examTip: 'State both reagent and condition pairings, not just product names.',
    },
  },
  {
    id: 'carbonyl-tests',
    title: 'Carbonyl test reactions',
    level: 'AS',
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
    metadata: {
      what: 'Differentiate aldehydes and ketones using qualitative test reactions.',
      how: 'Link each reagent to expected observations and structural interpretation.',
      why: 'Data-handling questions often require selecting the minimal test sequence.',
      examTip: 'Use 2,4-DNPH as the initial carbonyl check, then differentiate with Tollens or iodoform.',
    },
  },
  {
    id: 'acyl-derivatives',
    title: 'Carboxylic acid derivatives',
    level: 'A2',
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
    metadata: {
      what: 'Compare reactivity patterns across acyl chlorides, esters, and amides.',
      how: 'Use nucleophile strength and leaving-group ability to predict substitution outcomes.',
      why: 'A2 synthesis questions require selecting feasible derivative interconversions.',
      examTip: 'Prioritize acyl chlorides for efficient route planning when multiple options are valid.',
    },
  },
];

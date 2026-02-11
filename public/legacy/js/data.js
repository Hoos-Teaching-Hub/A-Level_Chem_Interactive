const colors = {
    crude: '#888888',
    hc: '#ff99ff', // Alkane/Alkene
    halo: '#ffff99',
    // Updated Alcohol Colors
    alcGroup: '#ffffff', // White center for hub
    alc1: '#93c5fd',     // Light Blue (Primary)
    alc2: '#3b82f6',     // Medium Blue (Secondary)
    alc3: '#1e40af',     // Dark Blue (Tertiary)
    carbonyl: '#ff9966', // Ald/Ket
    acid: '#ff6666', // Acid/Ester
    amine: '#34D399',
    nitrile: '#8B5CF6',
    polymer: '#a78bfa',
    product: '#94a3b8',
    test: '#fbbf24',
    noRxn: '#ef4444'
};

const baseNodes = [
    { id: 'Crude', name: 'Crude Oil', color: colors.crude, val: 20 },
    { id: 'Alkane', name: 'Alkanes', color: colors.hc, val: 10 },
    { id: 'Alkene', name: 'Alkenes', color: colors.hc, val: 10 },
    { id: 'Halo', name: 'Halogenoalkanes', color: colors.halo, val: 12 },

    // New Alcohol Structure
    { id: 'AlcoholGroup', name: 'Alcohols', color: colors.alcGroup, val: 15 },
    { id: 'Alc1', name: '1° Alcohol', color: colors.alc1, val: 8 },
    { id: 'Alc2', name: '2° Alcohol', color: colors.alc2, val: 8 },
    { id: 'Alc3', name: '3° Alcohol', color: colors.alc3, val: 8 },

    { id: 'Ald', name: 'Aldehyde', color: colors.carbonyl, val: 8 },
    { id: 'Ket', name: 'Ketone', color: colors.carbonyl, val: 8 },
    { id: 'Carb', name: 'Carboxylic Acid', color: colors.acid, val: 10 },
    { id: 'Ester', name: 'Ester', color: colors.acid, val: 10 },
    { id: 'Amine', name: 'Amine', color: colors.amine, val: 8 },
    { id: 'Nitrile', name: 'Nitrile', color: colors.nitrile, val: 8 },
    { id: 'Diol', name: 'Diol', color: colors.alc1, val: 8 },
    { id: 'Hydroxynitrile', name: 'Hydroxynitrile', color: colors.nitrile, val: 8 },
    { id: 'Polymer', name: 'Poly(alkene)', color: colors.polymer, val: 8 },
    { id: 'PVC', name: 'PVC', color: colors.polymer, val: 8 },
    { id: 'Chloroalkene', name: 'Chloroalkene', color: colors.halo, val: 8 },
    { id: 'Combustion', name: 'CO₂ + H₂O', color: colors.product, val: 6 },
    { id: 'IncompleteCombustion', name: 'CO/C + H₂O', color: colors.product, val: 6 },
    { id: 'CrackingMix', name: 'Cracking Products', color: colors.product, val: 8 },
    { id: 'Alkoxide', name: 'Alkoxide', color: colors.product, val: 6 },
    { id: 'Carboxylate', name: 'Carboxylate Salt', color: colors.product, val: 6 },
    { id: 'AgX', name: 'AgX Precipitate', color: colors.test, val: 6 },
    { id: 'DNPH', name: '2,4-DNPH Derivative', color: colors.test, val: 6 },
    { id: 'Iodoform', name: 'Iodoform (CHI₃)', color: colors.test, val: 6 },
    { id: 'NoRxn', name: 'No Reaction', color: colors.noRxn, val: 5 }
];

const baseLinks = [
        // Structural Links (New) - No particles, no arrows
        {
            source: 'AlcoholGroup',
            target: 'Alc1',
            label: 'Class',
            reagents: 'Classification link only (no reagent)',
            type: 'structure'
        },
        {
            source: 'AlcoholGroup',
            target: 'Alc2',
            label: 'Class',
            reagents: 'Classification link only (no reagent)',
            type: 'structure'
        },
        {
            source: 'AlcoholGroup',
            target: 'Alc3',
            label: 'Class',
            reagents: 'Classification link only (no reagent)',
            type: 'structure'
        },

        // Hydrocarbon
        { source: 'Crude', target: 'Alkane', label: 'Cracking', reagents: 'Heat + Al₂O₃', type: 'Thermal Decomposition' },
        { source: 'Crude', target: 'Alkene', label: 'Cracking', reagents: 'Heat + Al₂O₃', type: 'Thermal Decomposition' },
        { source: 'Alkane', target: 'CrackingMix', label: 'Cracking', reagents: 'Heat + Al₂O₃', type: 'Thermal Decomposition' },
        { source: 'Alkane', target: 'Halo', label: 'Free Radical Sub', reagents: 'UV Light + Halogen', type: 'Free Radical Substitution' },
        { source: 'Alkane', target: 'Combustion', label: 'Complete Combustion', reagents: 'O₂ (excess) + Ignition', type: 'Oxidation' },
        { source: 'Alkane', target: 'IncompleteCombustion', label: 'Incomplete Combustion', reagents: 'O₂ (limited) + Ignition', type: 'Oxidation' },
        { source: 'Alkene', target: 'Alkane', label: 'Hydrogenation', reagents: 'H₂ + Pt/Ni + Heat', type: 'Electrophilic Addition' },
        { source: 'Alkene', target: 'Halo', label: 'Electrophilic Add', reagents: 'HX (RTP)', type: 'Electrophilic Addition' },
        { source: 'Alkene', target: 'Halo', label: 'Halogenation', reagents: 'X₂ (RTP)', type: 'Electrophilic Addition' },
        { source: 'Alkene', target: 'Halo', label: 'Bromine Water Test', reagents: 'Br₂(aq) (RTP)', type: 'Electrophilic Addition' },
        { source: 'Alkene', target: 'Polymer', label: 'Addition Polymerisation', reagents: 'Catalyst/Pressure', type: 'Addition Polymerisation' },

        // Alkene to Alcohols (Consolidated)
        { source: 'Alkene', target: 'AlcoholGroup', label: 'Hydration', reagents: 'Steam + H₃PO₄ + 300°C', type: 'Electrophilic Addition' },

        // Alkene Oxidation Pathways
        { source: 'Alkene', target: 'Diol', label: 'Mild Oxidation', reagents: 'Cold Dilute KMnO₄', type: 'Oxidation' },
        { source: 'Alkene', target: 'Ket', label: 'Oxidative Cleavage', reagents: 'Hot Conc. KMnO₄ / H⁺', type: 'Strong Oxidation' },
        { source: 'Alkene', target: 'Carb', label: 'Oxidative Cleavage', reagents: 'Hot Conc. KMnO₄ / H⁺', type: 'Strong Oxidation' },

        { source: 'Halo', target: 'Alkene', label: 'Elimination', reagents: 'NaOH (eth) + Heat', type: 'Elimination' },

        // Halo Derivatives (Consolidated)
        { source: 'Halo', target: 'AlcoholGroup', label: 'Nuc Sub', reagents: 'NaOH (aq) + Heat', type: 'Nucleophilic Substitution (SN1/SN2)' },

        { source: 'Halo', target: 'Amine', label: 'Nuc Sub', reagents: 'Conc. NH₃ (eth) + Heat', type: 'Nucleophilic Substitution' },
        { source: 'Halo', target: 'Nitrile', label: 'Nuc Sub', reagents: 'KCN (eth) + Heat', type: 'Nucleophilic Substitution' },
        { source: 'Halo', target: 'AgX', label: 'Silver Nitrate Test', reagents: 'AgNO₃ (aq) in ethanol', type: 'Test Reaction' },

        // Oxidation
        { source: 'Alc1', target: 'Ald', label: 'Oxidation', reagents: 'K₂Cr₂O₇/H⁺ (Distil)', type: 'Partial Oxidation' },
        { source: 'Ald', target: 'Carb', label: 'Oxidation', reagents: 'K₂Cr₂O₂/H⁺ (Reflux)', type: 'Full Oxidation' },
        { source: 'Ald', target: 'Carb', label: 'Aldehyde Tests', reagents: 'Tollens/Fehling (Warm)', type: 'Oxidation (Test)' },
        { source: 'Alc1', target: 'Carb', label: 'Oxidation', reagents: 'Excess K₂Cr₂O₇/H⁺ (Reflux)', type: 'Full Oxidation' },
        { source: 'Alc2', target: 'Ket', label: 'Oxidation', reagents: 'K₂Cr₂O₇/H⁺ (Reflux)', type: 'Oxidation' },
        { source: 'Alc3', target: 'NoRxn', label: 'No Reaction', reagents: 'Resistant to oxidation', type: 'N/A' },

        // Reduction
        { source: 'Ald', target: 'Alc1', label: 'Reduction', reagents: 'NaBH₄', type: 'Nucleophilic Addition' },
        { source: 'Ket', target: 'Alc2', label: 'Reduction', reagents: 'NaBH₄', type: 'Nucleophilic Addition' },
        { source: 'Carb', target: 'Alc1', label: 'Reduction', reagents: 'LiAlH₄ (ether)', type: 'Reduction' },
        { source: 'Ald', target: 'Hydroxynitrile', label: 'Cyanohydrin', reagents: 'HCN + KCN (Cat)', type: 'Nucleophilic Addition' },
        { source: 'Ket', target: 'Hydroxynitrile', label: 'Cyanohydrin', reagents: 'HCN + KCN (Cat)', type: 'Nucleophilic Addition' },
        { source: 'Ald', target: 'DNPH', label: '2,4-DNPH Test', reagents: '2,4-DNPH', type: 'Condensation' },
        { source: 'Ket', target: 'DNPH', label: '2,4-DNPH Test', reagents: '2,4-DNPH', type: 'Condensation' },
        { source: 'Ald', target: 'Iodoform', label: 'Iodoform Test', reagents: 'I₂/NaOH', type: 'Oxidation/Test' },
        { source: 'Ket', target: 'Iodoform', label: 'Iodoform Test', reagents: 'I₂/NaOH', type: 'Oxidation/Test' },

        // Derivatives - UPDATED TO USE ALCOHOL GROUP
        { source: 'AlcoholGroup', target: 'Ester', label: 'Esterification', reagents: 'Acid + H₂SO₄', type: 'Condensation' },
        { source: 'Carb', target: 'Ester', label: 'Esterification', reagents: 'Alcohol + H₂SO₄', type: 'Condensation' },
        { source: 'AlcoholGroup', target: 'Halo', label: 'Substitution', reagents: 'HX / PCl₅ / SOCl₂', type: 'Substitution' },
        { source: 'Nitrile', target: 'Carb', label: 'Hydrolysis', reagents: 'Acid/Alkali + Heat', type: 'Hydrolysis' },
        { source: 'Ester', target: 'Carb', label: 'Hydrolysis', reagents: 'Acid/Alkali + Heat', type: 'Hydrolysis' },
        { source: 'Ester', target: 'Alc1', label: 'Hydrolysis', reagents: 'Acid/Alkali + Heat', type: 'Hydrolysis' },
        { source: 'AlcoholGroup', target: 'Alkoxide', label: 'Reaction with Na', reagents: 'Na(s)', type: 'Acid-Base/Redox' },
        { source: 'AlcoholGroup', target: 'Combustion', label: 'Combustion', reagents: 'O₂ + Ignition', type: 'Oxidation' },
        { source: 'Carb', target: 'Carboxylate', label: 'Neutralisation', reagents: 'NaOH', type: 'Acid-Base' },
        { source: 'Carb', target: 'Carboxylate', label: 'Metal Reaction', reagents: 'Mg/Na', type: 'Redox' },
        { source: 'Carb', target: 'Carboxylate', label: 'Acid-Carbonate', reagents: 'Na₂CO₃', type: 'Acid-Carbonate' },

        // Dehydration - UPDATED TO USE ALCOHOL GROUP
        { source: 'AlcoholGroup', target: 'Alkene', label: 'Dehydration', reagents: 'Hot Al₂O₃ or Conc. H₂SO₄', type: 'Elimination' },

        // Polymerisation
        { source: 'Chloroalkene', target: 'PVC', label: 'Addition Polymerisation', reagents: 'Catalyst/Pressure', type: 'Addition Polymerisation' }
];

const nodeMetadataById = {
    Crude: {
        level: 'AS',
        topic: 'Hydrocarbons',
        examTips: ['Mention fractional distillation before cracking or reforming pathways.']
    },
    Alkane: {
        level: 'AS',
        topic: 'Hydrocarbons',
        examTips: ['Use radical substitution language only when UV light and halogen are present.']
    },
    Alkene: {
        level: 'AS',
        topic: 'Hydrocarbons',
        examTips: ['State electrophilic addition and quote both reagent and condition.']
    },
    Halo: {
        level: 'AS',
        topic: 'Halogen compounds',
        examTips: ['Separate substitution and elimination conditions clearly in exam responses.']
    },
    AlcoholGroup: {
        level: 'AS',
        topic: 'Hydroxy compounds',
        examTips: ['Classify alcohols first; oxidation outcomes depend on 1°/2°/3° type.']
    },
    Alc1: {
        level: 'AS',
        topic: 'Hydroxy compounds',
        examTips: ['Primary alcohol oxidation can stop at aldehyde if distilled promptly.']
    },
    Alc2: {
        level: 'AS',
        topic: 'Hydroxy compounds',
        examTips: ['Secondary alcohol oxidation gives ketones under reflux conditions.']
    },
    Alc3: {
        level: 'AS',
        topic: 'Hydroxy compounds',
        examTips: ['Tertiary alcohols resist oxidation under standard dichromate conditions.']
    },
    Ald: {
        level: 'AS',
        topic: 'Carbonyl compounds',
        examTips: ['Aldehydes oxidize further; include test observation when relevant.']
    },
    Ket: {
        level: 'AS',
        topic: 'Carbonyl compounds',
        examTips: ['Ketones resist mild oxidation and are reduced to secondary alcohols.']
    },
    Carb: {
        level: 'A2',
        topic: 'Carboxylic acids and derivatives',
        examTips: ['Remember acid-carbonate reactions release CO2 effervescence.']
    },
    Ester: {
        level: 'A2',
        topic: 'Carboxylic acids and derivatives',
        examTips: ['Name esters from alcohol first, then carboxylate part ending in -oate.']
    },
    Amine: {
        level: 'A2',
        topic: 'Nitrogen compounds',
        examTips: ['Use excess ethanolic ammonia to favor primary amine formation in substitution routes.']
    },
    Nitrile: {
        level: 'A2',
        topic: 'Nitrogen compounds',
        examTips: ['Nitrile formation extends the carbon chain by one carbon atom.']
    },
    Diol: {
        level: 'AS',
        topic: 'Hydroxy compounds',
        examTips: ['Cold, dilute permanganate indicates alkene oxidation to vicinal diols.']
    },
    Hydroxynitrile: {
        level: 'A2',
        topic: 'Nitrogen compounds',
        examTips: ['Hydroxynitrile formation requires in situ HCN generated safely from cyanide and acid.']
    },
    Polymer: {
        level: 'A2',
        topic: 'Polymerisation',
        examTips: ['State monomer and repeat unit when describing polymer formation.']
    },
    PVC: {
        level: 'A2',
        topic: 'Polymerisation',
        examTips: ['Include repeat unit brackets and continuation bonds when drawing PVC structures.']
    },
    Chloroalkene: {
        level: 'A2',
        topic: 'Polymerisation',
        examTips: ['PVC is formed by addition polymerisation of chloroethene.']
    },
    Combustion: {
        level: 'AS',
        topic: 'Hydrocarbons',
        examTips: ['Complete combustion gives CO2 and H2O when oxygen is in excess.']
    },
    IncompleteCombustion: {
        level: 'AS',
        topic: 'Hydrocarbons',
        examTips: ['Limited oxygen leads to toxic CO or soot, so state the oxygen condition explicitly.']
    },
    CrackingMix: {
        level: 'AS',
        topic: 'Hydrocarbons',
        examTips: ['Cracking products are a mixture, so identify both alkane and alkene fractions.']
    },
    Alkoxide: {
        level: 'AS',
        topic: 'Hydroxy compounds',
        examTips: ['Alcohol plus sodium forms alkoxide and hydrogen gas; note the bubbling evidence.']
    },
    Carboxylate: {
        level: 'A2',
        topic: 'Carboxylic acids and derivatives',
        examTips: ['Carboxylate salts are ionic and usually more water-soluble than parent acids.']
    },
    AgX: {
        level: 'AS',
        topic: 'Halogen compounds',
        examTips: ['Learn AgCl, AgBr, AgI colors and ammonia solubility trends for halide tests.']
    },
    DNPH: {
        level: 'AS',
        topic: 'Carbonyl compounds',
        examTips: ['2,4-DNPH gives an orange precipitate with aldehydes and ketones.']
    },
    Iodoform: {
        level: 'AS',
        topic: 'Carbonyl compounds',
        examTips: ['Iodoform test identifies CH3CO- or CH3CH(OH)- containing compounds.']
    },
    NoRxn: {
        level: 'AS',
        topic: 'Reaction limits',
        examTips: ['Do not force oxidation pathways for tertiary alcohols in standard conditions.']
    }
};

const linkMetadataByKey = {
    'Crude|Alkane|Cracking': {
        mechanismSummary: 'Thermal cracking breaks long hydrocarbons into shorter saturated fragments.',
        conditions: 'Strong heating with catalyst such as Al2O3 under controlled cracking conditions.',
        quizData: {
            prompt: 'What process converts crude fractions into smaller alkanes?',
            hiddenFields: ['label'],
            answer: 'Cracking'
        },
        animationId: 'crude-to-alkane-cracking'
    },
    'Crude|Alkene|Cracking': {
        mechanismSummary: 'Thermal cracking also forms unsaturated hydrocarbons with C=C bonds.',
        conditions: 'High temperature cracking over catalyst to generate alkene-rich mixtures.',
        quizData: {
            prompt: 'Name one unsaturated product family formed during cracking.',
            hiddenFields: ['target'],
            answer: 'Alkenes'
        },
        animationId: 'crude-to-alkene-cracking'
    },
    'Alkane|Halo|Free Radical Sub': {
        mechanismSummary: 'Homolytic substitution under UV light through initiation, propagation, and termination.',
        conditions: 'UV light with halogen gas; control exposure to limit polysubstitution.',
        quizData: {
            prompt: 'Name the mechanism for converting an alkane to a halogenoalkane.',
            hiddenFields: ['type'],
            answer: 'Free radical substitution'
        },
        animationId: 'free-radical-substitution'
    },
    'Alkene|Halo|Electrophilic Add': {
        mechanismSummary: 'Polar electrophile attacks the alkene pi bond and forms a saturated halogenoalkane.',
        conditions: 'Hydrogen halide at room temperature with dry conditions where possible.',
        quizData: {
            prompt: 'Which mechanism describes HX addition to an alkene?',
            hiddenFields: ['type'],
            answer: 'Electrophilic addition'
        },
        animationId: 'alkene-hx-addition'
    },
    'Alkene|AlcoholGroup|Hydration': {
        mechanismSummary: 'Electrophilic addition where steam adds across C=C using acid catalyst.',
        conditions: 'Steam, H3PO4 catalyst, high temperature and pressure.',
        quizData: {
            prompt: 'Which reagent/conditions hydrate an alkene to an alcohol?',
            hiddenFields: ['reagents'],
            answer: 'Steam with H3PO4 catalyst'
        },
        animationId: 'alkene-hydration'
    },
    'Halo|AlcoholGroup|Nuc Sub': {
        mechanismSummary: 'Hydroxide nucleophile substitutes halide to produce alcohol from halogenoalkane.',
        conditions: 'Aqueous NaOH with heat, favoring substitution in hydroxy synthesis routes.',
        quizData: {
            prompt: 'What reagent converts halogenoalkanes to alcohols by substitution?',
            hiddenFields: ['reagents'],
            answer: 'Aqueous sodium hydroxide'
        },
        animationId: 'halo-to-alcohol-substitution'
    },
    'Alc1|Ald|Oxidation': {
        mechanismSummary: 'Primary alcohol oxidizes to aldehyde under controlled distillation.',
        conditions: 'Acidified K2Cr2O7 and gentle heating with distillation.',
        quizData: {
            prompt: 'What product forms from mild oxidation of a primary alcohol?',
            hiddenFields: ['target'],
            answer: 'Aldehyde'
        },
        animationId: 'primary-alcohol-oxidation'
    },
    'Alc2|Ket|Oxidation': {
        mechanismSummary: 'Secondary alcohol oxidizes to ketone without further oxidation under standard conditions.',
        conditions: 'Acidified dichromate under reflux until orange reagent turns green.',
        quizData: {
            prompt: 'What oxidation product is expected from a secondary alcohol?',
            hiddenFields: ['target'],
            answer: 'Ketone'
        },
        animationId: 'secondary-alcohol-oxidation'
    },
    'Ald|Carb|Oxidation': {
        mechanismSummary: 'Aldehyde oxidizes readily to carboxylic acid in warm oxidizing conditions.',
        conditions: 'Acidified oxidant under reflux or positive Tollens/Fehling-style oxidation test.',
        quizData: {
            prompt: 'What is the oxidation product of an aldehyde?',
            hiddenFields: ['target'],
            answer: 'Carboxylic acid'
        },
        animationId: 'aldehyde-oxidation'
    },
    'Ald|Alc1|Reduction': {
        mechanismSummary: 'Hydride transfer reduces aldehyde carbonyl to primary alcohol.',
        conditions: 'NaBH4 reduction followed by aqueous workup.',
        quizData: {
            prompt: 'Which reagent reduces aldehydes to primary alcohols?',
            hiddenFields: ['reagents'],
            answer: 'Sodium borohydride'
        },
        animationId: 'aldehyde-reduction'
    },
    'Ket|Alc2|Reduction': {
        mechanismSummary: 'Hydride addition to ketone forms secondary alcohol after protonation.',
        conditions: 'NaBH4 in suitable solvent, then protonation on workup.',
        quizData: {
            prompt: 'Reduction of ketones gives which alcohol class?',
            hiddenFields: ['target'],
            answer: 'Secondary alcohol'
        },
        animationId: 'ketone-reduction'
    },
    'Halo|Alkene|Elimination': {
        mechanismSummary: 'Base-induced elimination removes HX to regenerate a double bond.',
        conditions: 'Ethanolic NaOH with heat under reflux.',
        quizData: {
            prompt: 'Which condition favors elimination for halogenoalkanes?',
            hiddenFields: ['reagents'],
            answer: 'Ethanolic NaOH with heat'
        },
        animationId: 'haloalkane-elimination'
    },
    'AlcoholGroup|Alkene|Dehydration': {
        mechanismSummary: 'Elimination removes water from alcohol to regenerate alkene unsaturation.',
        conditions: 'Hot Al2O3 catalyst or concentrated H2SO4 with heating.',
        quizData: {
            prompt: 'What reaction type converts alcohols to alkenes with heat?',
            hiddenFields: ['type'],
            answer: 'Elimination (dehydration)'
        },
        animationId: 'alcohol-dehydration'
    }
};

const STRUCTURE_LINK_TYPE = 'structure';
const AS_SECTION_MAX = 22;
const INTRO_ORGANIC_SECTIONS = [13, 29];
const SYNTHESIS_SECTIONS = [21, 36];
const ANALYTICAL_SECTIONS = [22, 37];
const A2_FALLBACK_NODE_IDS = new Set([
    'Carb',
    'Ester',
    'Amine',
    'Nitrile',
    'Hydroxynitrile',
    'Polymer',
    'PVC',
    'Chloroalkene',
    'Carboxylate'
]);
const nodeNameById = new Map(baseNodes.map((node) => [node.id, node.name]));
const TOPIC_SYLLABUS_SECTIONS = {
    Hydrocarbons: [14, 30],
    'Halogen compounds': [15, 31],
    'Hydroxy compounds': [16, 32],
    'Carbonyl compounds': [17],
    'Carboxylic acids and derivatives': [18, 33],
    'Nitrogen compounds': [19, 34],
    Polymerisation: [20, 35],
    'Reaction limits': SYNTHESIS_SECTIONS
};
const INTRO_NODE_IDS = new Set([
    'Crude',
    'Alkane',
    'Alkene',
    'Halo',
    'AlcoholGroup',
    'Alc1',
    'Alc2',
    'Alc3'
]);
const ANALYTICAL_NODE_IDS = new Set(['AgX', 'DNPH', 'Iodoform']);
const SYNTHESIS_LINK_LABELS = new Set([
    'Hydrolysis',
    'Esterification',
    'Substitution',
    'Elimination',
    'Reduction',
    'Oxidation',
    'Hydration',
    'Dehydration'
]);

const getLinkKey = (link) => `${link.source}|${link.target}|${link.label}`;
const slugify = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'pathway';
const getNodeDisplayName = (nodeId) => nodeNameById.get(nodeId) || String(nodeId);
const getTopicSyllabusSections = (topic) => TOPIC_SYLLABUS_SECTIONS[topic] || [];
const normalizeSections = (sections) =>
    Array.from(
        new Set(
            sections.filter(
                (section) => Number.isInteger(section) && section >= 1 && section <= 37
            )
        )
    ).sort((a, b) => a - b);

const ensureSectionRange = (sections, level) => {
    const hasAsSection = sections.some((section) => section <= AS_SECTION_MAX);
    const hasA2Section = sections.some((section) => section > AS_SECTION_MAX);

    if (level === 'AS' && !hasAsSection) {
        return normalizeSections([...sections, INTRO_ORGANIC_SECTIONS[0]]);
    }

    if (level === 'A2' && !hasA2Section) {
        return normalizeSections([...sections, INTRO_ORGANIC_SECTIONS[1]]);
    }

    return sections;
};

const buildFallbackNodeMetadata = (node) => {
    const level = A2_FALLBACK_NODE_IDS.has(node.id) ? 'A2' : 'AS';
    const topic = level === 'A2' ? 'A2 organic chemistry' : 'AS organic chemistry';
    const defaultSection = level === 'A2' ? INTRO_ORGANIC_SECTIONS[1] : INTRO_ORGANIC_SECTIONS[0];
    return {
        level,
        topic,
        examTips: [`Link ${node.name} to named reagents and conditions when describing pathways.`],
        syllabusSections: [defaultSection]
    };
};

const buildNodeSyllabusSections = ({ node, metadata, level, topic, fallback }) => {
    const sections = [
        ...(Array.isArray(metadata.syllabusSections) ? metadata.syllabusSections : []),
        ...getTopicSyllabusSections(topic),
        ...(Array.isArray(fallback.syllabusSections) ? fallback.syllabusSections : [])
    ];

    if (INTRO_NODE_IDS.has(node.id)) {
        sections.push(...INTRO_ORGANIC_SECTIONS);
    }

    if (ANALYTICAL_NODE_IDS.has(node.id)) {
        sections.push(...ANALYTICAL_SECTIONS);
    }

    return ensureSectionRange(normalizeSections(sections), level);
};

const mapNodeMetadata = (node) => {
    const metadata = nodeMetadataById[node.id] || {};
    const fallback = buildFallbackNodeMetadata(node);
    const level = metadata.level || fallback.level;
    const topic = metadata.topic || fallback.topic;
    return {
        ...node,
        level,
        topic,
        examTips:
            Array.isArray(metadata.examTips) && metadata.examTips.length > 0
                ? metadata.examTips
                : fallback.examTips,
        syllabusSections: buildNodeSyllabusSections({
            node,
            metadata,
            level,
            topic,
            fallback
        })
    };
};

const buildFallbackLinkMetadata = (link) => {
    const sourceName = getNodeDisplayName(link.source);
    const targetName = getNodeDisplayName(link.target);

    if (link.type === STRUCTURE_LINK_TYPE) {
        return {
            conditions: link.reagents || 'Classification link only (no reagent).',
            mechanismSummary: `${targetName} is classified under ${sourceName} for revision grouping.`,
            quizData: null,
            animationId: null
        };
    }

    const pathwayName = link.label || link.type || `${sourceName} to ${targetName}`;
    return {
        conditions: link.reagents || `Use standard ${pathwayName.toLowerCase()} conditions.`,
        mechanismSummary: `${pathwayName} converts ${sourceName} to ${targetName} via ${
            link.type || 'an organic pathway'
        }.`,
        quizData: {
            prompt: `Which pathway converts ${sourceName} to ${targetName}?`,
            hiddenFields: ['label'],
            answer: pathwayName
        },
        animationId: `${slugify(link.source)}-to-${slugify(link.target)}-${slugify(pathwayName)}`
    };
};

const buildLinkSyllabusSections = ({ link, metadata, nodesById }) => {
    const sourceSections = nodesById.get(link.source)?.syllabusSections || [];
    const targetSections = nodesById.get(link.target)?.syllabusSections || [];
    const sections = [
        ...(Array.isArray(metadata.syllabusSections) ? metadata.syllabusSections : []),
        ...sourceSections,
        ...targetSections
    ];

    if (link.type === STRUCTURE_LINK_TYPE) {
        sections.push(...INTRO_ORGANIC_SECTIONS);
    }

    if (/test/i.test(link.label || '') || /test/i.test(link.type || '') || ANALYTICAL_NODE_IDS.has(link.target)) {
        sections.push(...ANALYTICAL_SECTIONS);
    }

    if (SYNTHESIS_LINK_LABELS.has(link.label)) {
        sections.push(...SYNTHESIS_SECTIONS);
    }

    return normalizeSections(sections);
};

const mapLinkMetadata = (link, nodesById) => {
    const metadata = linkMetadataByKey[getLinkKey(link)] || {};
    const fallback = buildFallbackLinkMetadata(link);
    return {
        ...link,
        conditions: metadata.conditions || fallback.conditions,
        mechanismSummary: metadata.mechanismSummary || fallback.mechanismSummary,
        quizData: metadata.quizData || fallback.quizData,
        animationId: metadata.animationId || fallback.animationId,
        syllabusSections: buildLinkSyllabusSections({ link, metadata, nodesById })
    };
};

const mappedNodes = baseNodes.map(mapNodeMetadata);
const mappedNodeById = new Map(mappedNodes.map((node) => [node.id, node]));

const gData = {
    nodes: mappedNodes,
    links: baseLinks.map((link) => mapLinkMetadata(link, mappedNodeById))
};

const compoundDescriptions = {
    Crude: 'Complex mixture of hydrocarbons found in geological formations.',
    Halo: 'Carbon chain with at least one halogen atom (F, Cl, Br, I). Polar bond makes it reactive.',
    Carb: 'Contains carboxyl group (-COOH). Acts as a weak acid in solution.',
    AlcoholGroup: 'Organic compounds containing one or more hydroxyl (-OH) groups attached to a carbon atom.',
    Alc1: 'Primary (1°): The carbon with the -OH group is attached to only one other alkyl group.',
    Alc2: 'Secondary (2°): The carbon with the -OH group is attached to two other alkyl groups.',
    Alc3: 'Tertiary (3°): The carbon with the -OH group is attached to three other alkyl groups.',
    Polymer: 'Long-chain macromolecules formed by addition polymerisation of alkenes.',
    PVC: 'Poly(chloroethene), formed by addition polymerisation of chloroethene.',
    Chloroalkene: 'Alkene containing a C=C with a chlorine substituent (e.g. chloroethene).',
    Combustion: 'Complete combustion products: carbon dioxide and water.',
    IncompleteCombustion: 'Incomplete combustion products: carbon monoxide/carbon and water.',
    CrackingMix: 'Mixture of shorter alkanes and alkenes from cracking.',
    Alkoxide: 'Salt formed when an alcohol reacts with sodium metal.',
    Carboxylate: 'Salt formed when a carboxylic acid is neutralised.',
    AgX: 'Silver halide precipitate formed in the halogenoalkane test.',
    DNPH: 'Hydrazone derivative formed in the 2,4-DNPH test.',
    Iodoform: 'Yellow precipitate (CHI₃) from the iodoform test.',
    Hydroxynitrile: 'Cyanohydrin formed by addition of HCN to a carbonyl compound.'
};

const organicMapData = {
    colors,
    gData,
    compoundDescriptions
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = organicMapData;
} else {
    window.OrganicMapData = organicMapData;
}

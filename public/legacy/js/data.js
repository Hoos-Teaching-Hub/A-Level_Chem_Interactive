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

const gData = {
    nodes: [
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
    ],
    links: [
        // Structural Links (New) - No particles, no arrows
        { source: 'AlcoholGroup', target: 'Alc1', label: 'Class', type: 'structure' },
        { source: 'AlcoholGroup', target: 'Alc2', label: 'Class', type: 'structure' },
        { source: 'AlcoholGroup', target: 'Alc3', label: 'Class', type: 'structure' },

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
    ]
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

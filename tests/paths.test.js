const assert = require('assert');
const { gData } = require('../src/js/data');
const { assertIncludesAll } = require('./test-utils');

// This test protects core reaction graph wiring so refactors do not drop
// canonical links relied on by the UI and quiz content.

// Each entry is [source, target, label, type].
// If you add new nodes or rename labels, update this list intentionally.
const expectedPaths = [
    ['AlcoholGroup', 'Alc1', 'Class', 'structure'],
    ['AlcoholGroup', 'Alc2', 'Class', 'structure'],
    ['AlcoholGroup', 'Alc3', 'Class', 'structure'],
    ['Crude', 'Alkane', 'Cracking', 'Thermal Decomposition'],
    ['Crude', 'Alkene', 'Cracking', 'Thermal Decomposition'],
    ['Alkane', 'CrackingMix', 'Cracking', 'Thermal Decomposition'],
    ['Alkane', 'Halo', 'Free Radical Sub', 'Free Radical Substitution'],
    ['Alkane', 'Combustion', 'Complete Combustion', 'Oxidation'],
    ['Alkane', 'IncompleteCombustion', 'Incomplete Combustion', 'Oxidation'],
    ['Alkene', 'Alkane', 'Hydrogenation', 'Electrophilic Addition'],
    ['Alkene', 'Halo', 'Electrophilic Add', 'Electrophilic Addition'],
    ['Alkene', 'Halo', 'Halogenation', 'Electrophilic Addition'],
    ['Alkene', 'Halo', 'Bromine Water Test', 'Electrophilic Addition'],
    ['Alkene', 'Polymer', 'Addition Polymerisation', 'Addition Polymerisation'],
    ['Alkene', 'AlcoholGroup', 'Hydration', 'Electrophilic Addition'],
    ['Alkene', 'Diol', 'Mild Oxidation', 'Oxidation'],
    ['Alkene', 'Ket', 'Oxidative Cleavage', 'Strong Oxidation'],
    ['Alkene', 'Carb', 'Oxidative Cleavage', 'Strong Oxidation'],
    ['Halo', 'Alkene', 'Elimination', 'Elimination'],
    ['Halo', 'AlcoholGroup', 'Nuc Sub', 'Nucleophilic Substitution (SN1/SN2)'],
    ['Halo', 'Amine', 'Nuc Sub', 'Nucleophilic Substitution'],
    ['Halo', 'Nitrile', 'Nuc Sub', 'Nucleophilic Substitution'],
    ['Halo', 'AgX', 'Silver Nitrate Test', 'Test Reaction'],
    ['Alc1', 'Ald', 'Oxidation', 'Partial Oxidation'],
    ['Ald', 'Carb', 'Oxidation', 'Full Oxidation'],
    ['Ald', 'Carb', 'Aldehyde Tests', 'Oxidation (Test)'],
    ['Alc1', 'Carb', 'Oxidation', 'Full Oxidation'],
    ['Alc2', 'Ket', 'Oxidation', 'Oxidation'],
    ['Alc3', 'NoRxn', 'No Reaction', 'N/A'],
    ['Ald', 'Alc1', 'Reduction', 'Nucleophilic Addition'],
    ['Ket', 'Alc2', 'Reduction', 'Nucleophilic Addition'],
    ['Carb', 'Alc1', 'Reduction', 'Reduction'],
    ['Ald', 'Hydroxynitrile', 'Cyanohydrin', 'Nucleophilic Addition'],
    ['Ket', 'Hydroxynitrile', 'Cyanohydrin', 'Nucleophilic Addition'],
    ['Ald', 'DNPH', '2,4-DNPH Test', 'Condensation'],
    ['Ket', 'DNPH', '2,4-DNPH Test', 'Condensation'],
    ['Ald', 'Iodoform', 'Iodoform Test', 'Oxidation/Test'],
    ['Ket', 'Iodoform', 'Iodoform Test', 'Oxidation/Test'],
    ['AlcoholGroup', 'Ester', 'Esterification', 'Condensation'],
    ['Carb', 'Ester', 'Esterification', 'Condensation'],
    ['AlcoholGroup', 'Halo', 'Substitution', 'Substitution'],
    ['Nitrile', 'Carb', 'Hydrolysis', 'Hydrolysis'],
    ['Ester', 'Carb', 'Hydrolysis', 'Hydrolysis'],
    ['Ester', 'Alc1', 'Hydrolysis', 'Hydrolysis'],
    ['AlcoholGroup', 'Alkoxide', 'Reaction with Na', 'Acid-Base/Redox'],
    ['AlcoholGroup', 'Combustion', 'Combustion', 'Oxidation'],
    ['Carb', 'Carboxylate', 'Neutralisation', 'Acid-Base'],
    ['Carb', 'Carboxylate', 'Metal Reaction', 'Redox'],
    ['Carb', 'Carboxylate', 'Acid-Carbonate', 'Acid-Carbonate'],
    ['AlcoholGroup', 'Alkene', 'Dehydration', 'Elimination'],
    ['Chloroalkene', 'PVC', 'Addition Polymerisation', 'Addition Polymerisation']
];

const toPathKey = (source, target, label, type) =>
    `${source}|${target}|${label}|${type}`;

// Convert all links to a stable string key so we can do O(1) existence checks.
const actualPaths = new Set(
    gData.links.map(link => toPathKey(link.source, link.target, link.label, link.type))
);

// Assert that every expected path is present in the graph data.
expectedPaths.forEach(([source, target, label, type]) => {
    const key = toPathKey(source, target, label, type);
    assert(
        actualPaths.has(key),
        `Expected path missing: ${source} -> ${target} (${label}, ${type})`
    );
});

// Ensure the underlying dataset did not shrink unexpectedly.
assertIncludesAll(
    Array.from(actualPaths).join('\n'),
    expectedPaths.map(([source, target, label, type]) => toPathKey(source, target, label, type)),
    'reaction graph'
);

// Print the count to keep CI output stable and easy to scan.
console.log(`Verified ${expectedPaths.length} reaction paths remain intact.`);

const assert = require('assert');
const { gData } = require('../data');

const expectedPaths = [
    ['AlcoholGroup', 'Alc1', 'Class', 'structure'],
    ['AlcoholGroup', 'Alc2', 'Class', 'structure'],
    ['AlcoholGroup', 'Alc3', 'Class', 'structure'],
    ['Crude', 'Alkane', 'Cracking', 'Thermal Decomposition'],
    ['Crude', 'Alkene', 'Cracking', 'Thermal Decomposition'],
    ['Alkane', 'Halo', 'Free Radical Sub', 'Free Radical Substitution'],
    ['Alkene', 'Alkane', 'Hydrogenation', 'Electrophilic Addition'],
    ['Alkene', 'Halo', 'Electrophilic Add', 'Electrophilic Addition'],
    ['Alkene', 'AlcoholGroup', 'Hydration', 'Electrophilic Addition'],
    ['Alkene', 'Diol', 'Mild Oxidation', 'Oxidation'],
    ['Alkene', 'Ket', 'Oxidative Cleavage', 'Strong Oxidation'],
    ['Alkene', 'Carb', 'Oxidative Cleavage', 'Strong Oxidation'],
    ['Halo', 'Alkene', 'Elimination', 'Elimination'],
    ['Halo', 'AlcoholGroup', 'Nuc Sub', 'Nucleophilic Substitution (SN1/SN2)'],
    ['Halo', 'Amine', 'Nuc Sub', 'Nucleophilic Substitution'],
    ['Halo', 'Nitrile', 'Nuc Sub', 'Nucleophilic Substitution'],
    ['Alc1', 'Ald', 'Oxidation', 'Partial Oxidation'],
    ['Ald', 'Carb', 'Oxidation', 'Full Oxidation'],
    ['Alc1', 'Carb', 'Oxidation', 'Full Oxidation'],
    ['Alc2', 'Ket', 'Oxidation', 'Oxidation'],
    ['Alc3', 'NoRxn', 'No Reaction', 'N/A'],
    ['Ald', 'Alc1', 'Reduction', 'Nucleophilic Addition'],
    ['Ket', 'Alc2', 'Reduction', 'Nucleophilic Addition'],
    ['Carb', 'Alc1', 'Reduction', 'Reduction'],
    ['AlcoholGroup', 'Ester', 'Esterification', 'Condensation'],
    ['Carb', 'Ester', 'Esterification', 'Condensation'],
    ['Nitrile', 'Carb', 'Hydrolysis', 'Hydrolysis'],
    ['Ester', 'Carb', 'Hydrolysis', 'Hydrolysis'],
    ['Ester', 'Alc1', 'Hydrolysis', 'Hydrolysis'],
    ['AlcoholGroup', 'Alkene', 'Dehydration', 'Elimination']
];

const actualPaths = new Set(
    gData.links.map(link => `${link.source}|${link.target}|${link.label}|${link.type}`)
);

expectedPaths.forEach(([source, target, label, type]) => {
    const key = `${source}|${target}|${label}|${type}`;
    assert(
        actualPaths.has(key),
        `Expected path missing: ${source} -> ${target} (${label}, ${type})`
    );
});

console.log(`Verified ${expectedPaths.length} reaction paths remain intact.`);

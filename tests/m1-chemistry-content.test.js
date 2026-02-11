const assert = require('assert');
const srcData = require('../src/js/data');
const legacyData = require('../public/legacy/js/data');

const SUBSCRIPT_MAP = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

const normalizeText = (value) =>
  String(value || '').replace(/[₀-₉]/g, (digit) => SUBSCRIPT_MAP[digit] || digit).toLowerCase();

const getLink = (gData, source, target, label) =>
  gData.links.find((link) => link.source === source && link.target === target && link.label === label);

const assertChemistryContent = (label, gData) => {
  const aldehydeOxidation = getLink(gData, 'Ald', 'Carb', 'Oxidation');
  assert.ok(aldehydeOxidation, `${label} missing Ald -> Carb oxidation link.`);
  assert.ok(
    normalizeText(aldehydeOxidation.reagents).includes('k2cr2o7'),
    `${label} Ald -> Carb oxidation must use acidified dichromate (K2Cr2O7/H+).`,
  );

  const incorrectAldehydeTestTarget = getLink(gData, 'Ald', 'Carb', 'Aldehyde Tests');
  assert.ok(
    !incorrectAldehydeTestTarget,
    `${label} Aldehyde Tests should not directly target carboxylic acid under alkaline test conditions.`,
  );
  const aldehydeTest = getLink(gData, 'Ald', 'Carboxylate', 'Aldehyde Tests');
  assert.ok(aldehydeTest, `${label} missing Ald -> Carboxylate Aldehyde Tests link.`);

  const aldehydeIodoform = getLink(gData, 'Ald', 'Iodoform', 'Iodoform Test');
  assert.ok(aldehydeIodoform, `${label} missing Ald -> Iodoform test link.`);
  assert.ok(
    normalizeText(aldehydeIodoform.conditions).includes('ethanal'),
    `${label} Ald -> Iodoform conditions must state ethanal-only applicability.`,
  );

  const ketoneIodoform = getLink(gData, 'Ket', 'Iodoform', 'Iodoform Test');
  assert.ok(ketoneIodoform, `${label} missing Ket -> Iodoform test link.`);
  assert.ok(
    normalizeText(ketoneIodoform.conditions).includes('methyl ketone'),
    `${label} Ket -> Iodoform conditions must state methyl-ketone applicability.`,
  );

  const cleavageToKet = getLink(gData, 'Alkene', 'Ket', 'Oxidative Cleavage');
  const cleavageToAcid = getLink(gData, 'Alkene', 'Carb', 'Oxidative Cleavage');
  [cleavageToKet, cleavageToAcid].forEach((link) => {
    assert.ok(link, `${label} missing oxidative cleavage link.`);
    const mechanism = normalizeText(link.mechanismSummary);
    const conditions = normalizeText(link.conditions);
    assert.ok(
      mechanism.includes('depends') || mechanism.includes('substitution'),
      `${label} oxidative cleavage mechanism must state product dependence on alkene substitution.`,
    );
    assert.ok(
      conditions.includes('depends') || conditions.includes('substitution'),
      `${label} oxidative cleavage conditions must state product dependence on alkene substitution.`,
    );
  });
};

assertChemistryContent('src', srcData.gData);
assertChemistryContent('legacy', legacyData.gData);

console.log('Verified chemistry-content accuracy for key M1 pathways.');

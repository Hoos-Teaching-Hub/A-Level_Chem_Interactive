const assert = require('assert');
const srcData = require('../src/js/data');
const publicData = require('../public/js/data');
const srcAnimations = require('../src/js/animations');
const publicAnimations = require('../public/js/animations');
const { readText } = require('./test-utils');

const REQUIRED_VISUAL_IDS = [
  'animationBondLayer',
  'animationAtomLayer',
  'animationDipoleLayer',
  'animationLonePairLayer',
  'animationElectronLayer',
];

const CURATED_MECHANISM_IDS = [
  'alkene-hx-addition',
  'halo-to-alcohol-substitution',
  'alcohol-dehydration',
];

const MIN_ATOM_DISTANCE_PX = 16;
const MIN_EFFECTIVE_BEND_PX = 3.5;

const assertVisualCueShape = (entry, label, animationId) => {
  assert.ok(
    Array.isArray(entry.atoms) && entry.atoms.length > 0,
    `${label} animation "${animationId}" must include atom scaffolds.`,
  );
  assert.ok(
    Array.isArray(entry.bonds) && entry.bonds.length > 0,
    `${label} animation "${animationId}" must include bond scaffolds.`,
  );
  assert.ok(
    Array.isArray(entry.dipoles) && entry.dipoles.length > 0,
    `${label} animation "${animationId}" must include dipole markers.`,
  );
  assert.ok(
    Array.isArray(entry.lonePairs) && entry.lonePairs.length > 0,
    `${label} animation "${animationId}" must include lone-pair markers.`,
  );
  assert.ok(
    Array.isArray(entry.electronMovement) && entry.electronMovement.length > 0,
    `${label} animation "${animationId}" must include electron movement arrows.`,
  );
};

const parseCubicEndpoint = (path) => {
  const cubic = parseCubicPath(path);
  if (!cubic) {
    return null;
  }
  return { x: cubic.x3, y: cubic.y3 };
};

const parseCubicPath = (path) => {
  if (typeof path !== 'string') {
    return null;
  }
  const match = path.match(
    /M\s*([-\d.]+)\s*([-\d.]+)\s*C\s*([-\d.]+)\s*([-\d.]+)\s*,?\s*([-\d.]+)\s*([-\d.]+)\s*,?\s*([-\d.]+)\s*([-\d.]+)/i,
  );
  if (!match) {
    return null;
  }
  return {
    x0: Number(match[1]),
    y0: Number(match[2]),
    x1: Number(match[3]),
    y1: Number(match[4]),
    x2: Number(match[5]),
    y2: Number(match[6]),
    x3: Number(match[7]),
    y3: Number(match[8]),
  };
};

const pickLatestCue = (cues, predicate, step) => {
  const boundedStep = Number.isFinite(step) ? step : 0;
  return cues
    .filter(predicate)
    .filter((cue) => cue.step === null || cue.step === undefined || cue.step <= boundedStep)
    .sort((left, right) => {
      const leftStep = left.step === null || left.step === undefined ? -1 : left.step;
      const rightStep = right.step === null || right.step === undefined ? -1 : right.step;
      return leftStep - rightStep;
    })
    .pop();
};

const selectCueByStep = (cues, stepIndex, keyResolver) => {
  if (!Array.isArray(cues)) {
    return [];
  }
  if (typeof keyResolver !== 'function') {
    return cues.filter((cue) => {
      if (!cue) return false;
      const cueStep = cue.step === null || cue.step === undefined ? -1 : Number(cue.step);
      const cueEndStep = cue.endStep === null || cue.endStep === undefined ? null : Number(cue.endStep);
      if (!Number.isFinite(cueStep) || cueStep > stepIndex) return false;
      if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) return false;
      return true;
    });
  }

  const selected = new Map();
  cues.forEach((cue) => {
    if (!cue) return;
    const cueStep = cue.step === null || cue.step === undefined ? -1 : Number(cue.step);
    const cueEndStep = cue.endStep === null || cue.endStep === undefined ? null : Number(cue.endStep);
    if (!Number.isFinite(cueStep) || cueStep > stepIndex) return;
    if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) return;
    const key = keyResolver(cue);
    if (!key) return;
    const existing = selected.get(key);
    if (!existing || cueStep >= existing._step) {
      selected.set(key, { ...cue, _step: cueStep });
    }
  });
  return Array.from(selected.values()).map((cue) => {
    const normalized = { ...cue };
    delete normalized._step;
    return normalized;
  });
};

const pointToLineDistance = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  return Math.abs((point.x - start.x) * dy - (point.y - start.y) * dx) / length;
};

const clampBendFactor = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(0.5, Math.min(4, numeric));
};

const assertAtomSpacing = (entry, label, animationId) => {
  const stepCount = Array.isArray(entry.steps) ? entry.steps.length : 0;
  for (let step = 0; step < stepCount; step += 1) {
    const atoms = selectCueByStep(entry.atoms, step, (atom) => atom.id);
    for (let left = 0; left < atoms.length; left += 1) {
      for (let right = left + 1; right < atoms.length; right += 1) {
        const atomA = atoms[left];
        const atomB = atoms[right];
        const distance = Math.hypot(atomA.x - atomB.x, atomA.y - atomB.y);
        assert.ok(
          distance >= MIN_ATOM_DISTANCE_PX,
          `${label} animation "${animationId}" has atom overlap at step ${step + 1}: ${atomA.id}/${atomB.id} distance ${distance.toFixed(2)}.`,
        );
      }
    }
  }
};

const assertElectronArrowBend = (entry, label, animationId) => {
  entry.electronMovement.forEach((arrow) => {
    const cubic = parseCubicPath(arrow.path);
    assert.ok(cubic, `${label} animation "${animationId}" has invalid cubic path.`);

    const start = { x: cubic.x0, y: cubic.y0 };
    const end = { x: cubic.x3, y: cubic.y3 };
    const c1 = { x: cubic.x1, y: cubic.y1 };
    const c2 = { x: cubic.x2, y: cubic.y2 };

    const rawBend = Math.max(
      pointToLineDistance(c1, start, end),
      pointToLineDistance(c2, start, end),
    );
    const effectiveBend = rawBend * clampBendFactor(arrow.bend);

    assert.ok(
      effectiveBend >= MIN_EFFECTIVE_BEND_PX,
      `${label} animation "${animationId}" arrow "${arrow.label || arrow.path}" is too straight (effective bend ${effectiveBend.toFixed(2)}).`,
    );
  });
};

const assertElectrophilicArrowTargetsBromine = (entry, label) => {
  const hbrArrow = entry.electronMovement.find((cue) => cue.label === 'H-Br -> Br');
  assert.ok(hbrArrow, `${label} alkene-hx-addition must include the "H-Br -> Br" arrow.`);

  const endpoint = parseCubicEndpoint(hbrArrow.path);
  assert.ok(endpoint, `${label} alkene-hx-addition must encode "H-Br -> Br" as a cubic path.`);

  const bromine = pickLatestCue(
    entry.atoms,
    (atom) => atom && atom.id === 'x',
    Number(hbrArrow.step),
  );
  assert.ok(
    bromine,
    `${label} alkene-hx-addition must provide a bromine atom position for the arrow step.`,
  );

  const distance = Math.hypot(endpoint.x - bromine.x, endpoint.y - bromine.y);
  assert.ok(
    distance <= 20,
    `${label} alkene-hx-addition "H-Br -> Br" arrow endpoint should target bromine (distance ${distance.toFixed(2)}).`,
  );
};

const assertElectrophilicChargeMarkerStyle = (entry, label) => {
  const carbocationCue = entry.dipoles.find((cue) => cue && cue.step === 2);
  assert.ok(
    carbocationCue,
    `${label} alkene-hx-addition must include a carbocation marker dipole cue.`,
  );
  assert.strictEqual(
    carbocationCue.text,
    '+',
    `${label} alkene-hx-addition should render carbocation as "+" (not "C+").`,
  );
};

const assertElectrophilicCuePlacement = (entry, label) => {
  const carbocationCue = entry.dipoles.find((cue) => cue && cue.step === 2 && cue.text === '+');
  assert.ok(carbocationCue, `${label} alkene-hx-addition must include a "+" carbocation cue at step 3.`);

  const carbocationAtom = pickLatestCue(
    entry.atoms,
    (atom) => atom && atom.id === 'c1' && Number(atom.charge || 0) > 0,
    Number(carbocationCue.step),
  );
  assert.ok(carbocationAtom, `${label} alkene-hx-addition must include a positively charged carbocation atom.`);

  const carbocationDistance = Math.hypot(carbocationCue.x - carbocationAtom.x, carbocationCue.y - carbocationAtom.y);
  assert.ok(
    carbocationDistance <= 14,
    `${label} alkene-hx-addition "+" marker should stay close to carbocation carbon (distance ${carbocationDistance.toFixed(2)}).`,
  );

  entry.lonePairs.forEach((pairCue) => {
    const cueStep = pairCue && pairCue.step !== null && pairCue.step !== undefined ? Number(pairCue.step) : 0;
    const bromine = pickLatestCue(
      entry.atoms,
      (atom) => atom && atom.id === 'x',
      cueStep,
    );
    assert.ok(bromine, `${label} alkene-hx-addition must include bromine position for lone-pair cue.`);
    const pairDistance = Math.hypot(pairCue.x - bromine.x, pairCue.y - bromine.y);
    assert.ok(
      pairDistance >= 12,
      `${label} alkene-hx-addition lone-pair cue should not overlap bromine atom (distance ${pairDistance.toFixed(2)}).`,
    );
    assert.ok(
      pairDistance <= 40,
      `${label} alkene-hx-addition lone-pair cue should remain visually associated with bromine (distance ${pairDistance.toFixed(2)}).`,
    );
  });
};

const assertElectrophilicBromideAttackArrowTargetsCation = (entry, label) => {
  const attackArrow = entry.electronMovement.find((cue) => cue.label === 'Br: -> +');
  assert.ok(attackArrow, `${label} alkene-hx-addition must include the "Br: -> +" arrow.`);

  const cubic = parseCubicPath(attackArrow.path);
  assert.ok(cubic, `${label} alkene-hx-addition "Br: -> +" must use a cubic path.`);

  const attackStep = Number(attackArrow.step);
  const startPoint = { x: cubic.x0, y: cubic.y0 };
  const endPoint = { x: cubic.x3, y: cubic.y3 };

  const bromideLonePairCue = pickLatestCue(
    entry.lonePairs,
    (cue) => cue && Number(cue.step) <= attackStep,
    attackStep,
  );
  assert.ok(
    bromideLonePairCue,
    `${label} alkene-hx-addition must provide a lone-pair cue for bromide attack.`,
  );

  const carbocationCue = pickLatestCue(
    entry.dipoles,
    (cue) => cue && cue.text === '+',
    attackStep,
  );
  assert.ok(
    carbocationCue,
    `${label} alkene-hx-addition must provide a carbocation "+" cue for bromide attack.`,
  );

  const startDistance = Math.hypot(startPoint.x - bromideLonePairCue.x, startPoint.y - bromideLonePairCue.y);
  assert.ok(
    startDistance <= 16,
    `${label} alkene-hx-addition "Br: -> +" arrow should start at lone pair (distance ${startDistance.toFixed(2)}).`,
  );

  const endDistance = Math.hypot(endPoint.x - carbocationCue.x, endPoint.y - carbocationCue.y);
  assert.ok(
    endDistance <= 14,
    `${label} alkene-hx-addition "Br: -> +" arrow should end at cation marker (distance ${endDistance.toFixed(2)}).`,
  );
};

const assertRegistryVisualCues = (label, gData, buildAnimationRegistry) => {
  const registry = buildAnimationRegistry(gData.links);
  CURATED_MECHANISM_IDS.forEach((animationId) => {
    const entry = registry[animationId];
    assert.ok(entry, `${label} registry is missing curated animation "${animationId}".`);
    assertVisualCueShape(entry, label, animationId);
    assertAtomSpacing(entry, label, animationId);
    assertElectronArrowBend(entry, label, animationId);
    if (animationId === 'alkene-hx-addition') {
      assertElectrophilicArrowTargetsBromine(entry, label);
      assertElectrophilicChargeMarkerStyle(entry, label);
      assertElectrophilicCuePlacement(entry, label);
      assertElectrophilicBromideAttackArrowTargetsCation(entry, label);
    }
  });
};

assertRegistryVisualCues('src', srcData.gData, srcAnimations.buildAnimationRegistry);
assertRegistryVisualCues('public', publicData.gData, publicAnimations.buildAnimationRegistry);

const mapHtml = readText('public/organic-map.html');
REQUIRED_VISUAL_IDS.forEach((id) => {
  assert.ok(
    mapHtml.includes(`id="${id}"`),
    `Expected map animation SVG layer "${id}" to exist.`,
  );
});

['src/js/main.js', 'public/js/main.js'].forEach((filePath) => {
  const contents = readText(filePath);
  assert.ok(
    contents.includes('atoms'),
    `Expected ${filePath} to render atom overlays.`,
  );
  assert.ok(
    contents.includes('bonds'),
    `Expected ${filePath} to render bond overlays.`,
  );
  assert.ok(
    contents.includes('electronMovement'),
    `Expected ${filePath} to render electron movement overlays.`,
  );
  assert.ok(
    contents.includes('lonePairs'),
    `Expected ${filePath} to render lone-pair overlays.`,
  );
  assert.ok(
    contents.includes('dipoles'),
    `Expected ${filePath} to render dipole overlays.`,
  );
});

console.log('Verified M2 animation visual cues for dipoles, lone pairs, and electron movement.');

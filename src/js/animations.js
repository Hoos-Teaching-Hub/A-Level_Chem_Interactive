const DEFAULT_ANIMATION_PATH = 'M 24 84 C 92 26, 268 26, 336 84';
const DEFAULT_ANIMATION_DURATION_MS = 3600;

const curatedAnimationOverrides = {
    'free-radical-substitution': {
        title: 'Free-radical substitution',
        summary: 'UV initiation creates radicals that propagate chain substitution.',
        path: 'M 22 82 C 104 16, 256 16, 338 82',
        steps: [
            'Initiation: homolytic bond fission forms radicals under UV.',
            'Propagation: radical abstracts hydrogen to form alkyl radical.',
            'Propagation: alkyl radical reacts with halogen to regenerate radical.'
        ]
    },
    'alkene-hx-addition': {
        title: 'Electrophilic addition',
        summary: 'Ethene pi electrons attack HBr, form a carbocation, then bromide attacks.',
        path: 'M 26 76 C 120 20, 208 20, 334 76',
        steps: [
            'Reactants approach: ethene near polarized H-Br.',
            'Pi electrons attack H while H-Br bond breaks heterolytically.',
            'Carbocation intermediate forms with free bromide ion.',
            'Bromide lone pair attacks the carbocation.',
            'Final product: bromoethane with all atoms neutral.'
        ],
        atoms: [
            { id: 'c1', x: 88, y: 92, label: 'C', charge: 0, step: 0 },
            { id: 'c2', x: 126, y: 84, label: 'C', charge: 0, step: 0 },
            { id: 'h1', x: 56, y: 70, label: 'H', step: 0 },
            { id: 'h2', x: 52, y: 118, label: 'H', step: 0 },
            { id: 'h3', x: 160, y: 66, label: 'H', step: 0 },
            { id: 'h4', x: 168, y: 112, label: 'H', step: 0 },
            { id: 'hR', x: 176, y: 40, label: 'H', step: 0 },
            { id: 'x', x: 214, y: 40, label: 'Br', charge: 0, step: 0 },

            { id: 'c1', x: 88, y: 94, label: 'C', charge: 1, step: 2 },
            { id: 'c2', x: 126, y: 86, label: 'C', charge: 0, step: 2 },
            { id: 'h3', x: 164, y: 72, label: 'H', step: 2 },
            { id: 'h4', x: 172, y: 114, label: 'H', step: 2 },
            { id: 'hR', x: 142, y: 60, label: 'H', step: 2 },
            { id: 'x', x: 286, y: 72, label: 'Br', charge: -1, step: 2 },

            { id: 'x', x: 242, y: 74, label: 'Br', charge: -1, step: 3 },
            { id: 'x', x: 58, y: 54, label: 'Br', charge: 0, step: 4 },
            { id: 'c1', x: 88, y: 92, label: 'C', charge: 0, step: 4 },
        ],
        bonds: [
            { from: 'c1', to: 'c2', order: 2, step: 0, endStep: 1 },
            { from: 'c1', to: 'h1', order: 1, step: 0 },
            { from: 'c1', to: 'h2', order: 1, step: 0 },
            { from: 'c2', to: 'h3', order: 1, step: 0 },
            { from: 'c2', to: 'h4', order: 1, step: 0 },
            { from: 'hR', to: 'x', order: 1, step: 0, endStep: 1 },

            { from: 'c1', to: 'c2', order: 1, step: 2 },
            { from: 'c2', to: 'hR', order: 1, step: 2 },
            { from: 'c1', to: 'x', order: 1, step: 4 },
        ],
        dipoles: [
            { x: 176, y: 26, text: 'delta+ H', step: 0, endStep: 1 },
            { x: 212, y: 26, text: 'delta- Br', step: 0, endStep: 1 },
            { x: 88, y: 84, text: '+', step: 2, endStep: 3 },
        ],
        lonePairs: [
            { x: 300, y: 60, label: '', step: 2, endStep: 2 },
            { x: 256, y: 62, label: '', step: 3, endStep: 3 },
        ],
        electronMovement: [
            { path: 'M 108 82 C 134 52, 156 44, 176 40', label: 'pi e- -> H', step: 1, endStep: 1, bend: 1.5 },
            { path: 'M 192 40 C 198 18, 208 16, 214 40', label: 'H-Br -> Br', step: 1, endStep: 1, bend: 1.6 },
            { path: 'M 256 62 C 228 120, 150 126, 88 84', label: 'Br: -> +', step: 3, endStep: 3, bend: 1.5 },
        ],
    },
    'halo-to-alcohol-substitution': {
        title: 'Nucleophilic substitution',
        summary: 'Hydroxide donates a lone pair and displaces the halide.',
        path: 'M 26 82 C 112 32, 246 28, 334 82',
        steps: [
            'Hydroxide approaches the electron-poor carbon.',
            'C-X bond breaks as C-O bond forms.',
            'Alcohol product forms after substitution completes.'
        ],
        atoms: [
            { id: 'c', x: 188, y: 60, label: 'C', step: null },
            { id: 'x', x: 286, y: 50, label: 'X', step: null },
            { id: 'o', x: 82, y: 52, label: 'O', step: null },
            { id: 'h', x: 64, y: 44, label: 'H', step: null },
        ],
        bonds: [
            { from: 'c', to: 'x', order: 1, step: 0 },
            { from: 'o', to: 'h', order: 1, step: null },
            { from: 'c', to: 'o', order: 1, step: 2 },
        ],
        dipoles: [
            { x: 190, y: 58, text: 'Cdelta+ - Xdelta-', step: 0 },
        ],
        lonePairs: [
            { x: 82, y: 52, label: ':OH-', step: 0 },
        ],
        electronMovement: [
            { path: 'M 92 54 C 118 20, 154 22, 182 60', label: ':OH- -> C', step: 0, bend: 1.35 },
            { path: 'M 186 60 C 214 18, 258 20, 286 50', label: 'C-X -> X', step: 1, bend: 1.35 },
        ],
    },
    'alcohol-dehydration': {
        title: 'Elimination (dehydration)',
        summary: 'Acid-catalyzed elimination removes water and reforms C=C.',
        path: 'M 24 86 C 120 18, 240 18, 336 86',
        steps: [
            'The alcohol oxygen is protonated to make a good leaving group.',
            'Water leaves and a carbocation intermediate forms.',
            'Base removes adjacent proton to regenerate the double bond.'
        ],
        atoms: [
            { id: 'c1', x: 148, y: 60, label: 'C', step: null },
            { id: 'c2', x: 184, y: 56, label: 'C', step: null },
            { id: 'o', x: 128, y: 40, label: 'O', step: null },
            { id: 'h', x: 164, y: 22, label: 'H', step: null },
            { id: 'bh', x: 286, y: 58, label: 'B:', step: null },
        ],
        bonds: [
            { from: 'c1', to: 'c2', order: 1, step: 0 },
            { from: 'c1', to: 'o', order: 1, step: 0 },
            { from: 'o', to: 'h', order: 1, step: 0 },
            { from: 'c1', to: 'c2', order: 1, step: 1 },
            { from: 'c1', to: 'c2', order: 2, step: 2 },
        ],
        dipoles: [
            { x: 148, y: 44, text: 'Odelta- / Hdelta+', step: 0 },
            { x: 208, y: 58, text: '+', step: 1 },
        ],
        lonePairs: [
            { x: 130, y: 38, label: ':O', step: 0 },
            { x: 286, y: 58, label: ':B', step: 2 },
        ],
        electronMovement: [
            { path: 'M 128 40 C 136 22, 150 12, 164 22', label: ':O -> H+', step: 0, bend: 1.3 },
            { path: 'M 286 58 C 260 18, 236 8, 216 38', label: ':B -> beta-H', step: 2, bend: 1.45 },
            { path: 'M 208 42 C 184 36, 162 42, 154 56', label: 'C-H -> C=C', step: 2, bend: 1.3 },
        ],
    }
};

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function toTitleCase(value) {
    const normalized = value
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
        .join(' ');
    return normalized || 'Mechanism animation';
}

function readEndpointName(endpoint) {
    if (endpoint && typeof endpoint === 'object') {
        return endpoint.name || endpoint.id || 'Compound';
    }
    return String(endpoint || 'Compound');
}

function toFiniteNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function toCueStep(value) {
    const step = Number(value);
    if (!Number.isInteger(step) || step < 0) {
        return null;
    }
    return step;
}

function toCueEndStep(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const step = Number(value);
    if (!Number.isInteger(step) || step < 0) {
        return null;
    }
    return step;
}

function toCueBend(value) {
    const bend = Number(value);
    if (!Number.isFinite(bend)) {
        return 1;
    }
    return Math.max(0.5, Math.min(4, bend));
}

function sanitizeDipoles(cues) {
    if (!Array.isArray(cues)) {
        return [];
    }

    return cues
        .filter(cue => cue && typeof cue === 'object' && isNonEmptyString(cue.text))
        .map(cue => ({
            x: toFiniteNumber(cue.x, 180),
            y: toFiniteNumber(cue.y, 56),
            text: cue.text.trim(),
            step: toCueStep(cue.step),
            endStep: toCueEndStep(cue.endStep),
        }));
}

function sanitizeLonePairs(cues) {
    if (!Array.isArray(cues)) {
        return [];
    }

    return cues
        .filter(cue => cue && typeof cue === 'object')
        .map(cue => ({
            x: toFiniteNumber(cue.x, 160),
            y: toFiniteNumber(cue.y, 56),
            label: isNonEmptyString(cue.label) ? cue.label.trim() : '',
            step: toCueStep(cue.step),
            endStep: toCueEndStep(cue.endStep),
        }));
}

function sanitizeElectronMovement(cues) {
    if (!Array.isArray(cues)) {
        return [];
    }

    return cues
        .filter(cue => cue && typeof cue === 'object' && isNonEmptyString(cue.path))
        .map(cue => ({
            path: cue.path.trim(),
            label: isNonEmptyString(cue.label) ? cue.label.trim() : '',
            bend: toCueBend(cue.bend),
            step: toCueStep(cue.step),
            endStep: toCueEndStep(cue.endStep),
        }));
}

function sanitizeAtoms(cues) {
    if (!Array.isArray(cues)) {
        return [];
    }

    return cues
        .filter(cue => cue && typeof cue === 'object')
        .filter(cue => isNonEmptyString(cue.id) && isNonEmptyString(cue.label))
        .map(cue => ({
            id: cue.id.trim(),
            x: toFiniteNumber(cue.x, 180),
            y: toFiniteNumber(cue.y, 56),
            label: cue.label.trim(),
            charge: toFiniteNumber(cue.charge, 0),
            step: toCueStep(cue.step),
            endStep: toCueEndStep(cue.endStep),
        }));
}

function sanitizeBonds(cues) {
    if (!Array.isArray(cues)) {
        return [];
    }

    return cues
        .filter(cue => cue && typeof cue === 'object')
        .filter(cue => isNonEmptyString(cue.from) && isNonEmptyString(cue.to))
        .map(cue => ({
            from: cue.from.trim(),
            to: cue.to.trim(),
            order: Math.max(1, Math.min(3, Math.floor(toFiniteNumber(cue.order, 1)))),
            step: toCueStep(cue.step),
            endStep: toCueEndStep(cue.endStep),
        }));
}

function buildDefaultSteps(link, sourceName, targetName) {
    const pathway = isNonEmptyString(link.label) ? link.label : (isNonEmptyString(link.type) ? link.type : 'Pathway');
    return [
        `${sourceName}: reactants orient for ${pathway.toLowerCase()}.`,
        `Electron flow follows ${pathway.toLowerCase()} with stated reagents.`,
        `${targetName}: product stabilizes and route is complete.`
    ];
}

function buildAnimationEntry(link, override) {
    const sourceName = readEndpointName(link.source);
    const targetName = readEndpointName(link.target);
    const fallbackTitle = isNonEmptyString(link.label) ? `${link.label} mechanism` : toTitleCase(link.animationId || '');
    const fallbackSummary = isNonEmptyString(link.mechanismSummary)
        ? link.mechanismSummary
        : `${sourceName} to ${targetName} reaction pathway.`;

    return {
        id: link.animationId,
        title: isNonEmptyString(override && override.title) ? override.title : fallbackTitle,
        summary: isNonEmptyString(override && override.summary) ? override.summary : fallbackSummary,
        path: isNonEmptyString(override && override.path) ? override.path : DEFAULT_ANIMATION_PATH,
        durationMs:
            Number.isFinite(override && override.durationMs) && override.durationMs > 0
                ? Math.floor(override.durationMs)
                : DEFAULT_ANIMATION_DURATION_MS,
        steps:
            Array.isArray(override && override.steps) && override.steps.length
                ? override.steps.filter(isNonEmptyString)
                : buildDefaultSteps(link, sourceName, targetName),
        atoms: sanitizeAtoms(override && override.atoms),
        bonds: sanitizeBonds(override && override.bonds),
        dipoles: sanitizeDipoles(override && override.dipoles),
        lonePairs: sanitizeLonePairs(override && override.lonePairs),
        electronMovement: sanitizeElectronMovement(override && override.electronMovement),
    };
}

function buildAnimationRegistry(links = []) {
    const registry = {};

    links.forEach(link => {
        if (!link || !isNonEmptyString(link.animationId)) {
            return;
        }
        const animationId = link.animationId.trim();
        const override = curatedAnimationOverrides[animationId] || null;
        registry[animationId] = buildAnimationEntry({ ...link, animationId }, override);
    });

    return registry;
}

const organicMapAnimations = {
    buildAnimationRegistry
};

if (typeof window !== 'undefined') {
    window.OrganicMapAnimations = organicMapAnimations;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = organicMapAnimations;
}

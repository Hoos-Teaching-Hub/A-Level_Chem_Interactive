const DEFAULT_ANIMATION_PATH = 'M 24 84 C 92 26, 268 26, 336 84';
const DEFAULT_ANIMATION_DURATION_MS = 2800;

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
        summary: 'The alkene pi bond attacks HX, then halide closes the cation.',
        path: 'M 26 76 C 120 20, 208 20, 334 76',
        steps: [
            'Pi electrons attack the electrophile and polarize HX.',
            'A carbocation intermediate forms on the more stable carbon.',
            'Halide nucleophile attacks to complete addition.'
        ]
    },
    'halo-to-alcohol-substitution': {
        title: 'Nucleophilic substitution',
        summary: 'Hydroxide donates a lone pair and displaces the halide.',
        path: 'M 26 82 C 112 32, 246 28, 334 82',
        steps: [
            'Hydroxide approaches the electron-poor carbon.',
            'C-X bond breaks as C-O bond forms.',
            'Alcohol product forms after substitution completes.'
        ]
    },
    'alcohol-dehydration': {
        title: 'Elimination (dehydration)',
        summary: 'Acid-catalyzed elimination removes water and reforms C=C.',
        path: 'M 24 86 C 120 18, 240 18, 336 86',
        steps: [
            'The alcohol oxygen is protonated to make a good leaving group.',
            'Water leaves and a carbocation intermediate forms.',
            'Base removes adjacent proton to regenerate the double bond.'
        ]
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
                : buildDefaultSteps(link, sourceName, targetName)
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

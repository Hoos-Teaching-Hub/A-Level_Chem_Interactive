const DEFAULT_ANIMATION_PATH = 'M 24 84 C 92 26, 268 26, 336 84';
const DEFAULT_ANIMATION_DURATION_MS = 3600;

function loadCuratedAnimationOverrides() {
    if (typeof window !== 'undefined' && window.OrganicMapMechanismDefinitions && typeof window.OrganicMapMechanismDefinitions === 'object') {
        return window.OrganicMapMechanismDefinitions;
    }

    if (typeof module !== 'undefined' && module.exports) {
        try {
            const definitions = require('./mechanism-definitions');
            if (definitions && typeof definitions === 'object') {
                return definitions;
            }
        } catch (error) {
            // Ignore missing generated module and continue to JSON fallback.
        }

        try {
            const definitions = require('../../mechanisms/definitions/curated-overrides.json');
            if (definitions && typeof definitions === 'object') {
                return definitions;
            }
        } catch (error) {
            // Ignore JSON fallback errors so runtime can still use template defaults.
        }
    }

    return {};
}

const curatedAnimationOverrides = loadCuratedAnimationOverrides();

function loadMechanismDefinitionValidator() {
    if (
        typeof window !== 'undefined' &&
        window.OrganicMapCanvasRenderer &&
        typeof window.OrganicMapCanvasRenderer.validateMechanismDefinition === 'function'
    ) {
        return window.OrganicMapCanvasRenderer.validateMechanismDefinition;
    }

    if (typeof module !== 'undefined' && module.exports) {
        try {
            const renderer = require('./mechanism-canvas-renderer');
            if (renderer && typeof renderer.validateMechanismDefinition === 'function') {
                return renderer.validateMechanismDefinition;
            }
        } catch (error) {
            // Ignore module load failures to keep compatibility in non-Node runtimes.
        }
    }

    return null;
}

function shouldValidateInDevelopment() {
    if (typeof process !== 'undefined' && process && process.env) {
        return process.env.NODE_ENV !== 'production';
    }

    if (typeof window !== 'undefined' && window.location) {
        const host = String(window.location.hostname || '').toLowerCase();
        return host === '' || host === 'localhost' || host === '127.0.0.1';
    }

    return false;
}

const mechanismDefinitionValidator = loadMechanismDefinitionValidator();

function validateAnimationEntryInDev(entry) {
    if (!entry || typeof entry !== 'object') {
        return;
    }
    if (!mechanismDefinitionValidator || !shouldValidateInDevelopment()) {
        return;
    }
    mechanismDefinitionValidator(entry, { mechanismId: entry.id });
}

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

function sanitizeCueRegistry(cueRegistry) {
    if (!cueRegistry || typeof cueRegistry !== 'object') {
        return null;
    }
    if (Array.isArray(cueRegistry)) {
        return cueRegistry
            .filter(entry => entry && typeof entry === 'object')
            .map(entry => ({
                ...entry,
                id: isNonEmptyString(entry.id) ? entry.id.trim() : '',
            }))
            .filter(entry => entry.id);
    }

    const normalized = {};
    Object.keys(cueRegistry).forEach(key => {
        if (!isNonEmptyString(key)) {
            return;
        }
        const cueId = key.trim();
        const cueValue = cueRegistry[key];
        if (cueValue && typeof cueValue === 'object') {
            normalized[cueId] = cueValue;
        }
    });
    return normalized;
}

function sanitizeStepSemantics(stepSemantics, steps) {
    if (!Array.isArray(stepSemantics)) {
        return null;
    }

    const stepCount = Array.isArray(steps) ? steps.length : 0;
    const normalized = stepSemantics.map(entry => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return null;
        }
        const events = Array.isArray(entry.events)
            ? entry.events
                .filter(event => event && typeof event === 'object' && !Array.isArray(event))
                .map(event => ({ ...event }))
            : [];
        const invariants = Array.isArray(entry.invariants)
            ? entry.invariants.filter(isNonEmptyString).map(item => item.trim())
            : [];
        return {
            events,
            invariants,
        };
    });

    while (stepCount > 0 && normalized.length < stepCount) {
        normalized.push(null);
    }

    return normalized;
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

    const steps =
        Array.isArray(override && override.steps) && override.steps.length
            ? override.steps.filter(isNonEmptyString)
            : buildDefaultSteps(link, sourceName, targetName);

    const entry = {
        id: link.animationId,
        title: isNonEmptyString(override && override.title) ? override.title : fallbackTitle,
        summary: isNonEmptyString(override && override.summary) ? override.summary : fallbackSummary,
        path: isNonEmptyString(override && override.path) ? override.path : DEFAULT_ANIMATION_PATH,
        durationMs:
            Number.isFinite(override && override.durationMs) && override.durationMs > 0
                ? Math.floor(override.durationMs)
                : DEFAULT_ANIMATION_DURATION_MS,
        steps,
        atoms: sanitizeAtoms(override && override.atoms),
        bonds: sanitizeBonds(override && override.bonds),
        dipoles: sanitizeDipoles(override && override.dipoles),
        lonePairs: sanitizeLonePairs(override && override.lonePairs),
        electronMovement: sanitizeElectronMovement(override && override.electronMovement),
        stepCueIds: Array.isArray(override && override.stepCueIds)
            ? override.stepCueIds.map(entry => (Array.isArray(entry) ? entry.slice() : entry))
            : undefined,
        cueRegistry: sanitizeCueRegistry(override && (override.cueRegistry || override.cues)),
        stepSemantics: sanitizeStepSemantics(override && override.stepSemantics, steps),
    };

    // Fail fast in development when mechanism definitions violate renderer contracts.
    validateAnimationEntryInDev(entry);
    return entry;
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

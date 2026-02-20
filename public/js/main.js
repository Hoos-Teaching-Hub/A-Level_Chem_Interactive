// Wrap in an IIFE so duplicate script execution (for example due to browser/tooling
// quirks) doesn't redeclare top-level bindings and break map startup.
(function organicMapBootstrap() {
if (typeof window !== 'undefined') {
    if (window.__organicMapScriptLoaded) {
        if (typeof window.initMap === 'function') {
            window.initMap();
        }
        return;
    }
    window.__organicMapScriptLoaded = true;
}

// --- Data Definition ---
// The graph data and descriptions are loaded via a global exposed in index.html.
// This keeps the data file separate from the rendering logic in this script.
const organicMapData = typeof window !== 'undefined' ? window.OrganicMapData : null;
const gData = organicMapData && organicMapData.gData ? organicMapData.gData : { nodes: [], links: [] };
const compoundDescriptions =
    organicMapData && organicMapData.compoundDescriptions ? organicMapData.compoundDescriptions : {};
const organicMapAnimations =
    typeof window !== 'undefined' && window.OrganicMapAnimations ? window.OrganicMapAnimations : null;

// Global variables for Graph and UI state.
// These are assigned after the DOM is ready so we can reuse them in handlers.
let Graph = null;
let highlightLink = null;
let fallbackRedraw = null;
let fallbackCleanup = null;
let mapBootstrapped = false;
let animationRegistry = {};
let animationRafId = null;
let animationPathLength = 0;
let animationVisualStep = -1;
let animationCanvasElem;
let animationCanvasCtx = null;
let animationPlayBtnElem;
let animationResetBtnElem;
let animationProgressElem;
let animationSpeedElem;
let animationPlaybackRunning = false;
let animationPlaybackProgress = 0;
let animationFrameStartTs = 0;
let animationFrameStartProgress = 0;
let animationPlaybackDurationMs = 3600;
let animationSpeedMultiplier = 1;
let activeAnimationSpec = null;
let animationControlsBound = false;

// UI Elements (populated on load).
// We store references once to avoid repeated DOM queries.
let contentArea;
let dynamicContent;
let detailTitle;
let detailType;
let reagentsElem;
let mechanismElem;
let reactionDetails;
let compoundDetails;
let compoundDesc;
let compoundExampleNameElem;
let compoundExampleStructureElem;
let compoundMechanismNavElem;
let compoundMechanismEmptyElem;
let animateBtn;
let infoWhatElem;
let infoHowElem;
let infoWhyElem;
let infoExamTipElem;
let animationPanelElem;
let animationStatusElem;
let animationTitleElem;
let animationSummaryElem;
let animationStepElem;
let animationFallbackElem;
let animationPathElem;
let animationMarkerElem;
let animationDipoleLayerElem;
let animationLonePairLayerElem;
let animationElectronLayerElem;
let animationBondLayerElem;
let animationAtomLayerElem;
let viewModeBtnElem;
let graphViewMode = '3d';
let forceGraphRuntimeErrorHandler = null;
const TWO_D_FOCUS_DEPTH = 60;

const SVG_NS = 'http://www.w3.org/2000/svg';

const defaultInfo = {
    what: 'Select a node or reaction to view structured study notes.',
    how: 'Follow linked pathways and match reagents to mechanism patterns.',
    why: 'This map is designed for rapid scan-and-recall revision.',
    examTip: 'State both reagent and condition to secure full method marks.'
};

function readEndpointName(endpoint) {
    if (endpoint && typeof endpoint === 'object') {
        return endpoint.name || endpoint.id || 'compound';
    }
    return String(endpoint || 'compound');
}

function getNodeClassLabel(node) {
    if (node && typeof node.topic === 'string' && node.topic.trim()) {
        return node.topic.trim();
    }
    if (node && typeof node.name === 'string' && node.name.trim()) {
        return node.name.trim();
    }
    return 'Organic class';
}

function getNodeLabelHtml(node) {
    const nodeName = node && node.name ? node.name : 'Compound';
    return `<div><strong>${nodeName}</strong></div>`;
}

function applyPersistentNodeLabels() {
    // Keep native ForceGraph node rendering to avoid cross-version THREE runtime
    // crashes in browser/CDN combinations. Labels remain available via nodeLabel.
    return false;
}

function setViewModeButtonAvailability(isEnabled) {
    if (!viewModeBtnElem) {
        return;
    }
    viewModeBtnElem.disabled = !isEnabled;
    viewModeBtnElem.classList.toggle('opacity-50', !isEnabled);
    viewModeBtnElem.classList.toggle('cursor-not-allowed', !isEnabled);
}

function updateViewModeButton() {
    if (!viewModeBtnElem) {
        return;
    }
    const nextModeLabel = graphViewMode === '3d' ? '2D' : '3D';
    viewModeBtnElem.innerText = nextModeLabel;
    const title = `Switch to ${nextModeLabel} view`;
    viewModeBtnElem.setAttribute('title', title);
    viewModeBtnElem.setAttribute('aria-label', title);
}

function setGraphViewMode(mode, options = {}) {
    const requestedMode = String(mode || '').toLowerCase() === '2d' ? '2d' : '3d';
    const shouldAnimate = options.animate !== false;
    const isForced = options.force === true;
    if (!isForced && requestedMode === graphViewMode) {
        setViewModeButtonAvailability(Boolean(Graph && typeof Graph.numDimensions === 'function'));
        updateViewModeButton();
        return;
    }
    graphViewMode = requestedMode;

    if (!Graph || typeof Graph.numDimensions !== 'function') {
        setViewModeButtonAvailability(false);
        updateViewModeButton();
        return;
    }

    try {
        Graph.numDimensions(requestedMode === '2d' ? 2 : 3);
        Graph.nodeRelSize(graphViewMode === '2d' ? 2.8 : 5);
        if (typeof Graph.d3ReheatSimulation === 'function') {
            Graph.d3ReheatSimulation();
        }

        const controls = typeof Graph.controls === 'function' ? Graph.controls() : null;
        if (controls) {
            controls.enableRotate = requestedMode !== '2d';
            controls.minPolarAngle = requestedMode === '2d' ? Math.PI / 2 : 0;
            controls.maxPolarAngle = requestedMode === '2d' ? Math.PI / 2 : Math.PI;
            if (typeof controls.update === 'function') {
                controls.update();
            }
        }

        const cameraDistance = requestedMode === '2d' ? 360 : 280;
        Graph.cameraPosition({ x: 0, y: 0, z: cameraDistance }, { x: 0, y: 0, z: 0 }, shouldAnimate ? 700 : 0);
        setViewModeButtonAvailability(true);
        updateViewModeButton();
        const labelsApplied = applyPersistentNodeLabels();
        if (!labelsApplied && graphViewMode === '2d') {
            // In flat mode, keep nodes compact even when persistent labels are unavailable.
            Graph.nodeRelSize(2.8);
        }
    } catch (error) {
        console.warn('Failed to switch graph view mode. Disabling view toggle.', error);
        setViewModeButtonAvailability(false);
        updateViewModeButton();
    }
}

function removeForceGraphRuntimeErrorGuard() {
    if (typeof window === 'undefined' || !forceGraphRuntimeErrorHandler) {
        return;
    }
    window.removeEventListener('error', forceGraphRuntimeErrorHandler);
    forceGraphRuntimeErrorHandler = null;
}

function installForceGraphRuntimeErrorGuard(mapContainer) {
    if (typeof window === 'undefined') {
        return;
    }

    removeForceGraphRuntimeErrorGuard();
    forceGraphRuntimeErrorHandler = (event) => {
        const message = String((event && event.message) || '').toLowerCase();
        const filename = String((event && event.filename) || '').toLowerCase();
        const isForceGraphLayoutCrash =
            filename.includes('3d-force-graph') &&
            message.includes('layout') &&
            message.includes('undefined');
        if (!isForceGraphLayoutCrash) {
            return;
        }

        console.warn('ForceGraph runtime failed; switching to fallback map.', event && event.message);
        try {
            if (Graph && typeof Graph.pauseAnimation === 'function') {
                Graph.pauseAnimation();
            }
        } catch (pauseError) {
            console.warn('Could not pause ForceGraph animation cleanly.', pauseError);
        }
        Graph = null;
        setViewModeButtonAvailability(false);
        renderFallbackMap(mapContainer);
        showDefault();
        mapBootstrapped = true;
        removeForceGraphRuntimeErrorGuard();
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
    };
    window.addEventListener('error', forceGraphRuntimeErrorHandler);
}

const defaultExampleStructure = {
    name: 'Propane',
    structure: 'CH3-CH2-CH3',
};

const exampleStructureByNodeId = {
    Crude: { name: 'Hexane fragment', structure: 'CH3-CH2-CH2-CH2-CH2-CH3' },
    Alkane: { name: 'Propane', structure: 'CH3-CH2-CH3' },
    Alkene: { name: 'Propene', structure: 'CH2=CH-CH3' },
    Halo: { name: '1-bromopropane', structure: 'CH3-CH2-CH2Br' },
    AlcoholGroup: { name: 'Propan-1-ol', structure: 'CH3-CH2-CH2OH' },
    Alc1: { name: 'Propan-1-ol', structure: 'CH3-CH2-CH2OH' },
    Alc2: { name: 'Propan-2-ol', structure: 'CH3-CH(OH)-CH3' },
    Alc3: { name: '2-methylpropan-2-ol', structure: '(CH3)3C-OH' },
    Ald: { name: 'Propanal', structure: 'CH3-CH2-CHO' },
    Ket: { name: 'Propanone', structure: 'CH3-CO-CH3' },
    Carb: { name: 'Propanoic acid', structure: 'CH3-CH2-COOH' },
    Ester: { name: 'Methyl propanoate', structure: 'CH3-CH2-COO-CH3' },
    Amine: { name: 'Propan-1-amine', structure: 'CH3-CH2-CH2NH2' },
    Nitrile: { name: 'Propanenitrile', structure: 'CH3-CH2-CN' },
    Diol: { name: 'Propane-1,2-diol', structure: 'HO-CH2-CH(OH)-CH3' },
    Hydroxynitrile: { name: '2-hydroxypropanenitrile', structure: 'CH3-CH(OH)-CN' },
    Polymer: { name: 'Propene monomer unit', structure: 'CH2=CH-CH3' },
    PVC: { name: '3-chloro-1-propene unit', structure: 'CH2=CH-CH2Cl' },
    Chloroalkene: { name: '3-chloro-1-propene', structure: 'CH2=CH-CH2Cl' },
    Combustion: { name: 'Propanol combustion context', structure: 'CH3-CH2-CH2OH + O2 -> products' },
    IncompleteCombustion: { name: 'Propane incomplete burn context', structure: 'CH3-CH2-CH3 + limited O2 -> CO/C + H2O' },
    CrackingMix: { name: 'Propane fraction', structure: 'CH3-CH2-CH3' },
    Alkoxide: { name: 'Propoxide', structure: 'CH3-CH2-CH2O-' },
    Carboxylate: { name: 'Propanoate', structure: 'CH3-CH2-COO-' },
    AgX: { name: '3-carbon test substrate', structure: 'CH3-CH2-CH2Br' },
    DNPH: { name: '3-carbon carbonyl substrate', structure: 'CH3-CO-CH3' },
    Iodoform: { name: '3-carbon methyl carbonyl substrate', structure: 'CH3-CO-CH3' },
    NoRxn: { name: '2-methylpropan-2-ol', structure: '(CH3)3C-OH' },
};

const exampleStructureByTopic = {
    Hydrocarbons: { name: 'Propane', structure: 'CH3-CH2-CH3' },
    'Halogen compounds': { name: '1-bromopropane', structure: 'CH3-CH2-CH2Br' },
    'Hydroxy compounds': { name: 'Propan-1-ol', structure: 'CH3-CH2-CH2OH' },
    'Carbonyl compounds': { name: 'Propanone', structure: 'CH3-CO-CH3' },
    'Carboxylic acids and derivatives': { name: 'Propanoic acid', structure: 'CH3-CH2-COOH' },
    'Nitrogen compounds': { name: 'Propanenitrile', structure: 'CH3-CH2-CN' },
    Polymerisation: { name: 'Propene', structure: 'CH2=CH-CH3' },
};

function getCompoundExampleStructure(node) {
    if (!node || typeof node !== 'object') {
        return defaultExampleStructure;
    }
    return (
        exampleStructureByNodeId[node.id] ||
        exampleStructureByTopic[getNodeClassLabel(node)] ||
        defaultExampleStructure
    );
}

function readEndpointId(endpoint) {
    if (endpoint && typeof endpoint === 'object') {
        return String(endpoint.id || endpoint.name || '');
    }
    return String(endpoint || '');
}

function getRelatedMechanismLinks(node) {
    if (!node || !node.id) {
        return [];
    }
    const nodeId = String(node.id);
    return gData.links
        .filter(link => link && link.type !== 'structure')
        .filter(link => readEndpointId(link.source) === nodeId || readEndpointId(link.target) === nodeId)
        .sort((left, right) => {
            const leftLabel = `${left.label || ''}|${readEndpointName(left.target)}`;
            const rightLabel = `${right.label || ''}|${readEndpointName(right.target)}`;
            return leftLabel.localeCompare(rightLabel);
        });
}

function renderCompoundMechanismNavigation(node) {
    if (!compoundMechanismNavElem || !compoundMechanismEmptyElem) {
        return;
    }
    compoundMechanismNavElem.innerHTML = '';

    const relatedLinks = getRelatedMechanismLinks(node);
    if (!relatedLinks.length) {
        compoundMechanismEmptyElem.classList.remove('hidden');
        return;
    }

    compoundMechanismEmptyElem.classList.add('hidden');
    const nodeId = String(node.id || '');
    relatedLinks.forEach(link => {
        const sourceId = readEndpointId(link.source);
        const sourceName = readEndpointName(link.source);
        const targetName = readEndpointName(link.target);
        const directionLabel = sourceId === nodeId ? 'Outgoing' : 'Incoming';
        const pathwayLabel = `${sourceName} -> ${targetName}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className =
            'w-full rounded border border-slate-600 bg-slate-800/80 px-2 py-2 text-left text-xs text-slate-100 hover:bg-slate-700/80';

        const title = document.createElement('div');
        title.className = 'font-semibold text-slate-100';
        title.innerText = `${directionLabel}: ${link.label || 'Pathway'}`;
        button.appendChild(title);

        const subtitle = document.createElement('div');
        subtitle.className = 'mt-1 text-[11px] text-slate-300';
        subtitle.innerText = pathwayLabel;
        button.appendChild(subtitle);

        button.addEventListener('click', () => {
            showReaction(link);
            const prepared = prepareAnimationPanel(link);
            if (prepared) {
                playAnimationSpec(prepared);
            }
        });
        compoundMechanismNavElem.appendChild(button);
    });
}

function renderInfoBlocks(info = {}) {
    if (!infoWhatElem || !infoHowElem || !infoWhyElem || !infoExamTipElem) {
        return;
    }

    infoWhatElem.innerText = info.what || defaultInfo.what;
    infoHowElem.innerText = info.how || defaultInfo.how;
    infoWhyElem.innerText = info.why || defaultInfo.why;
    infoExamTipElem.innerText = info.examTip || defaultInfo.examTip;
}

function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);
    Object.entries(attributes).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return;
        }
        element.setAttribute(key, String(value));
    });
    return element;
}

function parseCubicPath(pathString) {
    if (typeof pathString !== 'string') {
        return null;
    }
    const match = pathString.match(
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
}

function cubicPoint(path, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    const x =
        mt2 * mt * path.x0 +
        3 * mt2 * t * path.x1 +
        3 * mt * t2 * path.x2 +
        t2 * t * path.x3;
    const y =
        mt2 * mt * path.y0 +
        3 * mt2 * t * path.y1 +
        3 * mt * t2 * path.y2 +
        t2 * t * path.y3;
    return { x, y };
}

function cubicTangent(path, t) {
    const mt = 1 - t;
    const x =
        3 * mt * mt * (path.x1 - path.x0) +
        6 * mt * t * (path.x2 - path.x1) +
        3 * t * t * (path.x3 - path.x2);
    const y =
        3 * mt * mt * (path.y1 - path.y0) +
        6 * mt * t * (path.y2 - path.y1) +
        3 * t * t * (path.y3 - path.y2);
    return { x, y };
}

function clampArrowBend(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 1;
    }
    return Math.max(0.5, Math.min(4, numeric));
}

function applyArrowBend(curve, bendFactor) {
    if (!curve) {
        return null;
    }
    const factor = clampArrowBend(bendFactor);
    if (Math.abs(factor - 1) < 0.001) {
        return curve;
    }

    const dx = curve.x3 - curve.x0;
    const dy = curve.y3 - curve.y0;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const nx = -uy;
    const ny = ux;

    const scaleControlPoint = (x, y) => {
        const relX = x - curve.x0;
        const relY = y - curve.y0;
        const projected = relX * ux + relY * uy;
        const normalOffset = relX * nx + relY * ny;
        return {
            x: curve.x0 + projected * ux + normalOffset * factor * nx,
            y: curve.y0 + projected * uy + normalOffset * factor * ny,
        };
    };

    const control1 = scaleControlPoint(curve.x1, curve.y1);
    const control2 = scaleControlPoint(curve.x2, curve.y2);

    return {
        ...curve,
        x1: control1.x,
        y1: control1.y,
        x2: control2.x,
        y2: control2.y,
    };
}

function formatCubicPath(curve) {
    if (!curve) {
        return '';
    }
    return `M ${curve.x0.toFixed(2)} ${curve.y0.toFixed(2)} C ${curve.x1.toFixed(2)} ${curve.y1.toFixed(
        2,
    )}, ${curve.x2.toFixed(2)} ${curve.y2.toFixed(2)}, ${curve.x3.toFixed(2)} ${curve.y3.toFixed(2)}`;
}

function syncAnimationCanvas() {
    if (!animationCanvasElem) {
        return null;
    }
    if (!animationCanvasCtx) {
        animationCanvasCtx = animationCanvasElem.getContext('2d');
    }
    if (!animationCanvasCtx) {
        return null;
    }

    const rect = animationCanvasElem.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.max(1, Math.round(width * dpr));
    const targetHeight = Math.max(1, Math.round(height * dpr));

    if (animationCanvasElem.width !== targetWidth || animationCanvasElem.height !== targetHeight) {
        animationCanvasElem.width = targetWidth;
        animationCanvasElem.height = targetHeight;
    }
    animationCanvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: animationCanvasCtx, width, height };
}

function getActiveStepIndex(animationSpec, progressRatio) {
    const steps = Array.isArray(animationSpec && animationSpec.steps) ? animationSpec.steps : [];
    const stepCount = Math.max(steps.length, 1);
    const boundedProgress = Math.max(0, Math.min(1, progressRatio));
    const scaled = boundedProgress * stepCount;
    return Math.min(stepCount - 1, Math.floor(scaled));
}

function selectCueByStep(cues, stepIndex, keyResolver) {
    if (!Array.isArray(cues)) {
        return [];
    }
    if (typeof keyResolver !== 'function') {
        return cues.filter(cue => {
            if (!cue) {
                return false;
            }
            const cueStep = cue.step === null || cue.step === undefined ? -1 : Number(cue.step);
            const cueEndStep = cue.endStep === null || cue.endStep === undefined ? null : Number(cue.endStep);
            if (!Number.isFinite(cueStep) || cueStep > stepIndex) {
                return false;
            }
            if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) {
                return false;
            }
            return true;
        });
    }

    const selected = new Map();
    cues.forEach(cue => {
        if (!cue) {
            return;
        }
        const cueStep = cue.step === null || cue.step === undefined ? -1 : Number(cue.step);
        const cueEndStep = cue.endStep === null || cue.endStep === undefined ? null : Number(cue.endStep);
        if (!Number.isFinite(cueStep) || cueStep > stepIndex) {
            return;
        }
        if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) {
            return;
        }
        const key = keyResolver(cue);
        if (!key) {
            return;
        }
        const existing = selected.get(key);
        if (!existing || cueStep >= existing._step) {
            selected.set(key, { ...cue, _step: cueStep });
        }
    });
    return Array.from(selected.values()).map(cue => {
        const normalized = { ...cue };
        delete normalized._step;
        return normalized;
    });
}

function drawCanvasBond(ctx, source, target, order) {
    const x1 = Number(source.x || 0);
    const y1 = Number(source.y || 0);
    const x2 = Number(target.x || 0);
    const y2 = Number(target.y || 0);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * 2.4;
    const ny = (dx / length) * 2.4;

    const drawLine = (offset = 0) => {
        ctx.beginPath();
        ctx.moveTo(x1 + nx * offset, y1 + ny * offset);
        ctx.lineTo(x2 + nx * offset, y2 + ny * offset);
        ctx.lineWidth = 2.3;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineCap = 'round';
        ctx.stroke();
    };

    if (order >= 2) {
        drawLine(-0.7);
        drawLine(0.7);
    } else {
        drawLine(0);
    }
}

function getAtomStyle(label) {
    const trimmed = String(label || '').trim();
    if (trimmed.startsWith('Br')) return { fill: '#7f1d1d', text: '#ffffff' };
    if (trimmed.startsWith('O')) return { fill: '#0f766e', text: '#ffffff' };
    if (trimmed.startsWith('H')) return { fill: '#f8fafc', text: '#1e293b' };
    if (trimmed.startsWith('B')) return { fill: '#1e40af', text: '#ffffff' };
    return { fill: '#334155', text: '#ffffff' };
}

function drawCanvasAtom(ctx, atom) {
    const x = Number(atom.x || 0);
    const y = Number(atom.y || 0);
    const label = atom.label || '';
    const style = getAtomStyle(label);

    ctx.beginPath();
    ctx.arc(x, y + 1.5, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.85)';
    ctx.stroke();

    ctx.fillStyle = style.text;
    ctx.font = '600 8px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
}

function drawCanvasDipole(ctx, cue) {
    const text = String(cue.text || '')
        .replaceAll('delta+', 'δ+')
        .replaceAll('delta-', 'δ-');
    ctx.fillStyle = '#fb7185';
    ctx.font = '700 9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, Number(cue.x || 0), Number(cue.y || 0));
}

function drawCanvasLonePair(ctx, cue) {
    const x = Number(cue.x || 0);
    const y = Number(cue.y || 0);
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(x - 2.4, y - 1.4, 1.3, 0, Math.PI * 2);
    ctx.arc(x + 2.4, y + 1.4, 1.3, 0, Math.PI * 2);
    ctx.fill();
    if (cue.label) {
        ctx.fillStyle = '#93c5fd';
        ctx.font = '600 8px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(String(cue.label), x, y - 6);
    }
}

function drawCanvasArrow(ctx, cue, stepProgress, labelRow) {
    const parsedCurve = parseCubicPath(cue.path);
    if (!parsedCurve) {
        return;
    }
    const curve = applyArrowBend(parsedCurve, cue.bend);

    const t = Math.max(0.05, Math.min(1, stepProgress + 0.05));
    const endPoint = cubicPoint(curve, t);
    const tangent = cubicTangent(curve, t);
    const angle = Math.atan2(tangent.y, tangent.x);

    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(curve.x0, curve.y0);
    ctx.bezierCurveTo(curve.x1, curve.y1, curve.x2, curve.y2, endPoint.x, endPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const arrowSize = 7;
    ctx.beginPath();
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(
        endPoint.x - arrowSize * Math.cos(angle - Math.PI / 6),
        endPoint.y - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
        endPoint.x - arrowSize * Math.cos(angle + Math.PI / 6),
        endPoint.y - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    const electron = cubicPoint(curve, Math.max(0, Math.min(1, t - 0.08)));
    ctx.beginPath();
    ctx.arc(electron.x, electron.y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fde68a';
    ctx.fill();
    ctx.restore();

    if (cue.label) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '600 8px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cue.label, 180, 156 - labelRow * 11);
    }
}

function drawMechanismCanvasFrame(animationSpec, progressRatio) {
    const canvasState = syncAnimationCanvas();
    if (!canvasState || !animationSpec) {
        return;
    }

    const { ctx, width, height } = canvasState;
    const viewWidth = 360;
    const viewHeight = 180;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(width / viewWidth, height / viewHeight);

    const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    const stepIndex = getActiveStepIndex(animationSpec, progressRatio);
    const stepCount = Math.max((animationSpec.steps || []).length, 1);
    const scaled = Math.max(0, Math.min(1, progressRatio)) * stepCount;
    const stepProgress = Math.max(0, Math.min(1, scaled - stepIndex));

    const atoms = selectCueByStep(animationSpec.atoms, stepIndex, atom => atom.id);
    const bonds = selectCueByStep(animationSpec.bonds, stepIndex, bond =>
        [bond.from, bond.to].sort().join('|'),
    );
    const dipoles = selectCueByStep(animationSpec.dipoles, stepIndex);
    const lonePairs = selectCueByStep(animationSpec.lonePairs, stepIndex);
    const electronMovement = selectCueByStep(animationSpec.electronMovement, stepIndex).filter(
        cue => cue && cue.step !== null && cue.step !== undefined && Number(cue.step) === stepIndex,
    );

    const atomById = new Map(atoms.map(atom => [atom.id, atom]));

    bonds.forEach(bond => {
        const source = atomById.get(bond.from);
        const target = atomById.get(bond.to);
        if (!source || !target) {
            return;
        }
        drawCanvasBond(ctx, source, target, Number(bond.order || 1));
    });

    atoms.forEach(atom => drawCanvasAtom(ctx, atom));
    dipoles.forEach(cue => drawCanvasDipole(ctx, cue));
    lonePairs.forEach(cue => drawCanvasLonePair(ctx, cue));
    electronMovement.forEach((cue, idx) => drawCanvasArrow(ctx, cue, stepProgress, idx));

    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '600 8px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Step ${stepIndex + 1}/${stepCount}`, 10, 12);

    ctx.restore();
}

function updateAnimationPlayButton() {
    if (!animationPlayBtnElem) {
        return;
    }
    animationPlayBtnElem.innerText = animationPlaybackRunning ? '⏸' : '▶';
}

function setAnimationProgress(progressRatio, options = {}) {
    const { updateSlider = true } = options;
    const bounded = Math.max(0, Math.min(1, progressRatio));
    animationPlaybackProgress = bounded;

    if (updateSlider && animationProgressElem) {
        animationProgressElem.value = (bounded * 100).toFixed(1);
    }

    if (activeAnimationSpec) {
        const steps = Array.isArray(activeAnimationSpec.steps) ? activeAnimationSpec.steps : [];
        const stepCount = Math.max(steps.length, 1);
        const stepIndex = Math.min(stepCount - 1, Math.floor(bounded * stepCount));

        animationVisualStep = stepIndex;
        renderAnimationVisualCues(activeAnimationSpec, stepIndex);
        setAnimationMarkerProgress(bounded);
        if (animationStepElem) {
            animationStepElem.innerText = steps[stepIndex] || 'Mechanism step preview.';
        }
        drawMechanismCanvasFrame(activeAnimationSpec, bounded);
    }
}

function clearAnimationVisualLayers() {
    [
        animationBondLayerElem,
        animationAtomLayerElem,
        animationDipoleLayerElem,
        animationLonePairLayerElem,
        animationElectronLayerElem,
    ].forEach(layer => {
        if (layer) {
            layer.innerHTML = '';
        }
    });
}

function filterCuesForStep(cues, stepIndex) {
    if (!Array.isArray(cues)) {
        return [];
    }
    return cues.filter(cue => {
        if (!cue) {
            return false;
        }
        const cueStep = cue.step === null || cue.step === undefined ? null : Number(cue.step);
        const cueEndStep = cue.endStep === null || cue.endStep === undefined ? null : Number(cue.endStep);
        if (cueStep !== null && (!Number.isFinite(cueStep) || cueStep > stepIndex)) {
            return false;
        }
        if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) {
            return false;
        }
        return cueStep === null || cueStep <= stepIndex;
    });
}

function renderDipoleMarkers(dipoles) {
    if (!animationDipoleLayerElem) {
        return;
    }

    dipoles.forEach(dipole => {
        const text = createSvgElement('text', {
            x: Number(dipole.x || 180).toFixed(2),
            y: Number(dipole.y || 56).toFixed(2),
            fill: '#fb7185',
            'font-size': '10',
            'font-weight': '700',
            'text-anchor': 'middle',
        });
        text.textContent = dipole.text || '';
        animationDipoleLayerElem.appendChild(text);
    });
}

function renderBondScaffold(atoms, bonds) {
    if (!animationBondLayerElem) {
        return;
    }

    const atomsById = new Map();
    atoms.forEach(atom => {
        if (atom && atom.id) {
            atomsById.set(atom.id, atom);
        }
    });

    bonds.forEach(bond => {
        const source = atomsById.get(bond.from);
        const target = atomsById.get(bond.to);
        if (!source || !target) {
            return;
        }

        const x1 = Number(source.x || 0);
        const y1 = Number(source.y || 0);
        const x2 = Number(target.x || 0);
        const y2 = Number(target.y || 0);

        const drawLine = (offsetX = 0, offsetY = 0) => {
            animationBondLayerElem.appendChild(
                createSvgElement('line', {
                    x1: (x1 + offsetX).toFixed(2),
                    y1: (y1 + offsetY).toFixed(2),
                    x2: (x2 + offsetX).toFixed(2),
                    y2: (y2 + offsetY).toFixed(2),
                    stroke: '#94a3b8',
                    'stroke-width': '2',
                    'stroke-linecap': 'round',
                }),
            );
        };

        drawLine();

        if (bond.order >= 2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.hypot(dx, dy) || 1;
            const nx = (-dy / length) * 2;
            const ny = (dx / length) * 2;
            drawLine(nx, ny);
        }
    });
}

function renderAtomScaffold(atoms) {
    if (!animationAtomLayerElem) {
        return;
    }

    atoms.forEach(atom => {
        const x = Number(atom.x || 0);
        const y = Number(atom.y || 0);

        animationAtomLayerElem.appendChild(
            createSvgElement('circle', {
                cx: x.toFixed(2),
                cy: y.toFixed(2),
                r: '7',
                fill: '#0f172a',
                stroke: '#cbd5e1',
                'stroke-width': '1',
            }),
        );

        const text = createSvgElement('text', {
            x: x.toFixed(2),
            y: (y + 3).toFixed(2),
            fill: '#e2e8f0',
            'font-size': '8',
            'font-weight': '700',
            'text-anchor': 'middle',
        });
        text.textContent = atom.label || '';
        animationAtomLayerElem.appendChild(text);
    });
}

function renderLonePairMarkers(lonePairs) {
    if (!animationLonePairLayerElem) {
        return;
    }

    lonePairs.forEach(lonePair => {
        const x = Number(lonePair.x || 160);
        const y = Number(lonePair.y || 56);

        // Render two small electron dots to emphasize lone-pair location.
        animationLonePairLayerElem.appendChild(
            createSvgElement('circle', {
                cx: (x - 3).toFixed(2),
                cy: (y - 2).toFixed(2),
                r: '1.8',
                fill: '#60a5fa',
            }),
        );
        animationLonePairLayerElem.appendChild(
            createSvgElement('circle', {
                cx: (x + 3).toFixed(2),
                cy: (y + 2).toFixed(2),
                r: '1.8',
                fill: '#60a5fa',
            }),
        );
        if (lonePair.label) {
            const text = createSvgElement('text', {
                x: x.toFixed(2),
                y: (y - 6).toFixed(2),
                fill: '#93c5fd',
                'font-size': '9',
                'font-weight': '600',
                'text-anchor': 'middle',
            });
            text.textContent = lonePair.label;
            animationLonePairLayerElem.appendChild(text);
        }
    });
}

function renderElectronArrows(electronMovement) {
    if (!animationElectronLayerElem) {
        return;
    }

    electronMovement.forEach((arrow, index) => {
        const parsedCurve = parseCubicPath(arrow.path || '');
        const curve = applyArrowBend(parsedCurve, arrow.bend);
        const pathData = curve ? formatCubicPath(curve) : arrow.path || '';
        animationElectronLayerElem.appendChild(
            createSvgElement('path', {
                d: pathData,
                fill: 'none',
                stroke: '#fbbf24',
                'stroke-width': '2',
                'stroke-linecap': 'round',
                'stroke-dasharray': '3 3',
                'marker-end': 'url(#animationElectronArrowHead)',
            }),
        );

        if (arrow.label) {
            const text = createSvgElement('text', {
                x: '180',
                y: String(98 - index * 10),
                fill: '#fde68a',
                'font-size': '9',
                'font-weight': '600',
                'text-anchor': 'middle',
            });
            text.textContent = arrow.label;
            animationElectronLayerElem.appendChild(text);
        }
    });
}

function renderAnimationVisualCues(animationSpec, stepIndex) {
    clearAnimationVisualLayers();
    if (!animationSpec) {
        return;
    }

    const atoms = filterCuesForStep(animationSpec.atoms, stepIndex);
    const bonds = filterCuesForStep(animationSpec.bonds, stepIndex);
    const dipoles = filterCuesForStep(animationSpec.dipoles, stepIndex);
    const lonePairs = filterCuesForStep(animationSpec.lonePairs, stepIndex);
    const electronMovement = filterCuesForStep(animationSpec.electronMovement, stepIndex);

    renderBondScaffold(atoms, bonds);
    renderAtomScaffold(atoms);
    renderDipoleMarkers(dipoles);
    renderLonePairMarkers(lonePairs);
    renderElectronArrows(electronMovement);
}

function setAnimationMarkerProgress(progressRatio) {
    if (!animationPathElem || !animationMarkerElem || !animationPathLength) {
        return;
    }

    const boundedProgress = Math.max(0, Math.min(1, progressRatio));
    const point = animationPathElem.getPointAtLength(animationPathLength * boundedProgress);
    animationMarkerElem.setAttribute('cx', point.x.toFixed(2));
    animationMarkerElem.setAttribute('cy', point.y.toFixed(2));
}

function setAnimationStatus(status) {
    if (animationStatusElem) {
        animationStatusElem.innerText = status;
    }
}

function readAnimationSpeedMultiplier(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 1;
    }
    return Math.max(0.5, Math.min(2, numeric));
}

function getEffectiveAnimationDurationMs() {
    return Math.max(1, animationPlaybackDurationMs / animationSpeedMultiplier);
}

function stopAnimationPlayback() {
    if (animationRafId !== null) {
        window.cancelAnimationFrame(animationRafId);
        animationRafId = null;
    }
    animationPlaybackRunning = false;
    updateAnimationPlayButton();
}

function hideAnimationPanel() {
    stopAnimationPlayback();
    animationVisualStep = -1;
    animationPlaybackProgress = 0;
    activeAnimationSpec = null;
    clearAnimationVisualLayers();
    drawMechanismCanvasFrame(null, 0);
    if (animationPanelElem) {
        animationPanelElem.classList.add('hidden');
    }
    if (animationProgressElem) {
        animationProgressElem.value = '0';
    }
    setAnimationStatus('Idle');
}

function showAnimationUnavailable(message) {
    if (!animationPanelElem) {
        return null;
    }

    stopAnimationPlayback();
    animationPanelElem.classList.remove('hidden');
    if (animationTitleElem) animationTitleElem.innerText = 'Animation unavailable';
    if (animationSummaryElem) animationSummaryElem.innerText = 'This pathway currently has no playable mechanism asset.';
    if (animationStepElem) animationStepElem.innerText = '';
    if (animationFallbackElem) {
        animationFallbackElem.classList.remove('hidden');
        animationFallbackElem.innerText = message;
    }
    if (animationPathElem) {
        animationPathElem.setAttribute('d', '');
    }
    if (animationMarkerElem) {
        animationMarkerElem.setAttribute('cx', '24');
        animationMarkerElem.setAttribute('cy', '84');
    }
    animationPathLength = 0;
    animationVisualStep = -1;
    animationPlaybackProgress = 0;
    activeAnimationSpec = null;
    clearAnimationVisualLayers();
    if (animationCanvasCtx && animationCanvasElem) {
        const canvasState = syncAnimationCanvas();
        if (canvasState) {
            canvasState.ctx.clearRect(0, 0, canvasState.width, canvasState.height);
        }
    }
    if (animationProgressElem) {
        animationProgressElem.value = '0';
    }
    setAnimationStatus('Unavailable');
    return null;
}

function prepareAnimationPanel(link) {
    if (!animationPanelElem) {
        return null;
    }

    if (!link || !link.animationId) {
        return showAnimationUnavailable('No animation ID is attached to this pathway yet.');
    }

    const animationSpec = animationRegistry[link.animationId];
    if (!animationSpec) {
        return showAnimationUnavailable('No animation asset is registered for this pathway yet.');
    }

    stopAnimationPlayback();
    animationPanelElem.classList.remove('hidden');
    if (animationFallbackElem) {
        animationFallbackElem.classList.add('hidden');
        animationFallbackElem.innerText = '';
    }

    if (animationTitleElem) animationTitleElem.innerText = animationSpec.title || 'Mechanism animation';
    if (animationSummaryElem) {
        animationSummaryElem.innerText = animationSpec.summary || 'Mechanism step preview.';
    }
    if (animationStepElem) {
        const firstStep =
            Array.isArray(animationSpec.steps) && animationSpec.steps.length
                ? animationSpec.steps[0]
                : 'Mechanism step preview.';
        animationStepElem.innerText = firstStep;
    }

    if (animationPathElem) {
        animationPathElem.setAttribute('d', animationSpec.path || '');
    }

    activeAnimationSpec = animationSpec;
    animationPlaybackDurationMs =
        Number.isFinite(animationSpec.durationMs) && animationSpec.durationMs > 0
            ? animationSpec.durationMs
            : 3600;

    animationPathLength = 0;
    if (animationPathElem && animationSpec.path) {
        try {
            animationPathLength = animationPathElem.getTotalLength();
        } catch (error) {
            console.warn('Unable to read animation path length for pathway animation.', error);
            animationPathLength = 0;
        }
    }
    setAnimationProgress(0, { updateSlider: true });
    setAnimationStatus('Ready');
    return animationSpec;
}

function playAnimationSpec(animationSpec) {
    if (!animationSpec) {
        return;
    }

    activeAnimationSpec = animationSpec;
    stopAnimationPlayback();
    if (animationPlaybackProgress >= 1) {
        animationPlaybackProgress = 0;
    }

    animationPlaybackRunning = true;
    updateAnimationPlayButton();
    setAnimationStatus('Playing');

    animationFrameStartTs = performance.now();
    animationFrameStartProgress = animationPlaybackProgress;
    const tick = now => {
        if (!animationPlaybackRunning) {
            return;
        }
        const elapsed = now - animationFrameStartTs;
        const durationMs = getEffectiveAnimationDurationMs();
        const nextProgress = Math.min(1, animationFrameStartProgress + elapsed / durationMs);

        setAnimationProgress(nextProgress, { updateSlider: true });

        if (nextProgress >= 1) {
            stopAnimationPlayback();
            setAnimationStatus('Complete');
            return;
        }
        animationRafId = window.requestAnimationFrame(tick);
    };

    animationRafId = window.requestAnimationFrame(tick);
}

function bindAnimationControls() {
    if (animationControlsBound) {
        return;
    }
    if (!animationPlayBtnElem || !animationResetBtnElem || !animationProgressElem || !animationSpeedElem) {
        return;
    }

    animationSpeedMultiplier = readAnimationSpeedMultiplier(animationSpeedElem.value);

    animationPlayBtnElem.addEventListener('click', () => {
        if (!activeAnimationSpec) {
            return;
        }
        if (animationPlaybackRunning) {
            stopAnimationPlayback();
            setAnimationStatus('Paused');
            return;
        }
        playAnimationSpec(activeAnimationSpec);
    });

    animationResetBtnElem.addEventListener('click', () => {
        stopAnimationPlayback();
        setAnimationProgress(0, { updateSlider: true });
        if (activeAnimationSpec) {
            setAnimationStatus('Ready');
        }
    });

    animationProgressElem.addEventListener('input', event => {
        const target = event.target;
        const rawValue = target && typeof target.value === 'string' ? Number(target.value) : 0;
        const progressRatio = Math.max(0, Math.min(1, rawValue / 100));
        stopAnimationPlayback();
        setAnimationProgress(progressRatio, { updateSlider: false });
        if (activeAnimationSpec) {
            setAnimationStatus('Scrubbing');
        }
    });

    animationSpeedElem.addEventListener('change', event => {
        const target = event.target;
        const rawValue = target && typeof target.value === 'string' ? target.value : '1';
        animationSpeedMultiplier = readAnimationSpeedMultiplier(rawValue);
        if (animationPlaybackRunning) {
            animationFrameStartTs = performance.now();
            animationFrameStartProgress = animationPlaybackProgress;
        }
    });

    window.addEventListener('resize', () => {
        if (activeAnimationSpec && animationPanelElem && !animationPanelElem.classList.contains('hidden')) {
            drawMechanismCanvasFrame(activeAnimationSpec, animationPlaybackProgress);
        }
    });

    animationControlsBound = true;
    updateAnimationPlayButton();
}

function showStartupError(message) {
    const fallback = document.getElementById('contentArea');
    if (!fallback) {
        return;
    }
    fallback.innerHTML = `
        <p class="text-rose-300 mb-3">${message}</p>
        <p class="text-gray-400 text-xs">
            If you use script blocking (for example Brave Shields), allow jsdelivr and unpkg for this page.
        </p>
    `;
}

function hideStaticPreview() {
    const preview = document.getElementById('staticMapPreview');
    if (preview) {
        preview.style.display = 'none';
    }
}

function resolveEndpointNode(endpoint, nodeById) {
    if (!endpoint) return null;
    if (typeof endpoint === 'object') {
        if (endpoint.id && nodeById.has(endpoint.id)) {
            return nodeById.get(endpoint.id);
        }
        return endpoint;
    }
    return nodeById.get(String(endpoint)) || null;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
        return Math.hypot(px - x1, py - y1);
    }
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    return Math.hypot(px - closestX, py - closestY);
}

function rotatePoint(point, yaw, pitch) {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const xYaw = point.x * cosYaw - point.z * sinYaw;
    const zYaw = point.x * sinYaw + point.z * cosYaw;

    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);

    return {
        x: xYaw,
        y: point.y * cosPitch - zYaw * sinPitch,
        z: point.y * sinPitch + zYaw * cosPitch
    };
}

function projectPoint(point, cameraDistance, focalLength, centerX, centerY) {
    const depth = cameraDistance - point.z;
    const clampedDepth = Math.max(70, depth);
    const scale = focalLength / clampedDepth;

    return {
        x: centerX + point.x * scale,
        y: centerY - point.y * scale,
        scale,
        depth: clampedDepth
    };
}

function renderFallbackMap(container) {
    if (!container) {
        return;
    }

    if (fallbackCleanup) {
        fallbackCleanup();
        fallbackCleanup = null;
    }

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-label', 'Organic chemistry reaction map');

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        showStartupError('Unable to create fallback canvas context for the reaction map.');
        return;
    }

    hideStaticPreview();
    container.innerHTML = '';
    container.appendChild(canvas);

    const nodes = gData.nodes.map((node, index) => ({ ...node, _index: index }));
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const links = gData.links
        .map(link => ({
            ...link,
            source: resolveEndpointNode(link.source, nodeById),
            target: resolveEndpointNode(link.target, nodeById)
        }))
        .filter(link => link.source && link.target);

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const nodeCount = Math.max(nodes.length, 1);
    nodes.forEach((node, index) => {
        const y = 1 - (2 * index) / Math.max(nodeCount - 1, 1);
        const radius = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = goldenAngle * index;
        node.base = {
            x: radius * Math.cos(theta),
            y,
            z: radius * Math.sin(theta)
        };
    });

    let width = 0;
    let height = 0;
    let dpr = 1;
    let orbitYaw = 0.45;
    let orbitPitch = -0.25;
    let cameraDistance = 420;
    const focalLength = 520;
    let dragging = false;
    let movedSincePointerDown = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let rafId = null;
    let projectedNodes = [];
    let projectedLinks = [];

    function ensureCanvasSize() {
        width = container.clientWidth || window.innerWidth;
        height = container.clientHeight || window.innerHeight;
        dpr = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rebuildProjection() {
        const sphereRadius = Math.max(120, Math.min(width, height) * 0.32);
        const centerX = width / 2;
        const centerY = height / 2;

        const nodeFrames = nodes.map(node => {
            const rotated = rotatePoint(
                {
                    x: node.base.x * sphereRadius,
                    y: node.base.y * sphereRadius,
                    z: node.base.z * sphereRadius
                },
                orbitYaw,
                orbitPitch,
            );
            const projected = projectPoint(rotated, cameraDistance, focalLength, centerX, centerY);
            const radius = Math.max(4, Math.min(16, 8 * projected.scale));

            return {
                node,
                world: rotated,
                x: projected.x,
                y: projected.y,
                radius,
                scale: projected.scale,
                depth: projected.depth
            };
        });

        const frameById = new Map(nodeFrames.map(frame => [frame.node.id, frame]));
        const linkFrames = links
            .map(link => {
                const sourceFrame = frameById.get(link.source.id);
                const targetFrame = frameById.get(link.target.id);
                if (!sourceFrame || !targetFrame) return null;
                return {
                    link,
                    source: sourceFrame,
                    target: targetFrame,
                    z: (sourceFrame.world.z + targetFrame.world.z) / 2
                };
            })
            .filter(Boolean);

        projectedNodes = nodeFrames.sort((a, b) => a.world.z - b.world.z);
        projectedLinks = linkFrames.sort((a, b) => a.z - b.z);
    }

    function drawArrow(source, target, color) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.hypot(dx, dy);
        if (length < 1) return;

        const ux = dx / length;
        const uy = dy / length;
        const tipX = target.x - ux * (target.radius + 2);
        const tipY = target.y - uy * (target.radius + 2);
        const arrowSize = 4 + Math.min(3, target.scale * 2);

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ux * arrowSize * 2 + uy * arrowSize, tipY - uy * arrowSize * 2 - ux * arrowSize);
        ctx.lineTo(tipX - ux * arrowSize * 2 - uy * arrowSize, tipY - uy * arrowSize * 2 + ux * arrowSize);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawScene() {
        if (!width || !height) {
            ensureCanvasSize();
        }

        rebuildProjection();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, width, height);

        projectedLinks.forEach(({ link, source, target }) => {
            const isHighlight = link === highlightLink;
            const stroke = link.type === 'structure'
                ? '#ffffff22'
                : (isHighlight ? '#a855f7' : '#ffffff4f');
            const lineWidth = link.type === 'structure' ? 1 : (isHighlight ? 3 : 1.4);

            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            if (link.type !== 'structure') {
                drawArrow(source, target, isHighlight ? '#a855f7' : '#d8b4fe');
            }
        });

        projectedNodes.forEach(frame => {
            const { node, x, y, radius, scale } = frame;
            const grad = ctx.createRadialGradient(
                x - radius * 0.35,
                y - radius * 0.35,
                radius * 0.2,
                x,
                y,
                radius * 1.2,
            );
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, node.color || '#60a5fa');

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = `${Math.max(11, Math.min(16, 12 * scale))}px "Segoe UI", sans-serif`;
            ctx.fillStyle = '#e2e8f0';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, x, y - radius - 8);

        });
    }

    function pickNode(x, y) {
        for (let index = projectedNodes.length - 1; index >= 0; index -= 1) {
            const frame = projectedNodes[index];
            const threshold = Math.max(12, frame.radius + 4);
            if (Math.hypot(frame.x - x, frame.y - y) <= threshold) {
                return frame.node;
            }
        }
        return null;
    }

    function pickLink(x, y) {
        let best = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        projectedLinks.forEach(({ link, source, target }) => {
            if (link.type === 'structure') {
                return;
            }
            const distance = pointToSegmentDistance(x, y, source.x, source.y, target.x, target.y);
            if (distance < 9 && distance < bestDistance) {
                bestDistance = distance;
                best = link;
            }
        });

        return best;
    }

    function clientToCanvas(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function animate() {
        if (!dragging) {
            orbitYaw += 0.0012;
        }
        drawScene();
        rafId = window.requestAnimationFrame(animate);
    }

    function onPointerDown(event) {
        if (event.button !== 0) return;
        dragging = true;
        movedSincePointerDown = false;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        canvas.style.cursor = 'grabbing';
    }

    function onPointerMove(event) {
        const { x, y } = clientToCanvas(event.clientX, event.clientY);
        if (dragging) {
            const dx = event.clientX - lastPointerX;
            const dy = event.clientY - lastPointerY;
            if (Math.abs(event.clientX - pointerStartX) > 2 || Math.abs(event.clientY - pointerStartY) > 2) {
                movedSincePointerDown = true;
            }
            orbitYaw += dx * 0.007;
            orbitPitch -= dy * 0.007;
            orbitPitch = Math.max(-1.25, Math.min(1.25, orbitPitch));
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            canvas.style.cursor = 'grabbing';
            return;
        }

        const hoverNode = pickNode(x, y);
        const hoverLink = pickLink(x, y);
        canvas.style.cursor = hoverNode || hoverLink ? 'pointer' : 'grab';
    }

    function onPointerUp(event) {
        if (event.button !== 0) return;
        const { x, y } = clientToCanvas(event.clientX, event.clientY);
        const wasDragging = dragging;
        dragging = false;
        if (!wasDragging) {
            return;
        }

        if (!movedSincePointerDown) {
            const node = pickNode(x, y);
            if (node) {
                showCompound(node);
                return;
            }

            const link = pickLink(x, y);
            if (link) {
                showReaction(link);
                return;
            }

            showDefault();
        }

        const hoverNode = pickNode(x, y);
        const hoverLink = pickLink(x, y);
        canvas.style.cursor = hoverNode || hoverLink ? 'pointer' : 'grab';
    }

    function onWheel(event) {
        event.preventDefault();
        cameraDistance += event.deltaY * 0.35;
        cameraDistance = Math.max(220, Math.min(760, cameraDistance));
        drawScene();
    }

    function onResize() {
        ensureCanvasSize();
        drawScene();
    }

    function onContextMenu(event) {
        event.preventDefault();
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', onResize);

    ensureCanvasSize();
    drawScene();
    canvas.style.cursor = 'grab';
    rafId = window.requestAnimationFrame(animate);
    fallbackRedraw = drawScene;
    fallbackCleanup = () => {
        if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
        }
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('contextmenu', onContextMenu);
        window.removeEventListener('resize', onResize);
        fallbackRedraw = null;
    };
}

// UI Helpers.
// These functions coordinate text, visibility, and graph styling when the user
// selects reactions or compounds.
function showDefault() {
    if (!contentArea) return;
    contentArea.style.display = 'block';
    dynamicContent.classList.add('hidden');
    renderInfoBlocks(defaultInfo);
    hideAnimationPanel();
    highlightLink = null;
    if (Graph) Graph.linkDirectionalParticleSpeed(l => 0.002).linkWidth(1); // Reset
    if (fallbackRedraw) fallbackRedraw();
}

function showReaction(link) {
    // Ignore structural links since they represent static structure connections,
    // not actionable reaction pathways in the UI.
    if (link.type === 'structure') return;

    // Swap to detail mode and fill out reaction metadata.
    contentArea.style.display = 'none';
    dynamicContent.classList.remove('hidden');

    detailTitle.innerText = link.label || 'Reaction';
    detailType.innerText = 'Reaction Pathway';
    detailType.className =
        'inline-block px-2 py-1 text-xs font-semibold rounded mb-3 bg-purple-900 text-purple-200 border border-purple-700';

    reactionDetails.classList.remove('hidden');
    compoundDetails.classList.add('hidden');

    reagentsElem.innerText = link.conditions || link.reagents || 'See pathway notes.';
    mechanismElem.innerText = link.mechanismSummary || link.type || 'Reaction pathway';
    const sourceName = readEndpointName(link.source);
    const targetName = readEndpointName(link.target);
    const quizData = link && link.quizData ? link.quizData : null;
    const quizPrompt = quizData && quizData.prompt ? `${quizData.prompt} ` : '';
    const quizAnswer = quizData && quizData.answer ? `Answer: ${quizData.answer}.` : '';
    renderInfoBlocks({
        what: `${sourceName} to ${targetName}: ${link.label || 'reaction pathway'}.`,
        how: link.mechanismSummary || link.type || defaultInfo.how,
        why: `Use this conversion when planning routes between ${sourceName} and ${targetName}.`,
        examTip: `${quizPrompt}${quizAnswer}`.trim() || `Quote full conditions: ${reagentsElem.innerText}.`
    });
    const preparedAnimation = prepareAnimationPanel(link);

    // Highlight Visualization.
    // We visually emphasize the chosen link by increasing width and particle
    // speed so the learner can track the selected pathway.
    highlightLink = link;
    // Update Graph visualization for highlight
    if (Graph) {
        Graph.linkColor(l =>
            l === highlightLink ? '#a855f7' : (l.type === 'structure' ? '#ffffff22' : '#ffffff44')
        )
            .linkWidth(l => (l === highlightLink ? 3 : (l.type === 'structure' ? 0.5 : 1)))
            .linkDirectionalParticleSpeed(l => (l === highlightLink ? 0.02 : 0.002))
            .linkDirectionalParticleWidth(l => (l === highlightLink ? 4 : 2));
    }
    if (fallbackRedraw) fallbackRedraw();

    // Button Logic.
    // The animation button provides a quick "pulse" to draw attention to the
    // selected reaction without permanently altering the graph.
    animateBtn.onclick = () => {
        if (Graph) {
            // Burst speed animation
            const originalSpeed = 0.02;
            const burstSpeed = 0.1;

            // Temporarily increase particle density and speed to emphasize the selected pathway.
            Graph.linkDirectionalParticles(l => (l === highlightLink ? 8 : (l.type === 'structure' ? 0 : 2)));
            Graph.linkDirectionalParticleSpeed(l => (l === highlightLink ? burstSpeed : 0.002));

            setTimeout(() => {
                // Reset to baseline values so highlight animations don't stack after repeated clicks.
                Graph.linkDirectionalParticles(l => (l.type === 'structure' ? 0 : 2)); // Reset density
                Graph.linkDirectionalParticleSpeed(l => (l === highlightLink ? originalSpeed : 0.002)); // Reset speed
            }, 1500);
        }
        const nextAnimation = prepareAnimationPanel(link) || preparedAnimation;
        playAnimationSpec(nextAnimation);
    };
}

function getCompoundDescription(node) {
    // Provide a fallback description if the data file has no detailed entry.
    return compoundDescriptions[node.id] || `Functional Group: ${node.name}. `;
}

function showCompound(node) {
    // Swap to detail mode and fill out compound metadata.
    contentArea.style.display = 'none';
    dynamicContent.classList.remove('hidden');

    detailTitle.innerText = node.name;
    detailType.innerText = 'Chemical Compound';
    detailType.className =
        'inline-block px-2 py-1 text-xs font-semibold rounded mb-3 bg-blue-900 text-blue-200 border border-blue-700';

    reactionDetails.classList.add('hidden');
    compoundDetails.classList.remove('hidden');

    compoundDesc.innerText = getCompoundDescription(node);
    const exampleStructure = getCompoundExampleStructure(node);
    if (compoundExampleNameElem) {
        compoundExampleNameElem.innerText = exampleStructure.name;
    }
    if (compoundExampleStructureElem) {
        compoundExampleStructureElem.innerText = exampleStructure.structure;
    }
    renderCompoundMechanismNavigation(node);
    const firstTip = Array.isArray(node.examTips) && node.examTips.length ? node.examTips[0] : null;
    renderInfoBlocks({
        what: `${node.name} is part of this organic map.`,
        how: 'Use connected links to identify valid conversions and required conditions.',
        why: `${node.name} appears in multi-step synthesis and data interpretation questions.`,
        examTip: firstTip || defaultInfo.examTip
    });
    hideAnimationPanel();
    highlightLink = null;
    // Reset links but preserve structure link subtlety so the network stays readable.
    if (Graph) {
        Graph.linkColor(l => (l.type === 'structure' ? '#ffffff22' : '#ffffff44')).linkWidth(l =>
            l.type === 'structure' ? 0.5 : 1
        );
    }
    if (fallbackRedraw) fallbackRedraw();
}

// Global reset camera function.
// Exposed on `window` so the UI button in index.html can call it.
window.resetCamera = function resetCamera() {
    if (Graph) {
        const cameraDistance = graphViewMode === '2d' ? 360 : 250;
        Graph.cameraPosition({ x: 0, y: 0, z: cameraDistance }, { x: 0, y: 0, z: 0 }, 1000);
    }
    showDefault();
    if (fallbackRedraw) fallbackRedraw();
};

// --- Main Initialization ---
// We initialize once the DOM is parsed; this avoids stalling map startup when
// unrelated network resources delay the full window load event.
function initMap() {
    if (mapBootstrapped || Graph || fallbackRedraw) {
        return;
    }
    if (!organicMapData || !organicMapData.gData || !organicMapData.compoundDescriptions) {
        console.error('Organic map data failed to load. Ensure js/data.js is loaded before js/main.js.');
        showStartupError('Unable to load map data. Confirm js/data.js loads, then refresh.');
        return;
    }

    if (organicMapAnimations && typeof organicMapAnimations.buildAnimationRegistry === 'function') {
        animationRegistry = organicMapAnimations.buildAnimationRegistry(gData.links);
    } else {
        animationRegistry = {};
        console.warn('Animation registry helper not loaded. Mechanism playback will show fallback messages.');
    }

    // 1. Initialize UI Elements
    contentArea = document.getElementById('contentArea');
    dynamicContent = document.getElementById('dynamicContent');
    detailTitle = document.getElementById('detailTitle');
    detailType = document.getElementById('detailType');
    reagentsElem = document.getElementById('reagents');
    mechanismElem = document.getElementById('mechanism');
    reactionDetails = document.getElementById('reactionDetails');
    compoundDetails = document.getElementById('compoundDetails');
    compoundDesc = document.getElementById('compoundDesc');
    compoundExampleNameElem = document.getElementById('compoundExampleName');
    compoundExampleStructureElem = document.getElementById('compoundExampleStructure');
    compoundMechanismNavElem = document.getElementById('compoundMechanismNav');
    compoundMechanismEmptyElem = document.getElementById('compoundMechanismEmpty');
    animateBtn = document.getElementById('animateBtn');
    infoWhatElem = document.getElementById('infoWhat');
    infoHowElem = document.getElementById('infoHow');
    infoWhyElem = document.getElementById('infoWhy');
    infoExamTipElem = document.getElementById('infoExamTip');
    animationPanelElem = document.getElementById('animationPanel');
    animationStatusElem = document.getElementById('animationStatus');
    animationTitleElem = document.getElementById('animationTitle');
    animationSummaryElem = document.getElementById('animationSummary');
    animationStepElem = document.getElementById('animationStep');
    animationFallbackElem = document.getElementById('animationFallback');
    animationCanvasElem = document.getElementById('animationCanvas');
    animationPlayBtnElem = document.getElementById('animationPlayBtn');
    animationResetBtnElem = document.getElementById('animationResetBtn');
    animationProgressElem = document.getElementById('animationProgress');
    animationSpeedElem = document.getElementById('animationSpeed');
    animationPathElem = document.getElementById('animationPath');
    animationMarkerElem = document.getElementById('animationMarker');
    animationBondLayerElem = document.getElementById('animationBondLayer');
    animationAtomLayerElem = document.getElementById('animationAtomLayer');
    animationDipoleLayerElem = document.getElementById('animationDipoleLayer');
    animationLonePairLayerElem = document.getElementById('animationLonePairLayer');
    animationElectronLayerElem = document.getElementById('animationElectronLayer');
    viewModeBtnElem = document.getElementById('viewModeBtn');
    if (viewModeBtnElem && !viewModeBtnElem.dataset.bound) {
        viewModeBtnElem.addEventListener('click', () => {
            const nextMode = graphViewMode === '3d' ? '2d' : '3d';
            setGraphViewMode(nextMode);
        });
        viewModeBtnElem.dataset.bound = '1';
    }
    updateViewModeButton();
    bindAnimationControls();
    setAnimationProgress(0, { updateSlider: true });
    const mapContainer = document.getElementById('mynetwork');
    if (!mapContainer) {
        showStartupError('Map container is missing from the page. Reload and try again.');
        return;
    }

    // 2. Initialize 3D Graph.
    // ForceGraph3D is injected by the CDN script in index.html.
    if (typeof ForceGraph3D === 'undefined') {
        console.warn('Graph dependency failed to load (ForceGraph3D). Falling back to built-in 3D renderer.');
        setViewModeButtonAvailability(false);
        removeForceGraphRuntimeErrorGuard();
        renderFallbackMap(mapContainer);
        showDefault();
        mapBootstrapped = true;
        return;
    }

    try {
        installForceGraphRuntimeErrorGuard(mapContainer);
        let graphInstance = ForceGraph3D()(mapContainer)
            .graphData(gData)
            .backgroundColor('#000011')
            // Node styling uses built-in meshes for compatibility across runtime
            // environments that may load different Three.js instances.
            .nodeLabel(node => getNodeLabelHtml(node))
            .nodeColor('color')
            .nodeRelSize(5)
            .nodeResolution(16)
            .nodeOpacity(0.9)
            // Link Styling.
            // We differentiate structure links (very subtle) from reaction links.
            .linkWidth(link => {
                if (link.type === 'structure') return 0.5; // Thin structure lines
                return link === highlightLink ? 3 : 1;
            })
            .linkColor(link => {
                if (link.type === 'structure') return '#ffffff22'; // Very faint structure lines
                return link === highlightLink ? '#a855f7' : '#ffffff44';
            })
            .linkDirectionalArrowLength(link => (link.type === 'structure' ? 0 : 4)) // No arrows for structure
            .linkDirectionalArrowRelPos(1)
            .linkCurvature(link => (link.type === 'structure' ? 0 : 0.25)) // Straight structure lines
            .linkDirectionalParticles(link => (link.type === 'structure' ? 0 : 2)) // No particles for structure
            .linkDirectionalParticleWidth(link => (link === highlightLink ? 4 : 2))
            .linkDirectionalParticleSpeed(link => (link === highlightLink ? 0.02 : 0.002))
            // Interaction.
            // Clicking a node zooms toward it and fills in compound details;
            // clicking a link shows reaction details.
            .onNodeClick(node => {
                const distance = 40;
                const nodeX = Number(node && node.x) || 0;
                const nodeY = Number(node && node.y) || 0;
                const nodeZ = Number.isFinite(Number(node && node.z)) ? Number(node.z) : 0;
                const baselineDistance = Math.max(Math.hypot(nodeX, nodeY, nodeZ), 1);
                // Calculate a consistent camera offset so we fly toward the node without clipping it.
                const distRatio = 1 + distance / baselineDistance;
                const targetPosition = { x: nodeX, y: nodeY, z: nodeZ };

                if (graphViewMode === '2d') {
                    try {
                        // In 2D mode we avoid rotation and only pan/zoom within the flat plane.
                        const focus2DPosition = {
                            x: targetPosition.x,
                            y: targetPosition.y,
                            z: TWO_D_FOCUS_DEPTH,
                        };
                        if (Graph && typeof Graph.cameraPosition === 'function') {
                            Graph.cameraPosition(
                                focus2DPosition,
                                { x: targetPosition.x, y: targetPosition.y, z: 0 },
                                700
                            );
                        }
                    } catch (error) {
                        console.warn('2D node click focus failed; continuing with sidebar update.', error);
                    }
                    showCompound(node);
                    return;
                }

                try {
                    if (Graph && typeof Graph.cameraPosition === 'function') {
                        Graph.cameraPosition(
                            {
                                x: targetPosition.x * distRatio,
                                y: targetPosition.y * distRatio,
                                z: targetPosition.z * distRatio
                            },
                            targetPosition,
                            3000
                        );
                    }
                } catch (error) {
                    console.warn('Node click camera transition failed; continuing with sidebar update.', error);
                }
                showCompound(node);
            })
            .onLinkClick(link => {
                showReaction(link);
            });
        Graph = graphInstance;

        Graph.width(window.innerWidth);
        Graph.height(window.innerHeight);

        // Set initial camera orbit to spread nodes out for readability.
        Graph.d3Force('charge').strength(-150);
        Graph.nodeRelSize(5);
        setViewModeButtonAvailability(typeof Graph.numDimensions === 'function');
        updateViewModeButton();
        applyPersistentNodeLabels();
        Graph.cameraPosition({ x: 0, y: 0, z: 280 }, { x: 0, y: 0, z: 0 }, 0);
        showDefault();
        hideStaticPreview();
        mapBootstrapped = true;
    } catch (error) {
        console.error('Graph renderer initialization failed.', error);
        console.warn('Falling back to built-in 3D renderer.');
        setViewModeButtonAvailability(false);
        removeForceGraphRuntimeErrorGuard();
        renderFallbackMap(mapContainer);
        showDefault();
        mapBootstrapped = true;
        return;
    }

    // Handle Resize to keep the canvas filling the viewport.
    window.addEventListener('resize', () => {
        Graph.width(window.innerWidth);
        Graph.height(window.innerHeight);
    });
}

window.initMap = initMap;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap, { once: true });
} else {
    initMap();
}
window.addEventListener('load', initMap, { once: true });
})();

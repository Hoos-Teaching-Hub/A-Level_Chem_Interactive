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

function renderInfoBlocks(info = {}) {
    if (!infoWhatElem || !infoHowElem || !infoWhyElem || !infoExamTipElem) {
        return;
    }

    infoWhatElem.innerText = info.what || defaultInfo.what;
    infoHowElem.innerText = info.how || defaultInfo.how;
    infoWhyElem.innerText = info.why || defaultInfo.why;
    infoExamTipElem.innerText = info.examTip || defaultInfo.examTip;
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

function stopAnimationPlayback() {
    if (animationRafId !== null) {
        window.cancelAnimationFrame(animationRafId);
        animationRafId = null;
    }
}

function hideAnimationPanel() {
    stopAnimationPlayback();
    if (animationPanelElem) {
        animationPanelElem.classList.add('hidden');
    }
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

    animationPathLength = 0;
    if (animationPathElem && animationSpec.path) {
        try {
            animationPathLength = animationPathElem.getTotalLength();
        } catch (error) {
            console.warn('Unable to read animation path length for pathway animation.', error);
            animationPathLength = 0;
        }
    }
    setAnimationMarkerProgress(0);
    setAnimationStatus('Ready');
    return animationSpec;
}

function playAnimationSpec(animationSpec) {
    if (!animationSpec) {
        return;
    }

    const steps =
        Array.isArray(animationSpec.steps) && animationSpec.steps.length
            ? animationSpec.steps
            : ['Mechanism step preview.'];
    const durationMs =
        Number.isFinite(animationSpec.durationMs) && animationSpec.durationMs > 0
            ? animationSpec.durationMs
            : 2800;

    stopAnimationPlayback();
    setAnimationStatus('Playing');

    const startTime = performance.now();
    const tick = now => {
        const elapsed = now - startTime;
        const cycleProgress = ((elapsed % durationMs) + durationMs) / durationMs;

        setAnimationMarkerProgress(cycleProgress);
        if (animationStepElem) {
            const stepIndex = Math.min(steps.length - 1, Math.floor(cycleProgress * steps.length));
            animationStepElem.innerText = steps[stepIndex];
        }
        animationRafId = window.requestAnimationFrame(tick);
    };

    animationRafId = window.requestAnimationFrame(tick);
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
    const firstTip = Array.isArray(node.examTips) && node.examTips.length ? node.examTips[0] : null;
    renderInfoBlocks({
        what: `${node.name} belongs to ${node.topic || 'organic chemistry'}.`,
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
        Graph.cameraPosition({ x: 0, y: 0, z: 250 }, { x: 0, y: 0, z: 0 }, 1000);
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
    animationPathElem = document.getElementById('animationPath');
    animationMarkerElem = document.getElementById('animationMarker');
    const mapContainer = document.getElementById('mynetwork');
    if (!mapContainer) {
        showStartupError('Map container is missing from the page. Reload and try again.');
        return;
    }

    // 2. Initialize 3D Graph.
    // ForceGraph3D is injected by the CDN script in index.html.
    if (typeof ForceGraph3D === 'undefined') {
        console.warn('Graph dependency failed to load (ForceGraph3D). Falling back to built-in 3D renderer.');
        renderFallbackMap(mapContainer);
        showDefault();
        mapBootstrapped = true;
        return;
    }

    try {
        Graph = ForceGraph3D()(mapContainer)
            .graphData(gData)
            .backgroundColor('#000011')
            // Node styling uses built-in meshes for compatibility across runtime
            // environments that may load different Three.js instances.
            .nodeLabel('name')
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
                // Calculate a consistent camera offset so we fly toward the node without clipping it.
                const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

                Graph.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                    node,
                    3000
                );
                showCompound(node);
            })
            .onLinkClick(link => {
                showReaction(link);
            });

        Graph.width(window.innerWidth);
        Graph.height(window.innerHeight);

        // Set initial camera orbit to spread nodes out for readability.
        Graph.d3Force('charge').strength(-150);
        Graph.cameraPosition({ x: 0, y: 0, z: 280 }, { x: 0, y: 0, z: 0 }, 0);
        showDefault();
        hideStaticPreview();
        mapBootstrapped = true;
    } catch (error) {
        console.error('Graph renderer initialization failed.', error);
        console.warn('Falling back to built-in 3D renderer.');
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

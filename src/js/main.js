// --- Data Definition ---
// The graph data and descriptions are loaded via a global exposed in index.html.
// This keeps the data file separate from the rendering logic in this script.
const { gData, compoundDescriptions } = window.OrganicMapData;

// Global variables for Graph and UI state.
// These are assigned after the DOM is ready so we can reuse them in handlers.
let Graph = null;
let highlightLink = null;

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

// UI Helpers.
// These functions coordinate text, visibility, and graph styling when the user
// selects reactions or compounds.
function showDefault() {
    if (!contentArea) return;
    contentArea.style.display = 'block';
    dynamicContent.classList.add('hidden');
    highlightLink = null;
    if (Graph) Graph.linkDirectionalParticleSpeed(l => 0.002).linkWidth(1); // Reset
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

    reagentsElem.innerText = link.reagents;
    mechanismElem.innerText = link.type;

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

    // Button Logic.
    // The animation button provides a quick "pulse" to draw attention to the
    // selected reaction without permanently altering the graph.
    animateBtn.onclick = () => {
        if (!Graph) return;
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
    highlightLink = null;
    // Reset links but preserve structure link subtlety so the network stays readable.
    if (Graph) {
        Graph.linkColor(l => (l.type === 'structure' ? '#ffffff22' : '#ffffff44')).linkWidth(l =>
            l.type === 'structure' ? 0.5 : 1
        );
    }
}

// Global reset camera function.
// Exposed on `window` so the UI button in index.html can call it.
window.resetCamera = function resetCamera() {
    if (Graph) {
        Graph.cameraPosition({ x: 0, y: 0, z: 250 }, { x: 0, y: 0, z: 0 }, 1000);
    }
    showDefault();
};

// --- Main Initialization ---
// We wait for the window load event to ensure DOM nodes and external libraries
// are ready before building the graph.
window.addEventListener('load', () => {
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

    // 2. Initialize 3D Graph.
    // ForceGraph3D is injected by the CDN script in index.html.
    if (typeof ForceGraph3D === 'undefined') {
        console.error('ForceGraph3D library failed to load.');
        return;
    }

    Graph = ForceGraph3D()(document.getElementById('mynetwork'))
        .graphData(gData)
        .backgroundColor('#000011')
        // Node Styling.
        // Each node is a shaded sphere plus a text sprite so labels stay readable.
        .nodeLabel('name')
        .nodeColor('color')
        .nodeRelSize(5)
        .nodeResolution(16)
        .nodeOpacity(0.9)
        .nodeThreeObject(node => {
            const group = new THREE.Group();

            // 1. The Geometry (Sphere)
            const geometry = new THREE.SphereGeometry(Math.cbrt(node.val) * 2, 32, 32);
            const material = new THREE.MeshLambertMaterial({
                color: node.color,
                transparent: true,
                opacity: 0.9
            });
            const sphere = new THREE.Mesh(geometry, material);
            group.add(sphere);

            // 2. The Text Label (Sprite)
            const sprite = new SpriteText(node.name);
            sprite.color = node.color;
            sprite.textHeight = 3; // Size of text
            sprite.position.y = 8; // Offset above sphere
            sprite.backgroundColor = 'rgba(0,0,0,0.5)';
            sprite.padding = 2;
            sprite.borderRadius = 4;
            group.add(sprite);

            return group;
        })
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

    // Set initial camera orbit to spread nodes out for readability.
    Graph.d3Force('charge').strength(-150);

    // Handle Resize to keep the canvas filling the viewport.
    window.addEventListener('resize', () => {
        Graph.width(window.innerWidth);
        Graph.height(window.innerHeight);
    });
});

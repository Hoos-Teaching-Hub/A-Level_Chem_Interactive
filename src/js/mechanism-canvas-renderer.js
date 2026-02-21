(function initOrganicMapCanvasRenderer(globalScope) {
    const WORLD_W = 360;
    const WORLD_H = 180;
    const DEFAULT_FIT_SCOPE = 'mechanism';
    const FIT_TRANSFORM_CACHE = new Map();
    const VALIDATED_DEFINITIONS = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

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

    function toFiniteNumber(value, fallback) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    function normalizeSampleCount(sampleCount) {
        const numericSampleCount = Number(sampleCount);
        return Number.isFinite(numericSampleCount)
            ? Math.max(4, Math.min(48, Math.round(numericSampleCount)))
            : 14;
    }

    function isFinitePoint(point) {
        return point && Number.isFinite(point.x) && Number.isFinite(point.y);
    }

    function sampleCurvePoints(curve, sampleCount) {
        if (!curve) {
            return [];
        }

        const safeSampleCount = normalizeSampleCount(sampleCount);
        const points = [];

        for (let index = 0; index <= safeSampleCount; index += 1) {
            const t = index / safeSampleCount;
            points.push(cubicPoint(curve, t));
        }

        return points;
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

    function fitContain(screenW, screenH, worldW = WORLD_W, worldH = WORLD_H) {
        const safeScreenW = Math.max(1, toFiniteNumber(screenW, worldW));
        const safeScreenH = Math.max(1, toFiniteNumber(screenH, worldH));
        const safeWorldW = Math.max(1, toFiniteNumber(worldW, WORLD_W));
        const safeWorldH = Math.max(1, toFiniteNumber(worldH, WORLD_H));

        const scale = Math.min(safeScreenW / safeWorldW, safeScreenH / safeWorldH);
        const drawW = safeWorldW * scale;
        const drawH = safeWorldH * scale;
        const offsetX = (safeScreenW - drawW) / 2;
        const offsetY = (safeScreenH - drawH) / 2;

        return {
            scale,
            offsetX,
            offsetY,
            drawW,
            drawH,
        };
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
                if (!cue) return false;
                const cueStep = cue.step === null || cue.step === undefined ? -1 : Number(cue.step);
                const cueEndStep = cue.endStep === null || cue.endStep === undefined ? null : Number(cue.endStep);
                if (!Number.isFinite(cueStep) || cueStep > stepIndex) return false;
                if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) return false;
                return true;
            });
        }

        const selected = new Map();
        cues.forEach(cue => {
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

        return Array.from(selected.values()).map(cue => {
            const normalized = { ...cue };
            delete normalized._step;
            return normalized;
        });
    }

    function selectStepScopedCues(cues, stepIndex) {
        if (!Array.isArray(cues)) {
            return [];
        }

        return cues.filter(cue => {
            if (!cue) {
                return false;
            }

            const cueStep = cue.step === null || cue.step === undefined ? null : Number(cue.step);
            const cueEndStep = cue.endStep === null || cue.endStep === undefined ? null : Number(cue.endStep);

            if (cueStep === null) {
                if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) {
                    return false;
                }
                return true;
            }

            if (!Number.isFinite(cueStep) || cueStep !== stepIndex) {
                return false;
            }

            if (cueEndStep !== null && Number.isFinite(cueEndStep) && stepIndex > cueEndStep) {
                return false;
            }

            return true;
        });
    }

    function collectMechanismPoints(atoms, dipoles, lonePairs, electronMovement, options = {}) {
        const points = [];
        const safeArrowSamples = normalizeSampleCount(options.fitArrowSamples);

        const pushPoint = (x, y) => {
            const px = Number(x);
            const py = Number(y);
            if (Number.isFinite(px) && Number.isFinite(py)) {
                points.push({ x: px, y: py });
            }
        };

        atoms.forEach(atom => pushPoint(atom && atom.x, atom && atom.y));
        dipoles.forEach(cue => pushPoint(cue && cue.x, cue && cue.y));
        lonePairs.forEach(cue => pushPoint(cue && cue.x, cue && cue.y));

        electronMovement.forEach(cue => {
            const parsedCurve = parseCubicPath(cue && cue.path);
            const curve = applyArrowBend(parsedCurve, cue && cue.bend);
            if (!curve) {
                return;
            }

            sampleCurvePoints(curve, safeArrowSamples).forEach(point => {
                pushPoint(point.x, point.y);
            });
        });

        return points;
    }

    function resolveFitPadding(options) {
        const padding = Number(options && options.padding);
        const fitMargin = Number(options && options.fitMargin);
        return Number.isFinite(padding)
            ? padding
            : (Number.isFinite(fitMargin) ? fitMargin : 20);
    }

    function buildContentFitTransform(points, options) {
        if (!Array.isArray(points) || points.length < 2) {
            return null;
        }

        const viewWidth = Number(options && options.viewWidth) > 0 ? Number(options.viewWidth) : WORLD_W;
        const viewHeight = Number(options && options.viewHeight) > 0 ? Number(options.viewHeight) : WORLD_H;
        const padding = resolveFitPadding(options);
        const topInset = Number(options && options.fitTopInset);
        const bottomInset = Number(options && options.fitBottomInset);
        const minScale = Number(options && options.fitMinScale);
        const maxScale = Number(options && options.fitMaxScale);

        const safePadding = Number.isFinite(padding) ? padding : 20;
        const safeTopInset = Number.isFinite(topInset) ? topInset : 18;
        const safeBottomInset = Number.isFinite(bottomInset) ? bottomInset : 22;
        const safeMinScale = Number.isFinite(minScale) ? minScale : 0.75;
        const safeMaxScale = Number.isFinite(maxScale) ? maxScale : 2.4;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        points.forEach(point => {
            if (!isFinitePoint(point)) {
                return;
            }
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
            return null;
        }

        const contentWidth = Math.max(1, maxX - minX);
        const contentHeight = Math.max(1, maxY - minY);
        const availableWidth = Math.max(1, viewWidth - safePadding * 2);
        const availableHeight = Math.max(1, viewHeight - safeTopInset - safeBottomInset);

        const rawScale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
        const scale = Math.max(safeMinScale, Math.min(safeMaxScale, rawScale));
        const drawW = contentWidth * scale;
        const drawH = contentHeight * scale;

        const offsetX = safePadding + (availableWidth - drawW) / 2 - minX * scale;
        const offsetY = safeTopInset + (availableHeight - drawH) / 2 - minY * scale;

        return {
            scale,
            offsetX,
            offsetY,
        };
    }

    function getCueRegistryMap(animationSpec) {
        if (!animationSpec || typeof animationSpec !== 'object') {
            return new Map();
        }

        const registry = animationSpec.cueRegistry || animationSpec.cues;
        if (!registry) {
            return new Map();
        }

        if (Array.isArray(registry)) {
            const map = new Map();
            registry.forEach(entry => {
                if (!entry || typeof entry !== 'object') return;
                const cueId = typeof entry.id === 'string' ? entry.id.trim() : '';
                if (cueId) {
                    map.set(cueId, entry);
                }
            });
            return map;
        }

        if (typeof registry === 'object') {
            return new Map(Object.keys(registry).map(key => [key, registry[key]]));
        }

        return new Map();
    }

    function collectStepCueIds(animationSpec) {
        const ids = [];

        if (Array.isArray(animationSpec && animationSpec.stepCueIds)) {
            animationSpec.stepCueIds.forEach(entry => {
                if (Array.isArray(entry)) {
                    entry.forEach(value => {
                        if (typeof value === 'string' && value.trim()) {
                            ids.push(value.trim());
                        }
                    });
                    return;
                }

                if (typeof entry === 'string' && entry.trim()) {
                    ids.push(entry.trim());
                }
            });
        }

        const steps = Array.isArray(animationSpec && animationSpec.steps) ? animationSpec.steps : [];
        steps.forEach(step => {
            if (!step || typeof step !== 'object' || Array.isArray(step)) {
                return;
            }

            if (Array.isArray(step.cueIds)) {
                step.cueIds.forEach(cueId => {
                    if (typeof cueId === 'string' && cueId.trim()) {
                        ids.push(cueId.trim());
                    }
                });
            }

            if (typeof step.cueId === 'string' && step.cueId.trim()) {
                ids.push(step.cueId.trim());
            }
        });

        return ids;
    }

    function assertFiniteCueCoordinates(cues, label, errors) {
        if (!Array.isArray(cues)) {
            return;
        }

        cues.forEach((cue, index) => {
            if (!cue || typeof cue !== 'object') {
                return;
            }
            const x = Number(cue.x);
            const y = Number(cue.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                errors.push(`${label}[${index}] has invalid coordinates (${cue.x}, ${cue.y}).`);
            }
        });
    }

    function toBondKey(from, to) {
        return [String(from || ''), String(to || '')].sort().join('|');
    }

    function hasBondInState(stepState, from, to, order) {
        if (!stepState || !Array.isArray(stepState.bonds)) {
            return false;
        }
        const expectedKey = toBondKey(from, to);
        return stepState.bonds.some(bond => {
            if (!bond || typeof bond !== 'object') {
                return false;
            }
            if (toBondKey(bond.from, bond.to) !== expectedKey) {
                return false;
            }
            if (order === undefined || order === null) {
                return true;
            }
            const numericOrder = Number(order);
            return Number.isFinite(numericOrder) && Number(bond.order || 1) === numericOrder;
        });
    }

    function getAtomInState(stepState, atomId) {
        if (!stepState || !Array.isArray(stepState.atoms)) {
            return null;
        }
        const expectedId = String(atomId || '').trim();
        if (!expectedId) {
            return null;
        }
        return stepState.atoms.find(atom => atom && String(atom.id || '').trim() === expectedId) || null;
    }

    function findArrowInStateByLabel(stepState, label) {
        if (!stepState || !Array.isArray(stepState.electronMovement)) {
            return null;
        }
        const expectedLabel = String(label || '').trim();
        if (!expectedLabel) {
            return null;
        }
        return (
            stepState.electronMovement.find(arrow => {
                if (!arrow || typeof arrow !== 'object') {
                    return false;
                }
                return String(arrow.label || '').trim() === expectedLabel;
            }) || null
        );
    }

    function resolveStepState(stepStates, stepIndex) {
        if (!Array.isArray(stepStates) || stepStates.length === 0) {
            return null;
        }
        if (!Number.isInteger(stepIndex)) {
            return null;
        }
        if (stepIndex < 0 || stepIndex >= stepStates.length) {
            return null;
        }
        return stepStates[stepIndex];
    }

    function validateStepSemantics(animationSpec, atomIdSet, errors) {
        const steps = Array.isArray(animationSpec.steps) ? animationSpec.steps : [];
        const stepCount = Math.max(steps.length, 1);
        const semantics = animationSpec.stepSemantics;

        if (semantics === undefined || semantics === null) {
            return;
        }

        if (!Array.isArray(semantics)) {
            errors.push('stepSemantics must be an array when provided.');
            return;
        }

        if (semantics.length !== stepCount) {
            errors.push(`stepSemantics length (${semantics.length}) must match steps length (${stepCount}).`);
            return;
        }

        // Step scenes are reused for semantic validation to avoid validator/render divergence.
        const stepStates = [];
        for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
            stepStates.push(buildStepScene(animationSpec, stepIndex, { strictStepCues: false }));
        }

        semantics.forEach((stepSemantics, stepIndex) => {
            if (!stepSemantics) {
                return;
            }
            if (typeof stepSemantics !== 'object' || Array.isArray(stepSemantics)) {
                errors.push(`stepSemantics[${stepIndex}] must be an object.`);
                return;
            }

            const events = Array.isArray(stepSemantics.events) ? stepSemantics.events : [];
            events.forEach((event, eventIndex) => {
                if (!event || typeof event !== 'object' || Array.isArray(event)) {
                    errors.push(`stepSemantics[${stepIndex}].events[${eventIndex}] must be an object.`);
                    return;
                }

                const type = String(event.type || '').trim();
                if (!type) {
                    errors.push(`stepSemantics[${stepIndex}].events[${eventIndex}] is missing event type.`);
                    return;
                }

                const prevState = resolveStepState(stepStates, stepIndex - 1);
                const currentState = resolveStepState(stepStates, stepIndex);
                const nextState = resolveStepState(stepStates, stepIndex + 1);

                if (type === 'bondBreak') {
                    const from = String(event.from || '').trim();
                    const to = String(event.to || '').trim();
                    const order = event.order;
                    if (!from || !to) {
                        errors.push(`bondBreak event at step ${stepIndex} must include from/to atom ids.`);
                        return;
                    }
                    if (!atomIdSet.has(from) || !atomIdSet.has(to)) {
                        errors.push(`bondBreak event at step ${stepIndex} references unknown atoms (${from} -> ${to}).`);
                        return;
                    }
                    const existedBeforeOrAt =
                        hasBondInState(currentState, from, to, order) ||
                        hasBondInState(prevState, from, to, order);
                    const stillExistsAfter = hasBondInState(nextState, from, to, order);
                    if (!existedBeforeOrAt) {
                        errors.push(`bondBreak event at step ${stepIndex} does not match any existing bond (${from}-${to}).`);
                    }
                    if (stillExistsAfter) {
                        errors.push(`bondBreak event at step ${stepIndex} still appears in a later step (${from}-${to}).`);
                    }
                    return;
                }

                if (type === 'bondForm') {
                    const from = String(event.from || '').trim();
                    const to = String(event.to || '').trim();
                    const order = event.order;
                    if (!from || !to) {
                        errors.push(`bondForm event at step ${stepIndex} must include from/to atom ids.`);
                        return;
                    }
                    if (!atomIdSet.has(from) || !atomIdSet.has(to)) {
                        errors.push(`bondForm event at step ${stepIndex} references unknown atoms (${from} -> ${to}).`);
                        return;
                    }
                    const existedBefore = hasBondInState(prevState, from, to, order);
                    const existsAtOrAfter =
                        hasBondInState(currentState, from, to, order) ||
                        hasBondInState(nextState, from, to, order);
                    if (!existsAtOrAfter) {
                        errors.push(`bondForm event at step ${stepIndex} does not appear in this or next step (${from}-${to}).`);
                    }
                    if (existedBefore && !event.allowPreexisting) {
                        errors.push(
                            `bondForm event at step ${stepIndex} was already present in the previous step (${from}-${to}).`,
                        );
                    }
                    return;
                }

                if (type === 'chargeSet') {
                    const atomId = String(event.atomId || '').trim();
                    const expectedCharge = Number(event.charge);
                    if (!atomId) {
                        errors.push(`chargeSet event at step ${stepIndex} must include atomId.`);
                        return;
                    }
                    if (!atomIdSet.has(atomId)) {
                        errors.push(`chargeSet event at step ${stepIndex} references unknown atom "${atomId}".`);
                        return;
                    }
                    if (!Number.isFinite(expectedCharge)) {
                        errors.push(`chargeSet event at step ${stepIndex} has non-finite charge "${event.charge}".`);
                        return;
                    }
                    const atomNow = getAtomInState(currentState, atomId);
                    const atomNext = getAtomInState(nextState, atomId);
                    const chargeNow = atomNow ? Number(atomNow.charge || 0) : null;
                    const chargeNext = atomNext ? Number(atomNext.charge || 0) : null;
                    const matchesNow = chargeNow !== null && Math.abs(chargeNow - expectedCharge) < 0.001;
                    const matchesNext = chargeNext !== null && Math.abs(chargeNext - expectedCharge) < 0.001;
                    if (!matchesNow && !matchesNext) {
                        errors.push(
                            `chargeSet event at step ${stepIndex} expects ${atomId}=${expectedCharge}, but step charges are ${chargeNow} and ${chargeNext}.`,
                        );
                    }
                    return;
                }

                if (type === 'arrow') {
                    const label = String(event.label || '').trim();
                    if (!label) {
                        errors.push(`arrow event at step ${stepIndex} must include arrow label.`);
                        return;
                    }
                    const arrow = findArrowInStateByLabel(currentState, label);
                    if (!arrow) {
                        errors.push(`arrow event at step ${stepIndex} cannot find electronMovement label "${label}".`);
                        return;
                    }
                    if (event.arrowType === 'fishhook' || event.arrowType === 'pair') {
                        const expectFishhook = event.arrowType === 'fishhook';
                        const isFishhook = arrow.fishhook === true;
                        if (isFishhook !== expectFishhook) {
                            errors.push(
                                `arrow event at step ${stepIndex} expects "${label}" to be ${event.arrowType}, but got ${isFishhook ? 'fishhook' : 'pair'}.`,
                            );
                        }
                    }
                    return;
                }

                if (type === 'intermediate') {
                    const species = String(event.species || '').trim();
                    const atomId = String(event.atomId || '').trim();
                    if (species === 'carbocation') {
                        const atom = getAtomInState(currentState, atomId);
                        if (!atom || Number(atom.charge || 0) <= 0) {
                            errors.push(`intermediate event at step ${stepIndex} expects carbocation on atom "${atomId}".`);
                        }
                    }
                    return;
                }

                if (type === 'role') {
                    const atomId = String(event.atomId || '').trim();
                    if (atomId && !atomIdSet.has(atomId)) {
                        errors.push(`role event at step ${stepIndex} references unknown atom "${atomId}".`);
                    }
                    return;
                }

                errors.push(`stepSemantics[${stepIndex}].events[${eventIndex}] has unknown type "${type}".`);
            });
        });
    }

    function validateMechanismDefinition(animationSpec, options = {}) {
        if (!animationSpec || typeof animationSpec !== 'object') {
            throw new Error('Mechanism definition must be an object.');
        }

        const mechanismLabel =
            (typeof animationSpec.id === 'string' && animationSpec.id.trim()) ||
            (typeof options.mechanismId === 'string' && options.mechanismId.trim()) ||
            'unknown-mechanism';

        if (VALIDATED_DEFINITIONS && VALIDATED_DEFINITIONS.has(animationSpec)) {
            return true;
        }

        const errors = [];
        const atoms = Array.isArray(animationSpec.atoms) ? animationSpec.atoms : [];
        const bonds = Array.isArray(animationSpec.bonds) ? animationSpec.bonds : [];
        const electronMovement = Array.isArray(animationSpec.electronMovement) ? animationSpec.electronMovement : [];
        const dipoles = Array.isArray(animationSpec.dipoles) ? animationSpec.dipoles : [];
        const lonePairs = Array.isArray(animationSpec.lonePairs) ? animationSpec.lonePairs : [];

        const atomIdSet = new Set();
        atoms.forEach((atom, index) => {
            if (!atom || typeof atom !== 'object') {
                errors.push(`atoms[${index}] is not a valid object.`);
                return;
            }
            const atomId = typeof atom.id === 'string' ? atom.id.trim() : '';
            if (!atomId) {
                errors.push(`atoms[${index}] is missing a valid id.`);
                return;
            }
            atomIdSet.add(atomId);

            const x = Number(atom.x);
            const y = Number(atom.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                errors.push(`atoms[${index}] (${atomId}) has invalid coordinates (${atom.x}, ${atom.y}).`);
            }
        });

        bonds.forEach((bond, index) => {
            if (!bond || typeof bond !== 'object') {
                errors.push(`bonds[${index}] is not a valid object.`);
                return;
            }
            const fromId = typeof bond.from === 'string' ? bond.from.trim() : '';
            const toId = typeof bond.to === 'string' ? bond.to.trim() : '';
            if (!fromId || !toId) {
                errors.push(`bonds[${index}] is missing from/to ids.`);
                return;
            }
            if (!atomIdSet.has(fromId) || !atomIdSet.has(toId)) {
                errors.push(`bonds[${index}] references unknown atoms (${fromId} -> ${toId}).`);
            }
        });

        assertFiniteCueCoordinates(dipoles, 'dipoles', errors);
        assertFiniteCueCoordinates(lonePairs, 'lonePairs', errors);

        electronMovement.forEach((arrow, index) => {
            if (!arrow || typeof arrow !== 'object') {
                errors.push(`electronMovement[${index}] is not a valid object.`);
                return;
            }

            const parsed = parseCubicPath(arrow.path);
            const curve = applyArrowBend(parsed, arrow.bend);
            if (!curve) {
                errors.push(`electronMovement[${index}] has an invalid cubic path.`);
                return;
            }

            const endpointFields = ['x0', 'y0', 'x3', 'y3'];
            endpointFields.forEach(field => {
                if (!Number.isFinite(curve[field])) {
                    errors.push(`electronMovement[${index}] has non-finite ${field}.`);
                }
            });

            if (typeof arrow.fromAtomId === 'string' && arrow.fromAtomId.trim() && !atomIdSet.has(arrow.fromAtomId.trim())) {
                errors.push(`electronMovement[${index}] fromAtomId "${arrow.fromAtomId}" does not exist.`);
            }
            if (typeof arrow.toAtomId === 'string' && arrow.toAtomId.trim() && !atomIdSet.has(arrow.toAtomId.trim())) {
                errors.push(`electronMovement[${index}] toAtomId "${arrow.toAtomId}" does not exist.`);
            }
        });

        const cueRegistry = getCueRegistryMap(animationSpec);
        const stepCueIds = collectStepCueIds(animationSpec);
        if (stepCueIds.length > 0) {
            if (cueRegistry.size === 0) {
                errors.push('step cue ids are defined but cue registry is missing.');
            } else {
                stepCueIds.forEach(cueId => {
                    if (!cueRegistry.has(cueId)) {
                        errors.push(`step cue id "${cueId}" is missing from cue registry.`);
                    }
                });
            }
        }

        validateStepSemantics(animationSpec, atomIdSet, errors);

        if (errors.length > 0) {
            throw new Error(
                `[OrganicMapCanvasRenderer] Invalid mechanism definition "${mechanismLabel}": ${errors.join(' ')}`,
            );
        }

        if (VALIDATED_DEFINITIONS) {
            VALIDATED_DEFINITIONS.add(animationSpec);
        }

        return true;
    }

    function shouldValidateDefinition(options = {}) {
        if (options.validateDefinition === true || options.devValidateDefinition === true) {
            return true;
        }
        if (options.validateDefinition === false || options.devValidateDefinition === false) {
            return false;
        }

        if (typeof process !== 'undefined' && process && process.env) {
            if (process.env.NODE_ENV === 'production') {
                return false;
            }
            return true;
        }

        if (typeof window !== 'undefined' && window.location) {
            const host = String(window.location.hostname || '').toLowerCase();
            return host === '' || host === 'localhost' || host === '127.0.0.1';
        }

        return false;
    }

    function resolveMechanismId(animationSpec, options = {}) {
        if (typeof options.mechanismId === 'string' && options.mechanismId.trim()) {
            return options.mechanismId.trim();
        }
        if (typeof animationSpec.id === 'string' && animationSpec.id.trim()) {
            return animationSpec.id.trim();
        }
        if (typeof animationSpec.animationId === 'string' && animationSpec.animationId.trim()) {
            return animationSpec.animationId.trim();
        }
        if (typeof animationSpec.title === 'string' && animationSpec.title.trim()) {
            return animationSpec.title.trim();
        }
        return 'unknown-mechanism';
    }

    function buildStepScene(animationSpec, stepIndex, options = {}) {
        const atoms = selectCueByStep(animationSpec.atoms, stepIndex, atom => atom.id);
        const bonds = selectCueByStep(animationSpec.bonds, stepIndex, bond => [bond.from, bond.to].sort().join('|'));
        const dipoles =
            options.strictStepCues === true
                ? selectStepScopedCues(animationSpec.dipoles, stepIndex)
                : selectCueByStep(animationSpec.dipoles, stepIndex);
        const lonePairs =
            options.strictStepCues === true
                ? selectStepScopedCues(animationSpec.lonePairs, stepIndex)
                : selectCueByStep(animationSpec.lonePairs, stepIndex);
        const electronMovement = selectCueByStep(animationSpec.electronMovement, stepIndex).filter(
            cue => cue && cue.step !== null && cue.step !== undefined && Number(cue.step) === stepIndex,
        );

        return {
            atoms,
            bonds,
            dipoles,
            lonePairs,
            electronMovement,
        };
    }

    function collectScopePoints(animationSpec, stepIndex, options = {}) {
        const fitScope = options.fitScope === 'step' ? 'step' : DEFAULT_FIT_SCOPE;

        if (fitScope === 'step') {
            const scene = buildStepScene(animationSpec, stepIndex, options);
            return collectMechanismPoints(
                scene.atoms,
                scene.dipoles,
                scene.lonePairs,
                scene.electronMovement,
                options,
            );
        }

        const steps = Array.isArray(animationSpec && animationSpec.steps) ? animationSpec.steps : [];
        const stepCount = Math.max(steps.length, 1);
        const points = [];

        for (let cursor = 0; cursor < stepCount; cursor += 1) {
            const scene = buildStepScene(animationSpec, cursor, options);
            const scenePoints = collectMechanismPoints(
                scene.atoms,
                scene.dipoles,
                scene.lonePairs,
                scene.electronMovement,
                options,
            );
            points.push(...scenePoints);
        }

        return points;
    }

    function buildFitCacheKey(animationSpec, options = {}) {
        const mechanismId = resolveMechanismId(animationSpec, options);
        const fitToContent = options.fitToContent === true;
        const preserveAspect = options.preserveAspect !== false;
        const padding = resolveFitPadding(options);
        const fitScope = options.fitScope === 'step' ? 'step' : DEFAULT_FIT_SCOPE;

        return [
            mechanismId,
            `fit:${fitToContent ? 1 : 0}`,
            `aspect:${preserveAspect ? 1 : 0}`,
            `padding:${padding}`,
            `scope:${fitScope}`,
        ].join('|');
    }

    function resolveContentFitTransform(animationSpec, stepIndex, viewWidth, viewHeight, options = {}) {
        if (options.fitToContent !== true) {
            return null;
        }

        const fitScope = options.fitScope === 'step' ? 'step' : DEFAULT_FIT_SCOPE;
        const fitOptions = {
            ...options,
            viewWidth,
            viewHeight,
        };

        if (fitScope === 'step') {
            const stepPoints = collectScopePoints(animationSpec, stepIndex, { ...options, fitScope: 'step' });
            return buildContentFitTransform(stepPoints, fitOptions);
        }

        const cacheKey = buildFitCacheKey(animationSpec, options);
        if (FIT_TRANSFORM_CACHE.has(cacheKey)) {
            return FIT_TRANSFORM_CACHE.get(cacheKey);
        }

        const mechanismPoints = collectScopePoints(animationSpec, stepIndex, { ...options, fitScope: 'mechanism' });
        const transform = buildContentFitTransform(mechanismPoints, fitOptions);
        FIT_TRANSFORM_CACHE.set(cacheKey, transform);
        return transform;
    }

    function clearCanvasWithIdentityTransform(ctx, canvasState) {
        const pixelWidth = Math.max(
            1,
            Math.round(
                Number(canvasState && canvasState.pixelWidth) ||
                    Number(canvasState && canvasState.width) * (Number(canvasState && canvasState.dpr) || 1) ||
                    1,
            ),
        );
        const pixelHeight = Math.max(
            1,
            Math.round(
                Number(canvasState && canvasState.pixelHeight) ||
                    Number(canvasState && canvasState.height) * (Number(canvasState && canvasState.dpr) || 1) ||
                    1,
            ),
        );

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pixelWidth, pixelHeight);
        ctx.restore();
    }

    function resolveViewportTransform(width, height, viewWidth, viewHeight, options = {}) {
        const stretchToFill = options.stretchToFill === true;

        if (stretchToFill) {
            return {
                scaleX: Math.max(0.0001, width / viewWidth),
                scaleY: Math.max(0.0001, height / viewHeight),
                offsetX: 0,
                offsetY: 0,
            };
        }

        const contain = fitContain(width, height, viewWidth, viewHeight);
        return {
            scaleX: contain.scale,
            scaleY: contain.scale,
            offsetX: contain.offsetX,
            offsetY: contain.offsetY,
        };
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

    function drawMechanismCanvasFrame(animationSpec, progressRatio, options = {}) {
        const syncCanvas = typeof options.syncCanvas === 'function' ? options.syncCanvas : null;
        if (!syncCanvas || !animationSpec) {
            return null;
        }

        if (shouldValidateDefinition(options)) {
            validateMechanismDefinition(animationSpec, {
                mechanismId: resolveMechanismId(animationSpec, options),
            });
        }

        const canvasState = syncCanvas();
        if (!canvasState) {
            return null;
        }

        const { ctx, width, height } = canvasState;
        const viewWidth = Number(options.viewWidth) > 0 ? Number(options.viewWidth) : WORLD_W;
        const viewHeight = Number(options.viewHeight) > 0 ? Number(options.viewHeight) : WORLD_H;

        clearCanvasWithIdentityTransform(ctx, canvasState);

        const viewport = resolveViewportTransform(width, height, viewWidth, viewHeight, options);

        const stepIndex = getActiveStepIndex(animationSpec, progressRatio);
        const stepCount = Math.max((animationSpec.steps || []).length, 1);
        const scaled = Math.max(0, Math.min(1, progressRatio)) * stepCount;
        const stepProgress = Math.max(0, Math.min(1, scaled - stepIndex));

        const scene = buildStepScene(animationSpec, stepIndex, options);
        const atoms = scene.atoms;
        const bonds = scene.bonds;
        const dipoles = scene.dipoles;
        const lonePairs = scene.lonePairs;
        const electronMovement = scene.electronMovement;

        const atomById = new Map(atoms.map(atom => [atom.id, atom]));

        const fitTransform = resolveContentFitTransform(
            animationSpec,
            stepIndex,
            viewWidth,
            viewHeight,
            options,
        );

        ctx.save();
        ctx.translate(viewport.offsetX, viewport.offsetY);
        ctx.scale(viewport.scaleX, viewport.scaleY);

        const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
        gradient.addColorStop(0, '#020617');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, viewWidth, viewHeight);

        ctx.save();
        if (fitTransform) {
            ctx.translate(fitTransform.offsetX, fitTransform.offsetY);
            ctx.scale(fitTransform.scale, fitTransform.scale);
        }

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

        ctx.restore();

        if (options.drawStepBadge !== false) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
            ctx.font = '600 8px "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Step ${stepIndex + 1}/${stepCount}`, 10, 12);
        }

        ctx.restore();

        return {
            stepIndex,
            stepCount,
            stepProgress,
            atoms,
            bonds,
            dipoles,
            lonePairs,
            electronMovement,
            fitTransform,
            viewport,
        };
    }

    function clearFitTransformCache() {
        FIT_TRANSFORM_CACHE.clear();
    }

    const organicMapCanvasRenderer = {
        WORLD_W,
        WORLD_H,
        parseCubicPath,
        cubicPoint,
        cubicTangent,
        sampleCurvePoints,
        clampArrowBend,
        applyArrowBend,
        fitContain,
        getActiveStepIndex,
        selectCueByStep,
        collectMechanismPoints,
        buildContentFitTransform,
        validateMechanismDefinition,
        clearFitTransformCache,
        drawCanvasBond,
        drawCanvasAtom,
        drawCanvasDipole,
        drawCanvasLonePair,
        drawCanvasArrow,
        drawMechanismCanvasFrame,
    };

    if (typeof window !== 'undefined') {
        window.OrganicMapCanvasRenderer = organicMapCanvasRenderer;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = organicMapCanvasRenderer;
    }

    if (globalScope && typeof globalScope === 'object') {
        globalScope.OrganicMapCanvasRenderer = organicMapCanvasRenderer;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);

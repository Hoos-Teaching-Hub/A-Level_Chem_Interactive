(function initOrganicMapCanvasRenderer(globalScope) {
    const DEFAULT_VIEW_WIDTH = 360;
    const DEFAULT_VIEW_HEIGHT = 180;

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

    function sampleCurvePoints(curve, sampleCount) {
        if (!curve) {
            return [];
        }
        const numericSampleCount = Number(sampleCount);
        const safeSampleCount = Number.isFinite(numericSampleCount)
            ? Math.max(4, Math.min(48, Math.round(numericSampleCount)))
            : 14;
        const points = [];

        for (let index = 0; index <= safeSampleCount; index += 1) {
            const t = index / safeSampleCount;
            const point = cubicPoint(curve, t);
            points.push(point);
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
        const fitArrowSamples = Number(options.fitArrowSamples);
        const safeArrowSamples = Number.isFinite(fitArrowSamples)
            ? Math.max(4, Math.min(48, Math.round(fitArrowSamples)))
            : 14;

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

    function buildContentFitTransform(points, options) {
        if (!Array.isArray(points) || points.length < 2) {
            return null;
        }

        const viewWidth = Number(options && options.viewWidth) > 0 ? Number(options.viewWidth) : DEFAULT_VIEW_WIDTH;
        const viewHeight = Number(options && options.viewHeight) > 0 ? Number(options.viewHeight) : DEFAULT_VIEW_HEIGHT;
        const margin = Number(options && options.fitMargin);
        const topInset = Number(options && options.fitTopInset);
        const bottomInset = Number(options && options.fitBottomInset);
        const minScale = Number(options && options.fitMinScale);
        const maxScale = Number(options && options.fitMaxScale);

        const safeMargin = Number.isFinite(margin) ? margin : 20;
        const safeTopInset = Number.isFinite(topInset) ? topInset : 18;
        const safeBottomInset = Number.isFinite(bottomInset) ? bottomInset : 22;
        const safeMinScale = Number.isFinite(minScale) ? minScale : 0.75;
        const safeMaxScale = Number.isFinite(maxScale) ? maxScale : 2.4;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        points.forEach(point => {
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
        const availableWidth = Math.max(1, viewWidth - safeMargin * 2);
        const availableHeight = Math.max(1, viewHeight - safeTopInset - safeBottomInset);

        const rawScale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
        const boundedScale = Math.max(safeMinScale, Math.min(safeMaxScale, rawScale));

        const targetWidth = contentWidth * boundedScale;
        const targetHeight = contentHeight * boundedScale;
        const offsetX = safeMargin + (availableWidth - targetWidth) / 2 - minX * boundedScale;
        const offsetY = safeTopInset + (availableHeight - targetHeight) / 2 - minY * boundedScale;

        return {
            scale: boundedScale,
            offsetX,
            offsetY,
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

        const canvasState = syncCanvas();
        if (!canvasState) {
            return null;
        }

        const { ctx, width, height } = canvasState;
        const viewWidth = Number(options.viewWidth) > 0 ? Number(options.viewWidth) : DEFAULT_VIEW_WIDTH;
        const viewHeight = Number(options.viewHeight) > 0 ? Number(options.viewHeight) : DEFAULT_VIEW_HEIGHT;
        const preserveAspect = options.preserveAspect === true;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        if (preserveAspect) {
            const scale = Math.min(width / viewWidth, height / viewHeight);
            const offsetX = (width - viewWidth * scale) / 2;
            const offsetY = (height - viewHeight * scale) / 2;
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
        } else {
            ctx.scale(width / viewWidth, height / viewHeight);
        }

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

        const atomById = new Map(atoms.map(atom => [atom.id, atom]));

        const fitTransform =
            options.fitToContent === true
                ? buildContentFitTransform(
                      collectMechanismPoints(atoms, dipoles, lonePairs, electronMovement),
                      {
                          ...options,
                          viewWidth,
                          viewHeight,
                      },
                  )
                : null;

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
        };
    }

    const organicMapCanvasRenderer = {
        parseCubicPath,
        cubicPoint,
        cubicTangent,
        sampleCurvePoints,
        clampArrowBend,
        applyArrowBend,
        getActiveStepIndex,
        selectCueByStep,
        collectMechanismPoints,
        buildContentFitTransform,
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

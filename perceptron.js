// ── Configuration ──
// Change GRID_SIZE to any integer (4, 5, 6, …) for an NxN perceptron.
const GRID_SIZE = 4;
const NUM_INPUTS = GRID_SIZE * GRID_SIZE;
const WEIGHT_MIN = -30;
const WEIGHT_MAX = 30;

// ── Logical (CSS) sizes for canvases ──
const KNOB_SIZE = 40;
const BIAS_KNOB_SIZE = 48;
const METER_CSS_WIDTH = 188;
const METER_CSS_HEIGHT = 154;

// ── Derived meter geometry (in logical/CSS pixels) ──
const METER_CX = 94;
const METER_PIVOT_Y = 136;
const METER_SCALE_RADIUS = 74;
const METER_NEEDLE_RADIUS = 68;
const METER_ARC_START = 200 * Math.PI / 180;
const METER_ARC_END   = 340 * Math.PI / 180;

// ── State ──
const inputs  = new Array(NUM_INPUTS).fill(0);
const weights = new Array(NUM_INPUTS).fill(0);
let bias = 0;
let learningRate = 1;
let targetOutput  = 0.5;
let currentOutput = 0.5;

// ── Canvas resolution tracking ──
// The current pixel ratio used for all canvas backing stores.
// Updated on resize so canvases stay crisp at any zoom level.
let canvasPixelRatio = window.devicePixelRatio || 1;

// Prepare a canvas for hi-dpi rendering: set its backing store to
// cssW * ratio × cssH * ratio, fix its CSS display size, and apply
// a ctx.scale() so all subsequent drawing uses CSS-pixel coordinates.
function prepareHiDpiCanvas(canvas, cssW, cssH) {
  const r = canvasPixelRatio;
  canvas.width  = Math.round(cssW * r);
  canvas.height = Math.round(cssH * r);
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(r, 0, 0, r, 0, 0);
  return ctx;
}

// ── Knob arc geometry ──
const ARC_START = 135 * Math.PI / 180;
const ARC_TOTAL = 270 * Math.PI / 180;
const ARC_MID   = ARC_START + ARC_TOTAL / 2;

function valueToAngle(value) {
  return ARC_START + ((value - WEIGHT_MIN) / (WEIGHT_MAX - WEIGHT_MIN)) * ARC_TOTAL;
}

// ── Compute ──
function compute() {
  let sum = bias;
  for (let i = 0; i < NUM_INPUTS; i++) {
    sum += inputs[i] * weights[i];
  }
  targetOutput = 1 / (1 + Math.exp(-sum / 100));
  document.getElementById('weightedSumDisplay').textContent = sum.toFixed(1);
  document.getElementById('outputDisplay').textContent = targetOutput.toFixed(3);
}

// ── Knob Rendering ──
// Draws into CSS-pixel coordinate space (prepareHiDpiCanvas handles scaling).
function drawKnob(canvas, value) {
  const cssW = parseFloat(canvas.style.width);
  const cssH = parseFloat(canvas.style.height);
  const ctx = prepareHiDpiCanvas(canvas, cssW, cssH);
  const W = cssW, H = cssH;
  const cx = W / 2, cy = H / 2;
  const outerRadius = Math.min(W, H) / 2 - 1.5;
  const innerRadius = outerRadius - 9;

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  const outerGradient = ctx.createRadialGradient(cx - outerRadius * 0.35, cy - outerRadius * 0.35, 1, cx, cy, outerRadius);
  outerGradient.addColorStop(0, '#4e4e4e');
  outerGradient.addColorStop(1, '#1c1c1c');
  ctx.fillStyle = outerGradient;
  ctx.fill();
  ctx.strokeStyle = '#545454';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Tick marks (7 ticks around the arc)
  for (let t = 0; t < 7; t++) {
    const angle = ARC_START + (t / 6) * ARC_TOTAL;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx + cos * (outerRadius - 1.5), cy + sin * (outerRadius - 1.5));
    ctx.lineTo(cx + cos * (outerRadius - 5.5), cy + sin * (outerRadius - 5.5));
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Value arc (colored sweep showing current value)
  const valueAngle = valueToAngle(value);
  if (Math.abs(value) > 0.3) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius - 3.5, Math.min(ARC_MID, valueAngle), Math.max(ARC_MID, valueAngle));
    ctx.strokeStyle = value > 0 ? 'rgba(224,85,32,.8)' : 'rgba(61,136,255,.8)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Inner disc
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  const innerGradient = ctx.createRadialGradient(cx - innerRadius * 0.4, cy - innerRadius * 0.3, 1, cx, cy, innerRadius);
  innerGradient.addColorStop(0, '#525252');
  innerGradient.addColorStop(0.5, '#2c2c2c');
  innerGradient.addColorStop(1, '#0e0e0e');
  ctx.fillStyle = innerGradient;
  ctx.fill();
  ctx.strokeStyle = '#3c3c3c';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Grip knurling
  for (let k = 0; k < 22; k++) {
    const angle = (k / 22) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (innerRadius - 1), cy + Math.sin(angle) * (innerRadius - 1));
    ctx.lineTo(cx + Math.cos(angle) * (innerRadius - 3.5), cy + Math.sin(angle) * (innerRadius - 3.5));
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Pointer line
  const pointerColor = value > 0.3 ? '#e05520' : value < -0.3 ? '#3d8fff' : '#666';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(valueAngle) * 3, cy + Math.sin(valueAngle) * 3);
  ctx.lineTo(cx + Math.cos(valueAngle) * (innerRadius - 3), cy + Math.sin(valueAngle) * (innerRadius - 3));
  ctx.strokeStyle = pointerColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ── Knob Value Display ──
function setValueDisplay(element, value) {
  element.textContent = (value >= 0 ? '+' : '') + value.toFixed(0);
  element.className = 'knob-value' + (value > 0.3 ? ' positive' : value < -0.3 ? ' negative' : '');
}

// ── Knob Interaction (drag, double-click, scroll wheel) ──
function attachKnob(canvas, getValue, setValue, valueElement, options) {
  const snap = (options && options.snap) || 0.5;
  const scrollStep = (options && options.scrollStep) || 5;
  drawKnob(canvas, getValue());

  let dragging = false, startY = 0, startValue = 0;

  function beginDrag(y) {
    dragging = true;
    startY = y;
    startValue = getValue();
  }

  function onDrag(y) {
    if (!dragging) return;
    const raw = startValue + (startY - y) * 0.4;
    const newValue = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, Math.round(raw / snap) * snap));
    setValue(newValue);
    drawKnob(canvas, newValue);
    setValueDisplay(valueElement, newValue);
    compute();
  }

  function endDrag() {
    dragging = false;
  }

  // Mouse drag
  canvas.addEventListener('mousedown', e => { beginDrag(e.clientY); e.preventDefault(); });
  window.addEventListener('mousemove', e => onDrag(e.clientY));
  window.addEventListener('mouseup', endDrag);

  // Touch drag
  canvas.addEventListener('touchstart', e => { beginDrag(e.touches[0].clientY); e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', e => { if (dragging) { onDrag(e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
  window.addEventListener('touchend', endDrag);

  // Scroll wheel
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const step = e.deltaY > 0 ? -scrollStep : scrollStep;
    const newValue = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, getValue() + step));
    setValue(newValue);
    drawKnob(canvas, newValue);
    setValueDisplay(valueElement, newValue);
    compute();
  }, { passive: false });

  // Double-click to reset
  canvas.addEventListener('dblclick', () => {
    setValue(0);
    drawKnob(canvas, 0);
    setValueDisplay(valueElement, 0);
    compute();
  });
}

// ── Analog Meter ──
function outputToMeterAngle(output) {
  return METER_ARC_START + output * (METER_ARC_END - METER_ARC_START);
}

// Pre-rendered static meter background (offscreen)
const staticMeterCanvas = document.createElement('canvas');

function roundedRect(ctx, x, y, w, h, r, fill, stroke, strokeWidth) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.stroke(); }
}

function drawScrew(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#c8b896';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 2.3, y);
  ctx.lineTo(x + 2.3, y);
  ctx.strokeStyle = '#9a7a58';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function buildStaticMeter() {
  const ctx = prepareHiDpiCanvas(staticMeterCanvas, METER_CSS_WIDTH, METER_CSS_HEIGHT);

  // Case
  roundedRect(ctx, 0, 0, METER_CSS_WIDTH, METER_CSS_HEIGHT, 10, '#0c0c0c', '#3c3c3c', 1.5);
  roundedRect(ctx, 2.5, 2.5, METER_CSS_WIDTH - 5, METER_CSS_HEIGHT - 5, 8, null, '#181818', 1);

  // Face
  roundedRect(ctx, 11, 14, METER_CSS_WIDTH - 22, METER_CSS_HEIGHT - 26, 4, '#eee8d4', null, 0);

  // Red zone fill
  ctx.beginPath();
  ctx.moveTo(METER_CX, METER_PIVOT_Y);
  ctx.arc(METER_CX, METER_PIVOT_Y, METER_SCALE_RADIUS, outputToMeterAngle(0.7), METER_ARC_END);
  ctx.closePath();
  ctx.fillStyle = 'rgba(180,40,20,.08)';
  ctx.fill();

  // Scale arc background
  ctx.beginPath();
  ctx.arc(METER_CX, METER_PIVOT_Y, METER_SCALE_RADIUS - 9, METER_ARC_START, METER_ARC_END);
  ctx.strokeStyle = 'rgba(145,135,115,.38)';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Outer arc line
  ctx.beginPath();
  ctx.arc(METER_CX, METER_PIVOT_Y, METER_SCALE_RADIUS, METER_ARC_START, METER_ARC_END);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Tick marks
  for (let t = 0; t <= 20; t++) {
    const pct = t / 20;
    const angle = outputToMeterAngle(pct);
    const isMajor = (t % 5 === 0);
    ctx.beginPath();
    ctx.moveTo(METER_CX + Math.cos(angle) * METER_SCALE_RADIUS,
               METER_PIVOT_Y + Math.sin(angle) * METER_SCALE_RADIUS);
    ctx.lineTo(METER_CX + Math.cos(angle) * (METER_SCALE_RADIUS - (isMajor ? 11 : 5)),
               METER_PIVOT_Y + Math.sin(angle) * (METER_SCALE_RADIUS - (isMajor ? 11 : 5)));
    ctx.strokeStyle = pct >= 0.7 ? '#aa3311' : '#666';
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.stroke();
  }

  // Scale labels
  [[0, '-50'], [0.25, '-25'], [0.5, '0'], [0.75, '25'], [1, '50']].forEach(([pct, label]) => {
    const angle = outputToMeterAngle(pct);
    const r = METER_SCALE_RADIUS - 19;
    ctx.fillStyle = pct >= 0.7 ? '#aa2200' : '#555';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, METER_CX + Math.cos(angle) * r, METER_PIVOT_Y + Math.sin(angle) * r);
  });

  // Bottom text
  ctx.fillStyle = '#555';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MICROAMPERES', METER_CX, METER_CSS_HEIGHT - 13);
  ctx.fillStyle = '#888';
  ctx.font = '5.5px monospace';
  ctx.fillText('DC  1μA/DIV', METER_CX, METER_CSS_HEIGHT - 6);

  // Decorative screws
  drawScrew(ctx, 20, METER_CSS_HEIGHT - 13);
  drawScrew(ctx, METER_CSS_WIDTH - 20, METER_CSS_HEIGHT - 13);
}

function drawNeedle(output) {
  const meterCanvas = document.getElementById('meterCanvas');
  const meterCtx = prepareHiDpiCanvas(meterCanvas, METER_CSS_WIDTH, METER_CSS_HEIGHT);

  // Blit the static background (raw pixel copy, bypass the CSS scale transform)
  meterCtx.save();
  meterCtx.setTransform(1, 0, 0, 1, 0, 0);
  meterCtx.drawImage(staticMeterCanvas, 0, 0);
  meterCtx.restore();

  const angle = outputToMeterAngle(output);
  const tipX = METER_CX + Math.cos(angle) * METER_NEEDLE_RADIUS;
  const tipY = METER_PIVOT_Y + Math.sin(angle) * METER_NEEDLE_RADIUS;

  // Needle
  meterCtx.beginPath();
  meterCtx.moveTo(METER_CX - Math.cos(angle) * 6, METER_PIVOT_Y - Math.sin(angle) * 6);
  meterCtx.lineTo(tipX, tipY);
  meterCtx.strokeStyle = '#cc0000';
  meterCtx.lineWidth = 1.5;
  meterCtx.lineCap = 'round';
  meterCtx.stroke();

  // Pivot cap
  meterCtx.beginPath();
  meterCtx.arc(METER_CX, METER_PIVOT_Y, 4.5, 0, Math.PI * 2);
  const pivotGradient = meterCtx.createRadialGradient(METER_CX - 1, METER_PIVOT_Y - 1, 0.5, METER_CX, METER_PIVOT_Y, 4.5);
  pivotGradient.addColorStop(0, '#777');
  pivotGradient.addColorStop(1, '#1e1e1e');
  meterCtx.fillStyle = pivotGradient;
  meterCtx.fill();
  meterCtx.strokeStyle = '#888';
  meterCtx.lineWidth = 0.5;
  meterCtx.stroke();
}

// ── Animation Loop ──
function animationLoop() {
  const delta = targetOutput - currentOutput;
  if (Math.abs(delta) > 0.0004) {
    currentOutput += delta * 0.11;
    drawNeedle(currentOutput);
  }
  requestAnimationFrame(animationLoop);
}

// ── Scaling ──
// Scale the panel to fill the viewport while preserving aspect ratio.
// Also recomputes canvasPixelRatio and redraws all canvases at the new resolution.
function scaleToFit() {
  const panelEl = document.querySelector('.panel');
  // Reset scale so we can measure natural size
  panelEl.style.transform = 'scale(1)';
  const rect = panelEl.getBoundingClientRect();
  const pad = 48;
  const scaleX = (window.innerWidth  - pad) / rect.width;
  const scaleY = (window.innerHeight - pad) / rect.height;
  const scale = Math.min(scaleX, scaleY, 4);
  panelEl.style.transform = `scale(${scale})`;

  // Update canvas resolution to match the effective pixel density
  const dpr = window.devicePixelRatio || 1;
  const newRatio = dpr * scale;
  // Only re-render if the ratio changed meaningfully (avoid thrashing)
  if (Math.abs(newRatio - canvasPixelRatio) > 0.05) {
    canvasPixelRatio = newRatio;
    redrawAllCanvases();
  }
}

// Collection of all knob canvases + their current values, for re-rendering on DPI change
const knobRegistry = [];

function redrawAllCanvases() {
  // Re-render all weight/bias knobs
  for (const entry of knobRegistry) {
    drawKnob(entry.canvas, entry.getValue());
  }
  // Re-render meter
  buildStaticMeter();
  drawNeedle(currentOutput);
}

// ── DOM Setup ──
(function init() {
  // Title
  document.getElementById('panelTitle').textContent = `${GRID_SIZE}×${GRID_SIZE} PERCEPTRON`;
  document.title = `${GRID_SIZE}x${GRID_SIZE} Analog Perceptron`;

  // Build input switches
  const switchGrid = document.getElementById('switchGrid');
  switchGrid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 17px)`;
  for (let i = 0; i < NUM_INPUTS; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sw-wrap';

    const label = document.createElement('div');
    label.className = 'sw-num';
    label.textContent = String(i + 1).padStart(2, '0');

    const toggle = document.createElement('div');
    toggle.className = 'sw';
    const idx = i;
    toggle.addEventListener('click', () => {
      inputs[idx] ^= 1;
      toggle.classList.toggle('on', inputs[idx] === 1);
      compute();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(toggle);
    switchGrid.appendChild(wrapper);
  }

  // Build weight knobs
  const knobGrid = document.getElementById('knobGrid');
  knobGrid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 40px)`;
  for (let i = 0; i < NUM_INPUTS; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'knob-wrap';

    const canvas = document.createElement('canvas');
    canvas.style.width  = KNOB_SIZE + 'px';
    canvas.style.height = KNOB_SIZE + 'px';
    canvas.style.touchAction = 'none';

    const valueEl = document.createElement('div');
    valueEl.className = 'knob-value';
    valueEl.textContent = '+0';

    wrapper.appendChild(canvas);
    wrapper.appendChild(valueEl);
    knobGrid.appendChild(wrapper);

    const idx = i;
    const getValue = () => weights[idx];
    knobRegistry.push({ canvas, getValue });
    attachKnob(canvas, getValue, v => { weights[idx] = v; }, valueEl);
  }

  // Bias knob
  const biasCanvas = document.getElementById('biasCanvas');
  biasCanvas.style.width  = BIAS_KNOB_SIZE + 'px';
  biasCanvas.style.height = BIAS_KNOB_SIZE + 'px';
  const biasValueEl = document.getElementById('biasValue');
  const getBias = () => bias;
  knobRegistry.push({ canvas: biasCanvas, getValue: getBias });
  attachKnob(biasCanvas, getBias, v => { bias = v; }, biasValueEl);

  // Learning rate knob
  const lrCanvas = document.getElementById('lrCanvas');
  lrCanvas.style.width  = BIAS_KNOB_SIZE + 'px';
  lrCanvas.style.height = BIAS_KNOB_SIZE + 'px';
  const lrValueEl = document.getElementById('lrValue');
  const getLR = () => learningRate;
  knobRegistry.push({ canvas: lrCanvas, getValue: getLR });
  attachKnob(lrCanvas, getLR, v => { learningRate = v; }, lrValueEl, { snap: 1, scrollStep: 1 });

  // Weight adjust buttons
  const knobCanvases = [];
  const knobValueEls = [];
  knobGrid.querySelectorAll('.knob-wrap').forEach((wrap) => {
    knobCanvases.push(wrap.querySelector('canvas'));
    knobValueEls.push(wrap.querySelector('.knob-value'));
  });

  document.getElementById('btnDecWeights').addEventListener('click', () => {
    for (let i = 0; i < NUM_INPUTS; i++) {
      if (inputs[i]) {
        weights[i] = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, weights[i] - learningRate));
        drawKnob(knobCanvases[i], weights[i]);
        setValueDisplay(knobValueEls[i], weights[i]);
      }
    }
    compute();
  });

  document.getElementById('btnIncWeights').addEventListener('click', () => {
    for (let i = 0; i < NUM_INPUTS; i++) {
      if (inputs[i]) {
        weights[i] = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, weights[i] + learningRate));
        drawKnob(knobCanvases[i], weights[i]);
        setValueDisplay(knobValueEls[i], weights[i]);
      }
    }
    compute();
  });

  // Meter
  buildStaticMeter();
  drawNeedle(0.5);
  compute();
  animationLoop();

  // Scale panel to fill viewport
  scaleToFit();
  window.addEventListener('resize', scaleToFit);
})();

'use strict';

const $ = (selector) => document.querySelector(selector);
const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
const responses = [
  'Earth’s tilted axis changes the sunlight received by each hemisphere.',
  'Seasons result from axial tilt as Earth travels around the Sun.',
  'Earth’s tilt changes the angle and duration of sunlight over the year.',
  'The hemispheres receive different sunlight because Earth’s axis is tilted.',
  'Summer happens because Earth moves much closer to the Sun.',
  'Seasons are caused by recurring changes in local weather patterns.'
];
const vectors = [[1, .1, .1], [1, .02, .03], [1, -.08, .06], [1, .04, -.09], [-.2, 1, .1], [-.6, .1, 1]]
  .map((v) => v.map((x) => x / Math.hypot(...v)));
const similarities = vectors.map((a) => vectors.map((b) => a.reduce((sum, x, k) => sum + x * b[k], 0)));
const scores = similarities.map((row, i) => row.reduce((sum, value, j) => sum + (i === j ? 0 : Math.exp(value / .5)), 0) / (row.length - 1));
const winner = scores.indexOf(Math.max(...scores));
let stage = 2;
let focusedCandidate = winner;
let replayTimers = [];
let results;

function drawHero() {
  const svg = $('#hero-responses');
  svg.innerHTML = letters.map((letter, i) => {
    const y = 70 + i * 43;
    return `<g><rect x="5" y="${y}" width="143" height="32" rx="4" fill="#fff" stroke="#ccd5e1"/><rect x="6" y="${y + 1}" width="27" height="30" rx="3" fill="#f1f4fb"/><text x="20" y="${y + 21}" text-anchor="middle" fill="#435bd5" font-family="Arial,sans-serif" font-size="13">${letter}</text><path d="M44 ${y + 12} h${75 - i * 3} M44 ${y + 21} h${43 + i * 3}" stroke="#a6b2be" stroke-width="3" stroke-linecap="round"/><path d="M159 ${y + 16} H181" stroke="#8997a2" fill="none" marker-end="url(#arrow)"/>${Array.from({length: 6}, (_, j) => `<rect x="${196 + 23 * j}" y="${y + 8}" width="15" height="17" rx="2" fill="${i < 4 ? '#435bd5' : '#8d9ccb'}" opacity="${.65 + j * .05}"/>`).join('')}</g>`;
  }).join('');
}

function setStage(nextStage) {
  stage = nextStage;
  const descriptions = [
    'Sample independent responses from the base LLM. The paper uses 10 candidates per question; this example shows six.',
    'Append six learned summary tokens to each response. Reuse its KV cache, then mean-pool and normalize the final-layer token states.',
    'Compare response representations by cosine similarity. Average exponentially weighted similarities to the other candidates, then select the largest score.'
  ];
  $('.step-tabs').querySelectorAll('button').forEach((button, index) => {
    button.setAttribute('aria-selected', String(index === stage));
    button.tabIndex = index === stage ? 0 : -1;
  });
  $('#demo-panel').setAttribute('aria-labelledby', ['tab-sample', 'tab-encode', 'tab-select'][stage]);
  $('#stage-description').textContent = descriptions[stage];
  renderDemo();
}

function renderDemo() {
  $('#candidates').innerHTML = responses.map((text, i) => `<button type="button" class="candidate ${i === focusedCandidate ? 'selected' : ''} ${i > 3 ? 'outlier' : ''}" data-candidate="${i}" aria-pressed="${i === focusedCandidate}" aria-label="Inspect response ${letters[i]}: ${text}"><span class="candidate-letter">${letters[i]}</span><span>${text}</span></button>`).join('');
  $('#encoding-title').textContent = ['Independent samples', 'Summary-token encoding', 'Pairwise similarity'][stage];
  if (stage === 0) {
    $('#encoding-content').innerHTML = `<div class="sampling-sketch">${letters.map((letter, i) => `<div class="sample-line"><span>${letter}</span><i style="width:${65 + i * 11}%"></i></div>`).join('')}</div><p class="matrix-note">Same question · diverse reasoning paths</p>`;
    $('#selection-content').innerHTML = '<p class="pending-stage">Generation supplies the candidates.<br>Continue to Encode to see how LSC represents them.</p>';
  } else if (stage === 1) {
    $('#encoding-content').innerHTML = `<div class="token-stack">${letters.map((letter) => `<div class="token-row"><span>${letter}</span>${Array.from({length: 6}, (_, i) => `<span class="mini-token">S${i + 1}</span>`).join('')}</div>`).join('')}</div><div class="pool-arrow" aria-hidden="true">↓</div><div class="embedding-output">Mean pool → normalize → zᵢ</div>`;
    $('#selection-content').innerHTML = '<p class="pending-stage">Each response now has a compact representation.<br>Continue to Select to compare agreement.</p>';
  } else {
    $('#encoding-content').innerHTML = `<table class="matrix" aria-label="Constructed pairwise cosine similarities; diagonal excluded from selection scores"><thead><tr><th></th>${letters.map((letter) => `<th scope="col">${letter}</th>`).join('')}</tr></thead><tbody>${similarities.map((row, i) => `<tr class="${i === focusedCandidate ? 'focus-row' : ''}"><th scope="row">${letters[i]}</th>${row.map((value, j) => {
      const intensity = Math.max(0, Math.min(1, value));
      const color = value > .6 ? `rgb(${Math.round(222 - intensity * 155)},${Math.round(232 - intensity * 141)},${Math.round(249 - intensity * 36)})` : '#f3e5db';
      return `<td class="${i === j ? 'diagonal' : ''}" style="${i === j ? '' : `background:${color};color:${value > .82 ? '#fff' : '#34434e'}`}" title="${letters[i]} / ${letters[j]}: ${value.toFixed(4)}${i === j ? ' (excluded)' : ''}">${value.toFixed(2)}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table><div class="matrix-legend"><span>Lower similarity</span><span class="legend-scale" aria-hidden="true"></span><span>Higher similarity</span></div><p class="matrix-note">Inspecting ${letters[focusedCandidate]} · self-similarity excluded</p>`;
    $('#selection-content').innerHTML = `<div class="selected-answer"><span class="selected-label">Response ${letters[winner]} · strongest agreement</span>${responses[winner]}</div><div class="score-list" aria-label="LSC selection scores">${scores.map((score, i) => `<div class="score-row ${i === winner ? 'winner' : ''}"><span>${letters[i]}</span><div class="score-track"><div class="score-fill" style="width:${score / Math.max(...scores) * 100}%"></div></div><span>${score.toFixed(3)}</span></div>`).join('')}</div><p class="selection-hint">Click a candidate to inspect its similarity row. LSC selects an existing response; it does not synthesize a new answer.</p>`;
  }
}

function stopReplay() {
  replayTimers.forEach(clearTimeout);
  replayTimers = [];
}

function initDemo() {
  drawHero();
  setStage(2);
  $('.step-tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('[data-stage]');
    if (!tab) return;
    stopReplay();
    setStage(Number(tab.dataset.stage));
  });
  $('.step-tabs').addEventListener('keydown', (event) => {
    const tab = event.target.closest('[data-stage]');
    if (!tab) return;
    let nextStage = Number(tab.dataset.stage);
    if (event.key === 'ArrowRight') nextStage = (nextStage + 1) % 3;
    else if (event.key === 'ArrowLeft') nextStage = (nextStage + 2) % 3;
    else if (event.key === 'Home') nextStage = 0;
    else if (event.key === 'End') nextStage = 2;
    else return;
    event.preventDefault();
    stopReplay();
    setStage(nextStage);
    $(`[data-stage="${nextStage}"]`).focus();
  });
  $('#candidates').addEventListener('click', (event) => {
    const button = event.target.closest('[data-candidate]');
    if (!button) return;
    focusedCandidate = Number(button.dataset.candidate);
    renderDemo();
    $(`[data-candidate="${focusedCandidate}"]`).focus();
  });
  $('#replay').addEventListener('click', () => {
    stopReplay();
    setStage(0);
    replayTimers = [setTimeout(() => setStage(1), 1700), setTimeout(() => setStage(2), 3400)];
  });
}

function number(value, digits = 1) {
  return value === null ? 'N/A' : value.toFixed(digits);
}

function signed(value, digits = 1) {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(digits)}`;
}

function table(headers, rows, options = {}) {
  const base = rows.find((row) => row.method === options.baseline);
  return `<table class="result-table"><thead><tr><th scope="col">Method</th>${headers.map((header) => `<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr class="${row.method.startsWith('LSC') ? 'ours' : ''}"><th scope="row">${row.method}</th>${row.values.map((value, i) => {
    const digits = Array.isArray(options.digits) ? options.digits[i] : (options.digits ?? 1);
    let delta = '';
    if (options.deltas && row.method !== options.baseline) {
      const baselineValue = base?.values[i];
      if (value !== null && baselineValue !== null && baselineValue !== undefined && baselineValue !== 0) {
        const difference = value - baselineValue;
        const improvement = options.lowerIsBetter ? -difference : difference;
        delta = `<small class="delta ${improvement > 0 ? 'positive' : improvement < 0 ? 'negative' : ''}">${signed(difference, digits)} (${signed(difference / baselineValue * 100)}%)</small>`;
      } else delta = '<small class="delta">Δ N/A</small>';
    }
    const suffix = options.suffixes?.[i] ?? '';
    const text = value === null ? '<span class="unavailable">N/A</span>' : `${options.compact?.[i] ? String(value) : number(value, digits)}${suffix}`;
    const deviation = options.deviations?.find((entry) => entry.method === row.method)?.values[i];
    return `<td>${text}${deviation !== undefined && deviation !== null ? ` <span class="deviation">±${deviation.toFixed(1)}</span>` : ''}${delta}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
}

function chart(target, rows, valueIndex) {
  $(target).innerHTML = rows.filter((row) => row.values[valueIndex] !== null).map((row) => `<div class="bar-row ${row.method.startsWith('LSC') ? 'ours' : ''}"><span class="bar-label">${row.method}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${row.values[valueIndex]}%"></div></div><span class="bar-value">${number(row.values[valueIndex])}</span></div>`).join('') + '<div class="bar-axis" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>';
}

const interpretations = {
  llama8: 'For Llama 3.1 8B, LSC retains SC’s short-answer performance (72.3 vs. 72.2) and improves the long-answer average over USC (65.2 vs. 64.8). Dynamic TopK raises these averages to 72.8 and 65.8. The per-task tables show the limits: base LSC scores 0.7 points below USC on TruthfulQA generation (43.5 vs. 44.2; −1.6% relative).',
  qwen8: 'Qwen3 shows why the model matters. LSC’s short-answer average is 0.3 points below SC (76.8 vs. 77.1; −0.4% relative). Its long-answer average is 0.5 points below WUCS (74.9 vs. 75.4; −0.7%), despite small selection overhead. Dynamic TopK does not improve the long-answer average and reduces the short-answer average by 0.3 points (−0.4% relative to LSC).',
  llama70: 'For Llama 3.3 70B, LSC’s short-answer average is 0.1 points below SC (82.6 vs. 82.7; −0.1% relative), while its long-answer average is 0.8 points above USC (77.6 vs. 76.8; +1.0%). The gain varies by task: LSC improves MBPP+ over USC by 2.39 points (+3.3%), but trails on TruthfulQA generation by 1.8 points (−3.6%).'
};

function comparison(rows, baseline) {
  const base = rows.find((row) => row.method === baseline);
  const ours = rows.find((row) => row.method === 'LSC');
  const labels = ['Short-answer average', 'Long-answer average', 'Time overhead'];
  return [0, 1, 2].map((i) => {
    if (base.values[i] === null) return `<div><strong>N/A</strong>${labels[i]} vs. ${baseline}<br><small>Baseline not evaluated for this format.</small></div>`;
    const diff = ours.values[i] - base.values[i];
    const relative = base.values[i] !== 0 ? ` (${signed(diff / base.values[i] * 100)}% relative)` : '';
    return `<div class="${(i < 2 ? diff < 0 : diff > 0) ? 'negative' : ''}"><strong>${signed(diff, i === 2 ? 4 : 1).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')} pp</strong>${labels[i]} vs. ${baseline}<br><small>${ours.values[i]}${i === 2 ? '%' : ''} vs. ${base.values[i]}${i === 2 ? '%' : ''}${relative}</small></div>`;
  }).join('');
}

function renderResults() {
  const model = $('#model-select').value;
  const view = $('#view-select').value;
  const baselineSelect = $('#baseline-select');
  baselineSelect.querySelector('[value="SC"]').disabled = view === 'consistency';
  if (view === 'consistency' && baselineSelect.value === 'SC') baselineSelect.value = 'USC';
  const baseline = baselineSelect.value;
  const rows = results.overview[model];
  $('#quality-view').hidden = view !== 'quality';
  $('#consistency-view').hidden = view !== 'consistency';
  chart('#chart-short', rows, 0);
  chart('#chart-long', rows, 1);
  $('#overview-table').innerHTML = table(['Short avg. ↑', 'Long avg. ↑', 'Time overhead ↓', 'Memory overhead ↓'], rows, {digits: [1, 1, 4, 3], compact: [false, false, true, true], suffixes: ['', '', '%', '%']});
  $('#comparison').innerHTML = comparison(rows, baseline);
  $('#model-interpretation').textContent = interpretations[model];
  if (view === 'consistency') {
    chart('#consistency-chart', results.consistency[model], 7);
    $('#consistency-table').innerHTML = table(['GSM8K', 'MATH', 'TriviaQA', 'MMLU', 'TruthfulQA', 'MSMARCO', 'HumanEval', 'Average'], results.consistency[model], {digits: 2, baseline, deltas: $('#show-deltas').checked});
    const consistencyOurs = results.consistency[model].find((row) => row.method === 'LSC').values[7];
    const consistencyBase = results.consistency[model].find((row) => row.method === baseline).values[7];
    $('#consistency-interpretation').textContent = `Average majority-set selection: LSC ${number(consistencyOurs, 2)}% vs. ${baseline} ${number(consistencyBase, 2)}%, a difference of ${signed(consistencyOurs - consistencyBase, 2)} percentage points (${signed((consistencyOurs - consistencyBase) / consistencyBase * 100)}% relative). The quality view answers a separate question: whether this selection yields a better task result.`;
  }
  renderBenchmarks(model, baseline);
}

function renderBenchmarks(model, baseline) {
  const deltas = $('#show-deltas').checked;
  const groups = [
    {key: 'short', title: 'Short answers', source: 'Table 2 · Accuracy (%)', headers: ['GSM8K', 'MATH', 'TriviaQA', 'MMLU', 'TruthfulQA MC1', 'CommonsenseQA', 'Average'], digits: 1, note: 'GSM8K, MATH, TriviaQA, and MMLU are in-domain. TruthfulQA MC1 and CommonsenseQA are out-of-domain.'},
    {key: 'qa', title: 'Open-ended question answering', source: 'Table 3(a)', headers: ['MSMARCO Sem. sim.', 'BLEU-1', 'BLEU-2', 'BLEU-3', 'BLEU-4', 'ROUGE-L', 'TruthfulQA Truth (%)'], digits: [4, 4, 4, 4, 4, 4, 1], note: 'MSMARCO-NLG scores use a 0–1 scale. TruthfulQA Truth is a percentage assessed with GPT-4.1. These metrics measure different properties.'},
    {key: 'code', title: 'Code generation & summarization', source: 'Table 3(b) · code standard deviations from Appendix J', headers: ['HumanEval', 'HumanEval+', 'MBPP', 'MBPP+', 'CNN/DM R-1', 'R-2', 'R-L', 'BERTScore'], digits: [2, 2, 2, 2, 4, 4, 4, 4], note: `Code: Pass@1 (%), ${model === 'llama70' ? 'means over three seeds; 70B standard deviations are not reported in Appendix J' : 'mean ± standard deviation over three seeds'}. CNN/DailyMail: ROUGE and BERTScore on a 0–1 scale. All are out-of-domain.`}
  ];
  $('#benchmark-tables').innerHTML = groups.map((group) => `<h3>${group.title}</h3><h4>${group.source}</h4><div class="table-scroll" tabindex="0" role="region" aria-label="${group.title} results; scroll horizontally for all metrics">${table(group.headers, results[group.key][model], {digits: group.digits, baseline, deltas, deviations: group.key === 'code' ? results.codeStd?.[model] : undefined})}</div><p class="table-description">${group.note}</p>`).join('');
}

async function loadResults() {
  try {
    const response = await fetch('assets/results.json');
    if (!response.ok) throw new Error(`Results unavailable (${response.status})`);
    results = await response.json();
    renderResults();
    $('#sbert-table').innerHTML = table(results.sbert.metrics, results.sbert.rows, {baseline: 'Fine-tuned SBERT', deltas: true});
    $('#calibration-table').innerHTML = table(results.calibration.metrics.map((metric) => `${metric} ECE ↓`), results.calibration.rows, {digits: 3, baseline: 'WUCS', deltas: true, lowerIsBetter: true});
    $('#results-loading').hidden = true;
    $('#results-explorer').hidden = false;
    ['#model-select', '#view-select', '#baseline-select', '#show-deltas'].forEach((selector) => $(selector).addEventListener('change', renderResults));
  } catch (error) {
    $('#results-loading').innerHTML = 'The results could not be loaded. <a href="https://arxiv.org/html/2508.18395v3">Read the tables in the paper ↗</a>';
    console.error(error);
  }
}

$('#copy-citation').addEventListener('click', async () => {
  const text = $('#citation-text').textContent;
  try {
    await navigator.clipboard.writeText(text);
    $('#copy-status').textContent = 'BibTeX copied.';
    $('#copy-citation').textContent = 'Copied ✓';
    setTimeout(() => { $('#copy-citation').textContent = 'Copy BibTeX'; }, 2500);
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('#citation-text'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    $('#copy-status').textContent = 'Citation selected. Press Ctrl+C or ⌘C to copy.';
  }
});

initDemo();
loadResults();

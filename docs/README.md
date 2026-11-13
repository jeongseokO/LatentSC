# LSC research website

The public project page is served from this directory by GitHub Pages:
<https://jeongseoko.github.io/LatentSC/>.

This is a static, dependency-free site. Edit `index.html`, `assets/style.css`,
and `assets/site.js`; no build step is required. Preview from the repository root:

```bash
python3 -m http.server 8765
# Open http://localhost:8765/docs/
```

## Research sources

- Method and numerical results: [arXiv:2508.18395v3](https://arxiv.org/html/2508.18395v3),
  dated February 27, 2026. `assets/results.json` reproduces Tables 1–6 and the
  code-generation standard deviations in Appendix J. The 70B standard deviations
  are not reported there and are explicitly unavailable in the data.
- Publication metadata: [DOI 10.1609/aaai.v40i38.40536](https://doi.org/10.1609/aaai.v40i38.40536).
- Installation and inference examples: this repository's README and `run.sh`.

The results are paper-reported measurements, not new experiments. Table 1's
format-level averages are reproduced as published, rather than recomputed from
heterogeneous task metrics. A missing value stays `null` and renders as `N/A`.
The overview time and memory columns report percentage overhead on top of
10-candidate generation, not single-response decoding. Detailed percentage
metrics use percentage-point differences; other metrics use their original units.
Relative changes are `(value - baseline) / baseline * 100`.

The interactive inference example uses six hand-constructed unit vectors. Its
cosine matrix and selection scores are computed in the browser using the paper's
base LSC formula, with the diagonal excluded. It does not run a model or reproduce
an embedding projection. The optional Dynamic TopK method is explained separately.

The inference scenario keeps all five stages visible: one question enters the
LLM, six responses are sampled, summary tokens produce response embeddings,
pairwise similarities form a matrix, and LSC returns the highest-scoring response.
Response IDs A–F remain consistent throughout. There are no decorative response
length bars or hidden stages.

The training section follows the paper's Method and Appendices A/C. It covers
dataset composition, pseudo-label extraction, the MMLU explanation transformation,
question-group filtering/splitting, supervised contrastive learning, and updates
to only the added token embeddings. Dataset counts are question groups, not
response counts. Training diagrams are explanatory schematics, not new runs.

The diagrams are editable SVG/HTML, with all text rendered as accessible text.
The layout supports narrow screens, keyboard navigation, and reduced motion.
There are no analytics, external fonts, remote scripts, or backend services.

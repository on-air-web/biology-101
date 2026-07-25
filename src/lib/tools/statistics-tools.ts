import type { ToolMeta, ToolTier } from './types';
import type { ExternalInfo, ToolCategoryId } from './types';

/**
 * Statistics, plotting and figure tools.
 *
 * Kept separate from external.ts because the directory is going to grow by
 * domain, and one file per domain stays reviewable.
 *
 * The bias in these picks is deliberate and worth stating: tools that show
 * distributions and effect sizes are preferred over tools that emit a bare
 * p-value and a bar chart. That is not a stylistic preference — bar charts of
 * means hide the data they are drawn from, and a p-value without an effect
 * size is not a result.
 */
function entry(
  meta: {
    id: string;
    name: string;
    category: ToolCategoryId;
    summary: string;
    description: string;
    keywords: string[];
    tier: ToolTier;
    taskIds?: string[];
    relatedToolIds?: string[];
  } & Omit<ExternalInfo, 'useWhen'> & { useWhen?: string },
): ToolMeta {
  const { provider, url, access, licenseNote, useWhen, inputNote, tier, ...rest } = meta;
  return {
    ...rest,
    tier,
    kind: 'external',
    reviewStatus: 'drafted',
    external: { provider, url, access, licenseNote, useWhen: useWhen ?? '', inputNote },
    status: 'stable',
    computeLocation: 'server',
    citations: [{ label: `${meta.name} — project site`, source: provider, url }],
    reviewedAt: '2026-07-25',
  };
}

/** Command-line software: searchable, named inside task guides, no page. */
function pipeline(meta: {
  id: string;
  name: string;
  category: ToolCategoryId;
  summary: string;
  description: string;
  keywords: string[];
  provider: string;
  url: string;
  environment: string;
  taskIds?: string[];
}): ToolMeta {
  const { provider, url, environment, ...rest } = meta;
  return {
    ...rest,
    kind: 'pipeline',
    tier: 'listed',
    reviewStatus: 'drafted',
    pipeline: { provider, url, environment },
    status: 'stable',
    computeLocation: 'server',
    citations: [{ label: `${meta.name} — project site`, source: provider, url }],
    reviewedAt: '2026-07-25',
  };
}

export const STATISTICS_TOOLS: readonly ToolMeta[] = [
  // ---- General statistics -------------------------------------------------
  entry({
    id: 'graphpad-prism',
    name: 'GraphPad Prism',
    category: 'statistics',
    tier: 'pick',
    summary: 'The default statistics and graphing package in experimental biology.',
    description:
      'Combines analysis and publication-quality graphing, with guided test selection aimed at ' +
      'bench scientists rather than statisticians.',
    keywords: [
      'prism',
      'graphpad',
      'statistics',
      'graphing',
      'anova',
      't-test',
      'nonlinear regression',
    ],
    provider: 'Dotmatics',
    url: 'https://www.graphpad.com/features',
    access: 'paid',
    licenseNote: 'Subscription; many institutions hold a site licence',
    useWhen:
      'Your lab already has a licence, or you need dose–response and nonlinear curve fitting, ' +
      'where it is genuinely the best in class. If you are paying yourself, JASP or jamovi do ' +
      'the standard tests just as correctly for nothing.',
    taskIds: ['compare-two-groups', 'compare-many-groups', 'correlation-regression'],
  }),
  entry({
    id: 'jamovi',
    name: 'jamovi',
    category: 'statistics',
    tier: 'pick',
    summary: 'Free point-and-click statistics built on R, with a spreadsheet front end.',
    description:
      'A familiar spreadsheet interface over the R ecosystem. Analyses update live as data ' +
      'changes, and every analysis can be exported as the underlying R code.',
    keywords: ['jamovi', 'statistics', 'free', 'spss alternative', 'r', 'gui'],
    provider: 'jamovi project',
    url: 'https://www.jamovi.org',
    access: 'install',
    useWhen:
      'The friendliest way into proper statistics if you have never written code. Shows you the ' +
      'R behind each analysis, which makes it a good bridge if you later want to script.',
    taskIds: ['compare-two-groups', 'compare-many-groups', 'categorical-counts'],
  }),
  entry({
    id: 'estimation-stats',
    name: 'estimationstats.com',
    category: 'statistics',
    tier: 'pick',
    summary: 'Estimation plots: effect size with confidence interval, not just a p-value.',
    description:
      'Generates Gardner–Altman and Cumming estimation plots, showing the raw data alongside the ' +
      'effect size and its bootstrapped confidence interval.',
    keywords: [
      'estimation statistics',
      'effect size',
      'dabest',
      'gardner-altman',
      'confidence interval',
      'bootstrap',
      'cumming plot',
    ],
    provider: 'Ho, Tumkaya et al.',
    url: 'https://www.estimationstats.com',
    access: 'free',
    useWhen:
      'Any two-group comparison you intend to publish. It answers "how big is the difference and ' +
      'how sure are we" rather than "is it under 0.05", which is almost always the question you ' +
      'actually had.',
    taskIds: ['compare-two-groups', 'plot-data-honestly'],
  }),
  entry({
    id: 'r-project',
    name: 'R and RStudio',
    category: 'statistics',
    tier: 'pick',
    summary: 'The statistical environment nearly all biological methods are written for.',
    description:
      'A programming language built for statistics, with the Bioconductor ecosystem on top and a ' +
      'package for essentially every published method.',
    keywords: [
      'r',
      'rstudio',
      'posit',
      'ggplot2',
      'tidyverse',
      'bioconductor',
      'statistics',
      'script',
    ],
    provider: 'R Foundation / Posit',
    url: 'https://posit.co/download/rstudio-desktop/',
    access: 'free',
    useWhen:
      'Anything you will repeat, and anything that has to be reproducible. The learning curve is ' +
      'real and it is the last statistics tool you will need to learn.',
    taskIds: ['compare-two-groups', 'compare-many-groups', 'multiple-testing', 'heatmap'],
  }),
  entry({
    id: 'gpower',
    name: 'G*Power',
    category: 'statistics',
    tier: 'pick',
    summary: 'Power analysis and sample size calculation for the standard tests.',
    description:
      'Computes required sample size, achieved power or detectable effect size across t-tests, ' +
      'ANOVA, regression, correlation and chi-square.',
    keywords: ['gpower', 'g*power', 'power analysis', 'sample size', 'n', 'effect size', 'beta'],
    provider: 'Universität Düsseldorf',
    url: 'https://www.psychologie.hhu.de/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower',
    access: 'free',
    useWhen:
      'Before you run the experiment, when it can still change the design. Post-hoc power ' +
      'computed from your observed effect tells you nothing and is a known statistical error.',
    taskIds: ['sample-size'],
  }),
  entry({
    id: 'spss',
    name: 'IBM SPSS Statistics',
    category: 'statistics',
    tier: 'listed',
    summary: 'Long-established commercial statistics package, common in clinical research.',
    description:
      'Menu-driven statistics with wide institutional adoption, particularly in clinical and social science settings.',
    keywords: ['spss', 'ibm', 'statistics', 'clinical'],
    provider: 'IBM',
    url: 'https://www.ibm.com/products/spss-statistics',
    access: 'paid',
  }),
  entry({
    id: 'stata',
    name: 'Stata',
    category: 'statistics',
    tier: 'listed',
    summary: 'Commercial statistics package strong in epidemiology and survival analysis.',
    description:
      'Scriptable statistical software widely used in epidemiology, health economics and longitudinal analysis.',
    keywords: ['stata', 'epidemiology', 'survival', 'panel data'],
    provider: 'StataCorp',
    url: 'https://www.stata.com',
    access: 'paid',
  }),

  // ---- Plotting and figures ----------------------------------------------
  entry({
    id: 'superplots-of-data',
    name: 'SuperPlotsOfData',
    category: 'statistics',
    tier: 'pick',
    summary: 'Plots every replicate and every experiment, instead of hiding both in a bar.',
    description:
      'Web app for SuperPlots, which show individual data points colour-coded by biological ' +
      'replicate alongside the replicate means.',
    keywords: [
      'superplot',
      'superplots',
      'replicates',
      'plotsofdata',
      'scatter',
      'distribution',
      'n',
    ],
    provider: 'Joachim Goedhart, University of Amsterdam',
    url: 'https://huygens.science.uva.nl/SuperPlotsOfData/',
    access: 'free',
    useWhen:
      'Cell biology data with technical replicates nested inside biological ones — the case where ' +
      'a bar chart of pooled points inflates n and overstates significance. Reviewers ' +
      'increasingly ask for this.',
    taskIds: ['plot-data-honestly'],
  }),
  entry({
    id: 'volcanoser',
    name: 'VolcaNoseR',
    category: 'statistics',
    tier: 'pick',
    summary: 'Volcano plots from a results table, with labelling and thresholds you control.',
    description:
      'Upload a differential expression table and produce a labelled, publication-ready volcano ' +
      'plot without writing any code.',
    keywords: [
      'volcano plot',
      'volcanoser',
      'differential expression',
      'fold change',
      'p value',
      'labels',
    ],
    provider: 'Joachim Goedhart, University of Amsterdam',
    url: 'https://huygens.science.uva.nl/VolcaNoseR/',
    access: 'free',
    useWhen:
      'You already have a results table from DESeq2, limma or similar and just need the figure. ' +
      'It will not do the statistics for you, which is the correct division of labour.',
    taskIds: ['volcano-plot'],
  }),
  entry({
    id: 'morpheus',
    name: 'Morpheus',
    category: 'statistics',
    tier: 'pick',
    summary: 'Interactive heatmaps with clustering, in the browser.',
    description:
      'Matrix visualisation with hierarchical clustering, k-means, annotation tracks and grouping, ' +
      'handling reasonably large matrices client-side.',
    keywords: ['morpheus', 'heatmap', 'clustering', 'matrix', 'dendrogram', 'broad'],
    provider: 'Broad Institute',
    url: 'https://software.broadinstitute.org/morpheus/',
    access: 'free',
    useWhen:
      'Exploring an expression matrix interactively before committing to a figure. For the final ' +
      'figure, ComplexHeatmap in R gives you control Morpheus cannot.',
    taskIds: ['heatmap'],
  }),
  entry({
    id: 'srplot',
    name: 'SRplot',
    category: 'statistics',
    tier: 'listed',
    summary: 'Free web platform covering a very wide range of biological plot types.',
    description:
      'A large collection of ready-made plot generators — volcano, heatmap, Venn, chord, PCA and ' +
      'many more — from pasted data.',
    keywords: ['srplot', 'plots', 'venn', 'chord', 'pca', 'bioinformatics plots'],
    provider: 'Science and Research Online Platform',
    url: 'https://www.bioinformatics.com.cn/en',
    access: 'free',
  }),
  entry({
    id: 'biorender',
    name: 'BioRender',
    category: 'statistics',
    tier: 'pick',
    summary: 'Scientific diagrams and schematics from a large library of biological icons.',
    description:
      'Drag-and-drop figure creation for mechanisms, workflows and graphical abstracts, with ' +
      'field-standard icons.',
    keywords: ['biorender', 'figure', 'diagram', 'schematic', 'graphical abstract', 'illustration'],
    provider: 'BioRender',
    url: 'https://www.biorender.com',
    access: 'freemium',
    licenseNote: 'Free tier watermarks; publication export requires a subscription',
    useWhen:
      'Schematics and graphical abstracts, not data. Check the licence before submission — the ' +
      'free tier is not cleared for publication, which catches people at the worst moment.',
    taskIds: ['scientific-figure'],
  }),
  entry({
    id: 'inkscape',
    name: 'Inkscape',
    category: 'statistics',
    tier: 'listed',
    summary: 'Free vector editor for assembling and labelling multi-panel figures.',
    description:
      'Open-source SVG editor, capable of the final assembly and lettering stage of a publication figure.',
    keywords: ['inkscape', 'svg', 'vector', 'figure assembly', 'illustrator alternative'],
    provider: 'Inkscape project',
    url: 'https://inkscape.org',
    access: 'install',
  }),

  // ---- Pipelines: named in task guides, no pages --------------------------
  pipeline({
    id: 'ggplot2',
    name: 'ggplot2',
    category: 'statistics',
    summary: 'The grammar-of-graphics plotting library for R.',
    description:
      'Declarative plotting in R; the basis of most publication figures produced by people who script.',
    keywords: ['ggplot2', 'ggplot', 'r', 'grammar of graphics', 'tidyverse'],
    provider: 'Hadley Wickham / Posit',
    url: 'https://ggplot2.tidyverse.org',
    environment: 'R package',
    taskIds: ['plot-data-honestly', 'volcano-plot'],
  }),
  pipeline({
    id: 'seaborn',
    name: 'seaborn',
    category: 'statistics',
    summary: 'Statistical plotting for Python, built on matplotlib.',
    description:
      'High-level statistical graphics in Python, with sensible defaults for distributions and categorical data.',
    keywords: ['seaborn', 'python', 'matplotlib', 'statistical plots'],
    provider: 'Michael Waskom',
    url: 'https://seaborn.pydata.org',
    environment: 'Python package',
    taskIds: ['plot-data-honestly'],
  }),
  pipeline({
    id: 'complexheatmap',
    name: 'ComplexHeatmap',
    category: 'statistics',
    summary: 'The reference R package for annotated, publication-grade heatmaps.',
    description:
      'Bioconductor package for heatmaps with multiple annotation tracks, splitting and precise control of clustering.',
    keywords: ['complexheatmap', 'heatmap', 'bioconductor', 'r', 'annotation'],
    provider: 'Zuguang Gu / Bioconductor',
    url: 'https://bioconductor.org/packages/ComplexHeatmap/',
    environment: 'R / Bioconductor package',
    taskIds: ['heatmap'],
  }),
  pipeline({
    id: 'statsmodels',
    name: 'statsmodels',
    category: 'statistics',
    summary: 'Statistical models and hypothesis tests for Python.',
    description:
      'Regression, ANOVA, time series and hypothesis testing in Python, with R-like model formulas.',
    keywords: ['statsmodels', 'python', 'regression', 'anova', 'scipy'],
    provider: 'statsmodels developers',
    url: 'https://www.statsmodels.org',
    environment: 'Python package',
    taskIds: ['compare-two-groups', 'correlation-regression'],
  }),
];

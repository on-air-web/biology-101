import type { Task } from './types';

/**
 * Statistics tasks.
 *
 * Written to be read by someone mid-analysis who is not a statistician. Each
 * guidance block names what actually decides the choice and what people
 * commonly get wrong, because the second one is usually more useful.
 *
 * All drafted, none reviewed. That distinction is shown on the page.
 */
export const STATISTICS_TASKS: readonly Task[] = [
  {
    id: 'compare-two-groups',
    name: 'Compare two groups',
    question: 'Is my treatment different from my control?',
    category: 'statistics',
    summary: 'Choosing and running a two-group comparison, and reporting it usefully.',
    guidance:
      'The default is an unpaired t-test, and Welch\u2019s version of it should be your standard ' +
      'rather than the equal-variance one \u2014 it costs almost nothing when variances match and ' +
      'saves you when they do not. Use a paired test only when each measurement genuinely has a ' +
      'partner: the same dish before and after, the same animal on both days. If your data are ' +
      'clearly not normal and n is small, Mann\u2013Whitney is the usual fallback, though with ' +
      'very small n it has little power to detect anything.\n\n' +
      'The larger point is what you report. A p-value tells you almost nothing on its own. Give ' +
      'the difference between means and its confidence interval, and show the individual points. ' +
      'An estimation plot does all three at once.',
    caution:
      'If you measured several dishes from each of three independent experiments, your n is three, ' +
      'not the number of dishes. Pooling technical replicates as though they were independent is ' +
      'the single most common way biology papers report significance that is not there.',
    toolIds: ['estimation-stats', 'jamovi', 'graphpad-prism', 'r-project'],
    pipelineIds: ['statsmodels'],
    keywords: [
      't-test',
      'ttest',
      'welch',
      'student',
      'mann-whitney',
      'wilcoxon',
      'two groups',
      'treatment control',
      'p value',
      'unpaired',
      'paired',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'compare-many-groups',
    name: 'Compare three or more groups',
    question: 'Which of my conditions differ from each other?',
    category: 'statistics',
    summary: 'ANOVA, its non-parametric equivalents, and what to do about post-hoc tests.',
    guidance:
      'One-way ANOVA asks a single question: is anything different anywhere. It does not tell you ' +
      'which groups differ, which is what you actually wanted, so it is followed by a post-hoc ' +
      'test \u2014 Tukey when comparing everything against everything, Dunnett when comparing ' +
      'each treatment against one control. Dunnett is the right choice far more often than it is ' +
      'used, and it is more powerful because it asks for less.\n\n' +
      'Two factors, such as treatment and time, call for two-way ANOVA. Repeated measurements on ' +
      'the same subjects call for a repeated-measures design or a mixed model. Kruskal\u2013Wallis ' +
      'is the non-parametric one-way equivalent.',
    caution:
      'Running a t-test between every pair instead of an ANOVA inflates your false positive rate: ' +
      'with five groups that is ten tests, and roughly a 40% chance of at least one spurious ' +
      'result at p < 0.05.',
    toolIds: ['jamovi', 'graphpad-prism', 'r-project'],
    keywords: [
      'anova',
      'one-way',
      'two-way',
      'tukey',
      'dunnett',
      'bonferroni',
      'kruskal-wallis',
      'post hoc',
      'multiple groups',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'correlation-regression',
    name: 'Test whether two variables are related',
    question: 'Does one measurement predict the other?',
    category: 'statistics',
    summary: 'Correlation, linear regression, and the difference between them.',
    guidance:
      'Correlation asks whether two variables move together and treats them symmetrically. ' +
      'Regression asks how much one changes per unit of the other, and assumes you know which is ' +
      'the predictor. If you cannot say which variable causes which, you want correlation.\n\n' +
      'Pearson\u2019s r assumes a linear relationship and reasonably normal data; Spearman\u2019s ' +
      'rho works on ranks and handles curves and outliers. Always plot the data first \u2014 ' +
      'Anscombe\u2019s quartet is four datasets with identical correlation coefficients and ' +
      'entirely different shapes.',
    caution:
      'R\u00b2 describes how well the line fits the data you have. It says nothing about whether the ' +
      'relationship is causal, and nothing about whether it holds outside the range you measured.',
    toolIds: ['graphpad-prism', 'jamovi', 'r-project'],
    pipelineIds: ['statsmodels'],
    keywords: [
      'correlation',
      'pearson',
      'spearman',
      'regression',
      'linear regression',
      'r squared',
      'scatter',
      'trend line',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'categorical-counts',
    name: 'Compare counts or proportions',
    question: 'Do these categories occur at different rates?',
    category: 'statistics',
    summary: 'Chi-square, Fisher\u2019s exact test, and when each applies.',
    guidance:
      'For a contingency table of counts \u2014 survived versus died, expressing versus not \u2014 ' +
      'chi-square is the standard test, and Fisher\u2019s exact test is the right choice when any ' +
      'expected cell count falls below about five. With small samples, which is most bench ' +
      'biology, Fisher\u2019s is usually the safer default.\n\n' +
      'Report the proportions themselves alongside the test. "12 of 40 versus 31 of 44" is more ' +
      'informative than any p-value you could attach to it.',
    toolIds: ['jamovi', 'graphpad-prism'],
    keywords: [
      'chi-square',
      'chi squared',
      'fisher exact',
      'contingency table',
      'proportions',
      'counts',
      'categorical',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'sample-size',
    name: 'Work out how many samples you need',
    question: 'What n do I need for this experiment?',
    category: 'statistics',
    summary: 'Power analysis, done before the experiment rather than after.',
    guidance:
      'Power analysis connects four quantities: the effect size you care about, your significance ' +
      'threshold, the power you want (conventionally 80%), and n. Fix any three and the fourth ' +
      'follows. The hard part is the effect size, which has to come from pilot data, a published ' +
      'study, or an honest decision about the smallest difference that would matter biologically.\n\n' +
      'That last option is underrated. "A 20% change is the smallest I would act on" is a ' +
      'defensible basis for a sample size calculation, and it makes the experiment answer a ' +
      'question you actually have.',
    caution:
      'Post-hoc power \u2014 computing power from the effect you observed, after a non-significant ' +
      'result \u2014 is circular and uninformative. It is a recognised statistical error, not a ' +
      'rescue for an underpowered study.',
    toolIds: ['gpower', 'r-project'],
    keywords: [
      'power analysis',
      'sample size',
      'how many replicates',
      'n',
      'gpower',
      'beta',
      'effect size',
      'underpowered',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'multiple-testing',
    name: 'Correct for multiple testing',
    question: 'I ran thousands of tests — which results are real?',
    category: 'statistics',
    summary: 'Bonferroni, Benjamini–Hochberg, and choosing between them.',
    guidance:
      'Testing 20,000 genes at p < 0.05 gives you around 1,000 false positives before any biology ' +
      'happens. Bonferroni controls the chance of even one false positive and is severe; it suits ' +
      'a handful of pre-planned comparisons. Benjamini\u2013Hochberg controls the proportion of ' +
      'false positives among your hits and is the standard for genomics, where a 5% false ' +
      'discovery rate in a hit list is an acceptable trade.\n\n' +
      'Report adjusted values and say which method produced them. "q < 0.05" and "p < 0.05" are ' +
      'different claims.',
    toolIds: ['r-project'],
    keywords: [
      'multiple testing',
      'bonferroni',
      'benjamini-hochberg',
      'fdr',
      'false discovery rate',
      'q value',
      'adjusted p',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'plot-data-honestly',
    name: 'Plot your data so the reader can see it',
    question: 'How should I show this data instead of a bar chart?',
    category: 'statistics',
    summary: 'Showing distributions and replicate structure rather than hiding them.',
    guidance:
      'A bar chart of means with error bars conceals the data it was drawn from. Wildly different ' +
      'distributions produce identical bars, and readers cannot tell whether you have six points ' +
      'or six hundred. With n below roughly fifty, plot every point. Above that, a violin or box ' +
      'plot with points overlaid shows the shape.\n\n' +
      'Say what the error bars are. SD describes the spread of your data; SEM describes the ' +
      'precision of your mean and is always smaller, which is why it is chosen more often than it ' +
      'is warranted. A confidence interval is usually the most honest of the three.',
    caution:
      'When technical replicates sit inside biological ones, a SuperPlot colour-codes points by ' +
      'experiment so the real n is visible on the figure.',
    toolIds: ['superplots-of-data', 'estimation-stats', 'r-project'],
    pipelineIds: ['ggplot2', 'seaborn'],
    keywords: [
      'bar chart',
      'dot plot',
      'scatter',
      'violin plot',
      'box plot',
      'superplot',
      'error bars',
      'sem',
      'sd',
      'distribution',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'volcano-plot',
    name: 'Make a volcano plot',
    question: 'How do I plot fold change against significance?',
    category: 'statistics',
    summary: 'Turning a differential expression table into a labelled figure.',
    guidance:
      'A volcano plot puts log2 fold change on the x-axis and \u2212log10 of the adjusted p-value on ' +
      'the y. The statistics come from your differential expression analysis; the plot is only ' +
      'presentation, so the tool that draws it does not need to be the tool that computed it.\n\n' +
      'Choose thresholds before you look at the plot and state them in the legend. Label the genes ' +
      'that matter to the argument rather than everything that clears the cut-off.',
    toolIds: ['volcanoser', 'srplot', 'r-project'],
    pipelineIds: ['ggplot2'],
    keywords: [
      'volcano plot',
      'fold change',
      'log2fc',
      'differential expression',
      'rna-seq figure',
      'significance',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'heatmap',
    name: 'Make a heatmap',
    question: 'How do I visualise an expression matrix?',
    category: 'statistics',
    summary: 'Clustered heatmaps, and the scaling decision that changes what they show.',
    guidance:
      'Nearly every decision here is about scaling. Row-scaling (z-scores per gene) shows relative ' +
      'patterns across conditions and discards absolute abundance; unscaled data shows abundance ' +
      'and lets highly expressed genes dominate the colour range. Both are legitimate and they ' +
      'answer different questions, so state which you used.\n\n' +
      'Clustering rows groups genes with similar behaviour. Clustering columns is a check on your ' +
      'experiment: if replicates do not cluster together, that is worth knowing before the figure.',
    caution:
      'A red\u2013green colour scale is unreadable to roughly 8% of men. Use a perceptually uniform ' +
      'diverging scale such as blue\u2013white\u2013red instead.',
    toolIds: ['morpheus', 'srplot', 'r-project'],
    pipelineIds: ['complexheatmap'],
    keywords: [
      'heatmap',
      'clustering',
      'dendrogram',
      'z-score',
      'expression matrix',
      'colour scale',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
  {
    id: 'scientific-figure',
    name: 'Draw a schematic or graphical abstract',
    question: 'How do I make a diagram of my model?',
    category: 'statistics',
    summary: 'Diagrams and figure assembly, as distinct from plotting data.',
    guidance:
      'Schematics and data plots are different jobs. Build the diagram in a drawing tool, generate ' +
      'the plots in a statistics tool, and assemble the multi-panel figure in a vector editor so ' +
      'the lettering stays consistent and everything remains editable.\n\n' +
      'Keep everything vector until the very last step. A schematic rasterised at 150 dpi cannot ' +
      'be rescued at proof stage.',
    toolIds: ['biorender', 'inkscape'],
    keywords: [
      'figure',
      'schematic',
      'diagram',
      'graphical abstract',
      'illustration',
      'panel',
      'vector',
      'svg',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-25',
  },
];

import type { ToolMeta } from '@/lib/tools/types';

export const recipeScalerMeta: ToolMeta = {
  id: 'recipe-scaler',
  name: 'Recipe scaler',
  shortName: 'Scale a recipe',
  category: 'lab-calculators',
  summary: 'Scale a recipe to a different batch size and keep every concentration the same.',
  description:
    'You have a recipe that makes one volume and you need a different one. Enter what the recipe ' +
    'is written for, enter the batch you actually want, and every component scales by the same ' +
    'factor — so 230 µL of a supplement in 10 mL of medium becomes 575 µL in 25 mL, at the same ' +
    'final concentration. Handles as many components as the recipe has, works down as well as up, ' +
    'and tells you how much medium to make up with.',
  keywords: [
    'scale a recipe',
    'scale up',
    'scale down',
    'batch size',
    'unitary method',
    'proportion',
    'ratio',
    'how much for',
    'media supplement',
    'make up to',
    'final concentration',
    'same concentration',
    'bigger batch',
    'multiply recipe',
    'cell culture media',
    'master mix scaling',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Amount concentration, the ratio scaling preserves',
      source: 'IUPAC Compendium of Chemical Terminology (the Gold Book)',
      year: 2019,
      doi: '10.1351/goldbook',
      url: 'https://goldbook.iupac.org/terms/view/A00295',
    },
  ],
  relatedToolIds: ['dilution', 'molarity', 'serial-dilution'],
  reviewedAt: '2026-07-26',
};

import { describe, expect, it } from 'vitest';
import { analyseFilterSet, parseChannels, type ChannelDraft } from './compute';

const draft = (over: Partial<ChannelDraft> & { id: string }): ChannelDraft => ({
  label: over.id,
  laser: '',
  excitationFilter: '',
  dichroic: '',
  emissionFilter: '',
  ...over,
});

/** The standard two-colour arrangement everyone starts from. */
const GREEN = draft({
  id: 'green',
  label: 'GFP',
  laser: '488',
  dichroic: '495 LP',
  emissionFilter: '525/50',
});
const RED = draft({
  id: 'red',
  label: 'RFP',
  laser: '561',
  dichroic: '570 LP',
  emissionFilter: '600/50',
});

describe('parseChannels', () => {
  it('builds a channel from a laser line and two filters', () => {
    const { channels, issues } = parseChannels([GREEN]);
    expect(issues).toEqual([]);
    expect(channels).toHaveLength(1);
    expect(channels[0]!.illumination).toEqual({ kind: 'laser', nm: 488 });
    expect(channels[0]!.emission).toHaveLength(2);
  });

  it('falls back to the excitation filter when no laser is given', () => {
    const { channels, issues } = parseChannels([
      draft({ id: 'a', excitationFilter: '470/40', dichroic: '495 LP', emissionFilter: '525/50' }),
    ]);
    expect(issues).toEqual([]);
    expect(channels[0]!.illumination).toMatchObject({ kind: 'filtered' });
  });

  it('treats the dichroic as optional and the emission filter as required', () => {
    const withoutDichroic = parseChannels([
      draft({ id: 'a', laser: '488', emissionFilter: '525/50' }),
    ]);
    expect(withoutDichroic.issues).toEqual([]);
    expect(withoutDichroic.channels[0]!.emission).toHaveLength(1);

    const withoutEmission = parseChannels([draft({ id: 'a', laser: '488' })]);
    expect(withoutEmission.channels).toHaveLength(0);
    expect(withoutEmission.issues[0]!.field).toBe('emissionFilter');
  });

  it('collects every problem instead of stopping at the first', () => {
    // Someone editing four channels wants all four messages at once.
    const { issues, channels } = parseChannels([
      draft({ id: 'a', laser: 'blue', dichroic: 'wrong', emissionFilter: 'also wrong' }),
    ]);
    expect(channels).toHaveLength(0);
    expect(issues.map((i) => i.field).sort()).toEqual(['dichroic', 'emissionFilter', 'laser']);
  });

  it('rejects a wavelength outside the range the model covers', () => {
    const { issues } = parseChannels([draft({ id: 'a', laser: '50', emissionFilter: '525/50' })]);
    expect(issues[0]!.field).toBe('laser');
  });

  it('keeps good channels when a sibling is broken', () => {
    const { channels, issues } = parseChannels([GREEN, draft({ id: 'bad', laser: '561' })]);
    expect(channels.map((c) => c.id)).toEqual(['green']);
    expect(issues).toHaveLength(1);
  });
});

describe('analyseFilterSet', () => {
  const { channels } = parseChannels([GREEN, RED]);

  it('sends EGFP and mCherry to their own channels with nothing to report', () => {
    const report = analyseFilterSet(['egfp', 'mcherry'], channels);
    expect(report.rows.map((r) => r.homeChannelId)).toEqual(['green', 'red']);
    expect(report.findings.filter((f) => f.severity === 'problem')).toEqual([]);
  });

  it('reports each fluorophore at 100% of its own home channel', () => {
    const report = analyseFilterSet(['egfp'], channels);
    expect(report.rows[0]!.relative.green).toBeCloseTo(1, 12);
  });

  it('flags two fluorophores that land in the same channel as unfixable', () => {
    // EGFP and Alexa Fluor 488 are the same colour twice. The message has to
    // say the filter set cannot help, because that is the actionable part.
    const report = analyseFilterSet(['egfp', 'alexa-488'], channels);
    const problem = report.findings.find((f) => f.severity === 'problem');
    expect(problem?.message).toContain('Nothing in the filter set can separate them');
  });

  it('flags a fluorophore the illumination barely reaches', () => {
    // Neither 488 nor 561 excites a far-red dye worth speaking of.
    const report = analyseFilterSet(['alexa-647'], channels);
    expect(report.findings.some((f) => f.message.includes('different excitation wavelength'))).toBe(
      true,
    );
  });

  it('notices a channel nothing is aimed at', () => {
    const report = analyseFilterSet(['egfp'], channels);
    expect(report.findings.some((f) => f.message.includes('RFP is not the best channel'))).toBe(
      true,
    );
  });

  it('says nothing about an empty channel when nothing is selected at all', () => {
    const report = analyseFilterSet([], channels);
    expect(report.findings).toEqual([]);
    expect(report.rows).toEqual([]);
  });

  it('shows sequential excitation removing the DAPI leak that a shared line would cause', () => {
    // DAPI's emission is broad and does reach the 525/50 band — that part of
    // the classic DAPI-into-GFP bleed is real, and the second assertion below
    // measures it. What removes the problem is exciting the two channels
    // separately: at 488 nm DAPI absorbs nothing whatever, so it contributes
    // exactly zero to a 488-excited channel no matter what its emission does.
    //
    // Getting this the wrong way round is the reason the tool models a channel
    // as an excitation and an emission together rather than as a filter alone.
    const violet = draft({
      id: 'violet',
      label: 'DAPI',
      laser: '405',
      dichroic: '415 LP',
      emissionFilter: '450/50',
    });
    const sequential = parseChannels([violet, GREEN]).channels;
    const report = analyseFilterSet(['dapi'], sequential);
    expect(report.rows[0]!.homeChannelId).toBe('violet');
    expect(report.rows[0]!.relative.green).toBe(0);

    // The same fluorophore and the same emission filter, now sharing the
    // violet line: the leak appears.
    const shared = parseChannels([
      violet,
      draft({ id: 'green', label: 'GFP', laser: '405', emissionFilter: '525/50' }),
    ]).channels;
    expect(analyseFilterSet(['dapi'], shared).rows[0]!.relative.green).toBeGreaterThan(0.05);
  });

  it('gives a composition that sums to one and names anything left out', () => {
    const report = analyseFilterSet(['egfp', 'texas-red'], channels);
    for (const channel of report.composition) {
      const total = channel.shares.reduce((sum, s) => sum + s.share, 0);
      expect(total, channel.channelId).toBeCloseTo(1, 10);
      // Texas Red has no published ε or Φ, so it cannot enter a composition
      // and the tool has to say so rather than quietly dropping it.
      expect(channel.excludedIds).toEqual(['texas-red']);
    }
  });

  it('is unmoved by how bright the fluorophores are', () => {
    // The claim the bleed-through table makes. Rows are the same molecule seen
    // two ways, so ε and Φ cancel; only the composition table depends on them.
    const report = analyseFilterSet(['egfp', 'mcherry'], channels);
    const egfpRow = report.rows.find((r) => r.fluorophore.id === 'egfp')!;
    expect(egfpRow.relative.red).toBeLessThan(0.05);
    expect(egfpRow.relative.red).toBeGreaterThanOrEqual(0);
  });
});

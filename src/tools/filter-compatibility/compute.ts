/**
 * Filter set compatibility.
 *
 * Assembles a set of detection channels from typed filter designations and
 * reports what each will actually see. The optics live in src/lib/bio/optics.ts
 * — this module is the layer that turns user text into channels and channel
 * responses into findings someone can act on.
 *
 * Canonical units: nanometres, and every efficiency a fraction of one.
 */

import {
  OpticsError,
  bleedthrough,
  channelComposition,
  parseFilter,
  type Channel,
  type ChannelComposition,
  type Illumination,
  type OpticalFilter,
} from '@/lib/bio/optics';
import { getFluorophore, type Fluorophore } from '@/lib/bio/spectra';

export { OpticsError } from '@/lib/bio/optics';

/** One channel as the interface holds it, before parsing. */
export interface ChannelDraft {
  id: string;
  label: string;
  /** A laser line in nm, or empty to use the excitation filter instead. */
  laser: string;
  excitationFilter: string;
  dichroic: string;
  emissionFilter: string;
}

export interface ChannelIssue {
  channelId: string;
  field: 'laser' | 'excitationFilter' | 'dichroic' | 'emissionFilter';
  message: string;
}

export interface ParsedChannels {
  channels: Channel[];
  issues: ChannelIssue[];
}

/**
 * Turn drafts into channels, collecting every problem rather than throwing on
 * the first.
 *
 * A user editing four channels wants all four error messages at once; failing
 * fast would make them fix one typo per render.
 */
export function parseChannels(drafts: readonly ChannelDraft[]): ParsedChannels {
  const channels: Channel[] = [];
  const issues: ChannelIssue[] = [];

  for (const draft of drafts) {
    let illumination: Illumination | undefined;

    const laserText = draft.laser.trim();
    if (laserText) {
      const nm = Number(laserText);
      if (!Number.isFinite(nm) || nm < 200 || nm > 1200) {
        issues.push({
          channelId: draft.id,
          field: 'laser',
          message: `"${laserText}" is not a wavelength between 200 and 1200 nm.`,
        });
      } else {
        illumination = { kind: 'laser', nm };
      }
    } else {
      try {
        illumination = { kind: 'filtered', filter: parseFilter(draft.excitationFilter) };
      } catch (caught) {
        issues.push({
          channelId: draft.id,
          field: 'excitationFilter',
          message: caught instanceof OpticsError ? caught.message : 'Could not read that filter.',
        });
      }
    }

    const emission: OpticalFilter[] = [];
    for (const [field, text] of [
      ['dichroic', draft.dichroic],
      ['emissionFilter', draft.emissionFilter],
    ] as const) {
      // A dichroic is optional; an emission filter is not, since without one
      // the "channel" is just the camera looking at everything.
      if (field === 'dichroic' && !text.trim()) continue;
      try {
        emission.push(parseFilter(text));
      } catch (caught) {
        issues.push({
          channelId: draft.id,
          field,
          message: caught instanceof OpticsError ? caught.message : 'Could not read that filter.',
        });
      }
    }

    if (illumination && emission.length > 0) {
      channels.push({ id: draft.id, label: draft.label, illumination, emission });
    }
  }

  return { channels, issues };
}

export interface SpillRow {
  fluorophore: Fluorophore;
  homeChannelId: string;
  /** Fraction of the home-channel signal appearing in each channel. */
  relative: Record<string, number>;
  /** Excitation and collection efficiency in the home channel. */
  homeExcitation: number;
  homeCollection: number;
}

export interface FilterSetReport {
  rows: SpillRow[];
  composition: ChannelComposition[];
  findings: Finding[];
}

export type FindingSeverity = 'problem' | 'caution';

export interface Finding {
  severity: FindingSeverity;
  message: string;
}

/** Bleed-through above this is a real problem, not a rounding correction. */
const SERIOUS_SPILL = 0.1;
/** Below this the channel is collecting so little that noise dominates. */
const WEAK_SIGNAL = 0.05;

export function analyseFilterSet(
  fluorophoreIds: readonly string[],
  channels: readonly Channel[],
): FilterSetReport {
  const fluorophores = fluorophoreIds.map(getFluorophore).filter((f) => f !== undefined);

  const rows: SpillRow[] = [];
  for (const fluorophore of fluorophores) {
    const spill = bleedthrough(fluorophore, channels);
    if (!spill) continue;
    const home = spill.responses[spill.homeChannelId]!;
    rows.push({
      fluorophore,
      homeChannelId: spill.homeChannelId,
      relative: spill.relative,
      homeExcitation: home.excitation,
      homeCollection: home.collection,
    });
  }

  return {
    rows,
    composition: channelComposition(fluorophores, channels),
    findings: findProblems(rows, channels),
  };
}

/**
 * The findings, in the order someone should act on them.
 *
 * Two fluorophores landing in one channel is listed before bleed-through,
 * because it cannot be fixed by adjusting a filter — it means the panel is
 * wrong, not the optics.
 */
function findProblems(rows: readonly SpillRow[], channels: readonly Channel[]): Finding[] {
  const findings: Finding[] = [];
  const channelLabel = (id: string) => channels.find((c) => c.id === id)?.label ?? id;

  const byHome = new Map<string, SpillRow[]>();
  for (const row of rows) {
    byHome.set(row.homeChannelId, [...(byHome.get(row.homeChannelId) ?? []), row]);
  }

  for (const [channelId, sharing] of byHome) {
    if (sharing.length > 1) {
      findings.push({
        severity: 'problem',
        message: `${sharing.map((r) => r.fluorophore.name).join(' and ')} are both brightest in ${channelLabel(channelId)}. Nothing in the filter set can separate them — change a fluorophore, or plan on spectral unmixing.`,
      });
    }
  }

  for (const channel of channels) {
    if (!byHome.has(channel.id) && rows.length > 0) {
      findings.push({
        severity: 'caution',
        message: `${channel.label} is not the best channel for any of these fluorophores. It will collect something, but nothing is being detected there on purpose.`,
      });
    }
  }

  for (const row of rows) {
    for (const channel of channels) {
      if (channel.id === row.homeChannelId) continue;
      const spill = row.relative[channel.id] ?? 0;
      if (spill >= SERIOUS_SPILL) {
        findings.push({
          severity: spill >= 0.25 ? 'problem' : 'caution',
          message: `${row.fluorophore.name} puts ${(spill * 100).toFixed(0)}% of its ${channelLabel(row.homeChannelId)} signal into ${channelLabel(channel.id)}. Acquire a single-label control for it, or narrow the ${channelLabel(channel.id)} emission filter.`,
        });
      }
    }

    if (row.homeExcitation < WEAK_SIGNAL) {
      findings.push({
        severity: 'problem',
        message: `${row.fluorophore.name} is only ${(row.homeExcitation * 100).toFixed(0)}% excited in ${channelLabel(row.homeChannelId)}, its best channel. No emission filter recovers light that was never emitted; this needs a different excitation wavelength.`,
      });
    } else if (row.homeCollection < 0.15) {
      findings.push({
        severity: 'caution',
        message: `${channelLabel(row.homeChannelId)} collects only ${(row.homeCollection * 100).toFixed(0)}% of what ${row.fluorophore.name} emits. Widening the emission filter is the cheapest signal available, if cross-talk allows it.`,
      });
    }
  }

  return findings;
}

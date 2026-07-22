'use client';

import { useState } from 'react';

import type { RevenuePoint } from '@/lib/analytics/reporting';
import { formatCents } from '@/lib/invoicing/money';

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 16 };

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('nl-NL', {
    month: 'short',
    year: '2-digit',
  });
}

/**
 * RevenueChart — Sprint 10 rapportage. Enkele reeks (omzet/maand), dus geen
 * legenda nodig (dataviz-skill § marks-and-anatomy "een enkele reeks heeft
 * geen legendabox nodig"). Handgerold i.p.v. een chart-library: één simpele
 * tijdreeks rechtvaardigt geen nieuwe dependency, en dit geeft volledige
 * controle over de mark-spec (2px lijn, 8px eindmarkers, 2px surface-ring,
 * hairline-gridlines) zonder een derde-partij-theming-laag.
 */
export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-text-muted text-sm">Nog geen omzet in deze periode.</p>;
  }

  const maxCents = Math.max(...points.map((p) => p.totalCents), 1);
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    x: PADDING.left + (points.length > 1 ? index * stepX : plotWidth / 2),
    y: PADDING.top + plotHeight - (point.totalCents / maxCents) * plotHeight,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;
  const activeCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div>
      {/*
        role="group" i.p.v. "img": de punten hieronder zijn echte, focusbare
        interactieve controls (hover/focus-tooltip) — axe's "nested-
        interactive"-regel verbiedt focusbare content binnen role="img"
        (dat impliceert statische, niet-interactieve content).
      */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label="Omzet per maand"
        className="w-full"
      >
        {/* Gridlines: hairline, recessive (dataviz-skill: one-step-off-surface gray). */}
        {[0, 0.5, 1].map((fraction) => {
          const y = PADDING.top + plotHeight * fraction;
          return (
            <line
              key={fraction}
              x1={PADDING.left}
              y1={y}
              x2={WIDTH - PADDING.right}
              y2={y}
              className="stroke-border"
              strokeWidth={1}
            />
          );
        })}

        <path
          d={linePath}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((coord, index) => (
          <g key={points[index]!.period}>
            <circle
              cx={coord.x}
              cy={coord.y}
              r={5}
              className="fill-primary stroke-surface"
              strokeWidth={2}
            />
            {/* Onzichtbare, ruimere hit-area voor hover/focus (dataviz-skill: ≥24px). */}
            <circle
              cx={coord.x}
              cy={coord.y}
              r={12}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${formatPeriodLabel(points[index]!.period)}: ${formatCents(points[index]!.totalCents)}`}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(index)}
              onBlur={() => setHoverIndex(null)}
            />
          </g>
        ))}

        {coords.map((coord, index) =>
          index === 0 || index === coords.length - 1 ? (
            <text
              key={points[index]!.period}
              x={coord.x}
              y={HEIGHT - 8}
              textAnchor={index === 0 ? 'start' : 'end'}
              className="fill-text-muted text-[10px]"
            >
              {formatPeriodLabel(points[index]!.period)}
            </text>
          ) : null,
        )}
      </svg>

      {activePoint && activeCoord ? (
        <div className="text-text-muted text-xs" aria-live="polite">
          <span className="text-text font-semibold">{formatCents(activePoint.totalCents)}</span> —{' '}
          {formatPeriodLabel(activePoint.period)}
        </div>
      ) : (
        <div className="text-text-muted text-xs">
          Laatste maand:{' '}
          <span className="text-text font-semibold">
            {formatCents(points[points.length - 1]!.totalCents)}
          </span>
        </div>
      )}

      {/* Tabelweergave — dataviz-skill § final accessibility pass: "a table view exists". */}
      <table className="mt-3 w-full text-left text-xs">
        <caption className="sr-only">Omzet per maand</caption>
        <thead className="text-text-muted">
          <tr>
            <th className="py-1 font-medium">Maand</th>
            <th className="py-1 font-medium">Omzet</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.period} className="border-border border-t">
              <td className="py-1">{formatPeriodLabel(point.period)}</td>
              <td className="py-1 tabular-nums">{formatCents(point.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

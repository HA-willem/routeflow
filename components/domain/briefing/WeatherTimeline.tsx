'use client';

import { ChevronDown, CloudRain, Sun, Thermometer, Wind } from 'lucide-react';
import { useId, useState } from 'react';

import type { WeatherDay } from '@/lib/briefing/types';
import { cn } from '@/lib/utils';

import { AiPreviewBadge } from './AiPreviewBadge';

interface WeatherTimelineProps {
  weather: WeatherDay;
  aiPreview: boolean;
}

/**
 * Weer als dagtijdlijn (44 § 3.3/§ 7) — standaard samengevouwen tot de
 * kernregel, uitklapbaar naar een uur-voor-uur regenlijn met temperatuur en
 * wind. Eén rustig signaal per uur, geen drukke grafiek.
 */
export function WeatherTimeline({ weather, aiPreview }: WeatherTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const rainy = weather.hours.some((h) => h.precipitationChance >= 70);
  const Icon = rainy ? CloudRain : Sun;

  return (
    <section aria-label="Weer" className="border-border bg-bg rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="hover:bg-surface flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors duration-150"
      >
        <Icon aria-hidden className="text-text-muted size-4 shrink-0" />
        <span className="text-text min-w-0 flex-1 truncate text-sm">{weather.summaryLine}</span>
        <span className="text-text-muted hidden shrink-0 items-center gap-3 text-xs tabular-nums sm:flex">
          <span className="flex items-center gap-1">
            <Thermometer aria-hidden className="size-3" />
            {weather.minTemp}–{weather.maxTemp} °C
          </span>
          <span className="flex items-center gap-1">
            <Wind aria-hidden className="size-3" />
            {weather.maxWindBft} Bft
          </span>
        </span>
        {aiPreview ? <AiPreviewBadge /> : null}
        <ChevronDown
          aria-hidden
          className={cn(
            'text-text-muted size-4 shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div id={panelId} className="border-border border-t px-4 py-4">
          <p className="text-text-muted pb-3 text-xs">
            Neerslagkans per uur binnen het werkvenster
          </p>
          <div className="flex items-end gap-1" role="img" aria-label={weatherAlt(weather)}>
            {weather.hours.map((hour) => {
              const heavy = hour.precipitationChance >= 70;
              return (
                <div key={hour.hour} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-text-muted text-[10px] tabular-nums">
                    {hour.precipitationChance}%
                  </span>
                  <div className="bg-surface flex h-16 w-full items-end overflow-hidden rounded-sm">
                    <div
                      className={cn(
                        'w-full rounded-sm transition-[height] duration-200',
                        heavy ? 'bg-info' : 'bg-info/30',
                      )}
                      style={{ height: `${Math.max(hour.precipitationChance, 4)}%` }}
                    />
                  </div>
                  <span className="text-text-muted text-[10px] tabular-nums">
                    {String(hour.hour).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-text-muted flex gap-4 pt-3 text-xs">
            <span className="flex items-center gap-1">
              <Thermometer aria-hidden className="size-3" />
              {weather.minTemp} tot {weather.maxTemp} °C
            </span>
            <span className="flex items-center gap-1">
              <Wind aria-hidden className="size-3" />
              maximaal {weather.maxWindBft} Bft
            </span>
            {weather.affectedJobs > 0 ? (
              <span className="text-warning font-medium">
                {weather.affectedJobs} {weather.affectedJobs === 1 ? 'beurt' : 'beurten'} geraakt —
                zie voorstellen
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function weatherAlt(weather: WeatherDay): string {
  const wetHours = weather.hours.filter((h) => h.precipitationChance >= 70).map((h) => h.hour);
  if (wetHours.length === 0) return 'Uurlijkse regenkans: de hele werkdag droog.';
  return `Uurlijkse regenkans: hoge kans op regen vanaf ${wetHours[0]}:00.`;
}

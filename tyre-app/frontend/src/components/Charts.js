// src/components/Charts.js
import React from 'react';

export function DonutChart({ segments, size = 140, stroke = 22, label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const arcs = segments.map(seg => {
    const dashLen = (seg.pct / 100) * circ;
    const dashGap = circ - dashLen;
    const arc = { ...seg, dashLen, dashGap, offset };
    offset += dashLen;
    return arc;
  });

  return (
    <div className="an-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8eef6" strokeWidth={stroke} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeDasharray={`${arc.dashLen} ${arc.dashGap}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="an-donut-center">
        <strong>{label}</strong>
        <span>{sublabel}</span>
      </div>
    </div>
  );
}

export function BarChart({ data, color = '#003087', accentColor = '#F5A800', maxVal, height = 140 }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="an-bar-chart" style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max(2, (d.value / max) * 100);
        return (
          <div key={i} className="an-bar-col">
            <div className="an-bar-val">{d.value}</div>
            <div className="an-bar-track">
              <div
                className="an-bar-fill"
                style={{
                  height: `${pct}%`,
                  background: d.highlight
                    ? `linear-gradient(180deg, ${accentColor}, #d68b00)`
                    : `linear-gradient(180deg, ${color}cc, ${color})`,
                }}
              />
            </div>
            <div className="an-bar-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function SparkLine({ points, color = '#003087', width = 200, height = 60 }) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const coords = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * w,
    y: pad + h - ((v - min) / range) * h,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${coords[coords.length - 1].x.toFixed(1)},${(pad + h).toFixed(1)} L${coords[0].x.toFixed(1)},${(pad + h).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill={color} />
      ))}
    </svg>
  );
}

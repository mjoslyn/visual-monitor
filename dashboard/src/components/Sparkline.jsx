export default function Sparkline({ data, width = 120, height = 32, threshold, color = '#00e5ff' }) {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.changePercent);
  const max = Math.max(...values, threshold || 0, 1);
  const min = 0;
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Area fill path
  const areaPath = `M0,${height} L${points.map((p) => p).join(' L')} L${width},${height} Z`;

  // Threshold line y position
  const thresholdY = threshold != null
    ? height - ((threshold - min) / range) * (height - 4) - 2
    : null;

  const lastValue = values[values.length - 1];
  const lastX = width;
  const lastY = height - ((lastValue - min) / range) * (height - 4) - 2;

  return (
    <svg width={width} height={height} className="overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.08} />

      {/* Main line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Threshold line */}
      {thresholdY != null && (
        <line
          x1={0}
          y1={thresholdY}
          x2={width}
          y2={thresholdY}
          stroke="#ff3d71"
          strokeWidth={0.5}
          strokeDasharray="3 3"
          opacity={0.5}
        />
      )}

      {/* End dot */}
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
      <circle cx={lastX} cy={lastY} r={5} fill={color} opacity={0.2} />
    </svg>
  );
}

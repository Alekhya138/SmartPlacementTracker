/* ============================================================
   READINESS GAUGE — semi-circle instrument with HOLD/CAUTION/GO
   zones, tick marks, and a needle. Score 0–100.
   ============================================================ */

function polarToCartesian(cx, cy, r, angleDeg){
  const rad = (angleDeg) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle){
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = (startAngle - endAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function renderGauge(score){
  score = Math.max(0, Math.min(100, score));
  const cx = 110, cy = 110, r = 90;

  // score 0-100 maps to angle 180 (left) -> 0 (right)
  const needleAngle = 180 - (score / 100) * 180;
  const needleTip = polarToCartesian(cx, cy, r - 14, needleAngle);

  const holdEnd = 180 - (45 / 100) * 180;   // 0-45 hold
  const cautionEnd = 180 - (75 / 100) * 180; // 45-75 caution

  const svg = `
  <svg width="220" height="130" viewBox="0 0 220 130">
    <path d="${arcPath(cx, cy, r, 180, holdEnd)}" stroke="#FF6B6B" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path d="${arcPath(cx, cy, r, holdEnd, cautionEnd)}" stroke="#F2B705" stroke-width="14" fill="none" opacity="0.9"/>
    <path d="${arcPath(cx, cy, r, cautionEnd, 0)}" stroke="#3DDC97" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.9"/>
    <line x1="${cx}" y1="${cy}" x2="${needleTip.x}" y2="${needleTip.y}" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="var(--text)"/>
    <text x="${cx}" y="${cy - 26}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="30" font-weight="600" fill="var(--text)">${Math.round(score)}</text>
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="var(--text-muted)">READINESS / 100</text>
  </svg>`;

  document.getElementById("gauge-holder").innerHTML = svg;

  const badge = document.getElementById("readiness-badge");
  const status = readinessStatus(score);
  badge.textContent = score >= 75 ? "GO" : score >= 45 ? "CAUTION" : "HOLD";
  badge.className = "gauge-status " + status.cls;
}

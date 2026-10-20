/**
 * FertilityTrendChart.jsx — Recharts line chart with gradient fill
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Area, AreaChart, Dot
} from 'recharts';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const cls = val >= 70 ? 'text-green-600' : val >= 40 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-100 shadow-card-hover px-4 py-2.5">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-base font-black ${cls}`}>{val}<span className="text-xs font-medium text-gray-300">/100</span></p>
    </div>
  );
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = payload.score >= 70 ? '#22c55e' : payload.score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
    </g>
  );
};

export default function FertilityTrendChart({ points }) {
  if (!points?.length) {
    return (
      <div className="text-center py-8 text-xs text-gray-300">
        Complete more assessments to see your soil fertility trend here.
      </div>
    );
  }

  const data = points.map(p => ({
    date:  format(new Date(p.date), 'MMM d'),
    score: p.score,
    class: p.fertilityClass,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Fertility zone bands */}
        <ReferenceArea y1={0}  y2={40}  fill="#fef2f2" fillOpacity={0.5} />
        <ReferenceArea y1={40} y2={70}  fill="#fffbeb" fillOpacity={0.5} />
        <ReferenceArea y1={70} y2={100} fill="#f0fdf4" fillOpacity={0.5} />

        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone" dataKey="score"
          stroke="#16a34a" strokeWidth={2.5}
          fill="url(#scoreGradient)"
          dot={<CustomDot />}
          activeDot={{ r: 7, fill: '#16a34a', stroke: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

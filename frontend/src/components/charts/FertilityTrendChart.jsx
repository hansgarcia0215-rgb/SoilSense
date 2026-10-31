/**
 * FertilityTrendChart.jsx — Recharts line chart for the soil-condition index
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Area, AreaChart, Dot
} from 'recharts';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const cls = val >= 70 ? 'text-green-700' : val >= 40 ? 'text-soil-700' : 'text-[#a8402f]';
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-100 shadow-card-hover px-4 py-2.5">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-base font-black ${cls}`}>{val}<span className="text-xs font-medium text-gray-300"> index /100</span></p>
    </div>
  );
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = payload.score >= 70 ? '#4a652e' : payload.score >= 40 ? '#b0722a' : '#a8402f';
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
    </g>
  );
};

export default function FertilityTrendChart({ points }) {
  if (!points?.length) {
    return (
      <div className="text-center py-8 text-xs text-gray-500">
        Complete assessments with valid input data to see the soil-condition index trend.
      </div>
    );
  }

  const data = points.map(p => ({
    date:  format(new Date(p.date), 'MMM d'),
    score: p.score,
    class: p.screeningClass,
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

        {/* Screening-index reference bands */}
        <ReferenceArea y1={0}  y2={40}  fill="#f7e8e0" fillOpacity={0.5} />
        <ReferenceArea y1={40} y2={70}  fill="#f7efdc" fillOpacity={0.5} />
        <ReferenceArea y1={70} y2={100} fill="#eef3e4" fillOpacity={0.5} />

        <CartesianGrid strokeDasharray="3 3" stroke="#e8e0cd" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a3937a' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a3937a' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone" dataKey="score"
          stroke="#4a652e" strokeWidth={2.5}
          fill="url(#scoreGradient)"
          dot={<CustomDot />}
          activeDot={{ r: 7, fill: '#3c5226', stroke: '#fffdf8', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

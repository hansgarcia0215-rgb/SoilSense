/**
 * CropComparison.jsx — Side-by-side crop comparison table
 * Shows Best / Second-Best / Not Suitable in a grid with factor scores.
 */

const FACTOR_LABELS = {
  fertility:    'Fertility Match',
  pH:           'pH Compatibility',
  ph:           'pH Compatibility',
  moisture:     'Moisture Match',
  soilCondition:'Soil Condition',
  location:     'Location',
};

function Cell({ score }) {
  if (score == null) return <td className="px-3 py-2 text-center text-gray-300">—</td>;
  const icon  = score >= 70 ? '✓' : score >= 50 ? '△' : '✕';
  const color = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-400';
  return (
    <td className="px-3 py-2 text-center">
      <span className={`font-bold text-sm ${color}`}>{icon}</span>
      <span className="text-xs text-gray-400 ml-1">{score?.toFixed(0)}%</span>
    </td>
  );
}

export default function CropComparison({ crops }) {
  if (!crops?.length) return null;

  const factors = crops[0]?.componentScores
    ? Object.keys(crops[0].componentScores)
    : [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase">Factor</th>
            {crops.map(c => (
              <th key={c.cropId} className="px-3 py-2 text-center">
                <div className="font-bold text-gray-800 text-sm">{c.cropName}</div>
                <div className={`text-xs font-bold ${
                  c.status === 'BEST'        ? 'text-green-600' :
                  c.status === 'SECOND_BEST' ? 'text-blue-600'  : 'text-red-400'}`}>
                  {c.status === 'BEST' ? '🥇' : c.status === 'SECOND_BEST' ? '🥈' : '🚫'}
                  {' '}{c.suitabilityScore?.toFixed(0)}%
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {factors.map(key => (
            <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-3 py-2 text-xs font-medium text-gray-600">
                {FACTOR_LABELS[key] || key}
              </td>
              {crops.map(c => <Cell key={c.cropId} score={c.componentScores?.[key]} />)}
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
            <td className="px-3 py-2 text-xs font-bold text-gray-700 uppercase">Overall</td>
            {crops.map(c => (
              <td key={c.cropId} className="px-3 py-2 text-center">
                <span className={`font-black text-sm ${
                  c.suitabilityScore >= 70 ? 'text-green-600' :
                  c.suitabilityScore >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
                  {c.suitabilityScore?.toFixed(0)}%
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

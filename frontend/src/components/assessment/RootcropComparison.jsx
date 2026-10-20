/**
 * RootcropComparison.jsx — Side-by-side rootcrop comparison table
 *
 * Displays all three ranked crops in a comparison grid showing
 * individual factor scores with visual icons.
 */

const FACTOR_LABELS = {
  ph:           'pH Compatibility',
  moisture:     'Moisture Match',
  fertility:    'Fertility Match',
  soilCondition:'Soil Condition',
  location:     'Location',
};

function ScoreCell({ score }) {
  if (score == null) return <td className="px-3 py-2 text-center text-gray-300">—</td>;
  const icon = score >= 70 ? '✓' : score >= 50 ? '△' : '✕';
  const color = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-400';
  return (
    <td className="px-3 py-2 text-center">
      <span className={`font-bold text-sm ${color}`}>{icon}</span>
      <span className="text-xs text-gray-400 ml-1">{score?.toFixed(0)}%</span>
    </td>
  );
}

export default function RootcropComparison({ rootcrops }) {
  if (!rootcrops || rootcrops.length === 0) return null;

  const headers = ['Factor', ...rootcrops.map(r => r.cropName)];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
              Factor
            </th>
            {rootcrops.map(r => (
              <th key={r.cropId} className="px-3 py-2 text-center">
                <div className="text-sm font-bold text-gray-800">{r.cropName}</div>
                <div className={`text-xs font-bold ${
                  r.status === 'BEST'         ? 'text-green-600' :
                  r.status === 'SECOND_BEST'  ? 'text-blue-600'  : 'text-red-400'}`}>
                  {r.status === 'BEST' ? '🥇' : r.status === 'SECOND_BEST' ? '🥈' : '🚫'}{' '}
                  {r.suitabilityScore?.toFixed(0)}%
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(FACTOR_LABELS).map(([key, label]) => (
            <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-3 py-2 text-xs font-medium text-gray-600">{label}</td>
              {rootcrops.map(r => (
                <ScoreCell key={r.cropId} score={r.componentScores?.[key]} />
              ))}
            </tr>
          ))}
          {/* Overall row */}
          <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
            <td className="px-3 py-2 text-xs font-bold text-gray-700 uppercase">Overall</td>
            {rootcrops.map(r => (
              <td key={r.cropId} className="px-3 py-2 text-center">
                <span className={`font-black text-sm ${
                  r.suitabilityScore >= 70 ? 'text-green-600' :
                  r.suitabilityScore >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
                  {r.suitabilityScore?.toFixed(0)}%
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

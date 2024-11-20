import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const StatsOverTime = ({ data }) => {
  const chartData = data.map(item => ({
    date: new Date(item.observation_date).toLocaleDateString(),
    min: item.stats.min,
    max: item.stats.max,
    mean: item.stats.mean,
    stdev: item.stats.stdev
  }));

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mt-4">
      <h2 className="text-lg font-bold mb-4">Statistics Over Time</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="min" stroke="#8884d8" />
            <Line type="monotone" dataKey="max" stroke="#82ca9d" />
            <Line type="monotone" dataKey="mean" stroke="#ffc658" />
            <Line type="monotone" dataKey="stdev" stroke="#ff7300" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DataSummary = ({ data }) => {
  const totalObservations = data.length;
  const averageIntensity = data.reduce((acc, curr) => acc + curr.stats.mean, 0) / totalObservations;
  const maxIntensity = Math.max(...data.map(item => item.stats.max));
  const minIntensity = Math.min(...data.map(item => item.stats.min));

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mt-4">
      <h2 className="text-lg font-bold mb-4">Summary Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Total Observations</div>
          <div className="text-lg font-semibold">{totalObservations}</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Average Intensity</div>
          <div className="text-lg font-semibold">{averageIntensity.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Maximum Intensity</div>
          <div className="text-lg font-semibold">{maxIntensity.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Minimum Intensity</div>
          <div className="text-lg font-semibold">{minIntensity.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default function EnhancedStats({ selectedYear, fitsData }) {
  const dataArray = Object.entries(fitsData)
    .filter(([key]) => key.startsWith(selectedYear))
    .map(([_, data]) => data);

  if (dataArray.length === 0) {
    return null;
  }

  return (
    <>
      <DataSummary data={dataArray} />
      <StatsOverTime data={dataArray} />
    </>
  );
}
import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

const statsDescriptions = {
  min: 'Minimum pixel intensity value in the image.',
  max: 'Maximum pixel intensity value in the image.',
  mean: 'Average pixel intensity value in the image.',
  stdev: 'Standard deviation of pixel intensity values in the image.',
};

const StatCard = ({ label, value, description }: { label: string; value: number; description: string }) => (
  <div className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-help">
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-500 capitalize">{label}</span>
      <Info className="w-4 h-4 text-gray-400" />
    </div>
    <div className="text-lg font-semibold">{value.toFixed(2)}</div>
    <div className="max-w-xs p-2 text-sm">{description}</div>
  </div>
);

const ImageExplanation = () => (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
    <h3 className="font-semibold mb-2">Understanding the Image</h3>
    <ul className="list-disc list-inside space-y-2 text-sm">
      <li>X-axis: Solar East-West direction (in pixels)</li>
      <li>Y-axis: Solar North-South direction (in pixels)</li>
      <li>Brighter regions indicate stronger EUV emission at 94 Å</li>
      <li>Active regions appear as bright areas (~6 million Kelvin plasma)</li>
      <li>Dark regions represent quieter areas of the Sun</li>
    </ul>
  </div>
);

const HistogramExplanation = () => (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
    <h3 className="font-semibold mb-2">Understanding the Histogram</h3>
    <ul className="list-disc list-inside space-y-2 text-sm">
      <li>X-axis: Pixel intensity values (in DNs - Digital Numbers)</li>
      <li>Y-axis: Frequency (number of pixels with that value)</li>
      <li>The distribution is typically skewed because:</li>
      <ul className="list-circle list-inside ml-4 space-y-1 text-sm">
        <li>Most of the image is relatively dark (quiet sun)</li>
        <li>A few regions are very bright (active regions)</li>
        <li>Often follows a log-normal distribution</li>
      </ul>
    </ul>
  </div>
);

const FITSDataDisplay = ({ data }: { data: FITSData }) => {
  const [activeTab, setActiveTab] = useState('image');
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Solar Observation</h2>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            {showExplanation ? 'Hide' : 'Show'} Explanations
          </button>
        </div>
        <div className="mt-4">
          <div className="flex justify-between">
            <button onClick={() => setActiveTab('image')} className={`p-2 ${activeTab === 'image' ? 'bg-blue-200' : 'bg-gray-200'} rounded-l`}>
              Solar Image
            </button>
            <button onClick={() => setActiveTab('histogram')} className={`p-2 ${activeTab === 'histogram' ? 'bg-blue-200' : 'bg-gray-200'} rounded-r`}>
              Intensity Distribution
            </button>
          </div>
          {activeTab === 'image' && (
            <div className="mt-4">
              <img 
                src={`data:image/png;base64,${data.image}`}
                alt="FITS visualization"
                className="w-full max-w-2xl mx-auto"
              />
              {showExplanation && <ImageExplanation />}
            </div>
          )}
          {activeTab === 'histogram' && (
            <div className="mt-4">
              <img 
                src={`data:image/png;base64,${data.histogram}`}
                alt="Pixel value histogram"
                className="w-full max-w-2xl mx-auto"
              />
              {showExplanation && <HistogramExplanation />}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-lg font-bold">Image Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {Object.entries(data.stats).map(([key, value]) => (
            <StatCard
              key={key}
              label={key}
              value={value}
              description={statsDescriptions[key]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface FITSData {
  stats: {
    min: number;
    max: number;
    mean: number;
    stdev: number;
  };
  histogram: string;
  image: string;
}

const App = () => {
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [files, setFiles] = useState<{ [year: string]: string[] }>({});
  const [fitsData, setFitsData] = useState<{ [key: string]: FITSData }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedObservatory, setSelectedObservatory] = useState<string>('AIA_level_1.5');

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchFilesForYear(selectedYear);
    }
  }, [selectedYear]);

  const fetchYears = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/years');
      const data = await response.json();
      setYears(data);
      if (data.length > 0) {
        setSelectedYear(data[0]);
      }
    } catch (error) {
      setError('Failed to fetch years');
    }
  };

  const fetchFilesForYear = async (year: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/files/${year}`);
      const data = await response.json();
      setFiles(prev => ({ ...prev, [year]: data }));
    } catch (error) {
      setError(`Failed to fetch files for year ${year}`);
    }
  };

  const fetchFITSData = async (year: string, filename: string) => {
    const key = `${year}/${filename}`;
    if (fitsData[key]) return; // Don't fetch if we already have the data

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/fits-data/${year}/${filename}`);
      const data = await response.json();
      if (response.ok) {
        setFitsData(prev => ({ ...prev, [key]: data }));
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to fetch FITS data');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gradient-to-r from-blue-200 to-purple-300 p-4 w-screen h-screen overflow-scroll overflow-x-hidden">
      {/* Navbar */}
      <nav className="w-full bg-gray-800 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-xl">Solar Observation Dashboard</h1>
          <select 
            value={selectedObservatory} 
            onChange={(e) => setSelectedObservatory(e.target.value)} 
            className="bg-gray-700 text-white p-2 rounded"
          >
            <option value="AIA_level_1.5">AIA Level 1.5</option>
            {/* Add more observatories here */}
          </select>
        </div>
      </nav>

      {/* Hook Line */}
      <div className="mt-4 text-center">
        <h2 className="text-2xl font-bold">Explore Solar Observations</h2>
        <p className="text-gray-600">Dive into the data and understand the solar phenomena.</p>
      </div>

      <div className="w-full max-w-4xl mt-6">
        <div className="flex flex-wrap">
          {years.map(year => (
            <button 
              key={year} 
              onClick={() => setSelectedYear(year)}
              className="flex-1 p-2 m-1 text-center bg-gray-200 rounded hover:bg-gray-300"
            >
              {year}
            </button>
          ))}
        </div>

        {years.map(year => (
          <div key={year} className={`mt-4 ${selectedYear === year ? 'block' : 'hidden'}`}>
            <Accordion year={year} files={files[year]} fetchFITSData={fetchFITSData} loading={loading} fitsData={fitsData} />
          </div>
        ))}
      </div>
    </div>
  );
};

const Accordion = ({ year, files, fetchFITSData, loading, fitsData }) => (
  <div className="bg-white shadow-md rounded-lg p-4">
    <h2 className="text-lg font-bold">{year} Files</h2>
    <div className="space-y-2 mt-4">
      {files?.map(filename => (
        <div key={filename} className="border-b border-gray-300 pb-2">
          <button 
            onClick={() => fetchFITSData(year, filename)}
            className="text-left w-full text-blue-600 hover:underline"
          >
            {filename}
          </button>
          <div>
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : (
              fitsData[`${year}/${filename}`] && (
                <FITSDataDisplay data={fitsData[`${year}/${filename}`]} />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default App;

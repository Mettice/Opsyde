// components/rich-content/renderers/ChartRenderer.jsx
import React, { useMemo, useState, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';

// Lazy load Chart.js for better performance
const Chart = lazy(() => import('react-chartjs-2'));

// Chart.js components - import only what we need
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ChartRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [chartType, setChartType] = useState(metadata?.chart_type || 'bar');
  const [showRawData, setShowRawData] = useState(false);

  // Process and validate chart data
  const chartData = useMemo(() => {
    if (!content) return null;

    try {
      // Handle different data formats
      let processedData = null;

      // Already in Chart.js format
      if (content.labels && content.datasets) {
        processedData = content;
      }
      // Object with data property
      else if (content.data && (content.labels || content.datasets)) {
        processedData = {
          labels: content.labels || [],
          datasets: content.datasets || []
        };
      }
      // Array of objects - convert to chart data
      else if (Array.isArray(content) && content.length > 0) {
        if (typeof content[0] === 'object' && content[0] !== null) {
          // Detect keys for labels and values
          const firstItem = content[0];
          const keys = Object.keys(firstItem);
          
          // Common label keys
          const labelKey = keys.find(key => 
            ['label', 'name', 'category', 'date', 'time', 'x'].includes(key.toLowerCase())
          ) || keys[0];
          
          // Common value keys
          const valueKey = keys.find(key => 
            ['value', 'count', 'amount', 'total', 'y', 'data'].includes(key.toLowerCase())
          ) || keys[1] || keys[0];

          const labels = content.map(item => String(item[labelKey] || ''));
          const values = content.map(item => Number(item[valueKey]) || 0);

          processedData = {
            labels,
            datasets: [{
              label: metadata?.title || valueKey || 'Data',
              data: values,
              backgroundColor: generateColors(values.length, 0.8),
              borderColor: generateColors(values.length, 1),
              borderWidth: 1
            }]
          };
        }
        // Array of numbers
        else if (content.every(item => typeof item === 'number')) {
          processedData = {
            labels: content.map((_, index) => `Item ${index + 1}`),
            datasets: [{
              label: metadata?.title || 'Values',
              data: content,
              backgroundColor: generateColors(content.length, 0.8),
              borderColor: generateColors(content.length, 1),
              borderWidth: 1
            }]
          };
        }
      }
      // Single object with key-value pairs
      else if (typeof content === 'object' && content !== null) {
        const entries = Object.entries(content);
        const labels = entries.map(([key]) => key);
        const values = entries.map(([, value]) => Number(value) || 0);

        processedData = {
          labels,
          datasets: [{
            label: metadata?.title || 'Values',
            data: values,
            backgroundColor: generateColors(values.length, 0.8),
            borderColor: generateColors(values.length, 1),
            borderWidth: 1
          }]
        };
      }

      return processedData;
    } catch (error) {
      console.error('Error processing chart data:', error);
      return null;
    }
  }, [content, metadata]);

  // Generate colors for chart
  const generateColors = (count, alpha = 1) => {
    const colors = [
      `rgba(54, 162, 235, ${alpha})`,   // Blue
      `rgba(255, 99, 132, ${alpha})`,   // Red
      `rgba(255, 205, 86, ${alpha})`,   // Yellow
      `rgba(75, 192, 192, ${alpha})`,   // Green
      `rgba(153, 102, 255, ${alpha})`,  // Purple
      `rgba(255, 159, 64, ${alpha})`,   // Orange
      `rgba(199, 199, 199, ${alpha})`,  // Grey
      `rgba(83, 102, 255, ${alpha})`,   // Indigo
      `rgba(255, 99, 255, ${alpha})`,   // Pink
      `rgba(99, 255, 132, ${alpha})`,   // Light Green
    ];

    // Repeat colors if we need more
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  // Chart configuration
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          display: displayMode !== 'minimal'
        },
        title: {
          display: !!metadata?.title && displayMode !== 'minimal',
          text: metadata?.title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    };

    // Chart type specific options
    if (chartType === 'pie' || chartType === 'doughnut') {
      delete baseOptions.scales;
    }

    if (chartType === 'line') {
      baseOptions.elements = {
        point: {
          radius: 4,
          hoverRadius: 6
        },
        line: {
          tension: 0.1
        }
      };
    }

    return baseOptions;
  }, [metadata, displayMode, chartType]);

  // Export chart as image
  const exportChart = () => {
    const canvas = document.querySelector('.chart-container canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Export data as CSV
  const exportData = () => {
    if (!chartData) return;

    const csv = [
      ['Label', ...chartData.datasets.map(d => d.label)].join(','),
      ...chartData.labels.map((label, index) => 
        [label, ...chartData.datasets.map(d => d.data[index])].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chart-data-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Loading fallback
  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-600">Loading chart...</span>
      </div>
    </div>
  );

  if (!chartData) {
    return (
      <div className="chart-container bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-yellow-600 text-4xl mb-2">📊</div>
        <h3 className="font-medium text-yellow-800 mb-1">Unable to render chart</h3>
        <p className="text-yellow-700 text-sm">
          The data format is not supported for chart visualization
        </p>
        {displayMode !== 'minimal' && (
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="mt-3 px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded transition-colors"
          >
            {showRawData ? 'Hide' : 'Show'} Raw Data
          </button>
        )}
        {showRawData && (
          <pre className="mt-3 text-left text-xs text-gray-600 bg-white p-3 rounded overflow-auto max-h-32">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="chart-container space-y-4">
      {/* Header */}
      {metadata?.title && displayMode !== 'minimal' && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2">📊</span>
            {metadata.title}
          </h3>
        </div>
      )}

      {/* Chart controls */}
      {displayMode !== 'minimal' && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Chart Type:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="doughnut">Doughnut Chart</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportData}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              💾 Export Data
            </button>
            <button
              onClick={exportChart}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              📸 Export Image
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div 
          className="chart-container"
          style={{ 
            height: displayMode === 'minimal' ? '200px' : '400px',
            position: 'relative'
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Chart type={chartType} data={chartData} options={chartOptions} />
          </Suspense>
        </div>
      </div>

      {/* Chart statistics */}
      {displayMode === 'immersive' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Data Points</div>
            <div className="text-lg font-semibold text-blue-800">
              {chartData.labels.length}
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 mb-1">Datasets</div>
            <div className="text-lg font-semibold text-green-800">
              {chartData.datasets.length}
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">Max Value</div>
            <div className="text-lg font-semibold text-purple-800">
              {Math.max(...chartData.datasets.flatMap(d => d.data))}
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600 mb-1">Chart Type</div>
            <div className="text-lg font-semibold text-orange-800 capitalize">
              {chartType}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ChartRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default ChartRenderer;
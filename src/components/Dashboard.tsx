// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Thermometer, Droplets, Gauge, Wind, Activity, RefreshCw, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState('DASMA-05');
  const [nodes, setNodes] = useState([]);
  const [error, setError] = useState(null);

  // Fetch available nodes
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const nodesSnapshot = await getDocs(collection(db, 'nodes'));
        const nodesList = nodesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNodes(nodesList);
      } catch (err) {
        console.error('Error fetching nodes:', err);
      }
    };
    fetchNodes();
  }, []);

  // Fetch readings for selected node
  useEffect(() => {
    if (!selectedNode) return;

    setLoading(true);
    setError(null);

    // Query latest 20 readings for the selected node
    const q = query(
      collection(db, 'readings'),
      where('nodeId', '==', selectedNode),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
        }));
        setReadings(data);
        setLatestReading(data[0] || null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching readings:', err);
        setError('Failed to load sensor data. Please check your connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedNode]);

  // Get AQI status and color
  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return { label: 'Good', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' };
    if (aqi <= 100) return { label: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' };
    return { label: 'Very Unhealthy', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' };
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    try {
      return new Date(timestamp).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '--';
    }
  };

  if (loading && readings.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const aqiStatus = latestReading ? getAQIStatus(latestReading.aqi) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Environmental Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time air quality and weather monitoring</p>
      </div>

      {/* Node Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Node</label>
        <select
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {nodes.length > 0 ? (
            nodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.id} - {node.barangay || 'Unassigned'}
              </option>
            ))
          ) : (
            <>
              <option value="DASMA-05">DASMA-05</option>
              <option value="DASMA-01">DASMA-01</option>
              <option value="DASMA-02">DASMA-02</option>
              <option value="DASMA-03">DASMA-03</option>
              <option value="DASMA-04">DASMA-04</option>
            </>
          )}
        </select>
      </div>

      {/* Current Readings Cards */}
      {latestReading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Temperature Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <Thermometer className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-xs text-gray-400">Real-time</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">
                {latestReading.temp?.toFixed(1) || '--'}
              </span>
              <span className="text-gray-500 ml-2">°C</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {latestReading.temp >= 35 ? '⚠️ Heat advisory' : 'Normal temperature'}
            </p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Last update: {formatTime(latestReading.timestamp)}
              </p>
            </div>
          </div>

          {/* Pressure Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Gauge className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-400">Barometric</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">
                {latestReading.pressure?.toFixed(1) || '--'}
              </span>
              <span className="text-gray-500 ml-2">hPa</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {latestReading.pressure < 1010 ? 'Low pressure system' : 
               latestReading.pressure > 1020 ? 'High pressure system' : 
               'Normal pressure'}
            </p>
          </div>

          {/* Air Quality Card */}
          <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${aqiStatus?.bgLight || 'bg-gray-100'} rounded-xl`}>
                <Wind className={`w-6 h-6 ${aqiStatus?.textColor || 'text-gray-600'}`} />
              </div>
              <span className="text-xs text-gray-400">PM2.5 Index</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">
                {latestReading.aqi !== undefined ? latestReading.aqi : '--'}
              </span>
              <span className="text-gray-500 ml-2">AQI</span>
            </div>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${aqiStatus?.bgLight || 'bg-gray-100'} ${aqiStatus?.textColor || 'text-gray-700'}`}>
                {aqiStatus?.label || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mb-8">
          <AlertTriangle className="w-10 h-10 text-yellow-600 mx-auto mb-2" />
          <p className="text-yellow-800">No readings available for {selectedNode}. Waiting for data...</p>
        </div>
      )}

      {/* Recent History Table */}
      {readings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Recent Readings</h2>
            <p className="text-xs text-gray-500 mt-1">Last {readings.length} records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature (°C)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pressure (hPa)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Air Quality (AQI)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battery (V)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {readings.map((reading, index) => (
                  <tr key={reading.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(reading.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {reading.temp?.toFixed(1)}°C
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {reading.pressure?.toFixed(1)} hPa
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reading.aqi <= 50 ? 'bg-green-100 text-green-800' :
                        reading.aqi <= 100 ? 'bg-yellow-100 text-yellow-800' :
                        reading.aqi <= 150 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {reading.aqi}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reading.battery?.toFixed(1) || '--'} V
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Message */}
      {latestReading && (
        <div className="mt-6 text-center text-xs text-gray-400">
          <Activity className="w-3 h-3 inline mr-1" />
          Last reading received: {formatTime(latestReading.timestamp)}
        </div>
      )}
    </div>
  );
}
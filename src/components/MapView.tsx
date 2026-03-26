import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Node, Reading } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { MapPin, ShieldAlert, Thermometer, Droplets, Wind, X, Gauge } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapView() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [allLatestReadings, setAllLatestReadings] = useState<Record<string, Reading>>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [latestReading, setLatestReading] = useState<Reading | null>(null);

  useEffect(() => {
    const unsubscribeNodes = onSnapshot(collection(db, 'nodes'), (snapshot) => {
      setNodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Node)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'nodes'));

    // Listen to all readings to keep track of latest for each node
    const unsubscribeReadings = onSnapshot(collection(db, 'readings'), (snapshot) => {
      setAllLatestReadings(prev => {
        const readingsMap = { ...prev };
        snapshot.docs.forEach(doc => {
          const data = doc.data() as Reading;
          if (!readingsMap[data.nodeId] || new Date(data.timestamp) > new Date(readingsMap[data.nodeId].timestamp)) {
            readingsMap[data.nodeId] = data;
          }
        });
        return readingsMap;
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'readings'));

    return () => {
      unsubscribeNodes();
      unsubscribeReadings();
    };
  }, []);

  useEffect(() => {
    if (!selectedNode) {
      setLatestReading(null);
      return;
    }

    const q = query(
      collection(db, 'readings'),
      where('nodeId', '==', selectedNode.id),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestReading(snapshot.docs[0].data() as Reading);
      } else {
        setLatestReading(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `readings/${selectedNode.id}`));

    return () => unsubscribe();
  }, [selectedNode]);

  const createCustomIcon = (node: Node) => {
    const isOffline = node.status === 'offline';
    const lastSeen = new Date(node.lastUpdate).getTime();
    const now = new Date().getTime();
    const isProlongedOffline = isOffline && (now - lastSeen > 3600000); // 1 hour

    let colorClass = 'bg-emerald-500';
    let pingClass = 'bg-emerald-400';
    let iconSvg = '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';

    if (isProlongedOffline) {
      colorClass = 'bg-gray-600';
      pingClass = 'bg-gray-400';
      iconSvg = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
    } else if (isOffline) {
      colorClass = 'bg-red-500';
      pingClass = 'bg-red-400';
    }

    // Battery status color
    let batteryColor = 'bg-emerald-400';
    if (node.battery < 30) batteryColor = 'bg-red-400';
    else if (node.battery < 70) batteryColor = 'bg-amber-400';

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="relative flex items-center justify-center">
              <div class="absolute w-10 h-10 rounded-full animate-ping opacity-20 ${pingClass}"></div>
              <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${colorClass}">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>
              </div>
              <!-- Battery Indicator Dot -->
              <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${batteryColor}" title="Battery: ${node.battery}%"></div>
            </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">City Risk Map</h2>
          <p className="text-gray-500">Spatial visualization of environmental conditions across Dasmariñas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Map Area */}
        <div className="lg:col-span-3 bg-gray-100 rounded-2xl shadow-xl overflow-hidden relative min-h-[600px] border-4 border-white z-0">
          <MapContainer 
            center={[14.32, 120.93]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {nodes.map((node) => {
              const nodeReading = allLatestReadings[node.id];
              return (
                <Marker
                  key={node.id}
                  position={[node.lat, node.lng]}
                  icon={createCustomIcon(node)}
                  eventHandlers={{
                    click: () => setSelectedNode(node),
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
                        <MapPin className="w-4 h-4 text-[#064E3B]" />
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{node.barangay}</h4>
                          <p className="text-[10px] text-gray-500">{node.id}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-1.5 bg-orange-50 rounded-lg">
                          <Thermometer className="w-3 h-3 text-orange-500 mx-auto mb-1" />
                          <p className="text-[8px] text-gray-500 uppercase">Temp</p>
                          <p className="text-xs font-bold text-orange-700">
                            {nodeReading ? `${nodeReading.temp.toFixed(1)}°` : '--'}
                          </p>
                        </div>
                        <div className="text-center p-1.5 bg-blue-50 rounded-lg">
                          <Droplets className="w-3 h-3 text-blue-500 mx-auto mb-1" />
                          <p className="text-[8px] text-gray-500 uppercase">Hum</p>
                          <p className="text-xs font-bold text-blue-700">
                            {nodeReading ? `${nodeReading.humidity.toFixed(0)}%` : '--'}
                          </p>
                        </div>
                        <div className="text-center p-1.5 bg-indigo-50 rounded-lg">
                          <Gauge className="w-3 h-3 text-indigo-500 mx-auto mb-1" />
                          <p className="text-[8px] text-gray-500 uppercase">Pres</p>
                          <p className="text-xs font-bold text-indigo-700">
                            {nodeReading ? `${(nodeReading.pressure || 1013).toFixed(0)}` : '--'}
                          </p>
                        </div>
                        <div className="text-center p-1.5 bg-emerald-50 rounded-lg">
                          <Wind className="w-3 h-3 text-emerald-500 mx-auto mb-1" />
                          <p className="text-[8px] text-gray-500 uppercase">AQI</p>
                          <p className="text-xs font-bold text-emerald-700">
                            {nodeReading ? nodeReading.aqi.toFixed(0) : '--'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-between items-center text-[9px] text-gray-400">
                        <span>Lat: {node.lat.toFixed(4)}</span>
                        <span>Lng: {node.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-lg z-[1000] flex flex-col gap-4">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Node Status</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] text-gray-600 font-bold">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-[9px] text-gray-600 font-bold">Offline (Recent)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-600 flex items-center justify-center">
                    <X className="w-1.5 h-1.5 text-white" />
                  </div>
                  <span className="text-[9px] text-gray-600 font-bold">Prolonged Offline</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Battery Level</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] text-gray-600 font-bold">High (&gt;70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[9px] text-gray-600 font-bold">Medium (30-70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[9px] text-gray-600 font-bold">Low (&lt;30%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Node Details Sidebar */}
        <div className="space-y-6">
          {selectedNode ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedNode.id}</h3>
                  <p className="text-sm text-gray-500">{selectedNode.barangay}</p>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Current Readings</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Thermometer className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 uppercase">Temp</p>
                      <p className="font-bold text-sm">
                        {latestReading ? `${latestReading.temp.toFixed(1)}°C` : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 uppercase">Hum</p>
                      <p className="font-bold text-sm">
                        {latestReading ? `${latestReading.humidity.toFixed(0)}%` : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Gauge className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 uppercase">Pres</p>
                      <p className="font-bold text-sm">
                        {latestReading ? `${(latestReading.pressure || 1013).toFixed(1)}` : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Wind className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 uppercase">AQI</p>
                      <p className="font-bold text-sm">
                        {latestReading ? latestReading.aqi.toFixed(0) : '--'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Location Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-bold text-[#064E3B]">LAT</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-gray-700">{selectedNode.lat.toFixed(6)}</p>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-bold text-[#064E3B]">LNG</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-gray-700">{selectedNode.lng.toFixed(6)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button className="w-full bg-[#064E3B] text-white py-2 rounded-lg font-bold text-sm hover:bg-[#065F46] transition-colors">
                    View Detailed History
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900">Select a Node</h3>
              <p className="text-sm text-gray-500 mt-2">Click on a sensor marker on the map to view real-time barangay data.</p>
            </div>
          )}

          <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <h4 className="font-bold text-red-900 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4" />
              Risk Summary
            </h4>
            <p className="text-xs text-red-700 leading-relaxed">
              Currently monitoring 4 active zones. 1 zone (Langkaan I) is reporting offline status. No critical environmental hazards detected in the last 60 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

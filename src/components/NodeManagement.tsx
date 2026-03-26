import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Node } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { format } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Activity, 
  MapPin, 
  Settings2,
  Database,
  ChevronDown
} from 'lucide-react';
import { BARANGAYS, BARANGAY_COORDINATES } from '../constants/barangays';

export default function NodeManagement() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Node>>({
    id: '',
    barangay: '',
    lat: 14.329,
    lng: 120.936,
    status: 'online',
    thresholds: {
      tempMax: 40,
      humMin: 30,
      aqiMax: 150
    }
  });

  const handleBarangayChange = (barangay: string) => {
    const coords = BARANGAY_COORDINATES[barangay];
    if (coords) {
      setFormData({
        ...formData,
        barangay,
        lat: coords.lat,
        lng: coords.lng
      });
    } else {
      setFormData({ ...formData, barangay });
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'nodes'), (snapshot) => {
      setNodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Node)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'nodes'));
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (!formData.id) {
        alert('Node ID is required');
        return;
      }

      if (editingId) {
        await updateDoc(doc(db, 'nodes', editingId), formData);
        setEditingId(null);
      } else {
        // Use the provided ID as the document ID
        await setDoc(doc(db, 'nodes', formData.id), {
          ...formData,
          lastUpdate: new Date().toISOString(),
          battery: 4.2
        });
        setIsAdding(false);
      }
      setFormData({
        id: '',
        barangay: '',
        lat: 14.329,
        lng: 120.936,
        status: 'online',
        thresholds: { tempMax: 40, humMin: 30, aqiMax: 150 }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'nodes');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this node?')) {
      try {
        await deleteDoc(doc(db, 'nodes', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `nodes/${id}`);
      }
    }
  };

  const seedData = async () => {
    try {
      const sampleNodes = [
        { id: 'DASMA-01', barangay: 'Zone IV (Poblacion)', lat: 14.329, lng: 120.936, status: 'online', battery: 4.1, thresholds: { tempMax: 40, humMin: 30, aqiMax: 150 } },
        { id: 'DASMA-02', barangay: 'Salitran I', lat: 14.345, lng: 120.942, status: 'online', battery: 3.9, thresholds: { tempMax: 40, humMin: 30, aqiMax: 150 } },
        { id: 'DASMA-03', barangay: 'San Agustin II', lat: 14.312, lng: 120.928, status: 'online', battery: 4.0, thresholds: { tempMax: 40, humMin: 30, aqiMax: 150 } },
        { id: 'DASMA-04', barangay: 'Langkaan I', lat: 14.285, lng: 120.915, status: 'offline', battery: 3.2, thresholds: { tempMax: 40, humMin: 30, aqiMax: 150 } },
      ];

      for (const node of sampleNodes) {
        await setDoc(doc(db, 'nodes', node.id), { ...node, lastUpdate: new Date().toISOString() });
      }

      // Add some initial readings
      for (let i = 0; i < 20; i++) {
        await addDoc(collection(db, 'readings'), {
          nodeId: 'DASMA-01',
          temp: 30 + Math.random() * 5,
          humidity: 60 + Math.random() * 20,
          aqi: 40 + Math.random() * 60,
          battery: 4.1,
          timestamp: new Date(Date.now() - i * 3600000).toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'nodes/readings');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Node Management</h2>
          <p className="text-gray-500">Register and configure ESP32 LoRa sensor nodes</p>
        </div>
        <div className="flex gap-3">
          {nodes.length === 0 && (
            <button 
              onClick={seedData}
              className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-200 transition-colors"
            >
              <Database className="w-4 h-4" />
              Seed Sample Data
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[#064E3B] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#065F46] transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add New Node
          </button>
        </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">{editingId ? 'Edit Node' : 'Register New Node'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Node ID</label>
                <input 
                  type="text" 
                  value={formData.id}
                  onChange={e => setFormData({...formData, id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#064E3B] outline-none"
                  placeholder="e.g. DASMA-05"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Barangay</label>
                <div className="relative">
                  <select 
                    value={formData.barangay}
                    onChange={e => handleBarangayChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#064E3B] outline-none appearance-none bg-white"
                  >
                    <option value="" disabled>Select Barangay</option>
                    {BARANGAYS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Latitude</label>
                  <input 
                    type="number" 
                    value={formData.lat}
                    onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#064E3B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Longitude</label>
                  <input 
                    type="number" 
                    value={formData.lng}
                    onChange={e => setFormData({...formData, lng: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#064E3B] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#064E3B] outline-none"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                <Settings2 className="w-3 h-3" />
                Thresholds
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Temp Max (°C)</span>
                  <input 
                    type="number" 
                    value={formData.thresholds?.tempMax}
                    onChange={e => setFormData({...formData, thresholds: {...formData.thresholds!, tempMax: parseInt(e.target.value)}})}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Hum Min (%)</span>
                  <input 
                    type="number" 
                    value={formData.thresholds?.humMin}
                    onChange={e => setFormData({...formData, thresholds: {...formData.thresholds!, humMin: parseInt(e.target.value)}})}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">AQI Max</span>
                  <input 
                    type="number" 
                    value={formData.thresholds?.aqiMax}
                    onChange={e => setFormData({...formData, thresholds: {...formData.thresholds!, aqiMax: parseInt(e.target.value)}})}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="bg-[#064E3B] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#065F46] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update Node' : 'Save Node'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Node Info</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Location</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Thresholds</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {nodes.map((node) => (
              <tr key={node.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Activity className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{node.id}</p>
                      <p className="text-[10px] text-gray-400">Last seen: {node.lastUpdate ? format(new Date(node.lastUpdate), 'HH:mm') : 'Never'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-gray-700 font-medium">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {node.barangay}
                  </div>
                  <p className="text-[10px] text-gray-400">{node.lat.toFixed(4)}, {node.lng.toFixed(4)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    node.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 
                    node.status === 'offline' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {node.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">T:{node.thresholds.tempMax}°</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">H:{node.thresholds.humMin}%</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">A:{node.thresholds.aqiMax}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => { setEditingId(node.id); setFormData(node); }}
                      className="p-2 text-gray-400 hover:text-[#064E3B] hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(node.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {nodes.length === 0 && (
          <div className="py-12 text-center">
            <Database className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No nodes registered. Add your first sensor node to start monitoring.</p>
          </div>
        )}
      </div>
    </div>
  );
}

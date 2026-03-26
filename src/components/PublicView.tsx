import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Reading, Alert, RiskLevel, WeatherData, News } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  ShieldAlert, 
  Info,
  MapPin,
  ChevronRight,
  HeartPulse,
  Flame,
  Sun,
  Bell,
  Gauge,
  Zap,
  CloudRain,
  CloudSun,
  Wind as WindIcon,
  Eye,
  Waves,
  ChevronDown,
  Activity,
  Newspaper
} from 'lucide-react';
import { format } from 'date-fns';
import { BARANGAYS } from '../constants/barangays';

const StatusCard = ({ label, value, unit, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
    <div className={`p-4 rounded-full ${color} mb-4`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      <span className="text-sm text-gray-400 font-medium">{unit}</span>
    </div>
  </div>
);

export default function PublicView() {
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('SAFE');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const [news, setNews] = useState<News[]>([]);

  useEffect(() => {
    // Fetch news
    const qNews = query(collection(db, 'news'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeNews = onSnapshot(qNews, (snapshot) => {
      const newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News));
      setNews(newsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'news'));

    // Fetch weather data
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather');
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
          setWeatherError(null);
        } else {
          const errorData = await res.json();
          setWeatherError(errorData.error || "Weather service unavailable");
        }
      } catch (e) {
        console.error("Failed to fetch weather:", e);
        setWeatherError("Connection error");
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600000);

    // Listen for latest readings
    let qReadings;
    if (selectedBarangay) {
      qReadings = query(collection(db, 'readings'), orderBy('timestamp', 'desc'), limit(100));
    } else {
      qReadings = query(collection(db, 'readings'), orderBy('timestamp', 'desc'), limit(1));
    }

    const unsubscribeReadings = onSnapshot(qReadings, (snapshot) => {
      if (!snapshot.empty) {
        if (selectedBarangay) {
          // Filtering logic handled by displayReading useEffect
        } else {
          setLatestReading(snapshot.docs[0].data() as Reading);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'readings'));

    const qAlerts = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribeAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alerts = snapshot.docs.map(doc => doc.data() as Alert).filter(a => !a.resolved);
      setActiveAlerts(alerts);
      
      if (alerts.some(a => a.severity === 'critical')) setRiskLevel('DANGER');
      else if (alerts.length > 0) setRiskLevel('ALERT');
      else setRiskLevel('SAFE');
    }, (error) => handleFirestoreError(error, OperationType.GET, 'alerts'));

    return () => {
      unsubscribeReadings();
      unsubscribeAlerts();
      unsubscribeNews();
      clearInterval(weatherInterval);
    };
  }, [selectedBarangay]);

  // Fetch nodes to map barangay to readings
  const [nodes, setNodes] = useState<Record<string, string>>({}); // nodeId -> barangay
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'nodes'), (snapshot) => {
      const mapping: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        mapping[doc.id] = data.barangay;
      });
      setNodes(mapping);
    });
    return () => unsubscribe();
  }, []);

  // Filter latest reading based on selected barangay
  const [displayReading, setDisplayReading] = useState<Reading | null>(null);

  useEffect(() => {
    if (!selectedBarangay) {
      setDisplayReading(latestReading);
      return;
    }

    // Find latest reading for selected barangay
    const nodeId = Object.keys(nodes).find(id => nodes[id] === selectedBarangay);
    if (nodeId) {
      const q = query(
        collection(db, 'readings'),
        where('nodeId', '==', nodeId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setDisplayReading(snapshot.docs[0].data() as Reading);
        } else {
          setDisplayReading(null);
        }
      });
      return () => unsubscribe();
    } else {
      setDisplayReading(null);
    }
  }, [selectedBarangay, nodes, latestReading]);

  const riskStyles = {
    SAFE: { bg: 'bg-[#064E3B]', text: 'text-[#064E3B]', light: 'bg-emerald-50', label: 'Normal Conditions' },
    ALERT: { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50', label: 'Elevated Risk' },
    DANGER: { bg: 'bg-red-600', text: 'text-red-600', light: 'bg-red-50', label: 'Immediate Danger' }
  };

  return (
    <div className="bg-[#F8F9FA]">
      {/* Hero Section */}
      <section className={`${riskStyles[riskLevel].bg} text-white py-12 px-4 transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="bg-white p-2 rounded-full shadow-xl inline-block border-4 border-white/20">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Seal_of_Dasmari%C3%B1as.png/240px-Seal_of_Dasmari%C3%B1as.png" 
                alt="City of Dasmariñas Seal" 
                className="w-20 h-20 object-contain rounded-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=CDRRMO&background=ffffff&color=064E3B&bold=true&size=128';
                }}
              />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold mb-6 backdrop-blur-sm">
            <ShieldAlert className="w-4 h-4" />
            CITY STATUS: {riskLevel}
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            {riskStyles[riskLevel].label}
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Real-time environmental monitoring for the safety of all Dasmarineños.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        {/* Weather Alert Banner */}
        {weatherError && (
          <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3 text-orange-800">
            <Info className="w-5 h-5" />
            <p className="text-sm font-medium">
              Weather updates are currently unavailable: <span className="font-bold">{weatherError}</span>. 
              The system will retry automatically.
            </p>
          </div>
        )}

        {weather && (
          <div className={`mb-8 p-6 rounded-3xl shadow-xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 ${
            weather.alerts.thunderstorm 
              ? 'bg-red-600 border-red-400 text-white' 
              : weather.alerts.rainProbability > 50 
                ? 'bg-blue-600 border-blue-400 text-white' 
                : 'bg-white border-gray-100 text-gray-900'
          }`}>
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl ${
                weather.alerts.thunderstorm || weather.alerts.rainProbability > 50 ? 'bg-white/20' : 'bg-emerald-100'
              }`}>
                {weather.alerts.thunderstorm ? (
                  <Zap className="w-10 h-10 text-white animate-pulse" />
                ) : weather.alerts.rainProbability > 50 ? (
                  <CloudRain className="w-10 h-10 text-white" />
                ) : (
                  <CloudSun className="w-10 h-10 text-emerald-600" />
                )}
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Weather Alert</h3>
                <p className="text-lg font-medium opacity-90">{weather.alerts.summary}</p>
              </div>
            </div>
            
            <div className={`flex gap-8 items-center px-8 py-4 rounded-2xl border ${
              weather.alerts.thunderstorm || weather.alerts.rainProbability > 50 ? 'bg-black/10 border-white/20' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Rain Prob</p>
                <p className="text-3xl font-black">{weather.alerts.rainProbability.toFixed(2)}%</p>
              </div>
              <div className="w-px h-10 bg-current opacity-10" />
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Condition</p>
                <p className="text-3xl font-black">{weather.current.main}</p>
              </div>
            </div>
          </div>
        )}

        {/* Barangay Selector */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 text-gray-500 min-w-fit">
              <MapPin className="w-5 h-5 text-[#064E3B]" />
              <span className="text-sm font-bold uppercase tracking-wider">Select Barangay:</span>
            </div>
            <div className="relative w-full">
              <select 
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#064E3B] appearance-none cursor-pointer"
              >
                <option value="">All Areas (City Average)</option>
                {BARANGAYS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          {selectedBarangay && !displayReading && (
            <p className="text-center text-xs text-gray-400 mt-3 italic">
              No active sensor data for {selectedBarangay} at this moment.
            </p>
          )}
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <StatusCard 
            label="Temperature" 
            value={displayReading ? displayReading.temp.toFixed(2) : '--'} 
            unit="°C" 
            icon={Thermometer} 
            color="bg-orange-500" 
          />
          <StatusCard 
            label="Humidity" 
            value={displayReading ? displayReading.humidity.toFixed(2) : '--'} 
            unit="%" 
            icon={Droplets} 
            color="bg-blue-500" 
          />
          <StatusCard 
            label="Pressure" 
            value={displayReading ? (displayReading.pressure || 1013).toFixed(2) : '--'} 
            unit="hPa" 
            icon={Gauge} 
            color="bg-indigo-500" 
          />
          <StatusCard 
            label="Air Quality" 
            value={displayReading ? displayReading.aqi.toFixed(2) : '--'} 
            unit="AQI" 
            icon={Wind} 
            color="bg-emerald-500" 
          />
        </div>

        {/* Local Weather News Section */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-[#064E3B]" />
            Local Weather News
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news.map((newsItem) => (
              <div key={newsItem.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                    {newsItem.category}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">{newsItem.date}</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                  {newsItem.title}
                </h4>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {newsItem.summary}
                </p>
                <button className="mt-4 text-[#064E3B] text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                  Read Full Report <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
            {news.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-400 italic">No news updates available at the moment.</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Active Advisories */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#064E3B]" />
              Active Advisories
            </h3>
            <div className="space-y-4">
              {activeAlerts.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="font-bold text-gray-900">All Systems Normal</h4>
                  <p className="text-gray-500 text-sm">No active environmental hazards detected in the city.</p>
                </div>
              ) : (
                activeAlerts.map((alert, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border-l-4 shadow-sm ${
                    alert.severity === 'critical' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {alert.type === 'thunderstorm' && <Zap className="w-4 h-4 text-red-600 animate-pulse" />}
                        <span className="font-black text-sm uppercase tracking-wider text-gray-900">{alert.type} ALERT</span>
                      </div>
                      <span className="text-xs text-gray-500">{format(new Date(alert.timestamp), 'MMM dd, HH:mm')}</span>
                    </div>
                    <p className="font-bold text-gray-900 mb-1">{alert.barangay}</p>
                    <p className="text-gray-700 text-sm">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Safety Tips */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-[#064E3B]" />
              Safety Recommendations
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 flex gap-4">
                <div className="bg-orange-100 p-3 rounded-xl h-fit">
                  <Sun className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Heat Wave Safety</h4>
                  <p className="text-sm text-gray-500 mt-1">Drink plenty of water, stay in shaded areas, and avoid strenuous outdoor activities between 10 AM and 4 PM.</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 flex gap-4">
                <div className="bg-red-100 p-3 rounded-xl h-fit">
                  <Flame className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Fire Prevention</h4>
                  <p className="text-sm text-gray-500 mt-1">Ensure electrical connections are safe. Keep flammable materials away from heat sources during dry periods.</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-xl h-fit">
                  <WindIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Air Quality Advice</h4>
                  <p className="text-sm text-gray-500 mt-1">If AQI is high, sensitive groups (children, elderly) should limit prolonged outdoor exertion.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Weather Update Section */}
        {weather && (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-[#064E3B]" />
              Detailed Weather Update
            </h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-2xl">
                    <WindIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Wind Speed</p>
                    <p className="text-xl font-black text-gray-900">{weather.current.wind_speed.toFixed(2)} m/s</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="bg-orange-50 p-3 rounded-2xl">
                    <Thermometer className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Feels Like</p>
                    <p className="text-xl font-black text-gray-900">{weather.current.feels_like.toFixed(2)}°C</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-2xl">
                    <Eye className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Visibility</p>
                    <p className="text-xl font-black text-gray-900">{(weather.current.visibility / 1000).toFixed(2)} km</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl">
                    <Waves className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Humidity</p>
                    <p className="text-xl font-black text-gray-900">{weather.current.humidity.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <img 
                    src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`} 
                    alt={weather.current.description}
                    className="w-10 h-10"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-bold text-gray-700 capitalize">{weather.current.description}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium italic text-center sm:text-right">
                  Data provided by OpenWeatherMap • Updated every 10 mins
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Hotlines Section */}
        <div className="mt-12 bg-[#064E3B] p-8 rounded-3xl text-white shadow-xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Emergency Hotlines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">CDRRMO (Dasmariñas)</p>
              <p className="text-2xl font-black">(046) 416-0000</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Police / Emergency</p>
              <p className="text-2xl font-black">911 / 166</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

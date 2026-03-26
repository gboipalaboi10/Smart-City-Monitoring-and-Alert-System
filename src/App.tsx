import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation,
  Navigate
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Settings, 
  Bell, 
  ShieldAlert,
  Menu,
  X,
  User,
  LogOut,
  Globe
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDocFromServer, collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Dashboard from './components/Dashboard';
import PublicView from './components/PublicView';
import NodeManagement from './components/NodeManagement';
import MapView from './components/MapView';
import ChatBot from './components/ChatBot';
import FirstAidGuide from './components/FirstAidGuide';
import { HeartPulse } from 'lucide-react';

const Layout = ({ children, user }: { children: React.ReactNode, user: FirebaseUser | null }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAdmin = user?.email === 'gerry.guevarra10@gmail.com';

  const navItems = [
    { path: '/', label: 'Public Portal', icon: Globe, public: true },
    { path: '/first-aid', label: 'First Aid Guide', icon: HeartPulse, public: true },
    ...(isAdmin ? [
      { path: '/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, public: false },
      { path: '/map', label: 'City Map', icon: MapIcon, public: false },
      { path: '/nodes', label: 'Node Management', icon: Settings, public: false },
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <header className="bg-[#064E3B] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white p-0.5 rounded-full overflow-hidden w-12 h-12 flex items-center justify-center shadow-inner border border-white/20">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Seal_of_Dasmari%C3%B1as.png/240px-Seal_of_Dasmari%C3%B1as.png" 
                  alt="City of Dasmariñas Seal" 
                  className="w-10 h-10 object-contain rounded-full"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=CDRRMO&background=ffffff&color=064E3B&bold=true';
                  }}
                />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Smart City Monitoring and Alert System</h1>
                <p className="text-[10px] uppercase tracking-wider opacity-80">City of Dasmariñas</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path 
                      ? 'bg-white/10 text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              
              {!user ? (
                <button 
                  onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-bold transition-all shadow-md"
                >
                  Admin Login
                </button>
              ) : (
                <div className="flex items-center gap-4 pl-4 border-l border-white/20">
                  <div className="text-right hidden lg:block">
                    <p className="text-xs font-bold">{user.displayName}</p>
                    <p className="text-[10px] opacity-60">Administrator</p>
                  </div>
                  <button 
                    onClick={() => signOut(auth)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              )}
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-white hover:bg-white/10"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#064E3B] border-t border-white/10 px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === item.path 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            ))}
            {!user && (
              <button 
                onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                className="w-full text-left px-3 py-2 text-emerald-400 font-bold"
              >
                Admin Login
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* AI ChatBot */}
      <ChatBot />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} City Government of Dasmariñas. CDRRMO Monitoring System.
          </p>
          <p className="text-gray-400 text-[10px] mt-1">
            Powered by IoT Wireless Sensor Networks (ESP32 LoRa)
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Test connection as per guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        
        // Pre-populate First Aid Guides if empty
        const firstAidSnap = await getDocs(collection(db, 'first-aid'));
        if (firstAidSnap.empty) {
          const initialGuides = [
            {
              condition: "Heat Exhaustion",
              category: "heat",
              overview: "A condition whose symptoms may include heavy sweating and a rapid pulse, a result of your body overheating.",
              emergencySigns: ["Confusion", "Loss of consciousness", "High body temperature (above 40°C)", "Seizures"],
              itemsNeeded: ["Cool water", "Damp cloth", "Fan", "ORS (Oral Rehydration Salts)"],
              steps: [
                "Move the person to a cool, shaded area.",
                "Loosen tight clothing and remove extra layers.",
                "Apply cool, damp cloths to the skin or use a fan.",
                "Give small sips of cool water or an electrolyte drink if conscious.",
                "Monitor for signs of heat stroke."
              ],
              otcGuidance: "ORS (Oral Rehydration Salts) to replace lost electrolytes. Follow packet instructions.",
              notToDo: ["Do not give caffeinated or alcoholic drinks.", "Do not use an ice bath (can cause shock)."],
              aftercare: "Rest for at least 24 hours. Avoid direct sunlight. Stay hydrated.",
              visualGuide: "Infographic showing a person resting in shade with cool cloths on forehead and neck.",
              imageQueries: ["heat exhaustion first aid steps", "how to treat heat exhaustion"],
              videoQuery: "Heat Exhaustion First Aid Tutorial"
            },
            {
              condition: "Minor Cuts and Scrapes",
              category: "wounds",
              overview: "Small breaks in the skin that cause minor bleeding.",
              emergencySigns: ["Bleeding that doesn't stop with pressure", "Deep or gaping wound", "Signs of infection (pus, redness, warmth)"],
              itemsNeeded: ["Clean water", "Mild soap", "Sterile bandage", "Antibiotic ointment"],
              steps: [
                "Wash your hands before touching the wound.",
                "Apply gentle pressure with a clean cloth to stop bleeding.",
                "Rinse the wound with clean water.",
                "Clean the area around the wound with soap and water.",
                "Apply a thin layer of antibiotic ointment and cover with a bandage."
              ],
              otcGuidance: "Topical antibiotic ointment (e.g., Bacitracin) to prevent infection. Paracetamol for pain if needed.",
              notToDo: ["Do not use hydrogen peroxide or iodine (can damage tissue).", "Do not blow on the wound."],
              aftercare: "Change the bandage daily or if it gets wet/dirty. Monitor for signs of infection.",
              visualGuide: "Step-by-step photos of cleaning and bandaging a small cut.",
              imageQueries: ["how to clean a wound step by step", "minor cut first aid"],
              videoQuery: "First Aid for Cuts and Scrapes"
            }
          ];
          for (const guide of initialGuides) {
            await addDoc(collection(db, 'first-aid'), guide);
          }
        }
        // Pre-populate news if empty
        const newsSnap = await getDocs(collection(db, 'news'));
        if (newsSnap.empty) {
          const initialNews = [
            {
              title: "Dasmariñas CDRRMO on High Alert for Summer Heat",
              summary: "The City Disaster Risk Reduction and Management Office is monitoring heat indices as temperatures rise across the city.",
              date: "March 22, 2026",
              category: "Safety",
              timestamp: new Date().toISOString()
            },
            {
              title: "New Sensor Nodes Deployed in Barangay Salitran",
              summary: "Expansion of the environmental monitoring network continues with new high-precision LoRa nodes installed in key areas.",
              date: "March 21, 2026",
              category: "Infrastructure",
              timestamp: new Date().toISOString()
            },
            {
              title: "Water Conservation Advised as Humidity Drops",
              summary: "Residents are encouraged to manage water usage efficiently during the dry season to ensure sustainable supply.",
              date: "March 20, 2026",
              category: "Environment",
              timestamp: new Date().toISOString()
            },
            {
              title: "Air Quality Monitoring Expanded to More Barangays",
              summary: "The city's air quality initiative now covers 85% of the total land area, providing real-time AQI data to citizens.",
              date: "March 19, 2026",
              category: "Health",
              timestamp: new Date().toISOString()
            }
          ];
          for (const newsItem of initialNews) {
            await addDoc(collection(db, 'news'), newsItem);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#064E3B] flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-white animate-pulse mx-auto mb-4" />
          <p className="text-white font-medium tracking-widest uppercase text-sm">Initializing DRRM System...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<PublicView />} />
          <Route path="/first-aid" element={<FirstAidGuide />} />
          <Route 
            path="/dashboard" 
            element={user?.email === 'gerry.guevarra10@gmail.com' ? <Dashboard /> : <Navigate to="/" />} 
          />
          <Route 
            path="/map" 
            element={user?.email === 'gerry.guevarra10@gmail.com' ? <MapView /> : <Navigate to="/" />} 
          />
          <Route 
            path="/nodes" 
            element={user?.email === 'gerry.guevarra10@gmail.com' ? <NodeManagement /> : <Navigate to="/" />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

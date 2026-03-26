import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { FirstAidGuide as FirstAidType } from '../types';
import { 
  Search, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Info, 
  ArrowLeft, 
  Play, 
  Image as ImageIcon,
  Stethoscope,
  ChevronRight,
  Loader2,
  Sparkles,
  Home,
  Pill,
  ShieldAlert,
  Flame,
  Activity,
  Sun,
  Bug
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Info },
  { id: 'burns', name: 'Burns', icon: Flame },
  { id: 'wounds', name: 'Wounds', icon: Activity },
  { id: 'poisoning', name: 'Poisoning', icon: AlertCircle },
  { id: 'heat', name: 'Heat', icon: Sun },
  { id: 'bites', name: 'Bites', icon: Bug },
  { id: 'other', name: 'Other', icon: Plus },
];

export default function FirstAidGuide() {
  const [guides, setGuides] = useState<FirstAidType[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<FirstAidType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const q = query(collection(db, 'first-aid'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guidesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirstAidType));
      setGuides(guidesData);
      setLoading(false);
      setError(null);
      if (timeoutId) clearTimeout(timeoutId);
    }, (err) => {
      setLoading(false);
      setError("Failed to load guides. Please check your connection.");
      handleFirestoreError(err, OperationType.GET, 'first-aid');
      if (timeoutId) clearTimeout(timeoutId);
    });

    // Fallback timeout
    timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Loading is taking longer than expected. Please try refreshing.");
      }
    }, 10000);

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const filteredGuides = guides.filter(g => {
    const matchesSearch = g.condition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const generateGuide = async (condition: string) => {
    if (!condition) return;
    setGenerating(true);
    setGenError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a comprehensive first aid guide for "${condition}" following this exact JSON structure:
        {
          "condition": "Clear name of the condition",
          "category": "one of: burns, wounds, poisoning, heat, bites, other",
          "overview": "Brief explanation, causes, and symptoms",
          "emergencySigns": ["List symptoms that require immediate medical help"],
          "itemsNeeded": ["List common household items and OTC meds"],
          "steps": ["Numbered steps for first aid"],
          "otcGuidance": "Medicine name, purpose, dosage, and safety warnings",
          "notToDo": ["Common mistakes or dangerous practices"],
          "aftercare": "Monitoring recovery and hygiene tips",
          "visualGuide": "Description of helpful images",
          "imageQueries": ["3-5 suggested image search queries"],
          "videoQuery": "YouTube search query for a tutorial"
        }
        Rules: Simple English, concise but complete, prioritize safety, no diagnosis, recommend medical help when unsure.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              condition: { type: Type.STRING },
              category: { type: Type.STRING, enum: ["burns", "wounds", "poisoning", "heat", "bites", "other"] },
              overview: { type: Type.STRING },
              emergencySigns: { type: Type.ARRAY, items: { type: Type.STRING } },
              itemsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              otcGuidance: { type: Type.STRING },
              notToDo: { type: Type.ARRAY, items: { type: Type.STRING } },
              aftercare: { type: Type.STRING },
              visualGuide: { type: Type.STRING },
              imageQueries: { type: Type.ARRAY, items: { type: Type.STRING } },
              videoQuery: { type: Type.STRING }
            },
            required: ["condition", "category", "overview", "steps", "emergencySigns", "itemsNeeded", "notToDo", "aftercare", "imageQueries", "videoQuery"]
          }
        }
      });

      const newGuide = JSON.parse(response.text) as FirstAidType;
      
      // Check if it already exists in our local state to avoid duplicates
      const exists = guides.find(g => g.condition.toLowerCase() === newGuide.condition.toLowerCase());
      if (!exists) {
        const docRef = await addDoc(collection(db, 'first-aid'), newGuide);
        setSelectedGuide({ id: docRef.id, ...newGuide });
      } else {
        setSelectedGuide(exists);
      }
    } catch (error) {
      console.error("Error generating guide:", error);
      setGenError("Failed to generate guide. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (selectedGuide) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => setSelectedGuide(null)}
          className="flex items-center gap-2 text-emerald-700 font-bold mb-8 hover:gap-3 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Guides
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-[#064E3B] p-8 text-white">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                {selectedGuide.category}
              </span>
              <Stethoscope className="w-8 h-8 opacity-50" />
            </div>
            <h1 className="text-4xl font-black mb-4">{selectedGuide.condition}</h1>
            <p className="text-emerald-50/80 leading-relaxed text-lg">
              {selectedGuide.overview}
            </p>
          </div>

          <div className="p-8 space-y-12">
            {/* Emergency Warning Signs */}
            <section className="bg-red-50 p-6 rounded-2xl border border-red-100">
              <h3 className="text-red-900 font-black flex items-center gap-2 mb-4 uppercase tracking-tight">
                <ShieldAlert className="w-5 h-5" />
                ⚠️ Emergency Warning Signs
              </h3>
              <ul className="space-y-2">
                {selectedGuide.emergencySigns.map((sign, i) => (
                  <li key={i} className="flex items-start gap-3 text-red-800 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    {sign}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Items Needed */}
              <section>
                <h3 className="text-gray-900 font-black flex items-center gap-2 mb-4 uppercase tracking-tight">
                  <Home className="w-5 h-5 text-emerald-600" />
                  🏠 Items Needed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedGuide.itemsNeeded.map((item, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl text-sm font-medium border border-gray-200">
                      {item}
                    </span>
                  ))}
                </div>
              </section>

              {/* OTC Guidance */}
              {selectedGuide.otcGuidance && (
                <section>
                  <h3 className="text-gray-900 font-black flex items-center gap-2 mb-4 uppercase tracking-tight">
                    <Pill className="w-5 h-5 text-blue-600" />
                    💊 OTC Medication Guidance
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-sm text-blue-900 leading-relaxed">
                    {selectedGuide.otcGuidance}
                  </div>
                </section>
              )}
            </div>

            {/* Steps */}
            <section>
              <h3 className="text-gray-900 font-black flex items-center gap-2 mb-6 uppercase tracking-tight">
                <ChevronRight className="w-5 h-5 text-emerald-600" />
                🪜 Step-by-Step Procedure
              </h3>
              <div className="space-y-4">
                {selectedGuide.steps.map((step, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-gray-800 font-medium leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* What NOT to Do */}
            <section className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
              <h3 className="text-orange-900 font-black flex items-center gap-2 mb-4 uppercase tracking-tight">
                <XCircle className="w-5 h-5" />
                ❌ What NOT to Do
              </h3>
              <ul className="space-y-2">
                {selectedGuide.notToDo.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-orange-800 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Aftercare */}
            <section>
              <h3 className="text-gray-900 font-black flex items-center gap-2 mb-4 uppercase tracking-tight">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                🧼 Aftercare Tips
              </h3>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {selectedGuide.aftercare}
              </p>
            </section>

            {/* Visual & Video Guides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
              <section>
                <h3 className="text-gray-900 font-black flex items-center gap-2 mb-4 uppercase tracking-tight">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                  🖼️ Visual Guide
                </h3>
                <p className="text-sm text-gray-500 mb-4 italic">{selectedGuide.visualGuide}</p>
                <div className="space-y-2">
                  {selectedGuide.imageQueries.map((query, i) => (
                    <a 
                      key={i}
                      href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-purple-50 rounded-xl text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                    >
                      Search: {query}
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-gray-900 font-black flex items-center gap-2 mb-4 uppercase tracking-tight">
                  <Play className="w-5 h-5 text-red-600" />
                  🎥 Video Guide
                </h3>
                <a 
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedGuide.videoQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full aspect-video bg-gray-900 rounded-2xl flex flex-col items-center justify-center group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center z-20 group-hover:scale-110 transition-transform shadow-xl">
                    <Play className="w-8 h-8 text-white fill-current" />
                  </div>
                  <p className="mt-4 text-white font-bold z-20 text-center px-4">
                    Watch: {selectedGuide.videoQuery}
                  </p>
                </a>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">First Aid Guide</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Quick and reliable first aid instructions for common emergencies. 
          Search for a condition or browse by category.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-6 mb-12">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search condition (e.g., heat exhaustion, minor cuts)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-lg font-medium focus:ring-2 focus:ring-emerald-600 shadow-sm"
          />
          {searchQuery && !filteredGuides.find(g => g.condition.toLowerCase() === searchQuery.toLowerCase()) && (
            <button 
              onClick={() => generateGuide(searchQuery)}
              disabled={generating}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
        </div>
      </div>

      {genError && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{genError}</p>
          <button onClick={() => setGenError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                selectedCategory === cat.id 
                  ? 'bg-[#064E3B] text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Guides Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading guides...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-red-50 p-6 rounded-full mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{error}</h3>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map((guide) => (
            <button
              key={guide.id}
              onClick={() => setSelectedGuide(guide)}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                  {guide.category}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">
                {guide.condition}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {guide.overview}
              </p>
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                View Step-by-Step Guide
              </div>
            </button>
          ))}
          
          {/* Empty State */}
          {filteredGuides.length === 0 && !generating && (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No guide found for "{searchQuery}"</h3>
              <p className="text-gray-500 mb-8">Would you like our AI to generate a first aid guide for this condition?</p>
              <button 
                onClick={() => generateGuide(searchQuery)}
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 mx-auto hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
              >
                <Sparkles className="w-5 h-5" />
                Generate AI Guide
              </button>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-20 p-8 bg-gray-900 rounded-3xl text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/10 p-3 rounded-2xl">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-lg font-bold mb-2">Medical Disclaimer</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              This guide is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. 
              Always seek the advice of your physician or other qualified health provider with any questions you may have 
              regarding a medical condition. Never disregard professional medical advice or delay in seeking it because 
              of something you have read on this website. In case of emergency, call 911 or your local emergency number immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

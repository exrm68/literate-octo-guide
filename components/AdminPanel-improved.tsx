import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Settings, LogOut, Trash2, Edit, Plus, Save, Database, RefreshCw, Link, Bot, Star, List, Eye, TrendingUp } from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Movie, Episode } from '../types';
import { INITIAL_MOVIES, BOT_USERNAME } from '../constants';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [user, setUser] = useState<User | null>(null);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // App Configuration State
  const [botUsername, setBotUsername] = useState('');
  const [channelLink, setChannelLink] = useState('');
  const [autoViewIncrement, setAutoViewIncrement] = useState(true);
  const [viewIncrementInterval, setViewIncrementInterval] = useState('60'); // minutes

  // Content Management State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Exclusive');
  const [thumbnail, setThumbnail] = useState('');
  const [telegramCode, setTelegramCode] = useState('');
  const [year, setYear] = useState('2025');
  const [rating, setRating] = useState('9.0');
  const [quality, setQuality] = useState('4K HDR');
  const [description, setDescription] = useState('');
  const [initialViews, setInitialViews] = useState('0');
  
  // Episode Management State
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpSeason, setNewEpSeason] = useState('1');
  const [newEpDuration, setNewEpDuration] = useState('');
  const [newEpCode, setNewEpCode] = useState('');
  
  // List State
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch movies
  const fetchMovies = async () => {
    try {
        const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movie[];
        setMovieList(list);
    } catch (e) {
        console.warn("Error fetching movies:", e);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
      try {
          const docRef = doc(db, 'settings', 'config');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              const data = docSnap.data();
              setBotUsername(data.botUsername || BOT_USERNAME);
              setChannelLink(data.channelLink || '');
              setAutoViewIncrement(data.autoViewIncrement ?? true);
              setViewIncrementInterval(data.viewIncrementInterval || '60');
          } else {
              setBotUsername(BOT_USERNAME);
              setAutoViewIncrement(true);
              setViewIncrementInterval('60');
          }
      } catch (e) {
          console.error("Error fetching settings:", e);
      }
  };

  useEffect(() => {
    if (user) {
        if (activeTab === 'content') fetchMovies();
        if (activeTab === 'settings') fetchSettings();
    }
  }, [user, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
      await signOut(auth);
  };

  // --- Helper Functions ---

  const resetForm = () => {
      setTitle('');
      setCategory('Exclusive');
      setThumbnail('');
      setTelegramCode('');
      setYear('2025');
      setRating('9.0');
      setQuality('4K HDR');
      setDescription('');
      setInitialViews('0');
      setEpisodes([]);
      setNewEpSeason('1');
      setIsEditing(false);
      setEditId(null);
  };

  const handleAddEpisode = () => {
      if (!newEpTitle || !newEpCode) return;
      const seasonNum = parseInt(newEpSeason) || 1;
      
      const newEp: Episode = {
          id: Date.now().toString(),
          number: episodes.filter(e => e.season === seasonNum).length + 1,
          season: seasonNum,
          title: newEpTitle,
          duration: newEpDuration || 'N/A',
          telegramCode: newEpCode
      };
      
      const updatedEpisodes = [...episodes, newEp].sort((a, b) => {
          if (a.season !== b.season) return a.season - b.season;
          return a.number - b.number;
      });

      setEpisodes(updatedEpisodes);
      setNewEpTitle('');
      setNewEpDuration('');
      setNewEpCode('');
  };

  const removeEpisode = (id: string) => {
      setEpisodes(episodes.filter(ep => ep.id !== id));
  };

  // --- Main Actions ---

  const handleSaveSettings = async () => {
      setLoading(true);
      try {
          await setDoc(doc(db, 'settings', 'config'), {
              botUsername,
              channelLink,
              autoViewIncrement,
              viewIncrementInterval
          });
          alert("✅ App Configuration Saved Successfully!");
      } catch (e) {
          alert("❌ Error saving settings");
      } finally {
          setLoading(false);
      }
  };

  const handlePublish = async () => {
      if (!title || !thumbnail || (!telegramCode && episodes.length === 0)) {
          alert("❌ Title, Thumbnail and at least one Link (Code or Episode) are required");
          return;
      }
      setLoading(true);
      try {
          const movieData = {
              title,
              category,
              thumbnail,
              telegramCode,
              year,
              rating: parseFloat(rating),
              quality,
              description,
              episodes: episodes.length > 0 ? episodes : null,
              updatedAt: serverTimestamp()
          };

          if (isEditing && editId) {
              await updateDoc(doc(db, "movies", editId), movieData);
              alert("✅ Content Updated Successfully!");
          } else {
              await addDoc(collection(db, "movies"), {
                  ...movieData,
                  views: initialViews || '0',
                  createdAt: serverTimestamp()
              });
              alert("✅ Content Added Successfully!");
          }
          
          resetForm();
          if (activeTab === 'content') fetchMovies();
      } catch (e) {
          console.error(e);
          alert("❌ Error saving document");
      } finally {
          setLoading(false);
      }
  };

  const handleEdit = (movie: Movie) => {
      setTitle(movie.title);
      setCategory(movie.category);
      setThumbnail(movie.thumbnail);
      setTelegramCode(movie.telegramCode || '');
      setYear(movie.year || '2025');
      setRating(movie.rating.toString());
      setQuality(movie.quality || '4K HDR');
      setDescription(movie.description || '');
      setInitialViews(movie.views || '0');
      setEpisodes(movie.episodes || []);
      
      setIsEditing(true);
      setEditId(movie.id);
      setActiveTab('upload');
  };

  const handleDelete = async (id: string) => {
      if(confirm("⚠️ Are you sure you want to delete this content?")) {
          try {
              await deleteDoc(doc(db, "movies", id));
              setMovieList(prev => prev.filter(m => m.id !== id));
              alert("✅ Content deleted successfully!");
          } catch(e) {
              alert("❌ Error deleting movie");
          }
      }
  };

  const handleSeedData = async () => {
      if(!confirm("📦 This will upload all demo data to Firebase. Continue?")) return;
      setLoading(true);
      try {
          const batch = writeBatch(db);
          INITIAL_MOVIES.forEach((movie) => {
              const { id, ...data } = movie;
              const docRef = doc(collection(db, "movies"));
              batch.set(docRef, { ...data, createdAt: serverTimestamp() });
          });
          await batch.commit();
          alert("✅ Demo data uploaded successfully!");
          fetchMovies();
      } catch (e) {
          console.error(e);
          alert("❌ Error uploading data");
      } finally {
          setLoading(false);
      }
  };

  // Filtered movie list for search
  const filteredMovies = movieList.filter(m => 
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Login Screen
  if (!user) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
        >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="w-full max-w-md bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold/20 rounded-2xl p-8 relative shadow-2xl shadow-gold/10"
             >
                 <button 
                   onClick={onClose} 
                   className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                 >
                   <X size={24} />
                 </button>
                 
                 <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold/20">
                       <Settings size={32} className="text-gold" />
                     </div>
                     <h2 className="text-3xl font-bold text-white mb-2">Admin Console</h2>
                     <p className="text-gray-400 text-sm">🔐 Restricted area for authorized personnel only</p>
                 </div>
                 
                 <form onSubmit={handleLogin} className="space-y-4">
                     <div>
                       <label className="text-xs text-gray-400 mb-1 block">Email Address</label>
                       <input 
                          type="email" 
                          placeholder="admin@cineflix.com" 
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                       />
                     </div>
                     <div>
                       <label className="text-xs text-gray-400 mb-1 block">Password</label>
                       <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                       />
                     </div>
                     
                     {error && (
                       <motion.p 
                         initial={{ opacity: 0, y: -10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2"
                       >
                         ⚠️ {error}
                       </motion.p>
                     )}
                     
                     <button 
                       type="submit" 
                       disabled={loading} 
                       className="w-full bg-gradient-to-r from-gold to-[#ffe033] text-black font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
                     >
                         {loading ? "🔄 Authenticating..." : "🚀 Login to Console"}
                     </button>
                 </form>
                 
                 <p className="text-center text-xs text-gray-600 mt-6">
                   Powered by CINEFLIX Admin System v2.0
                 </p>
             </motion.div>
        </motion.div>
      )
  }

  // Main Admin Panel
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-xl overflow-y-auto"
    >
      <div className="min-h-screen p-4 pb-20">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold/20 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold to-white mb-1">
                🎬 CINEFLIX Admin Panel
              </h1>
              <p className="text-gray-400 text-sm">Complete Content Management System</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <p className="text-xs text-gray-500">Logged in as</p>
                <p className="text-sm text-gold font-semibold">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="flex gap-2 bg-black/50 p-2 rounded-xl border border-white/5">
            {[
              { id: 'upload', label: 'Add Content', icon: Upload },
              { id: 'content', label: 'Manage Content', icon: List },
              { id: 'settings', label: 'App Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-gold to-[#ffe033] text-black shadow-lg shadow-gold/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ADD CONTENT TAB */}
            {activeTab === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold/20 rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Upload className="text-gold" size={24} />
                  {isEditing ? '✏️ Edit Content' : '➕ Add New Content'}
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Title *</label>
                      <input 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., Bachelor Point Season 5"
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Category *</label>
                      <select 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                      >
                        <option value="Exclusive">Exclusive</option>
                        <option value="Korean Drama">Korean Drama</option>
                        <option value="Series">Series</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Thumbnail URL *</label>
                      <input 
                        value={thumbnail}
                        onChange={e => setThumbnail(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                      />
                      {thumbnail && (
                        <img src={thumbnail} alt="Preview" className="mt-2 w-32 h-48 object-cover rounded-lg border border-white/10" />
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-2 block flex items-center gap-2">
                        <Link size={14} />
                        Telegram Code (for movies/single content)
                      </label>
                      <input 
                        value={telegramCode}
                        onChange={e => setTelegramCode(e.target.value)}
                        placeholder="e.g., movie_hd_2024"
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Year</label>
                        <input 
                          value={year}
                          onChange={e => setYear(e.target.value)}
                          placeholder="2025"
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block flex items-center gap-1">
                          <Star size={12} className="text-gold fill-gold" />
                          Rating
                        </label>
                        <input 
                          value={rating}
                          onChange={e => setRating(e.target.value)}
                          placeholder="9.0"
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Quality</label>
                        <input 
                          value={quality}
                          onChange={e => setQuality(e.target.value)}
                          placeholder="4K HDR"
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-2 block flex items-center gap-2">
                        <Eye size={14} />
                        Initial Views
                      </label>
                      <input 
                        value={initialViews}
                        onChange={e => setInitialViews(e.target.value)}
                        placeholder="1,250"
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                      />
                      <p className="text-xs text-gray-600 mt-1">💡 Use format: 1,250 or 2.5K</p>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Description</label>
                      <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description..."
                        rows={4}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Episode Management */}
                <div className="mt-8 border-t border-white/10 pt-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    📺 Episode Management (for Series)
                  </h3>
                  
                  <div className="grid md:grid-cols-5 gap-3 mb-4">
                    <input 
                      value={newEpSeason}
                      onChange={e => setNewEpSeason(e.target.value)}
                      placeholder="Season"
                      className="bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                    />
                    <input 
                      value={newEpTitle}
                      onChange={e => setNewEpTitle(e.target.value)}
                      placeholder="Episode Title"
                      className="bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                    />
                    <input 
                      value={newEpDuration}
                      onChange={e => setNewEpDuration(e.target.value)}
                      placeholder="Duration"
                      className="bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                    />
                    <input 
                      value={newEpCode}
                      onChange={e => setNewEpCode(e.target.value)}
                      placeholder="Telegram Code"
                      className="bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                    />
                    <button
                      onClick={handleAddEpisode}
                      className="bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>

                  {episodes.length > 0 && (
                    <div className="space-y-2">
                      {episodes.map(ep => (
                        <div key={ep.id} className="bg-black/30 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-gold font-bold text-sm">S{ep.season}E{ep.number}</span>
                            <span className="text-white text-sm">{ep.title}</span>
                            <span className="text-gray-500 text-xs">{ep.duration}</span>
                            <span className="text-gray-600 text-xs font-mono">{ep.telegramCode}</span>
                          </div>
                          <button
                            onClick={() => removeEpisode(ep.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handlePublish}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-gold to-[#ffe033] text-black font-bold py-4 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {loading ? '🔄 Publishing...' : (isEditing ? '✅ Update Content' : '🚀 Publish Content')}
                  </button>
                  {isEditing && (
                    <button
                      onClick={resetForm}
                      className="px-6 py-4 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* MANAGE CONTENT TAB */}
            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold/20 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <List className="text-gold" size={24} />
                    📚 Content Library ({movieList.length} items)
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={fetchMovies}
                      className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                    <button
                      onClick={handleSeedData}
                      className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center gap-2"
                    >
                      <Database size={16} />
                      Seed Demo Data
                    </button>
                  </div>
                </div>

                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="🔍 Search by title or category..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none mb-4"
                />

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {filteredMovies.map(movie => (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-black/30 border border-white/5 rounded-lg p-4 hover:border-gold/20 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <img 
                          src={movie.thumbnail} 
                          alt={movie.title}
                          className="w-16 h-24 object-cover rounded-lg border border-white/10"
                        />
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg mb-1">{movie.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                            <span className="bg-gold/20 text-gold px-2 py-1 rounded">{movie.category}</span>
                            <span className="flex items-center gap-1">
                              <Star size={12} className="text-gold fill-gold" />
                              {movie.rating}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={12} />
                              {movie.views}
                            </span>
                            <span>{movie.year}</span>
                            <span>{movie.quality}</span>
                          </div>
                          {movie.episodes && (
                            <p className="text-xs text-gray-500">
                              📺 {movie.episodes.length} episodes
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(movie)}
                            className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(movie.id)}
                            className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {filteredMovies.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                      <Database size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No content found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold/20 rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Settings className="text-gold" size={24} />
                  ⚙️ App Configuration
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block flex items-center gap-2">
                      <Bot size={16} className="text-gold" />
                      Telegram Bot Username
                    </label>
                    <input 
                      value={botUsername}
                      onChange={e => setBotUsername(e.target.value)}
                      placeholder="YourBot_username"
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                    />
                    <p className="text-xs text-gray-600 mt-1">💡 This bot username will be used for "Watch Now" buttons</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-2 block flex items-center gap-2">
                      <Link size={16} className="text-gold" />
                      Channel/Group Link
                    </label>
                    <input 
                      value={channelLink}
                      onChange={e => setChannelLink(e.target.value)}
                      placeholder="https://t.me/yourchannel"
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                    />
                    <p className="text-xs text-gray-600 mt-1">💡 Users will be redirected here for requests/updates</p>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <label className="text-sm text-gray-300 flex items-center gap-2 mb-1">
                          <TrendingUp size={16} className="text-gold" />
                          Auto View Increment
                        </label>
                        <p className="text-xs text-gray-500">Automatically increase view counts over time</p>
                      </div>
                      <button
                        onClick={() => setAutoViewIncrement(!autoViewIncrement)}
                        className={`w-14 h-7 rounded-full transition-colors relative ${
                          autoViewIncrement ? 'bg-gold' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                          autoViewIncrement ? 'translate-x-7' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {autoViewIncrement && (
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Increment Interval (minutes)</label>
                        <select
                          value={viewIncrementInterval}
                          onChange={e => setViewIncrementInterval(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                        >
                          <option value="30">Every 30 minutes</option>
                          <option value="60">Every 1 hour</option>
                          <option value="120">Every 2 hours</option>
                          <option value="360">Every 6 hours</option>
                          <option value="1440">Every 24 hours</option>
                        </select>
                        <p className="text-xs text-gray-600 mt-1">⏱️ Views will increase by 1-5 per interval</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-gold to-[#ffe033] text-black font-bold py-4 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {loading ? '🔄 Saving...' : '✅ Save Configuration'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminPanel;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Layout, Settings, LogOut, Trash2, Edit, Plus, Save, Database, RefreshCw, Link, Bot, Star, List } from 'lucide-react';
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

  // Content Management State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Exclusive');
  const [thumbnail, setThumbnail] = useState('');
  const [telegramCode, setTelegramCode] = useState('');
  const [year, setYear] = useState('2024');
  const [rating, setRating] = useState('9.0');
  const [quality, setQuality] = useState('4K HDR');
  const [description, setDescription] = useState('');
  
  // Episode Management State
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpSeason, setNewEpSeason] = useState('1'); // Season State
  const [newEpDuration, setNewEpDuration] = useState('');
  const [newEpCode, setNewEpCode] = useState('');
  
  // List State
  const [movieList, setMovieList] = useState<Movie[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch movies (Limit to latest 100 for admin view to avoid lag)
  const fetchMovies = async () => {
    try {
        const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movie[];
        setMovieList(list);
    } catch (e) {
        console.warn("Error fetching movies (offline mode?):", e);
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
          } else {
              setBotUsername(BOT_USERNAME);
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
      setYear('2024');
      setRating('9.0');
      setQuality('4K HDR');
      setDescription('');
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
      
      // Add and sort by Season then Episode Number
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
              channelLink
          });
          alert("App Configuration Saved!");
      } catch (e) {
          alert("Error saving settings");
      } finally {
          setLoading(false);
      }
  };

  const handlePublish = async () => {
      if (!title || !thumbnail || (!telegramCode && episodes.length === 0)) {
          alert("Title, Thumbnail and at least one Link (Code or Episode) are required");
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
              alert("Content Updated Successfully!");
          } else {
              await addDoc(collection(db, "movies"), {
                  ...movieData,
                  views: '0',
                  createdAt: serverTimestamp()
              });
              alert("Content Added Successfully!");
          }
          
          resetForm();
          if (activeTab === 'content') fetchMovies();
      } catch (e) {
          console.error(e);
          alert("Error saving document");
      } finally {
          setLoading(false);
      }
  };

  const handleEdit = (movie: Movie) => {
      setTitle(movie.title);
      setCategory(movie.category);
      setThumbnail(movie.thumbnail);
      setTelegramCode(movie.telegramCode || '');
      setYear(movie.year || '2024');
      setRating(movie.rating.toString());
      setQuality(movie.quality || '4K HDR');
      setDescription(movie.description || '');
      setEpisodes(movie.episodes || []);
      
      setIsEditing(true);
      setEditId(movie.id);
      setActiveTab('upload');
  };

  const handleDelete = async (id: string) => {
      if(confirm("Are you sure you want to delete this content?")) {
          try {
              await deleteDoc(doc(db, "movies", id));
              setMovieList(prev => prev.filter(m => m.id !== id));
          } catch(e) {
              alert("Error deleting movie");
          }
      }
  };

  const handleSeedData = async () => {
      if(!confirm("This will upload all demo data to Firebase. Continue?")) return;
      setLoading(true);
      try {
          const batch = writeBatch(db);
          INITIAL_MOVIES.forEach((movie) => {
              // Remove ID as Firestore generates it
              const { id, ...data } = movie;
              const docRef = doc(collection(db, "movies"));
              batch.set(docRef, { ...data, createdAt: serverTimestamp() });
          });
          await batch.commit();
          alert("Demo data uploaded successfully!");
          fetchMovies();
      } catch (e) {
          console.error(e);
          alert("Error uploading data");
      } finally {
          setLoading(false);
      }
  };

  if (!user) {
      return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X /></button>
                 <div className="text-center mb-8">
                     <Settings size={40} className="text-gold mx-auto mb-4" />
                     <h2 className="text-2xl font-bold text-white">Admin Access</h2>
                     <p className="text-gray-500 text-sm">Restricted area for authorized personnel only.</p>
                 </div>
                 <form onSubmit={handleLogin} className="space-y-4">
                     <input 
                        type="email" 
                        placeholder="Admin Email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                     />
                     <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                     />
                     {error && <p className="text-red-500 text-xs">{error}</p>}
                     <button type="submit" disabled={loading} className="w-full bg-gold text-black font-bold py-3 rounded-lg hover:bg-[#ffe033] transition-colors">
                         {loading ? "Authenticating..." : "Login to Console"}
                     </button>
                 </form>
             </div>
        </div>
      )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[100] bg-black text-white font-sans flex flex-col"
    >
      {/* Admin Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0a0a]">
        <div>
          <h2 className="text-lg font-bold text-gold flex items-center gap-2">
              <Settings size={18} /> Admin Console
          </h2>
          <p className="text-[10px] text-gray-500">Logged in as {user.email}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20">
                <LogOut size={18} />
            </button>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-lg hover:bg-white/10">
                <X size={18} />
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <div className="w-16 md:w-64 border-r border-white/10 bg-[#0a0a0a] pt-4 flex flex-col items-center md:items-stretch gap-2 shrink-0">
           <button onClick={() => { setActiveTab('upload'); resetForm(); }} className={`p-3 md:px-6 flex items-center gap-3 ${activeTab === 'upload' ? 'text-gold bg-white/5 border-r-2 border-gold' : 'text-gray-400'}`}>
              <Upload size={20} />
              <span className="hidden md:inline text-sm font-semibold">Upload / Edit</span>
           </button>
           <button onClick={() => setActiveTab('content')} className={`p-3 md:px-6 flex items-center gap-3 ${activeTab === 'content' ? 'text-gold bg-white/5 border-r-2 border-gold' : 'text-gray-400'}`}>
              <Layout size={20} />
              <span className="hidden md:inline text-sm font-semibold">Manage Content</span>
           </button>
           <button onClick={() => setActiveTab('settings')} className={`p-3 md:px-6 flex items-center gap-3 ${activeTab === 'settings' ? 'text-gold bg-white/5 border-r-2 border-gold' : 'text-gray-400'}`}>
              <Settings size={20} />
              <span className="hidden md:inline text-sm font-semibold">Bot Settings</span>
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto pb-24 bg-black">
           
           {/* --- UPLOAD / EDIT TAB --- */}
           {activeTab === 'upload' && (
             <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        {isEditing ? <Edit size={20} className="text-gold" /> : <Plus size={20} className="text-gold" />}
                        {isEditing ? "Edit Content" : "Add New Content"}
                    </h3>
                    {isEditing && (
                        <button onClick={resetForm} className="text-xs text-red-400 border border-red-500/30 px-3 py-1 rounded hover:bg-red-500/10">
                            Cancel Edit
                        </button>
                    )}
                </div>
                
                {/* Basic Info */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase font-bold">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm focus:border-gold outline-none transition-colors" placeholder="Movie Name..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 uppercase font-bold">Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm outline-none text-white">
                        <option>Exclusive</option>
                        <option>Series</option>
                        <option>Korean Drama</option>
                        <option>All</option>
                      </select>
                      <p className="text-[9px] text-gray-500 mt-1">Select 'Exclusive' to set as Main Banner.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 uppercase font-bold">Year</label>
                      <input value={year} onChange={e => setYear(e.target.value)} type="text" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm outline-none" placeholder="2024" />
                    </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase font-bold">Thumbnail URL</label>
                  <input value={thumbnail} onChange={e => setThumbnail(e.target.value)} type="text" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm outline-none" placeholder="https://image-link.jpg" />
                  {thumbnail && <img src={thumbnail} className="h-24 w-auto rounded border border-white/10 mt-2 object-cover" />}
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-bold">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm h-20 outline-none" placeholder="Plot summary..." />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 uppercase font-bold">Rating</label>
                        <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-lg p-3">
                             <Star size={14} className="text-gold fill-gold" />
                             <input value={rating} onChange={e => setRating(e.target.value)} type="number" step="0.1" className="w-full bg-transparent text-sm outline-none" placeholder="9.0" />
                        </div>
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-400 uppercase font-bold">Quality</label>
                        <select value={quality} onChange={e => setQuality(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm outline-none text-white">
                            <option>4K HDR</option>
                            <option>4K</option>
                            <option>Dolby Vision</option>
                            <option>1080p</option>
                            <option>720p</option>
                            <option>WEB-DL</option>
                            <option>HDCam</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gold uppercase font-bold flex items-center gap-1">
                            <Bot size={12}/> File Code
                        </label>
                        <input 
                            value={telegramCode} 
                            onChange={e => setTelegramCode(e.target.value)} 
                            type="text" 
                            className="w-full bg-[#111] border border-gold/40 rounded-lg p-3 text-sm focus:border-gold outline-none" 
                            placeholder="Movie Code" 
                        />
                    </div>
                </div>

                {/* Episode Builder */}
                <div className="bg-[#111] border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-gold uppercase font-bold flex items-center gap-2">
                           <Database size={12} /> Episodes / Seasons
                        </label>
                    </div>

                    <div className="flex gap-2">
                         <div className="w-16 space-y-1">
                             <input value={newEpSeason} onChange={e => setNewEpSeason(e.target.value)} placeholder="S1" className="w-full bg-black border border-white/10 rounded p-2 text-xs text-center font-bold" />
                         </div>
                        <input value={newEpTitle} onChange={e => setNewEpTitle(e.target.value)} placeholder="Ep Title" className="flex-[2] bg-black border border-white/10 rounded p-2 text-xs" />
                        <input value={newEpDuration} onChange={e => setNewEpDuration(e.target.value)} placeholder="24m" className="w-16 bg-black border border-white/10 rounded p-2 text-xs text-center" />
                        <input value={newEpCode} onChange={e => setNewEpCode(e.target.value)} placeholder="Code" className="flex-1 bg-black border border-gold/30 rounded p-2 text-xs text-gold" />
                        <button onClick={handleAddEpisode} className="bg-white/10 hover:bg-gold hover:text-black p-2 rounded transition-colors"><Plus size={16}/></button>
                    </div>

                    {episodes.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {episodes.map((ep) => (
                                <div key={ep.id} className="flex items-center justify-between bg-black/50 p-2 rounded border border-white/5 text-xs group hover:border-gold/30">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-gray-400">S{ep.season}</span>
                                        <span className="text-gray-300 font-bold">{ep.number}. {ep.title}</span>
                                        <span className="text-gray-500">({ep.duration})</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gold font-mono text-[10px]">{ep.telegramCode}</span>
                                        <button onClick={() => removeEpisode(ep.id)} className="text-red-400 hover:text-red-300"><X size={12}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={handlePublish} disabled={loading} className="w-full bg-gold text-black font-bold py-4 rounded-xl mt-4 hover:bg-[#ffe033] shadow-lg shadow-gold/10 flex items-center justify-center gap-2">
                  <Save size={18} /> {loading ? "Processing..." : (isEditing ? "UPDATE CONTENT" : "PUBLISH NOW")}
                </button>
             </div>
           )}

           {/* --- MANAGE CONTENT TAB --- */}
           {activeTab === 'content' && (
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                   <h3 className="text-xl font-bold">Manage Library ({movieList.length})</h3>
                   <button onClick={handleSeedData} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded flex items-center gap-2 border border-white/10">
                       <RefreshCw size={12} /> Upload Demo Data
                   </button>
               </div>

               <div className="grid gap-3">
                   {movieList.map((movie) => (
                       <div key={movie.id} className="flex items-center gap-4 bg-[#111] p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                           <img src={movie.thumbnail} className="w-12 h-16 object-cover rounded" />
                           <div className="flex-1 min-w-0">
                               <h4 className="font-bold text-sm text-white truncate">{movie.title}</h4>
                               <div className="flex gap-2 text-[10px] text-gray-400">
                                   <span>{movie.category}</span>
                                   <span>•</span>
                                   <span>{movie.rating} ★</span>
                               </div>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => handleEdit(movie)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20">
                                   <Edit size={16} />
                               </button>
                               <button onClick={() => handleDelete(movie.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">
                                   <Trash2 size={16} />
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
               
               {movieList.length === 0 && (
                   <div className="text-center py-10 text-gray-500 text-sm">
                       No content in database. <br/> Use "Upload Demo Data" to get started.
                   </div>
               )}
             </div>
           )}

           {/* --- SETTINGS TAB --- */}
           {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Bot Configuration</h3>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">Global Settings</span>
                </div>

                <div className="p-4 bg-[#111] rounded-xl border border-white/10 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gold uppercase font-bold flex items-center gap-2">
                            <Bot size={14} /> Telegram Bot Username
                        </label>
                        <input 
                            value={botUsername} 
                            onChange={e => setBotUsername(e.target.value.replace('@', ''))} 
                            type="text" 
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm focus:border-gold outline-none" 
                            placeholder="e.g. Cineflix_Streembot" 
                        />
                        <p className="text-[10px] text-gray-500">Do not include '@'. This bot handles the file delivery.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2">
                            <Link size={14} /> Main Channel Link
                        </label>
                        <input 
                            value={channelLink} 
                            onChange={e => setChannelLink(e.target.value)} 
                            type="text" 
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm focus:border-gold outline-none" 
                            placeholder="https://t.me/yourchannel" 
                        />
                        <p className="text-[10px] text-gray-500">Link for the 'Join Channel' buttons.</p>
                    </div>

                    <button onClick={handleSaveSettings} disabled={loading} className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                        <Save size={16} /> {loading ? "Saving..." : "Save Configuration"}
                    </button>
                </div>

                <div className="p-4 bg-gold/5 rounded-xl border border-gold/10">
                    <h4 className="text-gold text-sm font-bold mb-2">How Deep Linking Works</h4>
                    <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
                        <li>Go to your Telegram Bot (<strong>{botUsername || 'your_bot'}</strong>) and upload a file.</li>
                        <li>Get the unique ID or Start Parameter for that file (e.g. <code>batch_123</code>).</li>
                        <li>In the <strong>Upload Tab</strong>, paste <strong>ONLY</strong> that ID into the <strong>Telegram File ID</strong> field.</li>
                        <li>The app automatically generates: <code>t.me/{botUsername}?start={telegramCode}</code>.</li>
                    </ul>
                </div>
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminPanel;
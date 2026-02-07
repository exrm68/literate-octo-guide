import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Settings, LogOut, Trash2, Edit, Plus, Save, Database, RefreshCw, 
  Link, Bot, Star, List, BarChart3, Bell, Image, Users, Download, FileText,
  Eye, Search, Filter, Copy, CheckCircle, XCircle, TrendingUp, Calendar,
  Layers, Zap, Archive, Activity, AlertCircle, Megaphone, Layout, Palette
} from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, 
  query, orderBy, writeBatch, setDoc, getDoc, where, limit 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Movie, Episode } from '../types';
import { INITIAL_MOVIES, BOT_USERNAME } from '../constants';

interface AdminPanelProps {
  onClose: () => void;
}

interface Notice {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  active: boolean;
  createdAt: any;
}

interface Story {
  id: string;
  thumbnail: string;
  title: string;
  slides: { image: string; duration: number }[];
  createdAt: any;
}

interface AnalyticsData {
  totalMovies: number;
  totalEpisodes: number;
  categoryCounts: { [key: string]: number };
  recentUploads: number;
  popularMovies: Movie[];
}

const PremiumAdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
  const [newEpSeason, setNewEpSeason] = useState('1');
  const [newEpDuration, setNewEpDuration] = useState('');
  const [newEpCode, setNewEpCode] = useState('');
  
  // List State
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Notice Management
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNoticeMsg, setNewNoticeMsg] = useState('');
  const [newNoticeType, setNewNoticeType] = useState<'info' | 'warning' | 'success' | 'error'>('info');

  // Story Management
  const [stories, setStories] = useState<Story[]>([]);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryThumb, setNewStoryThumb] = useState('');
  const [storySlides, setStorySlides] = useState<{ image: string; duration: number }[]>([]);

  // Banner Management
  const [banners, setBanners] = useState<Movie[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<string>('');

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMovies: 0,
    totalEpisodes: 0,
    categoryCounts: {},
    recentUploads: 0,
    popularMovies: []
  });

  // Categories Management
  const [customCategories, setCustomCategories] = useState<string[]>([
    'Exclusive', 'Trending', 'Popular', 'New Release', 'Action', 'Drama', 'Comedy', 
    'Thriller', 'Horror', 'Sci-Fi', 'Documentary', 'Anime', 'K-Drama'
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Bulk Operations
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  // Activity Log
  const [activityLog, setActivityLog] = useState<{ action: string; timestamp: Date; details: string }[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all data
  useEffect(() => {
    if (user) {
      if (activeTab === 'dashboard') {
        fetchAnalytics();
      }
      if (activeTab === 'content' || activeTab === 'dashboard') {
        fetchMovies();
      }
      if (activeTab === 'settings') {
        fetchSettings();
      }
      if (activeTab === 'notices') {
        fetchNotices();
      }
      if (activeTab === 'stories') {
        fetchStories();
      }
      if (activeTab === 'banners') {
        fetchBanners();
      }
    }
  }, [user, activeTab]);

  // Filter movies when search or filter changes
  useEffect(() => {
    let filtered = movieList;
    
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterCategory !== 'All') {
      filtered = filtered.filter(m => m.category === filterCategory);
    }
    
    setFilteredMovies(filtered);
  }, [searchQuery, filterCategory, movieList]);

  const addActivityLog = (action: string, details: string) => {
    setActivityLog(prev => [{
      action,
      timestamp: new Date(),
      details
    }, ...prev].slice(0, 50)); // Keep last 50 activities
  };

  const fetchMovies = async () => {
    try {
      const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movie[];
      setMovieList(list);
      setFilteredMovies(list);
    } catch (e) {
      console.warn("Error fetching movies:", e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const snapshot = await getDocs(collection(db, "movies"));
      const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movie[];
      
      const totalEps = movies.reduce((sum, m) => sum + (m.episodes?.length || 0), 0);
      const categoryCounts: { [key: string]: number } = {};
      
      movies.forEach(m => {
        categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = movies.filter(m => 
        m.createdAt?.toDate && m.createdAt.toDate() > sevenDaysAgo
      ).length;

      const popular = movies
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .slice(0, 5);

      setAnalytics({
        totalMovies: movies.length,
        totalEpisodes: totalEps,
        categoryCounts,
        recentUploads: recent,
        popularMovies: popular
      });
    } catch (e) {
      console.error("Error fetching analytics:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBotUsername(data.botUsername || BOT_USERNAME);
        setChannelLink(data.channelLink || '');
        if (data.categories) setCustomCategories(data.categories);
      } else {
        setBotUsername(BOT_USERNAME);
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  };

  const fetchNotices = async () => {
    try {
      const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notice[];
      setNotices(list);
    } catch (e) {
      console.error("Error fetching notices:", e);
    }
  };

  const fetchStories = async () => {
    try {
      const q = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(20));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Story[];
      setStories(list);
    } catch (e) {
      console.error("Error fetching stories:", e);
    }
  };

  const fetchBanners = async () => {
    try {
      const q = query(collection(db, "movies"), where("category", "==", "Exclusive"), limit(10));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movie[];
      setBanners(list);
    } catch (e) {
      console.error("Error fetching banners:", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      addActivityLog('LOGIN', 'Admin logged in');
    } catch (err) {
      setError('Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    addActivityLog('LOGOUT', 'Admin logged out');
    await signOut(auth);
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Exclusive');
    setThumbnail('');
    setTelegramCode('');
    setYear('2026');
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

  const handlePublish = async () => {
    if (!title || !thumbnail) {
      alert("Title and Thumbnail are required!");
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
        rating,
        quality,
        description,
        episodes: episodes.length > 0 ? episodes : undefined,
        createdAt: serverTimestamp()
      };

      if (isEditing && editId) {
        await updateDoc(doc(db, "movies", editId), movieData);
        addActivityLog('UPDATE', `Updated movie: ${title}`);
        alert("Content Updated!");
      } else {
        await addDoc(collection(db, "movies"), movieData);
        addActivityLog('CREATE', `Published new movie: ${title}`);
        alert("Content Published!");
      }

      resetForm();
      fetchMovies();
      if (activeTab === 'dashboard') fetchAnalytics();
    } catch (e) {
      console.error("Error publishing:", e);
      alert("Error occurred!");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (movie: Movie) => {
    setTitle(movie.title);
    setCategory(movie.category);
    setThumbnail(movie.thumbnail);
    setTelegramCode(movie.telegramCode || '');
    setYear(movie.year);
    setRating(movie.rating);
    setQuality(movie.quality);
    setDescription(movie.description || '');
    setEpisodes(movie.episodes || []);
    setIsEditing(true);
    setEditId(movie.id);
    setActiveTab('upload');
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    
    try {
      await deleteDoc(doc(db, "movies", id));
      addActivityLog('DELETE', `Deleted movie with ID: ${id}`);
      alert("Content Deleted!");
      fetchMovies();
      if (activeTab === 'dashboard') fetchAnalytics();
    } catch (e) {
      alert("Error deleting content");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMovies.length === 0) return;
    if (!confirm(`Delete ${selectedMovies.length} selected movies?`)) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedMovies.forEach(id => {
        batch.delete(doc(db, "movies", id));
      });
      await batch.commit();
      addActivityLog('BULK_DELETE', `Deleted ${selectedMovies.length} movies`);
      alert(`${selectedMovies.length} movies deleted!`);
      setSelectedMovies([]);
      setBulkMode(false);
      fetchMovies();
    } catch (e) {
      alert("Error in bulk delete");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        botUsername,
        channelLink,
        categories: customCategories
      });
      addActivityLog('SETTINGS', 'Updated app configuration');
      alert("Settings Saved!");
    } catch (e) {
      alert("Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm("This will add demo movies to your database. Continue?")) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      INITIAL_MOVIES.forEach((movie) => {
        const ref = doc(collection(db, "movies"));
        batch.set(ref, { ...movie, createdAt: serverTimestamp() });
      });
      await batch.commit();
      addActivityLog('SEED', 'Uploaded demo data');
      alert("Demo data uploaded!");
      fetchMovies();
    } catch (e) {
      alert("Error uploading demo data");
    } finally {
      setLoading(false);
    }
  };

  // Notice Management
  const handleAddNotice = async () => {
    if (!newNoticeMsg.trim()) return;
    
    try {
      await addDoc(collection(db, "notices"), {
        message: newNoticeMsg,
        type: newNoticeType,
        active: true,
        createdAt: serverTimestamp()
      });
      addActivityLog('NOTICE', `Created ${newNoticeType} notice`);
      setNewNoticeMsg('');
      fetchNotices();
      alert("Notice added!");
    } catch (e) {
      alert("Error adding notice");
    }
  };

  const handleToggleNotice = async (notice: Notice) => {
    try {
      await updateDoc(doc(db, "notices", notice.id), {
        active: !notice.active
      });
      fetchNotices();
    } catch (e) {
      alert("Error toggling notice");
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    try {
      await deleteDoc(doc(db, "notices", id));
      addActivityLog('NOTICE', 'Deleted notice');
      fetchNotices();
    } catch (e) {
      alert("Error deleting notice");
    }
  };

  // Story Management
  const handleAddStory = async () => {
    if (!newStoryTitle || !newStoryThumb || storySlides.length === 0) {
      alert("Please fill all story fields!");
      return;
    }

    try {
      await addDoc(collection(db, "stories"), {
        title: newStoryTitle,
        thumbnail: newStoryThumb,
        slides: storySlides,
        createdAt: serverTimestamp()
      });
      addActivityLog('STORY', `Created story: ${newStoryTitle}`);
      setNewStoryTitle('');
      setNewStoryThumb('');
      setStorySlides([]);
      fetchStories();
      alert("Story added!");
    } catch (e) {
      alert("Error adding story");
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    try {
      await deleteDoc(doc(db, "stories", id));
      addActivityLog('STORY', 'Deleted story');
      fetchStories();
    } catch (e) {
      alert("Error deleting story");
    }
  };

  // Add category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (customCategories.includes(newCategoryName)) {
      alert("Category already exists!");
      return;
    }

    const updated = [...customCategories, newCategoryName];
    setCustomCategories(updated);
    setNewCategoryName('');
    
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        botUsername,
        channelLink,
        categories: updated
      }, { merge: true });
      addActivityLog('CATEGORY', `Added category: ${newCategoryName}`);
    } catch (e) {
      console.error("Error saving category:", e);
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    if (!confirm(`Remove category "${cat}"?`)) return;
    const updated = customCategories.filter(c => c !== cat);
    setCustomCategories(updated);
    
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        botUsername,
        channelLink,
        categories: updated
      }, { merge: true });
      addActivityLog('CATEGORY', `Removed category: ${cat}`);
    } catch (e) {
      console.error("Error removing category:", e);
    }
  };

  // Export data
  const handleExportData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "movies"));
      const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const dataStr = JSON.stringify(movies, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cineflix-backup-${new Date().toISOString()}.json`;
      link.click();
      
      addActivityLog('EXPORT', 'Exported database');
      alert("Data exported successfully!");
    } catch (e) {
      alert("Error exporting data");
    }
  };

  // Quick Templates
  const applyTemplate = (template: 'movie' | 'series' | 'anime') => {
    if (template === 'movie') {
      setQuality('4K HDR');
      setRating('8.5');
      setEpisodes([]);
    } else if (template === 'series') {
      setQuality('1080p');
      setRating('9.0');
    } else if (template === 'anime') {
      setQuality('1080p');
      setRating('9.2');
      setCategory('Anime');
    }
  };

  // Login Screen
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold/20 rounded-2xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gold/10 rounded-full mb-4">
              <Settings className="w-12 h-12 text-gold" />
            </div>
            <h2 className="text-3xl font-bold text-gold mb-2">Admin Console</h2>
            <p className="text-gray-400 text-sm">Premium Management Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                placeholder="admin@cineflix.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-black font-bold py-3 rounded-lg hover:bg-[#ffe033] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={onClose}
            className="w-full mt-4 text-gray-500 hover:text-white text-sm transition-colors"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // Main Admin Panel
  const bgColor = theme === 'dark' ? 'bg-black' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-white' : 'text-black';
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-black/10';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 ${bgColor} z-50 overflow-hidden`}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor} bg-gradient-to-r from-gold/5 to-transparent`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-lg">
              <Settings className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${textColor}`}>Premium Admin Console</h1>
              <p className="text-xs text-gray-500">Logged in as {user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Palette size={18} className="text-gold" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium">Logout</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className={textColor} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className={`w-64 border-r ${borderColor} ${bgColor} overflow-y-auto custom-scrollbar`}>
            <div className="p-4 space-y-1">
              {[
                { id: 'dashboard', icon: BarChart3, label: 'Dashboard', color: 'text-blue-400' },
                { id: 'upload', icon: Upload, label: 'Upload Content', color: 'text-green-400' },
                { id: 'content', icon: List, label: 'Manage Content', color: 'text-purple-400' },
                { id: 'notices', icon: Bell, label: 'Notices', color: 'text-yellow-400' },
                { id: 'stories', icon: Image, label: 'Stories', color: 'text-pink-400' },
                { id: 'banners', icon: Layout, label: 'Banners', color: 'text-orange-400' },
                { id: 'categories', icon: Layers, label: 'Categories', color: 'text-cyan-400' },
                { id: 'analytics', icon: TrendingUp, label: 'Analytics', color: 'text-indigo-400' },
                { id: 'activity', icon: Activity, label: 'Activity Log', color: 'text-gray-400' },
                { id: 'settings', icon: Settings, label: 'Settings', color: 'text-gold' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gold/10 text-gold border border-gold/20'
                      : `${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${textColor}`
                  }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? 'text-gold' : tab.color} />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor} mb-2`}>Dashboard Overview</h2>
                      <p className="text-gray-500 text-sm">Welcome back! Here's what's happening.</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Database size={24} className="text-blue-400" />
                          </div>
                          <TrendingUp size={16} className="text-blue-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-blue-400 mb-1">{analytics.totalMovies}</h3>
                        <p className="text-sm text-gray-400">Total Movies</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-green-500/20 rounded-lg">
                            <List size={24} className="text-green-400" />
                          </div>
                          <TrendingUp size={16} className="text-green-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-green-400 mb-1">{analytics.totalEpisodes}</h3>
                        <p className="text-sm text-gray-400">Total Episodes</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Calendar size={24} className="text-purple-400" />
                          </div>
                          <Zap size={16} className="text-purple-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-purple-400 mb-1">{analytics.recentUploads}</h3>
                        <p className="text-sm text-gray-400">Uploaded This Week</p>
                      </div>

                      <div className="bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-gold/20 rounded-lg">
                            <Layers size={24} className="text-gold" />
                          </div>
                          <Star size={16} className="text-gold" />
                        </div>
                        <h3 className="text-3xl font-bold text-gold mb-1">{Object.keys(analytics.categoryCounts).length}</h3>
                        <p className="text-sm text-gray-400">Active Categories</p>
                      </div>
                    </div>

                    {/* Category Distribution */}
                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6`}>
                      <h3 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
                        <Layers size={20} className="text-gold" />
                        Category Distribution
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(analytics.categoryCounts).map(([cat, count]) => (
                          <div key={cat} className={`${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-lg p-3 border ${borderColor}`}>
                            <p className="text-xs text-gray-500 mb-1">{cat}</p>
                            <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Rated Movies */}
                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6`}>
                      <h3 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
                        <Star size={20} className="text-gold" />
                        Top Rated Content
                      </h3>
                      <div className="space-y-3">
                        {analytics.popularMovies.map((movie, idx) => (
                          <div key={movie.id} className={`flex items-center gap-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} p-3 rounded-lg border ${borderColor}`}>
                            <span className="text-2xl font-bold text-gold w-8">#{idx + 1}</span>
                            <img src={movie.thumbnail} className="w-12 h-16 object-cover rounded" alt={movie.title} />
                            <div className="flex-1">
                              <h4 className={`font-bold text-sm ${textColor}`}>{movie.title}</h4>
                              <p className="text-xs text-gray-500">{movie.category} • {movie.year}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-gold/10 px-3 py-1 rounded-full">
                              <Star size={14} className="text-gold" />
                              <span className="text-gold font-bold text-sm">{movie.rating}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* UPLOAD CONTENT TAB */}
                {activeTab === 'upload' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className={`text-2xl font-bold ${textColor}`}>
                          {isEditing ? 'Edit Content' : 'Upload New Content'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Fill in the details below to publish content</p>
                      </div>
                      {isEditing && (
                        <button
                          onClick={resetForm}
                          className="px-4 py-2 bg-gray-500/10 text-gray-500 rounded-lg hover:bg-gray-500/20 text-sm font-medium"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    {/* Quick Templates */}
                    <div className={`bg-gradient-to-r ${theme === 'dark' ? 'from-purple-500/5 to-blue-500/5' : 'from-purple-50 to-blue-50'} border ${borderColor} rounded-xl p-4`}>
                      <p className="text-xs text-gray-500 mb-3 uppercase font-bold">Quick Templates</p>
                      <div className="flex gap-2">
                        <button onClick={() => applyTemplate('movie')} className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 text-sm font-medium">
                          🎬 Movie Template
                        </button>
                        <button onClick={() => applyTemplate('series')} className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 text-sm font-medium">
                          📺 Series Template
                        </button>
                        <button onClick={() => applyTemplate('anime')} className="px-4 py-2 bg-pink-500/10 text-pink-400 rounded-lg hover:bg-pink-500/20 text-sm font-medium">
                          🎌 Anime Template
                        </button>
                      </div>
                    </div>

                    {/* Form */}
                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6 space-y-4`}>
                      {/* Title */}
                      <div className="space-y-2">
                        <label className="text-xs text-gold uppercase font-bold">Title *</label>
                        <input
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          type="text"
                          className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                          placeholder="Enter movie/series title"
                        />
                      </div>

                      {/* Category & Year */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-gold uppercase font-bold">Category</label>
                          <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                          >
                            {customCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-gold uppercase font-bold">Year</label>
                          <input
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            type="text"
                            className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                            placeholder="2026"
                          />
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div className="space-y-2">
                        <label className="text-xs text-gold uppercase font-bold flex items-center gap-2">
                          <Image size={12} /> Thumbnail URL *
                        </label>
                        <input
                          value={thumbnail}
                          onChange={e => setThumbnail(e.target.value)}
                          type="text"
                          className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                          placeholder="https://image-link.jpg"
                        />
                        {thumbnail && (
                          <div className="mt-2 p-2 bg-white/5 rounded-lg">
                            <img src={thumbnail} className="w-32 h-48 object-cover rounded mx-auto" alt="Preview" />
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 uppercase font-bold">Description</label>
                        <textarea
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          rows={4}
                          className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none resize-none`}
                          placeholder="Enter plot summary or description..."
                        />
                      </div>

                      {/* Rating, Quality, File Code */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-gold uppercase font-bold flex items-center gap-1">
                            <Star size={12} /> Rating
                          </label>
                          <input
                            value={rating}
                            onChange={e => setRating(e.target.value)}
                            type="text"
                            className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                            placeholder="9.0"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-gold uppercase font-bold">Quality</label>
                          <select
                            value={quality}
                            onChange={e => setQuality(e.target.value)}
                            className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                          >
                            <option>4K HDR</option>
                            <option>4K</option>
                            <option>Dolby Vision</option>
                            <option>1080p</option>
                            <option>720p</option>
                            <option>WEB-DL</option>
                            <option>HDCam</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-gold uppercase font-bold flex items-center gap-1">
                            <Bot size={12} /> File Code
                          </label>
                          <input
                            value={telegramCode}
                            onChange={e => setTelegramCode(e.target.value)}
                            type="text"
                            className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                            placeholder="Movie Code"
                          />
                        </div>
                      </div>

                      {/* Episode Builder */}
                      <div className={`${theme === 'dark' ? 'bg-black/50' : 'bg-gray-100'} border ${borderColor} rounded-xl p-4 space-y-3`}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gold uppercase font-bold flex items-center gap-2">
                            <Database size={12} /> Episodes / Seasons
                          </label>
                          <span className="text-xs text-gray-500">{episodes.length} episodes added</span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            value={newEpSeason}
                            onChange={e => setNewEpSeason(e.target.value)}
                            placeholder="S1"
                            className={`w-16 ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded p-2 text-xs text-center font-bold ${textColor}`}
                          />
                          <input
                            value={newEpTitle}
                            onChange={e => setNewEpTitle(e.target.value)}
                            placeholder="Episode Title"
                            className={`flex-[2] ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded p-2 text-xs ${textColor}`}
                          />
                          <input
                            value={newEpDuration}
                            onChange={e => setNewEpDuration(e.target.value)}
                            placeholder="24m"
                            className={`w-16 ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded p-2 text-xs text-center ${textColor}`}
                          />
                          <input
                            value={newEpCode}
                            onChange={e => setNewEpCode(e.target.value)}
                            placeholder="Code"
                            className={`flex-1 ${theme === 'dark' ? 'bg-black' : 'bg-white'} border border-gold/30 rounded p-2 text-xs text-gold`}
                          />
                          <button
                            onClick={handleAddEpisode}
                            className="bg-gold/10 hover:bg-gold hover:text-black p-2 rounded transition-colors"
                          >
                            <Plus size={16} className="text-gold" />
                          </button>
                        </div>

                        {episodes.length > 0 && (
                          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {episodes.map(ep => (
                              <div
                                key={ep.id}
                                className={`flex items-center justify-between ${theme === 'dark' ? 'bg-black/50' : 'bg-white'} p-2 rounded border ${borderColor} text-xs group hover:border-gold/30`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-gray-400">
                                    S{ep.season}
                                  </span>
                                  <span className={`${textColor} font-bold`}>
                                    {ep.number}. {ep.title}
                                  </span>
                                  <span className="text-gray-500">({ep.duration})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-gold font-mono text-[10px]">{ep.telegramCode}</span>
                                  <button
                                    onClick={() => removeEpisode(ep.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Publish Button */}
                      <button
                        onClick={handlePublish}
                        disabled={loading}
                        className="w-full bg-gold text-black font-bold py-4 rounded-xl mt-4 hover:bg-[#ffe033] shadow-lg shadow-gold/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <Save size={18} />
                        {loading ? 'Processing...' : isEditing ? 'UPDATE CONTENT' : 'PUBLISH NOW'}
                      </button>
                    </div>
                  </div>
                )}

                {/* MANAGE CONTENT TAB */}
                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h2 className={`text-2xl font-bold ${textColor}`}>Manage Content Library</h2>
                        <p className="text-gray-500 text-sm mt-1">{filteredMovies.length} items found</p>
                      </div>
                      <div className="flex gap-2">
                        {bulkMode && selectedMovies.length > 0 && (
                          <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 flex items-center gap-2 text-sm font-medium"
                          >
                            <Trash2 size={16} />
                            Delete {selectedMovies.length} Selected
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setBulkMode(!bulkMode);
                            setSelectedMovies([]);
                          }}
                          className={`px-4 py-2 ${bulkMode ? 'bg-gold/10 text-gold' : 'bg-white/5 text-gray-400'} rounded-lg hover:bg-white/10 flex items-center gap-2 text-sm font-medium`}
                        >
                          <CheckCircle size={16} />
                          Bulk Mode
                        </button>
                        <button
                          onClick={handleExportData}
                          className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 flex items-center gap-2 text-sm font-medium"
                        >
                          <Download size={16} />
                          Export Data
                        </button>
                        <button
                          onClick={handleSeedData}
                          className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 flex items-center gap-2 text-sm font-medium"
                        >
                          <RefreshCw size={16} />
                          Demo Data
                        </button>
                      </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <div className="relative">
                          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by title or description..."
                            className={`w-full ${theme === 'dark' ? 'bg-black/50' : 'bg-gray-100'} border ${borderColor} rounded-lg pl-10 pr-4 py-3 ${textColor} focus:border-gold outline-none`}
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          value={filterCategory}
                          onChange={e => setFilterCategory(e.target.value)}
                          className={`w-full ${theme === 'dark' ? 'bg-black/50' : 'bg-gray-100'} border ${borderColor} rounded-lg pl-10 pr-4 py-3 ${textColor} focus:border-gold outline-none`}
                        >
                          <option value="All">All Categories</option>
                          {customCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Movie Grid */}
                    <div className="grid gap-3">
                      {filteredMovies.map(movie => (
                        <div
                          key={movie.id}
                          className={`flex items-center gap-4 ${theme === 'dark' ? 'bg-[#111]' : 'bg-gray-50'} p-3 rounded-xl border ${borderColor} hover:border-gold/30 transition-all group`}
                        >
                          {bulkMode && (
                            <input
                              type="checkbox"
                              checked={selectedMovies.includes(movie.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedMovies([...selectedMovies, movie.id]);
                                } else {
                                  setSelectedMovies(selectedMovies.filter(id => id !== movie.id));
                                }
                              }}
                              className="w-5 h-5 accent-gold"
                            />
                          )}
                          <img src={movie.thumbnail} className="w-12 h-16 object-cover rounded" alt={movie.title} />
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm ${textColor} truncate`}>{movie.title}</h4>
                            <div className="flex gap-2 text-[10px] text-gray-400 mt-1">
                              <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">{movie.category}</span>
                              <span className="bg-gold/10 text-gold px-2 py-0.5 rounded">★ {movie.rating}</span>
                              <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{movie.quality}</span>
                              {movie.episodes && movie.episodes.length > 0 && (
                                <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                                  {movie.episodes.length} eps
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(movie)}
                              className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(movie.id)}
                              className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredMovies.length === 0 && (
                      <div className="text-center py-20">
                        <Database size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No content found</p>
                        <p className="text-gray-600 text-sm mt-1">Try adjusting your search or filter</p>
                      </div>
                    )}
                  </div>
                )}

                {/* NOTICES TAB */}
                {activeTab === 'notices' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor}`}>Notice Management</h2>
                      <p className="text-gray-500 text-sm mt-1">Create and manage app-wide announcements</p>
                    </div>

                    {/* Add Notice */}
                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6 space-y-4`}>
                      <h3 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
                        <Plus size={20} className="text-gold" />
                        Create New Notice
                      </h3>
                      <div className="space-y-4">
                        <textarea
                          value={newNoticeMsg}
                          onChange={e => setNewNoticeMsg(e.target.value)}
                          placeholder="Enter notice message..."
                          rows={3}
                          className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none resize-none`}
                        />
                        <div className="flex gap-2">
                          {(['info', 'warning', 'success', 'error'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => setNewNoticeType(type)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                newNoticeType === type
                                  ? type === 'info' ? 'bg-blue-500 text-white' :
                                    type === 'warning' ? 'bg-yellow-500 text-black' :
                                    type === 'success' ? 'bg-green-500 text-white' :
                                    'bg-red-500 text-white'
                                  : `${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} ${textColor}`
                              }`}
                            >
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={handleAddNotice}
                          className="w-full bg-gold text-black font-bold py-3 rounded-lg hover:bg-[#ffe033] flex items-center justify-center gap-2"
                        >
                          <Bell size={16} />
                          Publish Notice
                        </button>
                      </div>
                    </div>

                    {/* Notice List */}
                    <div className="space-y-3">
                      {notices.map(notice => (
                        <div
                          key={notice.id}
                          className={`${theme === 'dark' ? 'bg-[#111]' : 'bg-gray-50'} border ${borderColor} rounded-xl p-4`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  notice.type === 'info' ? 'bg-blue-500/10 text-blue-400' :
                                  notice.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                                  notice.type === 'success' ? 'bg-green-500/10 text-green-400' :
                                  'bg-red-500/10 text-red-400'
                                }`}>
                                  {notice.type.toUpperCase()}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  notice.active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                                }`}>
                                  {notice.active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </div>
                              <p className={`${textColor} text-sm`}>{notice.message}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleNotice(notice)}
                                className={`p-2 rounded-lg ${notice.active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'} hover:bg-opacity-20`}
                              >
                                {notice.active ? <Eye size={16} /> : <XCircle size={16} />}
                              </button>
                              <button
                                onClick={() => handleDeleteNotice(notice.id)}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {notices.length === 0 && (
                      <div className="text-center py-20">
                        <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No notices yet</p>
                        <p className="text-gray-600 text-sm mt-1">Create your first announcement above</p>
                      </div>
                    )}
                  </div>
                )}

                {/* STORIES TAB */}
                {activeTab === 'stories' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor}`}>Story Management</h2>
                      <p className="text-gray-500 text-sm mt-1">Manage Instagram-style stories</p>
                    </div>

                    {/* Add Story */}
                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6 space-y-4`}>
                      <h3 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
                        <Plus size={20} className="text-gold" />
                        Create New Story
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          value={newStoryTitle}
                          onChange={e => setNewStoryTitle(e.target.value)}
                          placeholder="Story Title"
                          className={`${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                        />
                        <input
                          value={newStoryThumb}
                          onChange={e => setNewStoryThumb(e.target.value)}
                          placeholder="Thumbnail URL"
                          className={`${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          placeholder="Slide Image URL"
                          className={`flex-1 ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                              setStorySlides([...storySlides, { image: e.currentTarget.value, duration: 5 }]);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={handleAddStory}
                          className="px-6 bg-gold text-black font-bold rounded-lg hover:bg-[#ffe033]"
                        >
                          Create Story
                        </button>
                      </div>
                      {storySlides.length > 0 && (
                        <p className="text-xs text-gray-500">{storySlides.length} slides added</p>
                      )}
                    </div>

                    {/* Story List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stories.map(story => (
                        <div
                          key={story.id}
                          className={`${theme === 'dark' ? 'bg-[#111]' : 'bg-gray-50'} border ${borderColor} rounded-xl overflow-hidden group`}
                        >
                          <img src={story.thumbnail} className="w-full h-48 object-cover" alt={story.title} />
                          <div className="p-4">
                            <h4 className={`font-bold ${textColor} mb-2`}>{story.title}</h4>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{story.slides.length} slides</span>
                              <button
                                onClick={() => handleDeleteStory(story.id)}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {stories.length === 0 && (
                      <div className="text-center py-20">
                        <Image size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No stories yet</p>
                        <p className="text-gray-600 text-sm mt-1">Create your first story above</p>
                      </div>
                    )}
                  </div>
                )}

                {/* BANNERS TAB */}
                {activeTab === 'banners' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor}`}>Banner Management</h2>
                      <p className="text-gray-500 text-sm mt-1">Control main banner carousel</p>
                    </div>

                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6`}>
                      <p className="text-sm text-gray-500 mb-4">
                        Banners are automatically selected from "Exclusive" category movies. 
                        To change banners, edit movies in the Content tab and set them to "Exclusive" category.
                      </p>
                      <div className="grid gap-4">
                        {banners.slice(0, 5).map((movie, idx) => (
                          <div key={movie.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
                            <span className="text-2xl font-bold text-gold w-8">#{idx + 1}</span>
                            <img src={movie.thumbnail} className="w-16 h-24 object-cover rounded" alt={movie.title} />
                            <div className="flex-1">
                              <h4 className={`font-bold ${textColor}`}>{movie.title}</h4>
                              <p className="text-xs text-gray-500">{movie.description?.slice(0, 80)}...</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORIES TAB */}
                {activeTab === 'categories' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor}`}>Category Management</h2>
                      <p className="text-gray-500 text-sm mt-1">Create and manage content categories</p>
                    </div>

                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6 space-y-4`}>
                      <h3 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
                        <Plus size={20} className="text-gold" />
                        Add New Category
                      </h3>
                      <div className="flex gap-2">
                        <input
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          placeholder="Category Name"
                          className={`flex-1 ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                          onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                        />
                        <button
                          onClick={handleAddCategory}
                          className="px-6 bg-gold text-black font-bold rounded-lg hover:bg-[#ffe033]"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {customCategories.map(cat => (
                        <div
                          key={cat}
                          className={`${theme === 'dark' ? 'bg-[#111]' : 'bg-gray-50'} border ${borderColor} rounded-xl p-4 flex items-center justify-between group hover:border-gold/30`}
                        >
                          <span className={`font-bold ${textColor}`}>{cat}</span>
                          <button
                            onClick={() => handleRemoveCategory(cat)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor}`}>Advanced Analytics</h2>
                      <p className="text-gray-500 text-sm mt-1">Detailed insights and metrics</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-blue-500/10 to-purple-500/10' : 'from-blue-50 to-purple-50'} border ${borderColor} rounded-xl p-6`}>
                        <h3 className={`text-lg font-bold ${textColor} mb-4`}>Content Distribution</h3>
                        <div className="space-y-3">
                          {Object.entries(analytics.categoryCounts).map(([cat, count]) => {
                            const percentage = (count / analytics.totalMovies) * 100;
                            return (
                              <div key={cat}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm text-gray-400">{cat}</span>
                                  <span className={`text-sm font-bold ${textColor}`}>{count} ({percentage.toFixed(0)}%)</span>
                                </div>
                                <div className="w-full bg-black/20 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-gold to-yellow-300 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-green-500/10 to-emerald-500/10' : 'from-green-50 to-emerald-50'} border ${borderColor} rounded-xl p-6`}>
                        <h3 className={`text-lg font-bold ${textColor} mb-4`}>Quick Stats</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Avg Rating</span>
                            <span className={`text-2xl font-bold ${textColor}`}>
                              {movieList.length > 0
                                ? (movieList.reduce((sum, m) => sum + parseFloat(m.rating), 0) / movieList.length).toFixed(1)
                                : '0.0'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Movies with Episodes</span>
                            <span className={`text-2xl font-bold ${textColor}`}>
                              {movieList.filter(m => m.episodes && m.episodes.length > 0).length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">4K Content</span>
                            <span className={`text-2xl font-bold ${textColor}`}>
                              {movieList.filter(m => m.quality.includes('4K')).length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTIVITY LOG TAB */}
                {activeTab === 'activity' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor}`}>Activity Log</h2>
                      <p className="text-gray-500 text-sm mt-1">Recent admin actions and changes</p>
                    </div>

                    <div className="space-y-2">
                      {activityLog.map((log, idx) => (
                        <div
                          key={idx}
                          className={`${theme === 'dark' ? 'bg-[#111]' : 'bg-gray-50'} border ${borderColor} rounded-xl p-4 flex items-start gap-4`}
                        >
                          <div className="p-2 bg-gold/10 rounded-lg">
                            <Activity size={16} className="text-gold" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-bold text-sm ${textColor}`}>{log.action}</span>
                              <span className="text-xs text-gray-500">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">{log.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {activityLog.length === 0 && (
                      <div className="text-center py-20">
                        <Activity size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No activity yet</p>
                        <p className="text-gray-600 text-sm mt-1">Admin actions will appear here</p>
                      </div>
                    )}
                  </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor}`}>App Configuration</h2>
                      <p className="text-gray-500 text-sm mt-1">Configure global app settings</p>
                    </div>

                    <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-[#1a1a1a] to-[#0a0a0a]' : 'from-gray-50 to-white'} border ${borderColor} rounded-xl p-6 space-y-6`}>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs text-gold uppercase font-bold flex items-center gap-2">
                            <Bot size={14} /> Telegram Bot Username
                          </label>
                          <input
                            value={botUsername}
                            onChange={e => setBotUsername(e.target.value.replace('@', ''))}
                            type="text"
                            className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                            placeholder="e.g. Cineflix_Streambot"
                          />
                          <p className="text-[10px] text-gray-500">Don't include '@'. This bot handles file delivery.</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2">
                            <Link size={14} /> Main Channel Link
                          </label>
                          <input
                            value={channelLink}
                            onChange={e => setChannelLink(e.target.value)}
                            type="text"
                            className={`w-full ${theme === 'dark' ? 'bg-black' : 'bg-white'} border ${borderColor} rounded-lg p-3 ${textColor} focus:border-gold outline-none`}
                            placeholder="https://t.me/yourchannel"
                          />
                          <p className="text-[10px] text-gray-500">Link for 'Join Channel' buttons.</p>
                        </div>

                        <button
                          onClick={handleSaveSettings}
                          disabled={loading}
                          className="w-full bg-gold text-black font-bold py-3 rounded-xl hover:bg-[#ffe033] transition-colors flex items-center justify-center gap-2"
                        >
                          <Save size={16} />
                          {loading ? 'Saving...' : 'Save Configuration'}
                        </button>
                      </div>
                    </div>

                    <div className={`bg-gradient-to-br from-gold/5 to-yellow-500/5 border border-gold/20 rounded-xl p-6`}>
                      <h4 className="text-gold text-sm font-bold mb-3 flex items-center gap-2">
                        <AlertCircle size={16} />
                        How Deep Linking Works
                      </h4>
                      <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
                        <li>Upload a file to your Telegram Bot (<strong>{botUsername || 'your_bot'}</strong>)</li>
                        <li>Get the unique ID or Start Parameter (e.g., <code>batch_123</code>)</li>
                        <li>In Upload Tab, paste ONLY that ID in the File Code field</li>
                        <li>App generates: <code>t.me/{botUsername}?start={'{'}code{'}'}</code></li>
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(217, 174, 30, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(217, 174, 30, 0.5);
        }
      `}</style>
    </motion.div>
  );
};

export default PremiumAdminPanel;

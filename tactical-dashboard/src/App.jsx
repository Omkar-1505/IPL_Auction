import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, Users, Shield, Zap, Target, Crosshair, 
  ChevronRight, Activity, Search, RefreshCw, CheckCircle2, 
  MapPin, Video, AlertTriangle, AlertCircle, Award, Flag, Map as MapIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STADIUMS = [
  "Neutral Venue", "Wankhede Stadium, Mumbai", "Eden Gardens, Kolkata",
  "M. Chinnaswamy Stadium, Bengaluru", "M.A. Chidambaram Stadium, Chennai",
  "Narendra Modi Stadium, Ahmedabad", "Arun Jaitley Stadium, Delhi",
  "Sawai Mansingh Stadium, Jaipur", "Rajiv Gandhi Intl Stadium, Hyderabad",
  "Ekana Cricket Stadium, Lucknow", "Maharaja Yadavindra Singh, Mullanpur"
];

const IPL_TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'DC', 'PBKS', 'LSG', 'GT'];

const TEAM_MAP = {
  'CSK': ['Chennai Super Kings'],
  'MI': ['Mumbai Indians'],
  'RCB': ['Royal Challengers Bengaluru', 'Royal Challengers Bangalore'],
  'KKR': ['Kolkata Knight Riders'],
  'SRH': ['Sunrisers Hyderabad'],
  'RR': ['Rajasthan Royals'],
  'DC': ['Delhi Capitals'],
  'PBKS': ['Punjab Kings'],
  'LSG': ['Lucknow Super Giants'],
  'GT': ['Gujarat Titans']
};

const parseCSV = (csvText) => {
  // Catch silent Vite 404s returning HTML instead of CSV
  if (!csvText || typeof csvText !== 'string' || csvText.includes("<!DOCTYPE html>")) return [];
  
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  // CRITICAL FIX: Strip invisible BOM (\uFEFF) characters from Excel saves
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(curr.trim());
        curr = '';
      } else {
        curr += char;
      }
    }
    values.push(curr.trim());

    let obj = {};
    headers.forEach((h, i) => {
      let val = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
      const lowerVal = val.toLowerCase();
      // Neutralize Kaggle NaN and null strings
      if (['nan', 'not available', 'unknown', 'none', 'null'].includes(lowerVal)) val = '';
      obj[h] = val;
    });
    return obj;
  });
};

const normalizeString = (str) => (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

const getDisplayName = (player) => {
  if (!player) return "Unknown";
  let name = player.Full_Name && player.Full_Name.trim() !== '' ? player.Full_Name : player.Player_Name;
  if (!name || name.toLowerCase() === 'unknown' || name.toLowerCase() === 'nan') name = player.Player_Name;
  return name.length > 42 ? name.substring(0, 42) + "..." : name;
};

const tokenize = (str) => normalizeString(str).split(' ').filter(Boolean);

const buildSurnameIndex = (list, nameKey = 'Player_Name') => {
  const idx = {};
  list.forEach((item) => {
    const toks = tokenize(item[nameKey]);
    if (toks.length === 0) return;
    const surname = toks[toks.length - 1];
    if (!idx[surname]) idx[surname] = [];
    idx[surname].push({ item, toks });
  });
  return idx;
};

const scoreGivenNames = (fullGiven, candGiven) => {
  if (fullGiven.length === 0 || candGiven.length === 0) return 0;
  let score = 0;
  fullGiven.forEach((g) => {
    if (candGiven.includes(g)) score += 2;
    else if (candGiven.some((c) => c[0] === g[0])) score += 1;
  });
  return score;
};

const findBestMatch = (name, surnameIndex) => {
  const toks = tokenize(name);
  if (toks.length < 2) return null;
  const surname = toks[toks.length - 1];
  const candidates = surnameIndex[surname];
  if (!candidates || candidates.length === 0) return null;

  const fullGiven = toks.slice(0, -1);
  let best = null;
  let bestScore = 0;
  let tie = false;

  candidates.forEach(({ item, toks: candToks }) => {
    const s = scoreGivenNames(fullGiven, candToks.slice(0, -1));
    if (s > bestScore) {
      best = item;
      bestScore = s;
      tie = false;
    } else if (s === bestScore && s > 0 && item !== best) {
      tie = true;
    }
  });

  return (bestScore === 0 || tie) ? null : best;
};

const smartLookup = (name, list, exactMap, surnameIndex) => {
  const norm = normalizeString(name);
  if (exactMap[norm]) return exactMap[norm];
  return findBestMatch(name, surnameIndex);
};

const BackgroundAnimation = () => (
  <div className="fixed inset-0 z-[-1] bg-[#020617] overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
    <motion.div animate={{ y: [0, -30, 0], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]" />
    <motion.div animate={{ y: [0, 40, 0], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-purple-900/20 rounded-full blur-[150px]" />
  </div>
);

const Navbar = ({ active, setActive }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'py-4 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-2xl' : 'py-6 bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400 w-8 h-8 animate-pulse" />
          <span className="text-3xl font-black text-white tracking-widest uppercase">IPL<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Brain</span></span>
        </div>
        <div className="flex gap-2 bg-slate-900/60 p-2 rounded-full border border-slate-700/50 backdrop-blur-md overflow-x-auto shadow-lg">
          <button onClick={() => setActive('war_room')} className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${active === 'war_room' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Users size={18} /> War Room
          </button>
          <button onClick={() => setActive('clash')} className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${active === 'clash' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Swords size={18} /> Clash Arena
          </button>
          <button onClick={() => setActive('stats')} className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${active === 'stats' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Activity size={18} /> Stats Hub
          </button>
        </div>
      </div>
    </nav>
  );
};

const SearchableSelect = ({ options, value, onChange, placeholder }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  const displayValue = isOpen ? search : (selectedOption ? selectedOption.label : '');
  
  const filtered = options
    .filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="relative w-full text-left" ref={wrapperRef}>
      <input
        type="text"
        className={`w-full bg-slate-900 border ${isOpen ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-slate-700'} text-white font-medium p-4 rounded-2xl text-lg outline-none transition-all cursor-text hover:bg-slate-800`}
        placeholder={placeholder}
        value={displayValue}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
      />
      <div className="absolute pointer-events-none text-slate-400 top-4 right-4 w-6 h-6">
        <ChevronRight className={`w-full h-full transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-slate-800 border border-slate-700 max-h-60 overflow-y-auto custom-scrollbar rounded-xl shadow-2xl">
          {filtered.length > 0 ? filtered.map(o => (
            <div 
              key={o.value}
              className="p-3 border-b border-slate-700/50 hover:bg-blue-600 text-slate-200 font-medium cursor-pointer transition-colors"
              onMouseDown={(e) => {
                e.preventDefault(); 
                onChange(o.value);
                setIsOpen(false);
              }}
            >
              {o.label}
            </div>
          )) : (
            <div className="p-3 text-slate-500 italic text-sm">No players found...</div>
          )}
        </div>
      )}
    </div>
  );
};

const FieldingIntel = ({ player }) => {
  if (!player) return null;
  const primary = player.General_Fielding_Position || player.Primary_Position;
  const loose = player.Out_Of_Position_Vulnerability || player.Loose_Fielding_Position;
  const isLooseValid = loose && loose !== "";

  if (primary === 'Wicketkeeper' || primary === 'Wicket Keeper') {
    return (
      <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 flex items-start gap-3 mt-4">
        <Shield className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-400 font-bold text-sm">SPECIALIST ROLE</p>
          <p className="text-blue-200 text-sm">Cleared for Wicketkeeping duties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-green-400 font-bold text-sm">OPTIMAL ZONE</p>
          <p className="text-green-200 text-sm">{primary ? primary : "Any Position"}</p>
        </div>
      </div>
      {isLooseValid ? (
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-500 font-bold text-sm">LIABILITY</p>
            <p className="text-red-200 text-sm">Fielding error at <span className="font-bold underline">{loose}</span>.</p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 flex items-start gap-3">
          <Shield className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 font-bold text-sm">SOLID DEFENSE</p>
            <p className="text-emerald-200 text-sm">Good in all fielding positions.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerDetailCard = ({ player }) => {
  if (!player) return null;
  const displayName = getDisplayName(player);
  const role = player.Role || "Player";
  const isBatter = role === 'Batsman' || role === 'Wicketkeeper' || role === 'Wicket Keeper';
  const isBowler = role === 'Bowler';
  const isAllRounder = role === 'All-Rounder';

  let formattedStadiums = "Neutral Venues";
  if (player.Best_to_Worst_Venues && player.Best_to_Worst_Venues !== "Neutral Venues") {
    formattedStadiums = player.Best_to_Worst_Venues.replace(/>/g, ',').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3).join(', ');
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-[2rem] p-8 shadow-2xl w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-8 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-tight">{displayName}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-lg">
            <span className="flex items-center gap-2 text-slate-300 font-bold bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
              <Flag className="w-4 h-4 text-blue-400" /> {player.Country || "Unknown"}
            </span>
            <span className="flex items-center gap-2 text-white font-black bg-blue-600/20 px-4 py-1.5 rounded-full border border-blue-500/50">
              <Shield className="w-4 h-4 text-blue-400" /> {player.Team || "Unattached"}
            </span>
            <span className="text-slate-400 font-bold uppercase tracking-widest">{role}</span>
          </div>
        </div>
      </div>

      <div className={`grid lg:grid-cols-${isBatter ? '1' : '2'} gap-8 mb-8`}>
        <div className="bg-black/50 p-6 rounded-3xl border border-slate-800/60 shadow-inner">
          <h4 className="text-slate-500 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><Target className="w-5 h-5 text-blue-500" /> Batting Intelligence</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Primary Phase</span><span className="font-bold text-white uppercase">{player.Primary_Batting_Phase || "Middle Order"}</span></div>
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Overall Strike Rate</span><span className="font-black text-xl text-blue-400">{player.Overall_Bat_SR || "0.0"}</span></div>
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Death Over SR</span><span className="font-black text-xl text-purple-400">{player.Pressure_Bat_SR_Death || "0.0"}</span></div>
          </div>
        </div>
        {!isBatter && (
          <div className="bg-black/50 p-6 rounded-3xl border border-slate-800/60 shadow-inner">
            <h4 className="text-slate-500 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><Crosshair className="w-5 h-5 text-red-500" /> Bowling Intelligence</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Career Wickets</span><span className="font-black text-xl text-white">{player.Wickets || "0"}</span></div>
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Overall Economy</span><span className="font-black text-xl text-green-400">{player.Overall_Bowl_Econ || "0.0"}</span></div>
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Death Economy</span><span className="font-black text-xl text-red-400">{player.Pressure_Bowl_Econ_Death || "0.0"}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700/80 mb-8">
        <h4 className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><MapIcon className="w-5 h-5 text-emerald-500" /> Venue & Fielding Diagnostics</h4>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-black/40 p-4 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Best Stadiums</p>
            <p className="text-white font-medium text-sm leading-relaxed">{formattedStadiums}</p>
          </div>
          <div className="bg-green-950/20 p-4 rounded-2xl border border-green-900/30">
            <p className="text-xs text-green-500 uppercase font-bold mb-2">Strong Zone</p>
            <p className="text-green-100 font-medium text-sm">{player.General_Fielding_Position || player.Primary_Position || "Any Position"}</p>
          </div>
          <div className="bg-red-950/20 p-4 rounded-2xl border border-red-900/30">
            <p className="text-xs text-red-500 uppercase font-bold mb-2">Liability Zone / Drops</p>
            <p className="text-red-100 font-medium text-sm">{player.Out_Of_Position_Vulnerability || player.Loose_Fielding_Position || "Good in all positions"}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-xl mb-8">
         <h4 className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-orange-500" /> H2H Matchups & Rivals</h4>
         <div className={`grid md:grid-cols-${isAllRounder ? '2' : '1'} gap-6`}>
           {(isBatter || isAllRounder) && (
             <div className="bg-slate-900/50 p-5 rounded-2xl border border-red-900/40">
               <p className="text-xs text-red-400 uppercase font-bold mb-2">Most Dangerous Bowler</p>
               <p className="text-white font-black text-lg">{player.Primary_Threat_Bowler && player.Primary_Threat_Bowler !== "None" ? player.Primary_Threat_Bowler : "Awaiting Scout Data"}</p>
             </div>
           )}
           {(isBowler || isAllRounder) && (
             <div className="bg-slate-900/50 p-5 rounded-2xl border border-orange-900/40">
               <p className="text-xs text-orange-400 uppercase font-bold mb-2">Nightmare Batter</p>
               <p className="text-white font-black text-lg">{player.Primary_Nightmare_Batter && player.Primary_Nightmare_Batter !== "None" ? player.Primary_Nightmare_Batter : "Awaiting Scout Data"}</p>
             </div>
           )}
         </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg">
        <div className="bg-blue-500/20 p-4 rounded-full shrink-0">
          <Video className="text-blue-400 w-8 h-8" />
        </div>
        <div>
          <h4 className="text-blue-400 font-black uppercase text-sm tracking-widest mb-3">Coach's Tape Suggestion</h4>
          <p className="text-slate-200 font-medium text-lg leading-relaxed italic">"{player.Coach_Tape_Suggestion || "Standard technical analysis required. Review recent footage."}"</p>
        </div>
      </div>
    </motion.div>
  );
};

const WarRoom = ({ playersDB }) => {
  const [mode, setMode] = useState('ipl');
  const [stadium, setStadium] = useState('Neutral Venue');
  const [myFranchise, setMyFranchise] = useState('RCB');
  const [oppFranchise, setOppFranchise] = useState('CSK');
  
  const [mySquadPool, setMySquadPool] = useState([]); 
  const [oppSquadPool, setOppSquadPool] = useState([]); 
  const [mySelected15, setMySelected15] = useState([]);
  const [oppSelected15, setOppSelected15] = useState([]);
  const [customSearch, setCustomSearch] = useState('');
  
  const [isFetching, setIsFetching] = useState(false);
  const [coachReview, setCoachReview] = useState(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analyzeTab, setAnalyzeTab] = useState('opponent');

  useEffect(() => {
    setMySelected15([]);
    setOppSelected15([]);
    setCoachReview(null);
    setIsAnalyzed(false);
    setMySquadPool([]);
    setOppSquadPool([]);
    setCustomSearch('');
  }, [mode]);

  const handleMyFranchiseChange = (e) => {
    const val = e.target.value;
    setMyFranchise(val);
    if (val === oppFranchise) {
      setOppFranchise(IPL_TEAMS.find(t => t !== val));
    }
  };

  const handleOppFranchiseChange = (e) => {
    const val = e.target.value;
    setOppFranchise(val);
    if (val === myFranchise) {
      setMyFranchise(IPL_TEAMS.find(t => t !== val));
    }
  };

  const isTeamMatch = (player, franchiseCode) => {
    if (!player || !player.In_2026_Squad || !player.Team) return false;
    const aliases = TEAM_MAP[franchiseCode] || [franchiseCode];
    return aliases.some(alias => player.Team.toLowerCase().trim() === alias.toLowerCase().trim());
  };

  const handleGo = () => {
    setIsFetching(true);
    setCoachReview(null);
    setIsAnalyzed(false);

    setTimeout(() => {
      const myTeamPlayers = playersDB.filter(p => isTeamMatch(p, myFranchise)).map(p => p.Player_Name);
      const oppTeamPlayers = playersDB.filter(p => isTeamMatch(p, oppFranchise)).map(p => p.Player_Name);
      
      setMySquadPool(myTeamPlayers);
      setOppSquadPool(oppTeamPlayers);
      setMySelected15([]);
      setOppSelected15([]);
      setIsFetching(false);
    }, 400);
  };

  const togglePlayerSelection = (playerName, isMyTeam) => {
    if (isMyTeam) {
      setMySelected15(prev => {
        if (prev.includes(playerName)) return prev.filter(p => p !== playerName);
        if (prev.length < 15) return [...prev, playerName];
        return prev;
      });
    } else {
      setOppSelected15(prev => {
        if (prev.includes(playerName)) return prev.filter(p => p !== playerName);
        if (prev.length < 15) return [...prev, playerName];
        return prev;
      });
    }
  };

  const runCoachReview = () => {
    let poolToDraftFrom = [];
    if (mode === 'ipl') {
      poolToDraftFrom = mySquadPool.map(name => playersDB.find(p => p.Player_Name === name)).filter(Boolean);
    } else {
      poolToDraftFrom = mySelected15.map(name => playersDB.find(p => p.Player_Name === name)).filter(Boolean);
    }

    const validOpp = oppSelected15.filter(Boolean);
    
    // Pitch Typologies
    const isSpinTrack = ["M.A. Chidambaram Stadium, Chennai", "Ekana Cricket Stadium, Lucknow", "Arun Jaitley Stadium, Delhi", "Rajiv Gandhi Intl Stadium, Hyderabad"].includes(stadium);
    const isFlatTrack = ["Wankhede Stadium, Mumbai", "M. Chinnaswamy Stadium, Bengaluru", "Eden Gardens, Kolkata"].includes(stadium);
    const isPaceTrack = ["Maharaja Yadavindra Singh, Mullanpur", "Narendra Modi Stadium, Ahmedabad", "Sawai Mansingh Stadium, Jaipur"].includes(stadium);

    const calculateDynamicScore = (player) => {
      let baseScore = 0;
      const sr = Number(player.Overall_Bat_SR) || 0;
      const wickets = Number(player.Wickets) || 0;
      const econ = Number(player.Overall_Bowl_Econ) || 9.0;
      const drops = Number(player.Total_Dropped_Catches) || 0;
      const role = player.Role || 'Player';
      const phase = player.Primary_Batting_Phase || '';

      if (role === 'Batsman' || role.includes('Wicket')) {
        baseScore = sr * 2; 
      } else if (role === 'Bowler') {
        baseScore = (wickets * 1.5) + ((10 - econ) * 30); 
      } else { 
        baseScore = sr + (wickets * 1.5) + ((10 - econ) * 15);
      }
      
      baseScore -= (drops * 25);
      if (stadium !== 'Neutral Venue' && player.Best_to_Worst_Venues && player.Best_to_Worst_Venues.includes(stadium)) baseScore += 300;

      if (isFlatTrack) {
         if (phase.includes("Aggressor") || phase.includes("Finisher")) baseScore += 200; 
         if (role === 'Bowler' && econ < 8.5) baseScore += 150; 
      } else if (isSpinTrack) {
         if (role === 'All-Rounder') baseScore += 250; 
         if (phase.includes("Anchor")) baseScore += 150; 
      } else if (isPaceTrack) {
         if (role === 'Bowler') baseScore += 150; 
         if (phase.includes("Aggressor")) baseScore += 100; 
      }

      if (validOpp.length > 0) {
        if (player.Primary_Threat_Bowler && validOpp.includes(player.Primary_Threat_Bowler)) baseScore -= 250; 
        validOpp.forEach(oppName => {
          const oppProfile = playersDB.find(db => db.Player_Name === oppName);
          if (oppProfile && oppProfile.Primary_Threat_Bowler === player.Player_Name) baseScore += 400; 
        });
      }
      return baseScore;
    };

    const sorted = [...poolToDraftFrom].sort((a, b) => calculateDynamicScore(b) - calculateDynamicScore(a));

    let xi = [];
    let remaining = [...sorted];

    const extractTopRole = (condition) => {
       const idx = remaining.findIndex(condition);
       if (idx !== -1) xi.push(remaining.splice(idx, 1)[0]);
    };

    extractTopRole(p => p.Role.includes('Wicket'));
    extractTopRole(p => p.Role === 'Batsman' && p.Primary_Batting_Phase?.includes('Top Order'));
    extractTopRole(p => p.Primary_Batting_Phase?.includes('Finisher'));
    extractTopRole(p => p.Role === 'All-Rounder');
    extractTopRole(p => p.Role === 'Bowler');
    extractTopRole(p => p.Role === 'Bowler');
    extractTopRole(p => p.Role === 'Bowler' || p.Role === 'All-Rounder');

    while (xi.length < 11 && remaining.length > 0) {
        xi.push(remaining.shift());
    }
    
    const roleOrder = { 'Batsman': 1, 'Wicketkeeper': 2, 'Wicket Keeper': 2, 'All-Rounder': 3, 'Bowler': 4 };
    xi.sort((a,b) => (roleOrder[a.Role] || 5) - (roleOrder[b.Role] || 5));

    const impactSubs = remaining.slice(0, 4);

    if (mode === 'ipl') {
      setMySelected15([...xi, ...impactSubs].map(p => p.Player_Name));
    }

    setCoachReview({
      xi: xi.map(p => p.Player_Name),
      subs: impactSubs.map(p => p.Player_Name)
    });
    
    setTimeout(() => document.getElementById('coach-review-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleAnalyze = () => {
    setIsAnalyzed(true);
    setTimeout(() => document.getElementById('analyze-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const renderTacticCards = (playerList, title) => (
    <div className="space-y-6 mt-6">
      <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm">{title}</h3>
      {playerList.map((pName, i) => {
        const dbProfile = playersDB.find(db => db.Player_Name === pName);
        const role = dbProfile?.Role || 'Player';
        return (
          <div key={i} className="bg-black/40 p-5 rounded-2xl border border-slate-800/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
              <span className="text-white font-bold text-lg">{getDisplayName(dbProfile || {Player_Name: pName})} <span className="text-sm font-normal text-slate-500 ml-2">({role})</span></span>
            </div>
            {dbProfile ? (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {role !== 'Bowler' && (
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-red-400 font-bold block mb-1">Bowling to him:</span>
                    <span className="text-slate-300 block mb-1">{dbProfile.Clash_Pace_Tactic || "Standard pace lines."}</span>
                    <span className="text-slate-400 block">{dbProfile.Clash_Spin_Tactic || "Standard spin lengths."}</span>
                  </div>
                )}
                {role !== 'Batsman' && (
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-blue-400 font-bold block mb-1">Batting against him:</span>
                    <span className="text-slate-300 block">{dbProfile.Batting_Against_Him_Tactic || "Rotate strike."}</span>
                  </div>
                )}
                <div className="md:col-span-2 bg-purple-900/10 p-3 rounded-lg border border-purple-900/30">
                  <span className="text-purple-400 font-bold flex items-center gap-1 mb-1"><Video className="w-3 h-3"/> Coach Tape Suggestion:</span>
                  <span className="text-slate-300 italic">"{dbProfile.Coach_Tape_Suggestion || "Review match footage."}"</span>
                </div>
              </div>
            ) : (
              <span className="text-slate-500 text-sm">Awaiting Scout Data. Generic tactical approach required.</span>
            )}
          </div>
        );
      })}
    </div>
  );

  const canClash = mode === 'ipl' ? oppSelected15.length >= 11 : (mySelected15.length >= 11 && oppSelected15.length >= 11);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
          <Shield className="text-blue-500 w-16 h-16" /> Tactical War Room
        </h1>
        <p className="text-slate-400 text-lg font-medium tracking-wide">Build your squad and dismantle the opposition.</p>
      </div>

      <div className="flex justify-center mb-12">
        <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-700 flex flex-col md:flex-row shadow-2xl">
          <button onClick={() => setMode('ipl')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${mode === 'ipl' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>IPL Match</button>
          <button onClick={() => setMode('custom')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${mode === 'custom' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Custom Match</button>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl mb-12">
        
        <div className="mb-10 max-w-xl mx-auto">
          <label className="text-slate-400 font-bold text-sm uppercase mb-3 block text-center tracking-widest"><MapPin className="inline w-5 h-5 mr-2 text-emerald-400"/> Select Stadium</label>
          <select value={stadium} onChange={(e) => setStadium(e.target.value)} className="w-full bg-slate-950/80 border-2 border-slate-700 rounded-2xl p-4 text-white font-bold text-lg outline-none focus:border-purple-500 text-center shadow-inner cursor-pointer transition-colors">
            {STADIUMS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {mode === 'ipl' && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col lg:flex-row gap-6 items-end justify-center bg-black/30 p-8 rounded-3xl border border-slate-800/50">
              <div className="w-full lg:flex-1">
                <label className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3 block text-center">Your Franchise</label>
                <select value={myFranchise} onChange={handleMyFranchiseChange} className="w-full h-14 bg-slate-900 border-2 border-blue-500/30 rounded-2xl px-4 text-white font-bold outline-none focus:border-blue-500 text-center cursor-pointer hover:bg-slate-800 transition-colors">
                  {IPL_TEAMS.map(t => <option key={t} value={t} disabled={t === oppFranchise} className="bg-slate-900 text-white disabled:text-slate-600 disabled:italic">{TEAM_MAP[t][0]}</option>)}
                </select>
              </div>
              <div className="text-3xl font-black text-slate-600 italic pb-3">VS</div>
              <div className="w-full lg:flex-1">
                <label className="text-red-400 font-black text-xs uppercase tracking-widest mb-3 block text-center">Opponent Franchise</label>
                <select value={oppFranchise} onChange={handleOppFranchiseChange} className="w-full h-14 bg-slate-900 border-2 border-red-500/30 rounded-2xl px-4 text-white font-bold outline-none focus:border-red-500 text-center cursor-pointer hover:bg-slate-800 transition-colors">
                  {IPL_TEAMS.map(t => <option key={t} value={t} disabled={t === myFranchise} className="bg-slate-900 text-white disabled:text-slate-600 disabled:italic">{TEAM_MAP[t][0]}</option>)}
                </select>
              </div>
              <button onClick={handleGo} disabled={isFetching} className="w-full lg:w-auto h-14 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white px-8 rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center">
                {isFetching ? <RefreshCw className="animate-spin" /> : "GO"}
              </button>
            </div>

            {mySquadPool.length > 0 && oppSquadPool.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-8 text-center">
                  <h3 className="text-yellow-400 font-black uppercase tracking-widest flex items-center justify-center gap-2"><Target className="w-5 h-5"/> Draft Opponent's Roster</h3>
                  <p className="text-slate-400 text-sm mt-1">Select 11 to 15 players from the opponent's squad. The AI Coach will auto-draft your best 11.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-blue-950/10 p-6 rounded-3xl border border-blue-900/30 shadow-inner opacity-80 pointer-events-none">
                    <h4 className="text-blue-400 font-black text-xl mb-6 uppercase text-center">{myFranchise} Squad</h4>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {mySquadPool.map(p => {
                        const prof = playersDB.find(db => db.Player_Name === p);
                        return (
                          <div key={p} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900/50 border border-slate-700 text-slate-500 cursor-default">
                            {getDisplayName(prof || { Player_Name: p })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-red-950/10 p-6 rounded-3xl border border-red-900/30 shadow-inner">
                    <h4 className="text-red-400 font-black text-xl mb-2 uppercase text-center">Select {oppFranchise} Squad</h4>
                    <p className="text-xs text-center text-red-300/60 font-bold uppercase tracking-widest mb-6">Selected: {oppSelected15.length} (Need 11-15)</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {oppSquadPool.map(p => {
                        const prof = playersDB.find(db => db.Player_Name === p);
                        return (
                          <button key={p} onClick={() => togglePlayerSelection(p, false)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${oppSelected15.includes(p) ? 'bg-red-600 text-white scale-105 shadow-red-600/50 border border-red-500' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'}`}>
                            {getDisplayName(prof || { Player_Name: p })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {mode === 'custom' && (
          <div className="flex flex-col gap-8">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 text-center">
              <h3 className="text-purple-400 font-black uppercase tracking-widest text-lg flex items-center justify-center gap-2"><Target className="w-5 h-5"/> Global Free Agent Draft</h3>
              <p className="text-slate-400 text-sm mt-2">Search the entire database. Pick 11-15 players for both sides to simulate the clash.</p>
            </div>
            
            <div className="max-w-2xl mx-auto w-full relative z-20">
               <div className="flex items-center gap-4 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl focus-within:border-purple-500 transition-colors shadow-xl">
                 <Search className="text-slate-400 w-6 h-6" />
                 <input 
                   type="text" 
                   placeholder="Search player (A-Z)..." 
                   className="bg-transparent w-full text-white font-bold outline-none text-lg placeholder:text-slate-600"
                   value={customSearch}
                   onChange={e => setCustomSearch(e.target.value)}
                 />
               </div>
               
               {customSearch.trim().length > 0 && (
                 <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
                   {playersDB
                     .filter(p => getDisplayName(p).toLowerCase().includes(customSearch.toLowerCase()))
                     .slice(0, 20)
                     .map(p => (
                       <div key={`search-${p.Player_Name}`} className="p-3 border-b border-slate-700/50 hover:bg-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors">
                         <div>
                           <p className="text-white font-bold">{getDisplayName(p)}</p>
                           <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{p.Team || 'FA'} • {p.Role}</p>
                         </div>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => { togglePlayerSelection(p.Player_Name, true); setCustomSearch(''); }}
                             disabled={mySelected15.includes(p.Player_Name) || mySelected15.length >= 15}
                             className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                           >
                             + Mine
                           </button>
                           <button 
                             onClick={() => { togglePlayerSelection(p.Player_Name, false); setCustomSearch(''); }}
                             disabled={oppSelected15.includes(p.Player_Name) || oppSelected15.length >= 15}
                             className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/50 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                           >
                             + Opp
                           </button>
                         </div>
                       </div>
                     ))}
                 </div>
               )}
            </div>

            <div className="grid lg:grid-cols-2 gap-10 mt-6 relative z-10">
              <div className="bg-blue-950/10 p-8 rounded-3xl border border-blue-900/30">
                <div className="flex justify-between items-center mb-6 border-b border-blue-900/30 pb-4">
                  <h4 className="text-blue-400 font-black text-xl uppercase">Your Squad</h4>
                  <span className="bg-blue-900/50 text-blue-200 px-3 py-1 rounded-lg text-xs font-bold">{mySelected15.length}/15</span>
                </div>
                <div className="space-y-2 h-[350px] overflow-y-auto custom-scrollbar pr-2">
                  {mySelected15.map(name => (
                    <div key={name} className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-xl">
                       <span className="text-slate-200 font-bold text-sm">{getDisplayName(playersDB.find(db => db.Player_Name === name) || {Player_Name: name})}</span>
                       <button onClick={() => togglePlayerSelection(name, true)} className="text-red-500 hover:text-red-400 font-black text-lg leading-none">&times;</button>
                    </div>
                  ))}
                  {mySelected15.length === 0 && <p className="text-slate-600 text-center mt-10 font-medium italic">No players selected.</p>}
                </div>
              </div>

              <div className="bg-red-950/10 p-8 rounded-3xl border border-red-900/30">
                <div className="flex justify-between items-center mb-6 border-b border-red-900/30 pb-4">
                  <h4 className="text-red-400 font-black text-xl uppercase">Opponent Squad</h4>
                  <span className="bg-red-900/50 text-red-200 px-3 py-1 rounded-lg text-xs font-bold">{oppSelected15.length}/15</span>
                </div>
                <div className="space-y-2 h-[350px] overflow-y-auto custom-scrollbar pr-2">
                  {oppSelected15.map(name => (
                    <div key={name} className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-xl">
                       <span className="text-slate-200 font-bold text-sm">{getDisplayName(playersDB.find(db => db.Player_Name === name) || {Player_Name: name})}</span>
                       <button onClick={() => togglePlayerSelection(name, false)} className="text-red-500 hover:text-red-400 font-black text-lg leading-none">&times;</button>
                    </div>
                  ))}
                  {oppSelected15.length === 0 && <p className="text-slate-600 text-center mt-10 font-medium italic">No players selected.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center mt-12 gap-6 pt-8 border-t border-slate-800">
          {canClash ? (
            <button onClick={runCoachReview} className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:scale-105 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center gap-3 w-full sm:w-auto">
              <Swords className="w-6 h-6" /> CLASH! (Coach Review)
            </button>
          ) : (
            <button disabled className="bg-slate-800 text-slate-500 cursor-not-allowed px-10 py-4 rounded-full font-black uppercase tracking-widest flex items-center justify-center gap-3 w-full sm:w-auto text-sm sm:text-base">
              {mode === 'ipl' 
                ? `Need at least 11 Opponents (${oppSelected15.length}/11)` 
                : `Need 11 on Both Sides (You: ${mySelected15.length}/11 | Opp: ${oppSelected15.length}/11)`}
            </button>
          )}
          
          {coachReview && (
            <button onClick={handleAnalyze} className="bg-gradient-to-r from-emerald-500 to-teal-700 hover:scale-105 text-white px-12 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 w-full sm:w-auto">
              <Target className="w-6 h-6" /> Analyze Matchups
            </button>
          )}
        </div>
      </div> 

      <AnimatePresence>
        {coachReview && (
          <motion.div id="coach-review-section" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-12 bg-slate-900/90 backdrop-blur-2xl border border-slate-700 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
            <h3 className="text-3xl md:text-4xl font-black text-white text-center uppercase mb-10 tracking-tight flex items-center justify-center gap-4">
              <Award className="text-yellow-500 w-10 h-10"/> AI Recommended 11 + Impact Subs
            </h3>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-black/40 p-8 rounded-3xl border border-slate-800">
                <h4 className="text-white font-black text-2xl border-b border-slate-700 pb-4 mb-6 uppercase tracking-widest flex items-center gap-3"><Shield className="text-blue-500"/> Playing XI</h4>
                <ol className="list-decimal list-inside text-slate-300 space-y-3 font-bold text-lg">
                  {coachReview.xi.map((p, i) => {
                    const prof = playersDB.find(db => db.Player_Name === p);
                    return <li key={i} className="pl-2 border-b border-slate-800/50 pb-2">{getDisplayName(prof || {Player_Name: p})} <span className="text-xs text-slate-500 ml-2 uppercase font-normal">{prof?.Role || ''}</span></li>
                  })}
                </ol>
              </div>
              <div className="bg-black/40 p-8 rounded-3xl border border-slate-800">
                <h4 className="text-slate-400 font-black text-2xl border-b border-slate-700 pb-4 mb-6 uppercase tracking-widest flex items-center gap-3"><Users className="text-purple-500"/> Impact Subs</h4>
                <ul className="text-slate-400 space-y-3 font-bold text-lg">
                  {coachReview.subs.map((p, i) => {
                    const prof = playersDB.find(db => db.Player_Name === p);
                    return (
                      <li key={i} className="flex items-center gap-3 border-b border-slate-800/50 pb-2">
                        <ChevronRight className="w-5 h-5 text-slate-600 shrink-0"/> {getDisplayName(prof || {Player_Name: p})}
                      </li>
                    );
                  })}
                  {coachReview.subs.length === 0 && <p className="text-slate-600 italic">No extra players selected for bench.</p>}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnalyzed && (
          <motion.div id="analyze-section" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <div className="flex flex-col items-center gap-4 mb-8 border-b border-slate-800 pb-8">
              <Target className="text-emerald-500 w-12 h-12" />
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter text-center">Strategies to Win</h2>
            </div>
            
            <div className="flex justify-center mb-8">
              <div className="bg-black/50 p-1 rounded-xl flex">
                <button onClick={() => setAnalyzeTab('opponent')} className={`px-6 py-2 rounded-lg font-bold text-sm uppercase transition-all ${analyzeTab === 'opponent' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Targeting Opponents</button>
                <button onClick={() => setAnalyzeTab('mine')} className={`px-6 py-2 rounded-lg font-bold text-sm uppercase transition-all ${analyzeTab === 'mine' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Our Squad Vulnerabilities</button>
              </div>
            </div>

            {analyzeTab === 'opponent' && renderTacticCards(oppSelected15, `Targeting the Opponent (${oppSelected15.length})`)}
            {analyzeTab === 'mine' && renderTacticCards(mySelected15, `Protecting Our Squad (${mySelected15.length})`)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ClashArena = ({ playersDB }) => {
  const [batterName, setBatterName] = useState('');
  const [bowlerName, setBowlerName] = useState('');
  const [stadium, setStadium] = useState('Neutral Venue');
  const [isSimulated, setIsSimulated] = useState(false);

  const battersList = useMemo(() => playersDB.filter(p => ['Batsman', 'All-Rounder', 'Wicketkeeper', 'Wicket Keeper'].includes(p.Role)), [playersDB]);
  const bowlersList = useMemo(() => playersDB.filter(p => ['Bowler', 'All-Rounder'].includes(p.Role)), [playersDB]);

  useEffect(() => {
    if (battersList.length > 0 && !batterName) setBatterName(battersList[0].Player_Name);
    if (bowlersList.length > 0 && !bowlerName) setBowlerName(bowlersList[0].Player_Name);
  }, [battersList, bowlersList, batterName, bowlerName]);

  useEffect(() => {
    setIsSimulated(false);
  }, [batterName, bowlerName, stadium]);

  const batter = playersDB.find(p => p.Player_Name === batterName);
  const bowler = playersDB.find(p => p.Player_Name === bowlerName);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 pb-20 px-6 flex flex-col items-center min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex items-center justify-center gap-4 mb-4">
          <Crosshair className="text-red-500 w-16 h-16" /> Clash Arena
        </h1>
        <p className="text-slate-400 text-lg font-medium tracking-wide">1v1 Tactical Combat Simulator</p>
      </div>

      <div className="mb-16 w-full max-w-lg">
        <label className="text-slate-400 font-bold text-sm uppercase mb-3 block text-center tracking-widest"><MapPin className="inline w-5 h-5 mr-2 text-emerald-400"/> Stadium Conditions</label>
        <select value={stadium} onChange={(e) => setStadium(e.target.value)} className="w-full bg-slate-900/80 backdrop-blur-md border-2 border-slate-700 text-white font-bold p-4 rounded-2xl outline-none focus:border-red-500 text-center shadow-lg text-lg cursor-pointer transition-colors hover:bg-slate-900">
          {STADIUMS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch justify-center gap-10 mb-10">
        <div className="w-full lg:w-2/5 flex flex-col">
          <label className="text-blue-400 font-black text-sm uppercase tracking-widest mb-3 block text-center">Search Batter / All-Rounder</label>
          <div className="mb-6 relative z-30">
            <SearchableSelect 
              size="lg"
              value={batterName} 
              onChange={setBatterName} 
              placeholder="Search Batter (A-Z)..."
              options={battersList.map(p => ({ value: p.Player_Name, label: `${getDisplayName(p)} (${p.Team || 'FA'})` }))}
            />
          </div>
          {batter && (
            <motion.div key={`card-${batter.Player_Name}`} initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-blue-900/50 flex flex-col justify-center text-center relative overflow-hidden shadow-2xl grow">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
              <h3 className="text-4xl font-black text-white mb-2 relative z-10 leading-tight">{getDisplayName(batter)}</h3>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-sm relative z-10 flex items-center justify-center gap-2 mb-4"><Flag className="w-4 h-4"/> {batter.Country || "Unknown"}</p>
              <div className="inline-block mx-auto bg-blue-900/30 border border-blue-800 rounded-full px-6 py-2 relative z-10 mb-6">
                <p className="text-slate-300 font-bold uppercase tracking-wider text-sm">Team: <span className="text-white font-black">{batter.Team || 'FA'}</span></p>
              </div>
              <div className="border-t border-slate-800 pt-6 text-left relative z-10 space-y-4">
                 <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
                   <p className="text-xs text-slate-500 uppercase font-bold mb-1">Overall Strike Rate</p>
                   <p className="text-2xl font-black text-white">{batter.Overall_Bat_SR || 'N/A'}</p>
                 </div>
                 <FieldingIntel player={batter} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-center shrink-0">
           <div className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-slate-400 to-slate-700 px-4 py-8 rounded-full border border-slate-800/50 bg-slate-900/50 shadow-inner">
             VS
           </div>
        </div>

        <div className="w-full lg:w-2/5 flex flex-col">
          <label className="text-red-400 font-black text-sm uppercase tracking-widest mb-3 block text-center">Search Bowler / All-Rounder</label>
          <div className="mb-6 relative z-20">
            <SearchableSelect 
              size="lg"
              value={bowlerName} 
              onChange={setBowlerName} 
              placeholder="Search Bowler (A-Z)..."
              options={bowlersList.map(p => ({ value: p.Player_Name, label: `${getDisplayName(p)} (${p.Team || 'FA'})` }))}
            />
          </div>
          {bowler && (
            <motion.div key={`card-${bowler.Player_Name}`} initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-red-900/50 flex flex-col justify-center text-center relative overflow-hidden shadow-2xl grow">
              <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent"></div>
              <h3 className="text-4xl font-black text-white mb-2 relative z-10 leading-tight">{getDisplayName(bowler)}</h3>
              <p className="text-red-400 font-bold uppercase tracking-widest text-sm relative z-10 flex items-center justify-center gap-2 mb-4"><Flag className="w-4 h-4"/> {bowler.Country || "Unknown"}</p>
              <div className="inline-block mx-auto bg-red-900/30 border border-red-800 rounded-full px-6 py-2 relative z-10 mb-6">
                <p className="text-slate-300 font-bold uppercase tracking-wider text-sm">Team: <span className="text-white font-black">{bowler.Team || 'FA'}</span></p>
              </div>
              <div className="border-t border-slate-800 pt-6 text-left relative z-10 space-y-4">
                 <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
                   <p className="text-xs text-slate-500 uppercase font-bold mb-1">Overall Economy</p>
                   <p className="text-2xl font-black text-white">{bowler.Overall_Bowl_Econ || 'N/A'}</p>
                 </div>
                 <FieldingIntel player={bowler} />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex justify-center mb-10 w-full">
        <button 
          onClick={() => setIsSimulated(true)}
          disabled={!batter || !bowler}
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:scale-105 text-white px-12 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Swords className="w-6 h-6" /> SIMULATE CLASH
        </button>
      </div>

      {isSimulated && batter && bowler && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-5xl bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-red-500"></div>
          <h3 className="text-3xl font-black text-white mb-10 uppercase text-center tracking-tight flex items-center justify-center gap-4">
            <Target className="w-8 h-8 text-yellow-500" /> Tactical Counter-Measures
          </h3>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="bg-black/40 p-8 rounded-3xl border border-blue-900/30 shadow-inner">
              <h4 className="text-blue-400 font-black mb-4 uppercase text-sm tracking-widest flex items-center gap-2 border-b border-blue-900/30 pb-3"><Crosshair className="w-5 h-5"/> How {getDisplayName(bowler)} should dismiss {getDisplayName(batter)}</h4>
              <div className="space-y-4">
                <p className="text-slate-300 font-medium leading-relaxed text-lg"><strong className="text-white">Pace Plan:</strong> {batter.Clash_Pace_Tactic || "Deploy standard lines and lengths. Focus on dot ball pressure."}</p>
                <p className="text-slate-300 font-medium leading-relaxed text-lg"><strong className="text-white">Spin Plan:</strong> {batter.Clash_Spin_Tactic || "Restrict boundaries. Use flight to deceive."}</p>
              </div>
            </div>
            <div className="bg-black/40 p-8 rounded-3xl border border-red-900/30 shadow-inner">
              <h4 className="text-red-400 font-black mb-4 uppercase text-sm tracking-widest flex items-center gap-2 border-b border-red-900/30 pb-3"><Shield className="w-5 h-5"/> How {getDisplayName(batter)} should survive {getDisplayName(bowler)}</h4>
              <p className="text-slate-300 font-medium leading-relaxed text-lg">
                {bowler.Batting_Against_Him_Tactic || "Watch the ball closely, respect good deliveries, rotate strike."}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const StatsHub = ({ playersDB }) => {
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    if (playersDB.length > 0 && !selectedName) {
      setSelectedName(playersDB[0].Player_Name);
    }
  }, [playersDB, selectedName]);

  const filtered = playersDB.filter(p => p.Player_Name.toLowerCase().includes(search.toLowerCase()) || p.Full_Name?.toLowerCase().includes(search.toLowerCase()));
  const selected = playersDB.find(p => p.Player_Name === selectedName);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex items-center justify-center gap-4 mb-4">
          <Activity className="text-purple-500 w-16 h-16" /> Stats Hub
        </h1>
        <p className="text-slate-400 text-lg font-medium tracking-wide">Master Player Database</p>
      </div>

      <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 p-5 rounded-2xl mb-12 focus-within:border-purple-500 transition-colors shadow-2xl max-w-3xl mx-auto">
        <Search className="text-slate-400 w-8 h-8" />
        <input 
          type="text" 
          placeholder="Search by name..." 
          className="bg-transparent w-full text-white font-bold outline-none text-xl placeholder:text-slate-600"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-6 h-[700px] overflow-y-auto custom-scrollbar shadow-2xl">
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-sm mb-6 px-2 text-center border-b border-slate-800 pb-4">Player Directory ({filtered.length})</h3>
          <div className="space-y-3 pr-2">
            {filtered.map(p => (
              <div 
                key={p.Player_Name} 
                onClick={() => setSelectedName(p.Player_Name)}
                className={`p-5 rounded-2xl cursor-pointer transition-all border ${selectedName === p.Player_Name ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] scale-[1.02]' : 'bg-black/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}
              >
                <p className="font-black text-lg truncate">{getDisplayName(p)}</p>
                <p className="text-xs uppercase font-bold tracking-widest mt-1 opacity-80"><span className={selectedName === p.Player_Name ? 'text-white' : 'text-blue-400'}>{p.Team || 'Unattached'}</span> • {p.Role || 'Player'}</p>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-slate-500 text-center mt-10 font-bold">No players found.</p>}
          </div>
        </div>

        <div className="lg:col-span-8">
          {selected ? (
            <PlayerDetailCard player={selected} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 font-bold bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-700 p-12 text-center">
              <Users className="w-16 h-16 mb-4 text-slate-600"/>
              <p className="text-xl">Select a player from the directory to view full intelligence report.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('war_room');
  const [playersDB, setPlayersDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchWithFallback = async (urls) => {
          for (const url of urls) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                const text = await res.text();
                // Extremely strict validation: Must not be HTML, must have length
                if (text && typeof text === 'string' && !text.includes("<!DOCTYPE html>") && text.length > 50) {
                  return text;
                }
              }
            } catch (e) {
              // Silently catch and try next URL
            }
          }
          return null;
        };

        // Added absolute paths with fallback to root for robust Vite fetching
        const pText = await fetchWithFallback(['/players.csv', '/players_5.csv', '/players_4.csv', '/players_3.csv', '/players_2.csv', 'players.csv']);
        const fText = await fetchWithFallback(['/fielding_analysis.csv', '/fielding_analysis_2.csv', 'fielding_analysis.csv']);
        const tText = await fetchWithFallback(['/teams.csv', '/teams_4.csv', 'teams.csv']);

        if (!pText) {
          throw new Error("Could not find or load players.csv. Make sure the file exists in the public/ directory.");
        }

        const players = parseCSV(pText);   
        const fielding = parseCSV(fText || '');  
        const teams = parseCSV(tText || '');     

        if (players.length === 0) {
          throw new Error("players.csv was found but is completely empty or corrupted.");
        }

        const playersExactMap = {};
        players.forEach(p => { if (p.Player_Name) playersExactMap[normalizeString(p.Player_Name)] = p; });
        const playersSurnameIdx = buildSurnameIndex(players);

        const fieldingExactMap = {};
        fielding.forEach(f => { if (f.Player_Name) fieldingExactMap[normalizeString(f.Player_Name)] = f; });
        const fieldingSurnameIdx = buildSurnameIndex(fielding);

        const matchedPlayerKeys = new Set();

        const rosterEntries = teams
          .filter(t => t.Player_Name)
          .map(t => {
            const statsMatch = smartLookup(t.Player_Name, players, playersExactMap, playersSurnameIdx);
            if (statsMatch) matchedPlayerKeys.add(normalizeString(statsMatch.Player_Name));
            const fieldMatch = smartLookup(t.Player_Name, fielding, fieldingExactMap, fieldingSurnameIdx);

            return {
              ...(statsMatch || {}),
              ...(fieldMatch || {}),
              Player_Name: t.Player_Name,
              Full_Name: statsMatch?.Full_Name || fieldMatch?.Full_Name || t.Player_Name,
              Team: t.Team ? t.Team : 'Unattached',
              Country: (t.Country && t.Country !== 'Unknown') ? t.Country : (statsMatch?.Country || 'Unknown'),
              Role: (t.Role && t.Role !== 'Player') ? t.Role : (statsMatch?.Role || 'Player'),
              In_2026_Squad: true
            };
          });

        const unrosteredEntries = players
          .filter(p => p.Player_Name && !matchedPlayerKeys.has(normalizeString(p.Player_Name)))
          .map(p => {
            const fieldMatch = smartLookup(p.Player_Name, fielding, fieldingExactMap, fieldingSurnameIdx);
            const fullName = (p.Full_Name && p.Full_Name.trim()) ? p.Full_Name.trim() : p.Player_Name;
            return {
              ...(fieldMatch || {}),
              ...p,
              Player_Name: p.Player_Name,
              Full_Name: fullName,
              Team: p.Team ? p.Team : 'Not in Current Squad',
              Country: p.Country || 'Unknown',
              Role: p.Role || 'Player',
            };
          });

        const merged = [...rosterEntries, ...unrosteredEntries];

        // Deduplication & Data Quality Filter
        const getQualityScore = (playerObj) => {
            let score = 0;
            Object.values(playerObj).forEach(v => {
                // Give points for actual, valid data (ignore blanks, Unknowns, and 0s)
                if (v && v !== '' && v !== 'Not Available' && v !== 'Unknown' && v !== 'None' && v !== '0' && v !== '0.0') {
                    score += 1;
                }
            });
            return score;
        };

        const uniqueMap = new Map();
        merged.forEach(p => {
           const dName = getDisplayName(p);
           const cleanKey = dName.toLowerCase().replace(/[^a-z]/g, ''); 
           
           if (!uniqueMap.has(cleanKey)) {
               uniqueMap.set(cleanKey, p);
           } else {
               const existing = uniqueMap.get(cleanKey);
               const existingScore = getQualityScore(existing);
               const newScore = getQualityScore(p);
               
               // If the new duplicate has richer stats than the existing ghost record
               if (newScore > existingScore) {
                   // Preserve the 2026 Team tags before overwriting so they don't drop out of the franchise!
                   if (existing.In_2026_Squad) p.In_2026_Squad = true;
                   if (existing.Team && existing.Team !== 'Unattached' && existing.Team !== 'Not in Current Squad') {
                       p.Team = existing.Team;
                   }
                   uniqueMap.set(cleanKey, p);
               } else {
                   // Existing is better, but preserve tags from the new one just in case
                   if (p.In_2026_Squad) existing.In_2026_Squad = true;
                   if (p.Team && p.Team !== 'Unattached' && p.Team !== 'Not in Current Squad') {
                       existing.Team = p.Team;
                   }
               }
           }
        });

        // GLOBAL ALPHABETICAL SORT
        const deduplicatedPlayers = Array.from(uniqueMap.values());
        deduplicatedPlayers.sort((a, b) => {
            const nameA = getDisplayName(a).toLowerCase();
            const nameB = getDisplayName(b).toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        setPlayersDB(deduplicatedPlayers.filter(p => p.Player_Name && p.Player_Name !== 'undefined'));
        setLoading(false);
      } catch (err) {
        console.error("Data Load Error:", err);
        setErrorMsg(err.message);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <RefreshCw className="animate-spin w-16 h-16 mb-6" />
        <p className="font-black tracking-widest uppercase text-xl">Initializing Intelligence Engine...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-red-500 p-6 text-center">
        <AlertCircle className="w-20 h-20 mb-6" />
        <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">System Error</h2>
        <p className="text-xl text-slate-300 max-w-xl mb-8">{errorMsg}</p>
        <div className="bg-slate-900/80 p-8 rounded-2xl text-left text-slate-400 font-mono text-base max-w-2xl border-2 border-red-900/50 shadow-2xl">
          <p className="text-red-400 font-bold mb-3 uppercase tracking-widest">Troubleshooting Steps:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Ensure <strong className="text-white">players.csv</strong> is in the <strong className="text-blue-400">public/</strong> folder.</li>
            <li>Ensure <strong className="text-white">fielding_analysis.csv</strong> is in the <strong className="text-blue-400">public/</strong> folder.</li>
            <li>Ensure <strong className="text-white">teams.csv</strong> is in the <strong className="text-blue-400">public/</strong> folder.</li>
            <li className="mt-2 text-yellow-400 text-sm">Pro Tip: Check your browser's Developer Console (F12) for exact network errors!</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-slate-300 selection:bg-blue-500/30 overflow-x-hidden">
      <BackgroundAnimation />
      <Navbar active={activeTab} setActive={setActiveTab} />
      
      <AnimatePresence mode="wait">
        {activeTab === 'war_room' && <WarRoom key="war" playersDB={playersDB} />}
        {activeTab === 'clash' && <ClashArena key="clash" playersDB={playersDB} />}
        {activeTab === 'stats' && <StatsHub key="stats" playersDB={playersDB} />}
      </AnimatePresence>
    </div>
  );
}


// import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { 
//   Swords, Users, Shield, Zap, Target, Crosshair, 
//   ChevronRight, Activity, Search, RefreshCw, CheckCircle2, 
//   MapPin, Video, AlertTriangle, AlertCircle, Award, Flag, Map
// } from 'lucide-react';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// const STADIUMS = [
//   "Neutral Venue", "Wankhede Stadium, Mumbai", "Eden Gardens, Kolkata",
//   "M. Chinnaswamy Stadium, Bengaluru", "M.A. Chidambaram Stadium, Chennai",
//   "Narendra Modi Stadium, Ahmedabad", "Arun Jaitley Stadium, Delhi",
//   "Sawai Mansingh Stadium, Jaipur", "Rajiv Gandhi Intl Stadium, Hyderabad",
//   "Ekana Cricket Stadium, Lucknow", "Maharaja Yadavindra Singh, Mullanpur"
// ];

// const IPL_TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'DC', 'PBKS', 'LSG', 'GT'];

// // Strict Mapping for teams.csv compatibility
// const TEAM_MAP = {
//   'CSK': ['Chennai Super Kings'],
//   'MI': ['Mumbai Indians'],
//   'RCB': ['Royal Challengers Bengaluru', 'Royal Challengers Bangalore'],
//   'KKR': ['Kolkata Knight Riders'],
//   'SRH': ['Sunrisers Hyderabad'],
//   'RR': ['Rajasthan Royals'],
//   'DC': ['Delhi Capitals'],
//   'PBKS': ['Punjab Kings'],
//   'LSG': ['Lucknow Super Giants'],
//   'GT': ['Gujarat Titans']
// };

// const parseCSV = (csvText) => {
//   if (!csvText || csvText.includes("<!DOCTYPE html>")) return [];
//   const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
//   if (lines.length < 2) return [];
  
//   const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
//   return lines.slice(1).map(line => {
//     const values = [];
//     let curr = '';
//     let inQuotes = false;
//     for (let i = 0; i < line.length; i++) {
//       const char = line[i];
//       if (char === '"') inQuotes = !inQuotes;
//       else if (char === ',' && !inQuotes) {
//         values.push(curr.trim());
//         curr = '';
//       } else {
//         curr += char;
//       }
//     }
//     values.push(curr.trim());

//     let obj = {};
//     headers.forEach((h, i) => {
//       let val = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
//       const lowerVal = val.toLowerCase();
//       if (['nan', 'not available', 'unknown', 'none', 'null'].includes(lowerVal)) val = '';
//       obj[h] = val;
//     });
//     return obj;
//   });
// };

// const normalizeString = (str) => (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

// const getDisplayName = (player) => {
//   if (!player) return "Unknown";
//   let name = player.Full_Name && player.Full_Name.trim() !== '' ? player.Full_Name : player.Player_Name;
//   if (!name || name.toLowerCase() === 'unknown' || name.toLowerCase() === 'nan') name = player.Player_Name;
//   return name.length > 42 ? name.substring(0, 42) + "..." : name;
// };

// const tokenize = (str) => normalizeString(str).split(' ').filter(Boolean);

// const buildSurnameIndex = (list, nameKey = 'Player_Name') => {
//   const idx = {};
//   list.forEach((item) => {
//     const toks = tokenize(item[nameKey]);
//     if (toks.length === 0) return;
//     const surname = toks[toks.length - 1];
//     if (!idx[surname]) idx[surname] = [];
//     idx[surname].push({ item, toks });
//   });
//   return idx;
// };

// const scoreGivenNames = (fullGiven, candGiven) => {
//   if (fullGiven.length === 0 || candGiven.length === 0) return 0;
//   let score = 0;
//   fullGiven.forEach((g) => {
//     if (candGiven.includes(g)) score += 2;
//     else if (candGiven.some((c) => c[0] === g[0])) score += 1;
//   });
//   return score;
// };

// const findBestMatch = (name, surnameIndex) => {
//   const toks = tokenize(name);
//   if (toks.length < 2) return null;
//   const surname = toks[toks.length - 1];
//   const candidates = surnameIndex[surname];
//   if (!candidates || candidates.length === 0) return null;

//   const fullGiven = toks.slice(0, -1);
//   let best = null;
//   let bestScore = 0;
//   let tie = false;

//   candidates.forEach(({ item, toks: candToks }) => {
//     const s = scoreGivenNames(fullGiven, candToks.slice(0, -1));
//     if (s > bestScore) {
//       best = item;
//       bestScore = s;
//       tie = false;
//     } else if (s === bestScore && s > 0 && item !== best) {
//       tie = true;
//     }
//   });

//   return (bestScore === 0 || tie) ? null : best;
// };

// const smartLookup = (name, list, exactMap, surnameIndex) => {
//   const norm = normalizeString(name);
//   if (exactMap[norm]) return exactMap[norm];
//   return findBestMatch(name, surnameIndex);
// };

// const BackgroundAnimation = () => (
//   <div className="fixed inset-0 z-[-1] bg-[#020617] overflow-hidden">
//     <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
//     <motion.div animate={{ y: [0, -30, 0], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]" />
//     <motion.div animate={{ y: [0, 40, 0], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-purple-900/20 rounded-full blur-[150px]" />
//   </div>
// );

// const Navbar = ({ active, setActive }) => {
//   const [scrolled, setScrolled] = useState(false);
//   useEffect(() => {
//     const handleScroll = () => setScrolled(window.scrollY > 20);
//     window.addEventListener('scroll', handleScroll);
//     return () => window.removeEventListener('scroll', handleScroll);
//   }, []);

//   return (
//     <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'py-4 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-2xl' : 'py-6 bg-transparent'}`}>
//       <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
//         <div className="flex items-center gap-2">
//           <Zap className="text-yellow-400 w-8 h-8 animate-pulse" />
//           <span className="text-3xl font-black text-white tracking-widest uppercase">IPL<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Brain</span></span>
//         </div>
//         <div className="flex gap-2 bg-slate-900/60 p-2 rounded-full border border-slate-700/50 backdrop-blur-md overflow-x-auto shadow-lg">
//           <button onClick={() => setActive('war_room')} className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${active === 'war_room' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
//             <Users size={18} /> War Room
//           </button>
//           <button onClick={() => setActive('clash')} className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${active === 'clash' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
//             <Swords size={18} /> Clash Arena
//           </button>
//           <button onClick={() => setActive('stats')} className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${active === 'stats' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
//             <Activity size={18} /> Stats Hub
//           </button>
//         </div>
//       </div>
//     </nav>
//   );
// };

// const SearchableSelect = ({ options, value, onChange, placeholder }) => {
//   const [search, setSearch] = useState('');
//   const [isOpen, setIsOpen] = useState(false);
//   const wrapperRef = useRef(null);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const selectedOption = options.find(o => o.value === value);
//   const displayValue = isOpen ? search : (selectedOption ? selectedOption.label : '');
  
//   const filtered = options
//     .filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
//     .sort((a, b) => a.label.localeCompare(b.label));

//   return (
//     <div className="relative w-full text-left" ref={wrapperRef}>
//       <input
//         type="text"
//         className={`w-full bg-slate-900 border ${isOpen ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-slate-700'} text-white font-medium p-4 rounded-2xl text-lg outline-none transition-all cursor-text hover:bg-slate-800`}
//         placeholder={placeholder}
//         value={displayValue}
//         onFocus={() => { setIsOpen(true); setSearch(''); }}
//         onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
//       />
//       <div className="absolute pointer-events-none text-slate-400 top-4 right-4 w-6 h-6">
//         <ChevronRight className={`w-full h-full transition-transform ${isOpen ? 'rotate-90' : ''}`} />
//       </div>

//       {isOpen && (
//         <div className="absolute z-[100] w-full mt-2 bg-slate-800 border border-slate-700 max-h-60 overflow-y-auto custom-scrollbar rounded-xl shadow-2xl">
//           {filtered.length > 0 ? filtered.map(o => (
//             <div 
//               key={o.value}
//               className="p-3 border-b border-slate-700/50 hover:bg-blue-600 text-slate-200 font-medium cursor-pointer transition-colors"
//               onMouseDown={(e) => {
//                 e.preventDefault(); 
//                 onChange(o.value);
//                 setIsOpen(false);
//               }}
//             >
//               {o.label}
//             </div>
//           )) : (
//             <div className="p-3 text-slate-500 italic text-sm">No players found...</div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// const FieldingIntel = ({ player }) => {
//   if (!player) return null;
//   const primary = player.General_Fielding_Position || player.Primary_Position;
//   const loose = player.Out_Of_Position_Vulnerability || player.Loose_Fielding_Position;
//   const isLooseValid = loose && loose !== "";

//   if (primary === 'Wicketkeeper' || primary === 'Wicket Keeper') {
//     return (
//       <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 flex items-start gap-3 mt-4">
//         <Shield className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
//         <div>
//           <p className="text-blue-400 font-bold text-sm">SPECIALIST ROLE</p>
//           <p className="text-blue-200 text-sm">Cleared for Wicketkeeping duties.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="mt-4 space-y-3">
//       <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-4 flex items-start gap-3">
//         <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0 mt-0.5" />
//         <div>
//           <p className="text-green-400 font-bold text-sm">OPTIMAL ZONE</p>
//           <p className="text-green-200 text-sm">{primary ? primary : "Any Position"}</p>
//         </div>
//       </div>
//       {isLooseValid ? (
//         <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex items-start gap-3">
//           <AlertTriangle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
//           <div>
//             <p className="text-red-500 font-bold text-sm">LIABILITY</p>
//             <p className="text-red-200 text-sm">Fielding error at <span className="font-bold underline">{loose}</span>.</p>
//           </div>
//         </div>
//       ) : (
//         <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 flex items-start gap-3">
//           <Shield className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
//           <div>
//             <p className="text-emerald-400 font-bold text-sm">SOLID DEFENSE</p>
//             <p className="text-emerald-200 text-sm">Good in all fielding positions.</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const PlayerDetailCard = ({ player }) => {
//   if (!player) return null;
//   const displayName = getDisplayName(player);
//   const role = player.Role || "Player";
//   const isBatter = role === 'Batsman' || role === 'Wicketkeeper' || role === 'Wicket Keeper';
//   const isBowler = role === 'Bowler';
//   const isAllRounder = role === 'All-Rounder';

//   let formattedStadiums = "Neutral Venues";
//   if (player.Best_to_Worst_Venues && player.Best_to_Worst_Venues !== "Neutral Venues") {
//     formattedStadiums = player.Best_to_Worst_Venues.replace(/>/g, ',').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3).join(', ');
//   }

//   return (
//     <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-[2rem] p-8 shadow-2xl w-full">
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-8 gap-4">
//         <div>
//           <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-tight">{displayName}</h2>
//           <div className="flex flex-wrap items-center gap-4 mt-3 text-lg">
//             <span className="flex items-center gap-2 text-slate-300 font-bold bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
//               <Flag className="w-4 h-4 text-blue-400" /> {player.Country || "Unknown"}
//             </span>
//             <span className="flex items-center gap-2 text-white font-black bg-blue-600/20 px-4 py-1.5 rounded-full border border-blue-500/50">
//               <Shield className="w-4 h-4 text-blue-400" /> {player.Team || "Unattached"}
//             </span>
//             <span className="text-slate-400 font-bold uppercase tracking-widest">{role}</span>
//           </div>
//         </div>
//       </div>

//       <div className={`grid lg:grid-cols-${isBatter ? '1' : '2'} gap-8 mb-8`}>
//         <div className="bg-black/50 p-6 rounded-3xl border border-slate-800/60 shadow-inner">
//           <h4 className="text-slate-500 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><Target className="w-5 h-5 text-blue-500" /> Batting Intelligence</h4>
//           <div className="space-y-4">
//             <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Primary Phase</span><span className="font-bold text-white uppercase">{player.Primary_Batting_Phase || "Middle Order"}</span></div>
//             <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Overall Strike Rate</span><span className="font-black text-xl text-blue-400">{player.Overall_Bat_SR || "0.0"}</span></div>
//             <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Death Over SR</span><span className="font-black text-xl text-purple-400">{player.Pressure_Bat_SR_Death || "0.0"}</span></div>
//           </div>
//         </div>
//         {!isBatter && (
//           <div className="bg-black/50 p-6 rounded-3xl border border-slate-800/60 shadow-inner">
//             <h4 className="text-slate-500 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><Crosshair className="w-5 h-5 text-red-500" /> Bowling Intelligence</h4>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Career Wickets</span><span className="font-black text-xl text-white">{player.Wickets || "0"}</span></div>
//               <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Overall Economy</span><span className="font-black text-xl text-green-400">{player.Overall_Bowl_Econ || "0.0"}</span></div>
//               <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Death Economy</span><span className="font-black text-xl text-red-400">{player.Pressure_Bowl_Econ_Death || "0.0"}</span></div>
//             </div>
//           </div>
//         )}
//       </div>

//       <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700/80 mb-8">
//         <h4 className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><Map className="w-5 h-5 text-emerald-500" /> Venue & Fielding Diagnostics</h4>
//         <div className="grid md:grid-cols-3 gap-6">
//           <div className="bg-black/40 p-4 rounded-2xl border border-slate-800">
//             <p className="text-xs text-slate-500 uppercase font-bold mb-2">Best Stadiums</p>
//             <p className="text-white font-medium text-sm leading-relaxed">{formattedStadiums}</p>
//           </div>
//           <div className="bg-green-950/20 p-4 rounded-2xl border border-green-900/30">
//             <p className="text-xs text-green-500 uppercase font-bold mb-2">Strong Zone</p>
//             <p className="text-green-100 font-medium text-sm">{player.General_Fielding_Position || player.Primary_Position || "Any Position"}</p>
//           </div>
//           <div className="bg-red-950/20 p-4 rounded-2xl border border-red-900/30">
//             <p className="text-xs text-red-500 uppercase font-bold mb-2">Liability Zone / Drops</p>
//             <p className="text-red-100 font-medium text-sm">{player.Out_Of_Position_Vulnerability || player.Loose_Fielding_Position || "Good in all positions"}</p>
//           </div>
//         </div>
//       </div>

//       <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-xl mb-8">
//          <h4 className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-orange-500" /> H2H Matchups & Rivals</h4>
//          <div className={`grid md:grid-cols-${isAllRounder ? '2' : '1'} gap-6`}>
//            {(isBatter || isAllRounder) && (
//              <div className="bg-slate-900/50 p-5 rounded-2xl border border-red-900/40">
//                <p className="text-xs text-red-400 uppercase font-bold mb-2">Most Dangerous Bowler</p>
//                <p className="text-white font-black text-lg">{player.Primary_Threat_Bowler && player.Primary_Threat_Bowler !== "None" ? player.Primary_Threat_Bowler : "Awaiting Scout Data"}</p>
//              </div>
//            )}
//            {(isBowler || isAllRounder) && (
//              <div className="bg-slate-900/50 p-5 rounded-2xl border border-orange-900/40">
//                <p className="text-xs text-orange-400 uppercase font-bold mb-2">Nightmare Batter</p>
//                <p className="text-white font-black text-lg">{player.Primary_Nightmare_Batter && player.Primary_Nightmare_Batter !== "None" ? player.Primary_Nightmare_Batter : "Awaiting Scout Data"}</p>
//              </div>
//            )}
//          </div>
//       </div>

//       <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg">
//         <div className="bg-blue-500/20 p-4 rounded-full shrink-0">
//           <Video className="text-blue-400 w-8 h-8" />
//         </div>
//         <div>
//           <h4 className="text-blue-400 font-black uppercase text-sm tracking-widest mb-3">Coach's Tape Suggestion</h4>
//           <p className="text-slate-200 font-medium text-lg leading-relaxed italic">"{player.Coach_Tape_Suggestion || "Standard technical analysis required. Review recent footage."}"</p>
//         </div>
//       </div>
//     </motion.div>
//   );
// };

// const WarRoom = ({ playersDB }) => {
//   const [mode, setMode] = useState('ipl');
//   const [stadium, setStadium] = useState('Neutral Venue');
  
//   const [myFranchise, setMyFranchise] = useState('RCB');
//   const [oppFranchise, setOppFranchise] = useState('CSK');
  
//   const [mySquadPool, setMySquadPool] = useState([]); 
//   const [oppSquadPool, setOppSquadPool] = useState([]); 
  
//   const [mySelected, setMySelected] = useState([]);
//   const [oppSelected, setOppSelected] = useState([]);
  
//   const [customSearch, setCustomSearch] = useState('');
  
//   const [isFetching, setIsFetching] = useState(false);
//   const [coachReview, setCoachReview] = useState(null);
//   const [isAnalyzed, setIsAnalyzed] = useState(false);
//   const [analyzeTab, setAnalyzeTab] = useState('opponent');

//   useEffect(() => {
//     setMySelected([]);
//     setOppSelected([]);
//     setCoachReview(null);
//     setIsAnalyzed(false);
//     setMySquadPool([]);
//     setOppSquadPool([]);
//     setCustomSearch('');
//   }, [mode]);

//   const handleMyFranchiseChange = (e) => {
//     const val = e.target.value;
//     setMyFranchise(val);
//     if (val === oppFranchise) {
//       setOppFranchise(IPL_TEAMS.find(t => t !== val));
//     }
//   };

//   const handleOppFranchiseChange = (e) => {
//     const val = e.target.value;
//     setOppFranchise(val);
//     if (val === myFranchise) {
//       setMyFranchise(IPL_TEAMS.find(t => t !== val));
//     }
//   };

//   const isTeamMatch = (player, franchiseCode) => {
//     if (!player || !player.In_2026_Squad || !player.Team) return false;
//     const aliases = TEAM_MAP[franchiseCode] || [franchiseCode];
//     return aliases.some(alias => player.Team.toLowerCase().trim() === alias.toLowerCase().trim());
//   };

//   const handleGo = () => {
//     setIsFetching(true);
//     setCoachReview(null);
//     setIsAnalyzed(false);

//     setTimeout(() => {
//       // Pulling directly from teams.csv data flagged with In_2026_Squad
//       const myTeamPlayers = playersDB.filter(p => isTeamMatch(p, myFranchise)).map(p => p.Player_Name);
//       const oppTeamPlayers = playersDB.filter(p => isTeamMatch(p, oppFranchise)).map(p => p.Player_Name);
      
//       setMySquadPool(myTeamPlayers);
//       setOppSquadPool(oppTeamPlayers);
//       setMySelected([]);
//       setOppSelected([]);
//       setIsFetching(false);
//     }, 400);
//   };

//   const togglePlayerSelection = (playerName, isMyTeam) => {
//     if (isMyTeam) {
//       setMySelected(prev => {
//         if (prev.includes(playerName)) return prev.filter(p => p !== playerName);
//         if (prev.length < 15) return [...prev, playerName];
//         return prev;
//       });
//     } else {
//       setOppSelected(prev => {
//         if (prev.includes(playerName)) return prev.filter(p => p !== playerName);
//         if (prev.length < 15) return [...prev, playerName];
//         return prev;
//       });
//     }
//   };

//   const runCoachReview = () => {
//     let poolToDraftFrom = [];
//     if (mode === 'ipl') {
//       poolToDraftFrom = mySquadPool.map(name => playersDB.find(p => p.Player_Name === name)).filter(Boolean);
//     } else {
//       poolToDraftFrom = mySelected.map(name => playersDB.find(p => p.Player_Name === name)).filter(Boolean);
//     }

//     const validOpp = oppSelected.filter(Boolean);
    
//     // Pitch Typologies
//     const isSpinTrack = ["M.A. Chidambaram Stadium, Chennai", "Ekana Cricket Stadium, Lucknow", "Arun Jaitley Stadium, Delhi", "Rajiv Gandhi Intl Stadium, Hyderabad"].includes(stadium);
//     const isFlatTrack = ["Wankhede Stadium, Mumbai", "M. Chinnaswamy Stadium, Bengaluru", "Eden Gardens, Kolkata"].includes(stadium);
//     const isPaceTrack = ["Maharaja Yadavindra Singh, Mullanpur", "Narendra Modi Stadium, Ahmedabad", "Sawai Mansingh Stadium, Jaipur"].includes(stadium);

//     const calculateDynamicScore = (player) => {
//       let baseScore = 0;
//       const sr = Number(player.Overall_Bat_SR) || 0;
//       const wickets = Number(player.Wickets) || 0;
//       const econ = Number(player.Overall_Bowl_Econ) || 9.0;
//       const drops = Number(player.Total_Dropped_Catches) || 0;
//       const role = player.Role || 'Player';
//       const phase = player.Primary_Batting_Phase || '';

//       if (role === 'Batsman' || role.includes('Wicket')) {
//         baseScore = sr * 2; 
//       } else if (role === 'Bowler') {
//         baseScore = (wickets * 1.5) + ((10 - econ) * 30); 
//       } else { 
//         baseScore = sr + (wickets * 1.5) + ((10 - econ) * 15);
//       }
      
//       baseScore -= (drops * 25);
//       if (stadium !== 'Neutral Venue' && player.Best_to_Worst_Venues && player.Best_to_Worst_Venues.includes(stadium)) baseScore += 300;

//       if (isFlatTrack) {
//          if (phase.includes("Aggressor") || phase.includes("Finisher")) baseScore += 200; 
//          if (role === 'Bowler' && econ < 8.5) baseScore += 150; 
//       } else if (isSpinTrack) {
//          if (role === 'All-Rounder') baseScore += 250; 
//          if (phase.includes("Anchor")) baseScore += 150; 
//       } else if (isPaceTrack) {
//          if (role === 'Bowler') baseScore += 150; 
//          if (phase.includes("Aggressor")) baseScore += 100; 
//       }

//       if (validOpp.length > 0) {
//         if (player.Primary_Threat_Bowler && validOpp.includes(player.Primary_Threat_Bowler)) baseScore -= 250; 
//         validOpp.forEach(oppName => {
//           const oppProfile = playersDB.find(db => db.Player_Name === oppName);
//           if (oppProfile && oppProfile.Primary_Threat_Bowler === player.Player_Name) baseScore += 400; 
//         });
//       }
//       return baseScore;
//     };

//     const sorted = [...poolToDraftFrom].sort((a, b) => calculateDynamicScore(b) - calculateDynamicScore(a));

//     let xi = [];
//     let remaining = [...sorted];

//     const extractTopRole = (condition) => {
//        const idx = remaining.findIndex(condition);
//        if (idx !== -1) xi.push(remaining.splice(idx, 1)[0]);
//     };

//     extractTopRole(p => p.Role.includes('Wicket'));
//     extractTopRole(p => p.Role === 'Batsman' && p.Primary_Batting_Phase?.includes('Top Order'));
//     extractTopRole(p => p.Primary_Batting_Phase?.includes('Finisher'));
//     extractTopRole(p => p.Role === 'All-Rounder');
//     extractTopRole(p => p.Role === 'Bowler');
//     extractTopRole(p => p.Role === 'Bowler');
//     extractTopRole(p => p.Role === 'Bowler' || p.Role === 'All-Rounder');

//     while (xi.length < 11 && remaining.length > 0) {
//         xi.push(remaining.shift());
//     }
    
//     const roleOrder = { 'Batsman': 1, 'Wicketkeeper': 2, 'Wicket Keeper': 2, 'All-Rounder': 3, 'Bowler': 4 };
//     xi.sort((a,b) => (roleOrder[a.Role] || 5) - (roleOrder[b.Role] || 5));

//     const impactSubs = remaining.slice(0, 4);

//     if (mode === 'ipl') {
//       setMySelected([...xi, ...impactSubs].map(p => p.Player_Name));
//     }

//     setCoachReview({
//       xi: xi.map(p => p.Player_Name),
//       subs: impactSubs.map(p => p.Player_Name)
//     });
    
//     setTimeout(() => document.getElementById('coach-review-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
//   };

//   const handleAnalyze = () => {
//     setIsAnalyzed(true);
//     setTimeout(() => document.getElementById('analyze-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
//   };

//   const renderTacticCards = (playerList, title) => (
//     <div className="space-y-6 mt-6">
//       <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm">{title}</h3>
//       {playerList.map((pName, i) => {
//         const dbProfile = playersDB.find(db => db.Player_Name === pName);
//         const role = dbProfile?.Role || 'Player';
//         return (
//           <div key={i} className="bg-black/40 p-5 rounded-2xl border border-slate-800/50">
//             <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
//               <span className="text-white font-bold text-lg">{getDisplayName(dbProfile || {Player_Name: pName})} <span className="text-sm font-normal text-slate-500 ml-2">({role})</span></span>
//             </div>
//             {dbProfile ? (
//               <div className="grid md:grid-cols-2 gap-4 text-sm">
//                 {role !== 'Bowler' && (
//                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
//                     <span className="text-red-400 font-bold block mb-1">Bowling to him:</span>
//                     <span className="text-slate-300 block mb-1">{dbProfile.Clash_Pace_Tactic || "Standard pace lines."}</span>
//                     <span className="text-slate-400 block">{dbProfile.Clash_Spin_Tactic || "Standard spin lengths."}</span>
//                   </div>
//                 )}
//                 {role !== 'Batsman' && (
//                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
//                     <span className="text-blue-400 font-bold block mb-1">Batting against him:</span>
//                     <span className="text-slate-300 block">{dbProfile.Batting_Against_Him_Tactic || "Rotate strike."}</span>
//                   </div>
//                 )}
//                 <div className="md:col-span-2 bg-purple-900/10 p-3 rounded-lg border border-purple-900/30">
//                   <span className="text-purple-400 font-bold flex items-center gap-1 mb-1"><Video className="w-3 h-3"/> Coach Tape Suggestion:</span>
//                   <span className="text-slate-300 italic">"{dbProfile.Coach_Tape_Suggestion || "Review match footage."}"</span>
//                 </div>
//               </div>
//             ) : (
//               <span className="text-slate-500 text-sm">Awaiting Scout Data. Generic tactical approach required.</span>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );

//   const canClash = mode === 'ipl' ? oppSelected.length >= 11 : (mySelected.length >= 11 && oppSelected.length >= 11);

//   return (
//     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
//       <div className="text-center mb-12">
//         <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
//           <Shield className="text-blue-500 w-16 h-16" /> Tactical War Room
//         </h1>
//         <p className="text-slate-400 text-lg font-medium tracking-wide">Build your squad and dismantle the opposition.</p>
//       </div>

//       <div className="flex justify-center mb-12">
//         <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-700 flex flex-col md:flex-row shadow-2xl">
//           <button onClick={() => setMode('ipl')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${mode === 'ipl' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>IPL Match</button>
//           <button onClick={() => setMode('custom')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${mode === 'custom' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Custom Match</button>
//         </div>
//       </div>

//       <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl mb-12">
        
//         <div className="mb-10 max-w-xl mx-auto">
//           <label className="text-slate-400 font-bold text-sm uppercase mb-3 block text-center tracking-widest"><MapPin className="inline w-5 h-5 mr-2 text-emerald-400"/> Select Stadium</label>
//           <select value={stadium} onChange={(e) => setStadium(e.target.value)} className="w-full bg-slate-950/80 border-2 border-slate-700 rounded-2xl p-4 text-white font-bold text-lg outline-none focus:border-purple-500 text-center shadow-inner cursor-pointer transition-colors">
//             {STADIUMS.map(s => <option key={s} value={s}>{s}</option>)}
//           </select>
//         </div>

//         {mode === 'ipl' && (
//           <div className="flex flex-col gap-8">
//             <div className="flex flex-col lg:flex-row gap-6 items-end justify-center bg-black/30 p-8 rounded-3xl border border-slate-800/50">
//               <div className="w-full lg:flex-1">
//                 <label className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3 block text-center">Your Franchise</label>
//                 <select value={myFranchise} onChange={handleMyFranchiseChange} className="w-full h-14 bg-slate-900 border-2 border-blue-500/30 rounded-2xl px-4 text-white font-bold outline-none focus:border-blue-500 text-center cursor-pointer hover:bg-slate-800 transition-colors">
//                   {IPL_TEAMS.map(t => <option key={t} value={t} disabled={t === oppFranchise} className="bg-slate-900 text-white disabled:text-slate-600 disabled:italic">{TEAM_MAP[t][0]}</option>)}
//                 </select>
//               </div>
//               <div className="text-3xl font-black text-slate-600 italic pb-3">VS</div>
//               <div className="w-full lg:flex-1">
//                 <label className="text-red-400 font-black text-xs uppercase tracking-widest mb-3 block text-center">Opponent Franchise</label>
//                 <select value={oppFranchise} onChange={handleOppFranchiseChange} className="w-full h-14 bg-slate-900 border-2 border-red-500/30 rounded-2xl px-4 text-white font-bold outline-none focus:border-red-500 text-center cursor-pointer hover:bg-slate-800 transition-colors">
//                   {IPL_TEAMS.map(t => <option key={t} value={t} disabled={t === myFranchise} className="bg-slate-900 text-white disabled:text-slate-600 disabled:italic">{TEAM_MAP[t][0]}</option>)}
//                 </select>
//               </div>
//               <button onClick={handleGo} disabled={isFetching} className="w-full lg:w-auto h-14 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white px-8 rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center">
//                 {isFetching ? <RefreshCw className="animate-spin" /> : "GO"}
//               </button>
//             </div>

//             {mySquadPool.length > 0 && oppSquadPool.length > 0 && (
//               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
//                 <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-8 text-center">
//                   <h3 className="text-yellow-400 font-black uppercase tracking-widest flex items-center justify-center gap-2"><Target className="w-5 h-5"/> Draft Opponent's Roster</h3>
//                   <p className="text-slate-400 text-sm mt-1">Select 11 to 15 players from the opponent's squad. The AI Coach will auto-draft your best 11.</p>
//                 </div>

//                 <div className="grid lg:grid-cols-2 gap-8">
//                   <div className="bg-blue-950/10 p-6 rounded-3xl border border-blue-900/30 shadow-inner opacity-80 pointer-events-none">
//                     <h4 className="text-blue-400 font-black text-xl mb-6 uppercase text-center">{myFranchise} Squad</h4>
//                     <div className="flex flex-wrap gap-3 justify-center">
//                       {mySquadPool.map(p => {
//                         const prof = playersDB.find(db => db.Player_Name === p);
//                         return (
//                           <div key={p} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900/50 border border-slate-700 text-slate-500 cursor-default">
//                             {getDisplayName(prof || { Player_Name: p })}
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </div>
//                   <div className="bg-red-950/10 p-6 rounded-3xl border border-red-900/30 shadow-inner">
//                     <h4 className="text-red-400 font-black text-xl mb-2 uppercase text-center">Select {oppFranchise} Squad</h4>
//                     <p className="text-xs text-center text-red-300/60 font-bold uppercase tracking-widest mb-6">Selected: {oppSelected.length} (Need 11-15)</p>
//                     <div className="flex flex-wrap gap-3 justify-center">
//                       {oppSquadPool.map(p => {
//                         const prof = playersDB.find(db => db.Player_Name === p);
//                         return (
//                           <button key={p} onClick={() => togglePlayerSelection(p, false)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${oppSelected.includes(p) ? 'bg-red-600 text-white scale-105 shadow-red-600/50 border border-red-500' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'}`}>
//                             {getDisplayName(prof || { Player_Name: p })}
//                           </button>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 </div>
//               </motion.div>
//             )}
//           </div>
//         )}

//         {mode === 'custom' && (
//           <div className="flex flex-col gap-8">
//             <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 text-center">
//               <h3 className="text-purple-400 font-black uppercase tracking-widest text-lg flex items-center justify-center gap-2"><Target className="w-5 h-5"/> Global Free Agent Draft</h3>
//               <p className="text-slate-400 text-sm mt-2">Search the entire database. Pick 11-15 players for both sides to simulate the clash.</p>
//             </div>
            
//             <div className="max-w-2xl mx-auto w-full relative z-20">
//                <div className="flex items-center gap-4 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl focus-within:border-purple-500 transition-colors shadow-xl">
//                  <Search className="text-slate-400 w-6 h-6" />
//                  <input 
//                    type="text" 
//                    placeholder="Search player (A-Z)..." 
//                    className="bg-transparent w-full text-white font-bold outline-none text-lg placeholder:text-slate-600"
//                    value={customSearch}
//                    onChange={e => setCustomSearch(e.target.value)}
//                  />
//                </div>
               
//                {customSearch.trim().length > 0 && (
//                  <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
//                    {playersDB
//                      .filter(p => getDisplayName(p).toLowerCase().includes(customSearch.toLowerCase()))
//                      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)))
//                      .slice(0, 20)
//                      .map(p => (
//                        <div key={`search-${p.Player_Name}`} className="p-3 border-b border-slate-700/50 hover:bg-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors">
//                          <div>
//                            <p className="text-white font-bold">{getDisplayName(p)}</p>
//                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{p.Team || 'FA'} • {p.Role}</p>
//                          </div>
//                          <div className="flex gap-2">
//                            <button 
//                              onClick={() => { togglePlayerSelection(p.Player_Name, true); setCustomSearch(''); }}
//                              disabled={mySelected.includes(p.Player_Name) || mySelected.length >= 15}
//                              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
//                            >
//                              + Mine
//                            </button>
//                            <button 
//                              onClick={() => { togglePlayerSelection(p.Player_Name, false); setCustomSearch(''); }}
//                              disabled={oppSelected.includes(p.Player_Name) || oppSelected.length >= 15}
//                              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/50 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
//                            >
//                              + Opp
//                            </button>
//                          </div>
//                        </div>
//                      ))}
//                  </div>
//                )}
//             </div>

//             <div className="grid lg:grid-cols-2 gap-10 mt-6 relative z-10">
//               <div className="bg-blue-950/10 p-8 rounded-3xl border border-blue-900/30">
//                 <div className="flex justify-between items-center mb-6 border-b border-blue-900/30 pb-4">
//                   <h4 className="text-blue-400 font-black text-xl uppercase">Your Squad</h4>
//                   <span className="bg-blue-900/50 text-blue-200 px-3 py-1 rounded-lg text-xs font-bold">{mySelected.length}/15</span>
//                 </div>
//                 <div className="space-y-2 h-[350px] overflow-y-auto custom-scrollbar pr-2">
//                   {mySelected.map(name => (
//                     <div key={name} className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-xl">
//                        <span className="text-slate-200 font-bold text-sm">{getDisplayName(playersDB.find(db => db.Player_Name === name) || {Player_Name: name})}</span>
//                        <button onClick={() => togglePlayerSelection(name, true)} className="text-red-500 hover:text-red-400 font-black text-lg leading-none">&times;</button>
//                     </div>
//                   ))}
//                   {mySelected.length === 0 && <p className="text-slate-600 text-center mt-10 font-medium italic">No players selected.</p>}
//                 </div>
//               </div>

//               <div className="bg-red-950/10 p-8 rounded-3xl border border-red-900/30">
//                 <div className="flex justify-between items-center mb-6 border-b border-red-900/30 pb-4">
//                   <h4 className="text-red-400 font-black text-xl uppercase">Opponent Squad</h4>
//                   <span className="bg-red-900/50 text-red-200 px-3 py-1 rounded-lg text-xs font-bold">{oppSelected.length}/15</span>
//                 </div>
//                 <div className="space-y-2 h-[350px] overflow-y-auto custom-scrollbar pr-2">
//                   {oppSelected.map(name => (
//                     <div key={name} className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-xl">
//                        <span className="text-slate-200 font-bold text-sm">{getDisplayName(playersDB.find(db => db.Player_Name === name) || {Player_Name: name})}</span>
//                        <button onClick={() => togglePlayerSelection(name, false)} className="text-red-500 hover:text-red-400 font-black text-lg leading-none">&times;</button>
//                     </div>
//                   ))}
//                   {oppSelected.length === 0 && <p className="text-slate-600 text-center mt-10 font-medium italic">No players selected.</p>}
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         <div className="flex flex-col sm:flex-row justify-center mt-12 gap-6 pt-8 border-t border-slate-800">
//           {canClash ? (
//             <button onClick={runCoachReview} className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:scale-105 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center gap-3 w-full sm:w-auto">
//               <Swords className="w-6 h-6" /> CLASH! (Coach Review)
//             </button>
//           ) : (
//             <button disabled className="bg-slate-800 text-slate-500 cursor-not-allowed px-10 py-4 rounded-full font-black uppercase tracking-widest flex items-center justify-center gap-3 w-full sm:w-auto text-sm sm:text-base">
//               {mode === 'ipl' 
//                 ? `Need at least 11 Opponents (${oppSelected.length}/11)` 
//                 : `Need 11 on Both Sides (You: ${mySelected.length}/11 | Opp: ${oppSelected.length}/11)`}
//             </button>
//           )}
          
//           {coachReview && (
//             <button onClick={handleAnalyze} className="bg-gradient-to-r from-emerald-500 to-teal-700 hover:scale-105 text-white px-12 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 w-full sm:w-auto">
//               <Target className="w-6 h-6" /> Analyze Matchups
//             </button>
//           )}
//         </div>
//       </div> 

//       <AnimatePresence>
//         {coachReview && (
//           <motion.div id="coach-review-section" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-12 bg-slate-900/90 backdrop-blur-2xl border border-slate-700 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
//             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
//             <h3 className="text-3xl md:text-4xl font-black text-white text-center uppercase mb-10 tracking-tight flex items-center justify-center gap-4">
//               <Award className="text-yellow-500 w-10 h-10"/> AI Recommended 11 + Impact Subs
//             </h3>
//             <div className="grid md:grid-cols-2 gap-12">
//               <div className="bg-black/40 p-8 rounded-3xl border border-slate-800">
//                 <h4 className="text-white font-black text-2xl border-b border-slate-700 pb-4 mb-6 uppercase tracking-widest flex items-center gap-3"><Shield className="text-blue-500"/> Playing XI</h4>
//                 <ol className="list-decimal list-inside text-slate-300 space-y-3 font-bold text-lg">
//                   {coachReview.xi.map((p, i) => {
//                     const prof = playersDB.find(db => db.Player_Name === p);
//                     return <li key={i} className="pl-2 border-b border-slate-800/50 pb-2">{getDisplayName(prof || {Player_Name: p})} <span className="text-xs text-slate-500 ml-2 uppercase font-normal">{prof?.Role || ''}</span></li>
//                   })}
//                 </ol>
//               </div>
//               <div className="bg-black/40 p-8 rounded-3xl border border-slate-800">
//                 <h4 className="text-slate-400 font-black text-2xl border-b border-slate-700 pb-4 mb-6 uppercase tracking-widest flex items-center gap-3"><Users className="text-purple-500"/> Impact Subs</h4>
//                 <ul className="text-slate-400 space-y-3 font-bold text-lg">
//                   {coachReview.subs.map((p, i) => {
//                     const prof = playersDB.find(db => db.Player_Name === p);
//                     return (
//                       <li key={i} className="flex items-center gap-3 border-b border-slate-800/50 pb-2">
//                         <ChevronRight className="w-5 h-5 text-slate-600 shrink-0"/> {getDisplayName(prof || {Player_Name: p})}
//                       </li>
//                     );
//                   })}
//                   {coachReview.subs.length === 0 && <p className="text-slate-600 italic">No extra players selected for bench.</p>}
//                 </ul>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       <AnimatePresence>
//         {isAnalyzed && (
//           <motion.div id="analyze-section" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
//             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
//             <div className="flex flex-col items-center gap-4 mb-8 border-b border-slate-800 pb-8">
//               <Target className="text-emerald-500 w-12 h-12" />
//               <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter text-center">Strategies to Win</h2>
//             </div>
            
//             <div className="flex justify-center mb-8">
//               <div className="bg-black/50 p-1 rounded-xl flex">
//                 <button onClick={() => setAnalyzeTab('opponent')} className={`px-6 py-2 rounded-lg font-bold text-sm uppercase transition-all ${analyzeTab === 'opponent' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Targeting Opponents</button>
//                 <button onClick={() => setAnalyzeTab('mine')} className={`px-6 py-2 rounded-lg font-bold text-sm uppercase transition-all ${analyzeTab === 'mine' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Our Squad Vulnerabilities</button>
//               </div>
//             </div>

//             {analyzeTab === 'opponent' && renderTacticCards(oppSelected, `Targeting the Opponent (${oppSelected.length})`)}
//             {analyzeTab === 'mine' && renderTacticCards(mySelected, `Protecting Our Squad (${mySelected.length})`)}
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </motion.div>
//   );
// };

// const ClashArena = ({ playersDB }) => {
//   const [batterName, setBatterName] = useState('');
//   const [bowlerName, setBowlerName] = useState('');
//   const [stadium, setStadium] = useState('Neutral Venue');
//   const [isSimulated, setIsSimulated] = useState(false);

//   // Strict sorting and filtering
//   const battersList = useMemo(() => playersDB
//     .filter(p => ['Batsman', 'All-Rounder', 'Wicketkeeper', 'Wicket Keeper'].includes(p.Role))
//     .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))), [playersDB]);
    
//   const bowlersList = useMemo(() => playersDB
//     .filter(p => ['Bowler', 'All-Rounder'].includes(p.Role))
//     .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))), [playersDB]);

//   useEffect(() => {
//     if (battersList.length > 0 && !batterName) setBatterName(battersList[0].Player_Name);
//     if (bowlersList.length > 0 && !bowlerName) setBowlerName(bowlersList[0].Player_Name);
//   }, [battersList, bowlersList, batterName, bowlerName]);

//   useEffect(() => {
//     setIsSimulated(false);
//   }, [batterName, bowlerName, stadium]);

//   const batter = playersDB.find(p => p.Player_Name === batterName);
//   const bowler = playersDB.find(p => p.Player_Name === bowlerName);

//   return (
//     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 pb-20 px-6 flex flex-col items-center min-h-screen">
//       <div className="text-center mb-10">
//         <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex items-center justify-center gap-4 mb-4">
//           <Crosshair className="text-red-500 w-16 h-16" /> Clash Arena
//         </h1>
//         <p className="text-slate-400 text-lg font-medium tracking-wide">1v1 Tactical Combat Simulator</p>
//       </div>

//       <div className="mb-16 w-full max-w-lg">
//         <label className="text-slate-400 font-bold text-sm uppercase mb-3 block text-center tracking-widest"><MapPin className="inline w-5 h-5 mr-2 text-emerald-400"/> Stadium Conditions</label>
//         <select value={stadium} onChange={(e) => setStadium(e.target.value)} className="w-full bg-slate-900/80 backdrop-blur-md border-2 border-slate-700 text-white font-bold p-4 rounded-2xl outline-none focus:border-red-500 text-center shadow-lg text-lg cursor-pointer transition-colors hover:bg-slate-900">
//           {STADIUMS.map(s => <option key={s} value={s}>{s}</option>)}
//         </select>
//       </div>

//       <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch justify-center gap-10 mb-10">
//         <div className="w-full lg:w-2/5 flex flex-col">
//           <label className="text-blue-400 font-black text-sm uppercase tracking-widest mb-3 block text-center">Search Batter / All-Rounder</label>
//           <div className="mb-6 relative z-30">
//             <SearchableSelect 
//               size="lg"
//               value={batterName} 
//               onChange={setBatterName} 
//               placeholder="Search Batter (A-Z)..."
//               options={battersList.map(p => ({ value: p.Player_Name, label: `${getDisplayName(p)} (${p.Team || 'FA'})` }))}
//             />
//           </div>
//           {batter && (
//             <motion.div key={`card-${batter.Player_Name}`} initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-blue-900/50 flex flex-col justify-center text-center relative overflow-hidden shadow-2xl grow">
//               <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
//               <h3 className="text-4xl font-black text-white mb-2 relative z-10 leading-tight">{getDisplayName(batter)}</h3>
//               <p className="text-blue-400 font-bold uppercase tracking-widest text-sm relative z-10 flex items-center justify-center gap-2 mb-4"><Flag className="w-4 h-4"/> {batter.Country || "Unknown"}</p>
//               <div className="inline-block mx-auto bg-blue-900/30 border border-blue-800 rounded-full px-6 py-2 relative z-10 mb-6">
//                 <p className="text-slate-300 font-bold uppercase tracking-wider text-sm">Team: <span className="text-white font-black">{batter.Team || 'FA'}</span></p>
//               </div>
//               <div className="border-t border-slate-800 pt-6 text-left relative z-10 space-y-4">
//                  <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
//                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Overall Strike Rate</p>
//                    <p className="text-2xl font-black text-white">{batter.Overall_Bat_SR || 'N/A'}</p>
//                  </div>
//                  <FieldingIntel player={batter} />
//               </div>
//             </motion.div>
//           )}
//         </div>

//         <div className="flex items-center justify-center shrink-0">
//            <div className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-slate-400 to-slate-700 px-4 py-8 rounded-full border border-slate-800/50 bg-slate-900/50 shadow-inner">
//              VS
//            </div>
//         </div>

//         <div className="w-full lg:w-2/5 flex flex-col">
//           <label className="text-red-400 font-black text-sm uppercase tracking-widest mb-3 block text-center">Search Bowler / All-Rounder</label>
//           <div className="mb-6 relative z-20">
//             <SearchableSelect 
//               size="lg"
//               value={bowlerName} 
//               onChange={setBowlerName} 
//               placeholder="Search Bowler (A-Z)..."
//               options={bowlersList.map(p => ({ value: p.Player_Name, label: `${getDisplayName(p)} (${p.Team || 'FA'})` }))}
//             />
//           </div>
//           {bowler && (
//             <motion.div key={`card-${bowler.Player_Name}`} initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-red-900/50 flex flex-col justify-center text-center relative overflow-hidden shadow-2xl grow">
//               <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent"></div>
//               <h3 className="text-4xl font-black text-white mb-2 relative z-10 leading-tight">{getDisplayName(bowler)}</h3>
//               <p className="text-red-400 font-bold uppercase tracking-widest text-sm relative z-10 flex items-center justify-center gap-2 mb-4"><Flag className="w-4 h-4"/> {bowler.Country || "Unknown"}</p>
//               <div className="inline-block mx-auto bg-red-900/30 border border-red-800 rounded-full px-6 py-2 relative z-10 mb-6">
//                 <p className="text-slate-300 font-bold uppercase tracking-wider text-sm">Team: <span className="text-white font-black">{bowler.Team || 'FA'}</span></p>
//               </div>
//               <div className="border-t border-slate-800 pt-6 text-left relative z-10 space-y-4">
//                  <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
//                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Overall Economy</p>
//                    <p className="text-2xl font-black text-white">{bowler.Overall_Bowl_Econ || 'N/A'}</p>
//                  </div>
//                  <FieldingIntel player={bowler} />
//               </div>
//             </motion.div>
//           )}
//         </div>
//       </div>

//       <div className="flex justify-center mb-10 w-full">
//         <button 
//           onClick={() => setIsSimulated(true)}
//           disabled={!batter || !bowler}
//           className="bg-gradient-to-r from-red-600 to-orange-600 hover:scale-105 text-white px-12 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           <Swords className="w-6 h-6" /> SIMULATE CLASH
//         </button>
//       </div>

//       {isSimulated && batter && bowler && (
//         <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-5xl bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
//           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-red-500"></div>
//           <h3 className="text-3xl font-black text-white mb-10 uppercase text-center tracking-tight flex items-center justify-center gap-4">
//             <Target className="w-8 h-8 text-yellow-500" /> Tactical Counter-Measures
//           </h3>
//           <div className="grid md:grid-cols-2 gap-10">
//             <div className="bg-black/40 p-8 rounded-3xl border border-blue-900/30 shadow-inner">
//               <h4 className="text-blue-400 font-black mb-4 uppercase text-sm tracking-widest flex items-center gap-2 border-b border-blue-900/30 pb-3"><Crosshair className="w-5 h-5"/> How {getDisplayName(bowler)} should dismiss {getDisplayName(batter)}</h4>
//               <div className="space-y-4">
//                 <p className="text-slate-300 font-medium leading-relaxed text-lg"><strong className="text-white">Pace Plan:</strong> {batter.Clash_Pace_Tactic || "Deploy standard lines and lengths. Focus on dot ball pressure."}</p>
//                 <p className="text-slate-300 font-medium leading-relaxed text-lg"><strong className="text-white">Spin Plan:</strong> {batter.Clash_Spin_Tactic || "Restrict boundaries. Use flight to deceive."}</p>
//               </div>
//             </div>
//             <div className="bg-black/40 p-8 rounded-3xl border border-red-900/30 shadow-inner">
//               <h4 className="text-red-400 font-black mb-4 uppercase text-sm tracking-widest flex items-center gap-2 border-b border-red-900/30 pb-3"><Shield className="w-5 h-5"/> How {getDisplayName(batter)} should survive {getDisplayName(bowler)}</h4>
//               <p className="text-slate-300 font-medium leading-relaxed text-lg">
//                 {bowler.Batting_Against_Him_Tactic || "Watch the ball closely, respect good deliveries, rotate strike."}
//               </p>
//             </div>
//           </div>
//         </motion.div>
//       )}
//     </motion.div>
//   );
// };

// const StatsHub = ({ playersDB }) => {
//   const [search, setSearch] = useState('');
//   const [selectedName, setSelectedName] = useState('');

//   useEffect(() => {
//     if (playersDB.length > 0 && !selectedName) {
//       setSelectedName(playersDB[0].Player_Name);
//     }
//   }, [playersDB, selectedName]);

//   const filtered = playersDB
//     .filter(p => p.Player_Name.toLowerCase().includes(search.toLowerCase()) || p.Full_Name?.toLowerCase().includes(search.toLowerCase()))
//     .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));

//   const selected = playersDB.find(p => p.Player_Name === selectedName);

//   return (
//     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
//       <div className="text-center mb-12">
//         <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex items-center justify-center gap-4 mb-4">
//           <Activity className="text-purple-500 w-16 h-16" /> Stats Hub
//         </h1>
//         <p className="text-slate-400 text-lg font-medium tracking-wide">Master Player Database</p>
//       </div>

//       <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 p-5 rounded-2xl mb-12 focus-within:border-purple-500 transition-colors shadow-2xl max-w-3xl mx-auto">
//         <Search className="text-slate-400 w-8 h-8" />
//         <input 
//           type="text" 
//           placeholder="Search by name (A-Z)..." 
//           className="bg-transparent w-full text-white font-bold outline-none text-xl placeholder:text-slate-600"
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//         />
//       </div>

//       <div className="grid lg:grid-cols-12 gap-10">
//         <div className="lg:col-span-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-6 h-[700px] overflow-y-auto custom-scrollbar shadow-2xl">
//           <h3 className="text-slate-400 font-black uppercase tracking-widest text-sm mb-6 px-2 text-center border-b border-slate-800 pb-4">Player Directory ({filtered.length})</h3>
//           <div className="space-y-3 pr-2">
//             {filtered.map(p => (
//               <div 
//                 key={p.Player_Name} 
//                 onClick={() => setSelectedName(p.Player_Name)}
//                 className={`p-5 rounded-2xl cursor-pointer transition-all border ${selectedName === p.Player_Name ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] scale-[1.02]' : 'bg-black/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}
//               >
//                 <p className="font-black text-lg truncate">{getDisplayName(p)}</p>
//                 <p className="text-xs uppercase font-bold tracking-widest mt-1 opacity-80"><span className={selectedName === p.Player_Name ? 'text-white' : 'text-blue-400'}>{p.Team || 'Unattached'}</span> • {p.Role || 'Player'}</p>
//               </div>
//             ))}
//             {filtered.length === 0 && <p className="text-slate-500 text-center mt-10 font-bold">No players found.</p>}
//           </div>
//         </div>

//         <div className="lg:col-span-8">
//           {selected ? (
//             <PlayerDetailCard player={selected} />
//           ) : (
//             <div className="h-full flex flex-col items-center justify-center text-slate-500 font-bold bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-700 p-12 text-center">
//               <Users className="w-16 h-16 mb-4 text-slate-600"/>
//               <p className="text-xl">Select a player from the directory to view full intelligence report.</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </motion.div>
//   );
// };

// export default function App() {
//   const [activeTab, setActiveTab] = useState('war_room');
//   const [playersDB, setPlayersDB] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [errorMsg, setErrorMsg] = useState(null);

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const [pRes, fRes, tRes] = await Promise.all([
//           fetch('players.csv')
//             .then(r => r.ok ? r : fetch('players_3.csv'))
//             .then(r => r.ok ? r : fetch('players_2.csv'))
//             .catch(() => ({ ok: false })),
//           fetch('fielding_analysis.csv')
//             .then(r => r.ok ? r : fetch('fielding_analysis_2.csv'))
//             .catch(() => ({ ok: false })),
//           fetch('teams.csv')
//             .then(r => r.ok ? r : fetch('teams_4.csv'))
//             .catch(() => ({ ok: false, text: () => '' })) 
//         ]);

//         if (!pRes.ok) throw new Error("players.csv not found in public folder");
//         if (!fRes.ok) throw new Error("fielding_analysis.csv not found in public folder");

//         const [pText, fText, tText] = await Promise.all([
//           pRes.text(), fRes.text(), tRes.ok ? tRes.text() : Promise.resolve('')
//         ]);

//         const players = parseCSV(pText);   
//         const fielding = parseCSV(fText);  
//         const teams = parseCSV(tText);     

//         if (players.length === 0) throw new Error("players.csv is empty or parsed incorrectly.");

//         const playersExactMap = {};
//         players.forEach(p => { if (p.Player_Name) playersExactMap[normalizeString(p.Player_Name)] = p; });
//         const playersSurnameIdx = buildSurnameIndex(players);

//         const fieldingExactMap = {};
//         fielding.forEach(f => { if (f.Player_Name) fieldingExactMap[normalizeString(f.Player_Name)] = f; });
//         const fieldingSurnameIdx = buildSurnameIndex(fielding);

//         const matchedPlayerKeys = new Set();

//         const rosterEntries = teams
//           .filter(t => t.Player_Name)
//           .map(t => {
//             const statsMatch = smartLookup(t.Player_Name, players, playersExactMap, playersSurnameIdx);
//             if (statsMatch) matchedPlayerKeys.add(normalizeString(statsMatch.Player_Name));
//             const fieldMatch = smartLookup(t.Player_Name, fielding, fieldingExactMap, fieldingSurnameIdx);

//             return {
//               ...(statsMatch || {}),
//               ...(fieldMatch || {}),
//               Player_Name: t.Player_Name,
//               Full_Name: statsMatch?.Full_Name || fieldMatch?.Full_Name || t.Player_Name,
//               Team: t.Team ? t.Team.trim() : 'Unattached',
//               Country: (t.Country && t.Country !== 'Unknown') ? t.Country : (statsMatch?.Country || 'Unknown'),
//               Role: (t.Role && t.Role !== 'Player') ? t.Role : (statsMatch?.Role || 'Player'),
//               In_2026_Squad: true
//             };
//           });

//         const unrosteredEntries = players
//           .filter(p => p.Player_Name && !matchedPlayerKeys.has(normalizeString(p.Player_Name)))
//           .map(p => {
//             const fieldMatch = smartLookup(p.Player_Name, fielding, fieldingExactMap, fieldingSurnameIdx);
//             const fullName = (p.Full_Name && p.Full_Name.trim()) ? p.Full_Name.trim() : p.Player_Name;
//             return {
//               ...(fieldMatch || {}),
//               ...p,
//               Player_Name: p.Player_Name,
//               Full_Name: fullName,
//               Team: p.Team || 'Not in Current Squad',
//               Country: p.Country || 'Unknown',
//               Role: p.Role || 'Player',
//               In_2026_Squad: false
//             };
//           });

//         const merged = [...rosterEntries, ...unrosteredEntries];

//         merged.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));

//         setPlayersDB(merged.filter(p => p.Player_Name && p.Player_Name !== 'undefined'));
//         setLoading(false);
//       } catch (err) {
//         console.error("Data Load Error:", err);
//         setErrorMsg(err.message);
//         setLoading(false);
//       }
//     };
    
//     loadData();
//   }, []);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
//         <RefreshCw className="animate-spin w-16 h-16 mb-6" />
//         <p className="font-black tracking-widest uppercase text-xl">Initializing Intelligence Engine...</p>
//       </div>
//     );
//   }

//   if (errorMsg) {
//     return (
//       <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-red-500 p-6 text-center">
//         <AlertCircle className="w-20 h-20 mb-6" />
//         <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">System Error</h2>
//         <p className="text-xl text-slate-300 max-w-xl mb-8">{errorMsg}</p>
//         <div className="bg-slate-900/80 p-8 rounded-2xl text-left text-slate-400 font-mono text-base max-w-2xl border-2 border-red-900/50 shadow-2xl">
//           <p className="text-red-400 font-bold mb-3 uppercase tracking-widest">Troubleshooting Steps:</p>
//           <ul className="list-disc list-inside space-y-2">
//             <li>Ensure <strong className="text-white">players.csv</strong> is active.</li>
//             <li>Ensure <strong className="text-white">fielding_analysis.csv</strong> is active.</li>
//             <li>Ensure <strong className="text-white">teams.csv</strong> is active.</li>
//           </ul>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#020617] font-sans text-slate-300 selection:bg-blue-500/30 overflow-x-hidden">
//       <BackgroundAnimation />
//       <Navbar active={activeTab} setActive={setActiveTab} />
      
//       <AnimatePresence mode="wait">
//         {activeTab === 'war_room' && <WarRoom key="war" playersDB={playersDB} />}
//         {activeTab === 'clash' && <ClashArena key="clash" playersDB={playersDB} />}
//         {activeTab === 'stats' && <StatsHub key="stats" playersDB={playersDB} />}
//       </AnimatePresence>
//     </div>
//   );
// }
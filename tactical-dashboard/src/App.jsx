import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, Users, Shield, Zap, Target, Crosshair, 
  ChevronRight, Activity, Search, RefreshCw, CheckCircle2, 
  MapPin, Video, AlertTriangle, AlertCircle, Award, Flag, Map
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STADIUMS = [
  "Neutral Venue",
  "Wankhede Stadium, Mumbai",
  "Eden Gardens, Kolkata",
  "M. Chinnaswamy Stadium, Bengaluru",
  "M.A. Chidambaram Stadium, Chennai",
  "Narendra Modi Stadium, Ahmedabad",
  "Arun Jaitley Stadium, Delhi",
  "Sawai Mansingh Stadium, Jaipur",
  "Rajiv Gandhi Intl Stadium, Hyderabad",
  "Ekana Cricket Stadium, Lucknow",
  "Maharaja Yadavindra Singh, Mullanpur"
];

const IPL_TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'DC', 'PBKS', 'LSG', 'GT'];

const TEAM_MAP = {
  'CSK': ['Chennai Super Kings', 'CSK'],
  'MI': ['Mumbai Indians', 'MI'],
  'RCB': ['Royal Challengers Bengaluru', 'Royal Challengers Bangalore', 'RCB'],
  'KKR': ['Kolkata Knight Riders', 'KKR'],
  'SRH': ['Sunrisers Hyderabad', 'SRH'],
  'RR': ['Rajasthan Royals', 'RR'],
  'DC': ['Delhi Capitals', 'DC'],
  'PBKS': ['Punjab Kings', 'Kings XI Punjab', 'PBKS'],
  'LSG': ['Lucknow Super Giants', 'LSG'],
  'GT': ['Gujarat Titans', 'GT']
};

const parseCSV = (csvText) => {
  if (!csvText || csvText.includes("<!DOCTYPE html>")) return [];
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
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
      obj[h] = val && val !== 'nan' && val !== 'NaN' ? val : '';
    });
    return obj;
  });
};

const normalizeString = (str) => (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

const getDisplayName = (player) => {
  if (!player) return "Unknown";
  const name = player.Full_Name && player.Full_Name !== 'NaN' && player.Full_Name.trim() !== ''
               ? player.Full_Name
               : player.Player_Name;
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

  if (bestScore === 0 || tie) return null; 
  return best;
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

const FieldingIntel = ({ player }) => {
  if (!player) return null;
  const primary = player.General_Fielding_Position || player.Primary_Position;
  const loose = player.Out_Of_Position_Vulnerability || player.Loose_Fielding_Position;
  const isLooseValid = loose && loose !== "None" && loose !== "Unknown" && loose !== "Not Available";

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
          <p className="text-green-200 text-sm">{(primary && primary !== "Unknown" && primary !== "None" && primary !== "Not Available") ? primary : "Any Position"}</p>
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
            <p className="text-emerald-200 text-sm">Good in Fielding in all position</p>
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerDetailCard = ({ player }) => {
  if (!player) return null;
  
  const displayName = player.Full_Name || player.Player_Name;
  const role = player.Role || "Player";
  
  // Intelligent Role Checks
  const isBatter = role === 'Batsman' || role === 'Wicketkeeper' || role === 'Wicket Keeper';
  const isBowler = role === 'Bowler';
  const isAllRounder = role === 'All-Rounder';

  // Smart Stadium Formatting: Limit 3, Comma Separated
  let formattedStadiums = "Neutral Venues";
  if (player.Best_to_Worst_Venues && player.Best_to_Worst_Venues !== "Neutral Venues") {
    formattedStadiums = player.Best_to_Worst_Venues
      .replace(/>/g, ',')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
  }

  const primaryFielding = player.General_Fielding_Position && player.General_Fielding_Position !== 'Unknown' && player.General_Fielding_Position !== 'None' && player.General_Fielding_Position !== 'Not Available' ? player.General_Fielding_Position : (player.Primary_Position && player.Primary_Position !== 'Not Available' ? player.Primary_Position : "Any Position");
  
  const looseValue = player.Out_Of_Position_Vulnerability || player.Loose_Fielding_Position;
  const looseFielding = looseValue && looseValue !== 'None' && looseValue !== 'Not Available' && looseValue !== 'Unknown' ? looseValue : "Good in Fielding in all position";

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
        {/* Batting is shown for EVERYONE (including bowlers) */}
        <div className="bg-black/50 p-6 rounded-3xl border border-slate-800/60 shadow-inner">
          <h4 className="text-slate-500 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><Target className="w-5 h-5 text-blue-500" /> Batting Intelligence</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Primary Phase</span><span className="font-bold text-white uppercase">{player.Primary_Batting_Phase || "Lower Order"}</span></div>
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Overall Strike Rate</span><span className="font-black text-xl text-blue-400">{player.Overall_Bat_SR || "0.0"}</span></div>
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="text-slate-400 font-medium">Death Over SR</span><span className="font-black text-xl text-purple-400">{player.Pressure_Bat_SR_Death || "0.0"}</span></div>
          </div>
        </div>

        {/* Bowling is hidden for pure batsmen/wicketkeepers */}
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

      {/* VENUE & FIELDING */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700/80 mb-8">
        <h4 className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-6 flex items-center gap-2"><Map className="w-5 h-5 text-emerald-500" /> Venue & Fielding Diagnostics</h4>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-black/40 p-4 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Best Stadiums</p>
            <p className="text-white font-medium text-sm leading-relaxed">{formattedStadiums}</p>
          </div>
          <div className="bg-green-950/20 p-4 rounded-2xl border border-green-900/30">
            <p className="text-xs text-green-500 uppercase font-bold mb-2">Strong Zone</p>
            <p className="text-green-100 font-medium text-sm">{primaryFielding}</p>
          </div>
          <div className="bg-red-950/20 p-4 rounded-2xl border border-red-900/30">
            <p className="text-xs text-red-500 uppercase font-bold mb-2">Liability Zone / Drops</p>
            <p className="text-red-100 font-medium text-sm">{looseFielding}</p>
          </div>
        </div>
      </div>

      {/* ROLE-SPECIFIC MATCHUPS & RIVALS */}
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
  const [mode, setMode] = useState('ipl'); // 'ipl' | 'custom'
  const [stadium, setStadium] = useState('Neutral Venue');
  
  const [myFranchise, setMyFranchise] = useState('RCB');
  const [oppFranchise, setOppFranchise] = useState('CSK');
  const [isFetching, setIsFetching] = useState(false);
  
  const [mySquadPool, setMySquadPool] = useState([]); 
  const [oppSquadPool, setOppSquadPool] = useState([]); 
  
  const [mySelected15, setMySelected15] = useState([]);
  const [oppSelected15, setOppSelected15] = useState([]);
  
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analyzeTab, setAnalyzeTab] = useState('opponent'); // 'opponent' | 'mine'
  const [coachReview, setCoachReview] = useState(null);

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

  const isTeamMatch = (playerTeam, franchiseCode) => {
    if (!playerTeam || playerTeam === 'FA' || playerTeam === 'Unattached' || playerTeam === 'Not in Current Squad') return false;
    const aliases = TEAM_MAP[franchiseCode] || [franchiseCode];
    return aliases.some(alias => playerTeam.toLowerCase().includes(alias.toLowerCase()));
  };

  const handleLetsGo = () => {
    setIsFetching(true);
    setMySelected15([]);
    setOppSelected15([]);
    setCoachReview(null);
    setIsAnalyzed(false);

    setTimeout(() => {
      const myTeamPlayers = playersDB.filter(p => isTeamMatch(p.Team, myFranchise)).map(p => p.Player_Name);
      const oppTeamPlayers = playersDB.filter(p => isTeamMatch(p.Team, oppFranchise)).map(p => p.Player_Name);
      
      setMySquadPool(myTeamPlayers.slice(0, 25));
      setOppSquadPool(oppTeamPlayers.slice(0, 25));
      setIsFetching(false);
    }, 500);
  };

  const togglePlayerSelection = (playerName, isMyTeam) => {
    if (isMyTeam) {
      if (mySelected15.includes(playerName)) {
        setMySelected15(mySelected15.filter(p => p !== playerName));
      } else if (mySelected15.length < 16) { 
        setMySelected15([...mySelected15, playerName]);
      }
    } else {
      if (oppSelected15.includes(playerName)) {
        setOppSelected15(oppSelected15.filter(p => p !== playerName));
      } else if (oppSelected15.length < 16) {
        setOppSelected15([...oppSelected15, playerName]);
      }
    }
  };

  const runCoachReview = () => {
    let poolToDraftFrom = [];

    if (mode === 'ipl') {
      poolToDraftFrom = mySquadPool.map(name => playersDB.find(p => p.Player_Name === name)).filter(Boolean);
    } else {
      // In Custom Mode, draft specifically from the user's selected 15
      poolToDraftFrom = mySelected15.map(name => playersDB.find(p => p.Player_Name === name)).filter(Boolean);
    }
    
    // AI Drafting Algorithm: Balances Roles, Wickets, Strike Rate, Stadium, and H2H Context
    const calculateDynamicScore = (player) => {
      let baseScore = 0;
      const sr = Number(player.Overall_Bat_SR) || 0;
      const wickets = Number(player.Wickets) || 0;
      const econ = Number(player.Overall_Bowl_Econ) || 9.0;
      const role = player.Role || 'Player';

      // Base historical score normalized by Role to prevent Bowlers from taking all spots
      if (role === 'Batsman' || role.includes('Wicket')) {
        baseScore = sr * 2; // e.g., SR 150 = 300 points
      } else if (role === 'Bowler') {
        baseScore = (wickets * 1.5) + ((10 - econ) * 30); // Rewards high wickets and low economy
      } else { // All-Rounders get a balanced mix
        baseScore = sr + (wickets * 1.5);
      }
      
      // 1. Stadium Tactical Boost
      if (stadium !== 'Neutral Venue' && player.Best_to_Worst_Venues && player.Best_to_Worst_Venues.includes(stadium)) {
        baseScore += 300; // Big boost for home ground advantage
      }

      // 2. Head-to-Head Opponent Context
      if (oppSelected15.length > 0) {
        // PENALTY: The opponent has drafted this batter's absolute worst nightmare
        if (player.Primary_Threat_Bowler && oppSelected15.includes(player.Primary_Threat_Bowler)) {
          baseScore -= 250; 
        }
        
        // BOOST: This bowler is a tactical nightmare for someone in the opponent's squad!
        oppSelected15.forEach(oppName => {
          const oppProfile = playersDB.find(db => db.Player_Name === oppName);
          if (oppProfile && oppProfile.Primary_Threat_Bowler === player.Player_Name) {
            baseScore += 400; // Tactical Counter-measure deployed
          }
        });
      }

      return baseScore;
    };

    const sorted = [...poolToDraftFrom].sort((a, b) => {
       return calculateDynamicScore(b) - calculateDynamicScore(a);
    });

    const playingXI = sorted.slice(0, 11);
    const impactSubs = sorted.slice(11, 16);

    if (mode === 'ipl') {
      setMySelected15([...playingXI, ...impactSubs].map(p => p.Player_Name));
    }

    setCoachReview({
      xi: playingXI.map(p => p.Player_Name),
      subs: impactSubs.map(p => p.Player_Name)
    });
    
    setTimeout(() => {
      document.getElementById('coach-review-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleAnalyze = () => {
    setIsAnalyzed(true);
    setTimeout(() => {
      document.getElementById('analyze-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Helper to render tactics inside Analyze mode
  const renderTacticCards = (playerList, title) => (
    <div className="space-y-6 mt-6">
      <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm">{title}</h3>
      {playerList.map((pName, i) => {
        const dbProfile = playersDB.find(db => db.Player_Name === pName);
        const role = dbProfile?.Role || 'Player';
        const team = dbProfile?.Team || 'Unattached';
        
        return (
          <div key={i} className="bg-black/40 p-5 rounded-2xl border border-slate-800/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
              <span className="text-white font-bold text-lg">{getDisplayName(dbProfile || {Player_Name: pName})} <span className="text-sm font-normal text-slate-500 ml-2">({role})</span></span>
            </div>
            {dbProfile ? (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {role !== 'Bowler' && (
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-red-400 font-bold block mb-1">Bowling to him (Pace/Spin):</span>
                    <span className="text-slate-300 block">{dbProfile.Clash_Pace_Tactic || "Standard pace lines. Build pressure."}</span>
                    <span className="text-slate-400 block mt-1">{dbProfile.Clash_Spin_Tactic || "Standard spin lengths. Restrict boundaries."}</span>
                  </div>
                )}
                {role !== 'Batsman' && (
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-blue-400 font-bold block mb-1">Batting against him:</span>
                    <span className="text-slate-300 block">{dbProfile.Batting_Against_Him_Tactic || "Respect good lengths, rotate strike."}</span>
                  </div>
                )}
                <div className="md:col-span-2 bg-purple-900/10 p-3 rounded-lg border border-purple-900/30">
                  <span className="text-purple-400 font-bold flex items-center gap-1 mb-1"><Video className="w-3 h-3"/> Coach Tape Suggestion:</span>
                  <span className="text-slate-300 italic">"{dbProfile.Coach_Tape_Suggestion || "Review standard match footage for technical flaws."}"</span>
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
          <button onClick={() => {setMode('ipl'); handleLetsGo();}} className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${mode === 'ipl' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>IPL Teams</button>
          <button onClick={() => {setMode('custom'); handleLetsGo();}} className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${mode === 'custom' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Custom Match with Friends</button>
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
            <div className="flex flex-col lg:flex-row gap-8 items-center justify-center bg-black/30 p-8 rounded-3xl border border-slate-800/50">
              <div className="w-full lg:w-1/3">
                <label className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3 block text-center">Your Franchise</label>
                <select value={myFranchise} onChange={handleMyFranchiseChange} className="w-full bg-slate-900 border-2 border-blue-500/30 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 text-center cursor-pointer hover:bg-slate-800 transition-colors">
                  {IPL_TEAMS.map(t => <option key={t} value={t} disabled={t === oppFranchise} className="bg-slate-900 text-white disabled:text-slate-600 disabled:italic">{TEAM_MAP[t][0]}</option>)}
                </select>
              </div>
              <div className="text-3xl font-black text-slate-600 italic">VS</div>
              <div className="w-full lg:w-1/3">
                <label className="text-red-400 font-black text-xs uppercase tracking-widest mb-3 block text-center">Opponent Franchise</label>
                <select value={oppFranchise} onChange={handleOppFranchiseChange} className="w-full bg-slate-900 border-2 border-red-500/30 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-500 text-center cursor-pointer hover:bg-slate-800 transition-colors">
                  {IPL_TEAMS.map(t => <option key={t} value={t} disabled={t === myFranchise} className="bg-slate-900 text-white disabled:text-slate-600 disabled:italic">{TEAM_MAP[t][0]}</option>)}
                </select>
              </div>
              <button onClick={handleLetsGo} disabled={isFetching} className="w-full lg:w-auto bg-gradient-to-br from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                {isFetching ? <RefreshCw className="animate-spin" /> : "Let's GO!!!"}
              </button>
            </div>

            {mySquadPool.length > 0 && oppSquadPool.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-8 text-center">
                  <h3 className="text-yellow-400 font-black uppercase tracking-widest flex items-center justify-center gap-2"><Target className="w-5 h-5"/> Draft Opponent's Squad</h3>
                  <p className="text-slate-400 text-sm mt-1">Select at least 11 opponents. The AI will automatically draft your best 11 to counter them.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-red-950/10 p-6 rounded-3xl border border-red-900/30 shadow-inner">
                    <h4 className="text-red-400 font-black text-xl mb-2 uppercase text-center">{oppFranchise} Pool</h4>
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

                  <div className="bg-blue-950/10 p-6 rounded-3xl border border-blue-900/30 shadow-inner opacity-80 pointer-events-none">
                    <h4 className="text-blue-400 font-black text-xl mb-2 uppercase text-center">{myFranchise} Pool</h4>
                    <p className="text-xs text-center text-blue-300/60 font-bold uppercase tracking-widest mb-6">AI will auto-draft optimal 11 + Subs</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {mySquadPool.map(p => {
                        const prof = playersDB.find(db => db.Player_Name === p);
                        return (
                          <div key={p} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900/50 text-slate-500 border border-slate-800">
                            {getDisplayName(prof || { Player_Name: p })}
                          </div>
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
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center">
              <h3 className="text-yellow-400 font-black uppercase tracking-widest text-lg flex items-center justify-center gap-2"><Target className="w-5 h-5"/> Free Agent Draft</h3>
              <p className="text-slate-400 text-sm mt-2">Select 15 players for both sides. The AI will draft your optimal Playing XI.</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="bg-red-950/10 p-8 rounded-3xl border border-red-900/30">
                <div className="flex justify-between items-center mb-6 border-b border-red-900/30 pb-4">
                  <h4 className="text-red-400 font-black text-xl uppercase">Opponent 15</h4>
                  <span className="bg-red-900/50 text-red-200 px-3 py-1 rounded-lg text-xs font-bold">{oppSelected15.length}/15</span>
                </div>
                <div className="space-y-3 h-[400px] overflow-y-auto custom-scrollbar pr-4">
                  {[...Array(15)].map((_, i) => (
                    <select key={`opp-${i}`} className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-medium p-3 rounded-xl focus:border-red-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors" onChange={(e) => { const newArr = [...oppSelected15]; newArr[i] = e.target.value; setOppSelected15(newArr.filter(Boolean)); }}>
                      <option value="">+ Select Player {i+1}</option>
                      {playersDB.map(p => <option key={`o-${p.Player_Name}`} value={p.Player_Name}>{getDisplayName(p)} ({p.Team || 'FA'})</option>)}
                    </select>
                  ))}
                </div>
              </div>

              <div className="bg-blue-950/10 p-8 rounded-3xl border border-blue-900/30">
                <div className="flex justify-between items-center mb-6 border-b border-blue-900/30 pb-4">
                  <h4 className="text-blue-400 font-black text-xl uppercase">Your 15</h4>
                  <span className="bg-blue-900/50 text-blue-200 px-3 py-1 rounded-lg text-xs font-bold">{mySelected15.length}/15</span>
                </div>
                <div className="space-y-3 h-[400px] overflow-y-auto custom-scrollbar pr-4">
                  {[...Array(15)].map((_, i) => (
                    <select key={`my-${i}`} className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-medium p-3 rounded-xl focus:border-blue-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors" onChange={(e) => { const newArr = [...mySelected15]; newArr[i] = e.target.value; setMySelected15(newArr.filter(Boolean)); }}>
                      <option value="">+ Select Player {i+1}</option>
                      {playersDB.map(p => <option key={`m-${p.Player_Name}`} value={p.Player_Name}>{getDisplayName(p)} ({p.Team || 'FA'})</option>)}
                    </select>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Action Buttons */}
        <AnimatePresence>
          {oppSelected15.length >= 11 && (mode === 'ipl' || mySelected15.length >= 11) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col sm:flex-row justify-center mt-12 gap-6 pt-8 border-t border-slate-800">
                <button onClick={runCoachReview} className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:scale-105 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center gap-3 w-full sm:w-auto">
                  <Award className="w-6 h-6" /> Coach Review (Draft Team)
                </button>
                {coachReview && (
                  <button onClick={handleAnalyze} className="bg-gradient-to-r from-emerald-500 to-teal-700 hover:scale-105 text-white px-12 py-4 rounded-full font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 w-full sm:w-auto">
                    <Target className="w-6 h-6" /> Analyze Matchups
                  </button>
                )}
            </motion.div>
          )}
        </AnimatePresence>
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

  const battersList = useMemo(() => playersDB.filter(p => ['Batsman', 'All-Rounder', 'Wicketkeeper', 'Wicket Keeper'].includes(p.Role)), [playersDB]);
  const bowlersList = useMemo(() => playersDB.filter(p => ['Bowler', 'All-Rounder'].includes(p.Role)), [playersDB]);

  useEffect(() => {
    if (battersList.length > 0 && !batterName) setBatterName(battersList[0].Player_Name);
    if (bowlersList.length > 0 && !bowlerName) setBowlerName(bowlersList[0].Player_Name);
  }, [battersList, bowlersList, batterName, bowlerName]);

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

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch justify-center gap-10 mb-16">
        <div className="w-full lg:w-2/5 flex flex-col">
          <label className="text-blue-400 font-black text-sm uppercase tracking-widest mb-3 block text-center">Select Batter / All-Rounder</label>
          <select value={batterName} onChange={(e) => setBatterName(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 text-white font-bold p-4 rounded-2xl mb-6 outline-none focus:border-blue-500 cursor-pointer text-center text-lg">
            {battersList.map(p => <option key={`bat-${p.Player_Name}`} value={p.Player_Name}>{getDisplayName(p)} ({p.Team || 'FA'})</option>)}
          </select>
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
          <label className="text-red-400 font-black text-sm uppercase tracking-widest mb-3 block text-center">Select Bowler / All-Rounder</label>
          <select value={bowlerName} onChange={(e) => setBowlerName(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 text-white font-bold p-4 rounded-2xl mb-6 outline-none focus:border-red-500 cursor-pointer text-center text-lg">
            {bowlersList.map(p => <option key={`bowl-${p.Player_Name}`} value={p.Player_Name}>{getDisplayName(p)} ({p.Team || 'FA'})</option>)}
          </select>
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

      {batter && bowler && (
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
          <div className="space-y-3">
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
        const [pRes, fRes, tRes] = await Promise.all([
          fetch('/players.csv').catch(() => ({ ok: false })),
          fetch('/fielding_analysis.csv').catch(() => ({ ok: false })),
          fetch('/teams.csv').catch(() => ({ ok: false, text: () => '' })) 
        ]);

        if (!pRes.ok) throw new Error("players.csv not found in public folder");
        if (!fRes.ok) throw new Error("fielding_analysis.csv not found in public folder");

        const [pText, fText, tText] = await Promise.all([
          pRes.text(), fRes.text(), tRes.ok ? tRes.text() : Promise.resolve('')
        ]);

        const players = parseCSV(pText);   
        const fielding = parseCSV(fText);  
        const teams = parseCSV(tText);     

        if (players.length === 0) throw new Error("players.csv is empty or parsed incorrectly.");

        // Fast Lookups
        const playersExactMap = {};
        players.forEach(p => { if (p.Player_Name) playersExactMap[normalizeString(p.Player_Name)] = p; });
        const playersSurnameIdx = buildSurnameIndex(players);

        const fieldingExactMap = {};
        fielding.forEach(f => { if (f.Player_Name) fieldingExactMap[normalizeString(f.Player_Name)] = f; });
        const fieldingSurnameIdx = buildSurnameIndex(fielding);

        const matchedPlayerKeys = new Set();

        // Ultra-Merge Pass 1
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
              Full_Name: t.Player_Name,
              Team: t.Team || 'Unattached',
              Country: t.Country || statsMatch?.Country || 'Unknown',
              Role: t.Role || statsMatch?.Role || 'Player',
            };
          });

        // Ultra-Merge Pass 2
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
              Team: 'Not in Current Squad',
              Country: p.Country || 'Unknown',
              Role: p.Role || 'Player',
            };
          });

        const merged = [...rosterEntries, ...unrosteredEntries];

        setPlayersDB(merged.filter(p => p.Player_Name && p.Player_Name !== 'undefined'));
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
            <li>Ensure <strong className="text-white">players.csv</strong> is in the <code className="text-red-300">public/</code> folder.</li>
            <li>Ensure <strong className="text-white">fielding_analysis.csv</strong> is in the <code className="text-red-300">public/</code> folder.</li>
            <li>Check CSV header formatting.</li>
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
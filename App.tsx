import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Scroll, 
  ShoppingBag, 
  Hammer, 
  PlusCircle, 
  CheckCircle2, 
  Coins, 
  Trash2, 
  Sparkles,
  Trophy,
  Zap,
  ListFilter,
  ArrowUpDown,
  X,
  FileText,
  Layers
} from 'lucide-react';
import { Stat, Quest, Reward, EpicProject, UserProfile, StatType, QuestType, QuestLevel } from './types';
import { INITIAL_STATS, INITIAL_PROJECTS, INITIAL_QUESTS, INITIAL_REWARDS } from './constants';
import { ProgressBar } from './components/ProgressBar';
import { StatSpiderChart } from './components/StatSpiderChart';
import { generateQuestWithAI } from './services/geminiService';

// Color mapping for stats
const STAT_COLORS: Record<StatType, string> = {
  [StatType.SKILL]: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  [StatType.GOLD]: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
  [StatType.FOCUS]: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]',
  [StatType.CHAR]: 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]',
  [StatType.HP_MP]: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  [StatType.MORAL]: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
};

type View = 'dashboard' | 'quests' | 'store' | 'projects';
type SortOption = 'NEWEST' | 'OLDEST' | 'XP' | 'COINS';

const App: React.FC = () => {
  // -- State --
  const [view, setView] = useState<View>('dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('lq_profile');
    return saved ? JSON.parse(saved) : { name: 'Streamer Divino', totalCoins: 600, totalXP: 0 };
  });
  const [stats, setStats] = useState<Stat[]>(() => {
    const saved = localStorage.getItem('lq_stats');
    return saved ? JSON.parse(saved) : INITIAL_STATS;
  });
  const [quests, setQuests] = useState<Quest[]>(() => {
    const saved = localStorage.getItem('lq_quests');
    return saved ? JSON.parse(saved) : INITIAL_QUESTS;
  });
  const [rewards, setRewards] = useState<Reward[]>(() => {
    const saved = localStorage.getItem('lq_rewards');
    return saved ? JSON.parse(saved) : INITIAL_REWARDS;
  });
  const [projects, setProjects] = useState<EpicProject[]>(() => {
    const saved = localStorage.getItem('lq_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  // Filter & Sort State
  const [filterType, setFilterType] = useState<'ALL' | QuestType>('ALL');
  const [filterStat, setFilterStat] = useState<'ALL' | StatType>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');

  const [isGenerating, setIsGenerating] = useState(false);
  
  // -- Quest Form State --
  const [newQuestFormOpen, setNewQuestFormOpen] = useState(false);
  const [isQuestBatchMode, setIsQuestBatchMode] = useState(false);
  
  const [newQuestName, setNewQuestName] = useState('');
  const [bulkQuestNames, setBulkQuestNames] = useState(''); // For Textarea
  
  const [newQuestType, setNewQuestType] = useState<QuestType>(QuestType.DAILY);
  const [newQuestLevel, setNewQuestLevel] = useState<QuestLevel>(QuestLevel.L1);
  const [newQuestStat, setNewQuestStat] = useState<StatType>(StatType.SKILL);
  const [newQuestXP, setNewQuestXP] = useState(10);
  const [newQuestCoins, setNewQuestCoins] = useState(5);

  // -- Reward Form State --
  const [newRewardFormOpen, setNewRewardFormOpen] = useState(false);
  const [isRewardBatchMode, setIsRewardBatchMode] = useState(false);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(50);
  const [bulkRewardText, setBulkRewardText] = useState('');

  // -- Persistence --
  useEffect(() => { localStorage.setItem('lq_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('lq_stats', JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem('lq_quests', JSON.stringify(quests)); }, [quests]);
  useEffect(() => { localStorage.setItem('lq_rewards', JSON.stringify(rewards)); }, [rewards]);
  useEffect(() => { localStorage.setItem('lq_projects', JSON.stringify(projects)); }, [projects]);

  // -- Quest Handlers --

  const handleCompleteQuest = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || quest.completed) return;

    // 1. Mark Completed
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, completed: true } : q));

    // 2. Update Global Profile (Coins & Total XP)
    setUserProfile(prev => ({
      ...prev,
      totalCoins: prev.totalCoins + quest.coinReward,
      totalXP: prev.totalXP + quest.xpReward
    }));

    // 3. Update Specific Stat (XP Logic & Level Up)
    setStats(prev => prev.map(stat => {
      if (stat.type === quest.statAssoc) {
        let newXP = stat.currentXP + quest.xpReward;
        let newLevel = stat.level;
        let newMaxXP = stat.maxXP;

        // Level Up Loop (in case of massive XP gain)
        while (newXP >= newMaxXP) {
          newXP -= newMaxXP;
          newLevel += 1;
          newMaxXP = newLevel * 100; // Scaling difficulty
          alert(`LEVEL UP! ${stat.name} is now Level ${newLevel}!`);
        }

        return {
          ...stat,
          level: newLevel,
          currentXP: newXP,
          maxXP: newMaxXP
        };
      }
      return stat;
    }));
  };

  const handleDeleteQuest = (id: string) => {
    setQuests(prev => prev.filter(q => q.id !== id));
  };

  const handleAddQuest = (e: React.FormEvent) => {
    e.preventDefault();

    if (isQuestBatchMode) {
      // Batch Mode
      const lines = bulkQuestNames.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const newQuests: Quest[] = lines.map((line, index) => ({
        id: (Date.now() + index).toString(),
        name: line.trim(),
        type: newQuestType,
        levelAssoc: newQuestLevel,
        xpReward: newQuestXP,
        coinReward: newQuestCoins,
        statAssoc: newQuestStat,
        completed: false
      }));
      
      setQuests(prev => [...prev, ...newQuests]);
      setBulkQuestNames('');
    } else {
      // Single Mode
      const newQuest: Quest = {
        id: Date.now().toString(),
        name: newQuestName,
        type: newQuestType,
        levelAssoc: newQuestLevel,
        xpReward: newQuestXP,
        coinReward: newQuestCoins,
        statAssoc: newQuestStat,
        completed: false
      };
      setQuests(prev => [...prev, newQuest]);
      setNewQuestName('');
    }
    setNewQuestFormOpen(false);
  };

  // -- Reward Handlers --

  const handleBuyReward = (reward: Reward) => {
    if (userProfile.totalCoins >= reward.cost) {
      if (window.confirm(`¿Comprar "${reward.name}" por ${reward.cost} monedas?`)) {
        setUserProfile(prev => ({
          ...prev,
          totalCoins: prev.totalCoins - reward.cost
        }));
        alert("¡Objeto adquirido! ¡Disfruta tu recompensa!");
      }
    } else {
      alert("No tienes suficientes monedas.");
    }
  };

  const handleDeleteReward = (id: string) => {
    if(window.confirm("¿Eliminar esta recompensa de la tienda?")) {
      setRewards(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRewardBatchMode) {
       // Bulk Format: Name | Cost
       const lines = bulkRewardText.split('\n').filter(line => line.trim() !== '');
       if (lines.length === 0) return;
       
       const newBatchRewards: Reward[] = lines.map((line, index) => {
         const [name, costStr] = line.split('|');
         // If no cost provided after pipe, default to 50
         const parsedCost = costStr ? parseInt(costStr.trim()) : 50; 
         return {
           id: (Date.now() + index).toString(),
           name: name.trim(),
           cost: isNaN(parsedCost) ? 50 : parsedCost
         };
       });

       setRewards(prev => [...prev, ...newBatchRewards]);
       setBulkRewardText('');

    } else {
      const newReward: Reward = {
        id: Date.now().toString(),
        name: newRewardName,
        cost: newRewardCost
      };
      setRewards(prev => [...prev, newReward]);
      setNewRewardName('');
      setNewRewardCost(50);
    }
    setNewRewardFormOpen(false);
  };

  // -- AI Handler --

  const handleGenerateAIQuest = async () => {
    if (!process.env.API_KEY) {
      alert("Please configure your API_KEY in the environment to use AI features.");
      return;
    }
    setIsGenerating(true);
    const generatedQuest = await generateQuestWithAI(stats);
    setIsGenerating(false);

    if (generatedQuest) {
      const newQuest: Quest = {
        ...generatedQuest,
        id: Date.now().toString(),
        completed: false,
        isAiGenerated: true
      };
      setQuests(prev => [...prev, newQuest]);
    } else {
      alert("La IA está descansando (Error de conexión o API Limit). Intenta de nuevo.");
    }
  };

  const handleToggleProjectItem = (projectId: string, itemId: string) => {
    setProjects(prev => prev.map(proj => {
      if (proj.id === projectId) {
        return {
          ...proj,
          items: proj.items.map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
          )
        };
      }
      return proj;
    }));
  };

  // -- Render Helpers --

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center space-x-4">
          <div className="bg-yellow-500/20 p-3 rounded-full">
            <Coins className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider">Inventario</p>
            <p className="text-3xl font-bold text-white rpg-font">{userProfile.totalCoins}</p>
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center space-x-4">
           <div className="bg-purple-500/20 p-3 rounded-full">
            <Trophy className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider">XP Total</p>
            <p className="text-3xl font-bold text-white rpg-font">{userProfile.totalXP}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h3 className="text-xl font-bold mb-4 rpg-font text-white border-b border-gray-700 pb-2">Hoja de Personaje</h3>
          {stats.map(stat => (
            <ProgressBar
              key={stat.id}
              current={stat.currentXP}
              max={stat.maxXP}
              label={`${stat.name} (Lvl ${stat.level})`}
              colorClass={STAT_COLORS[stat.type]}
            />
          ))}
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center shadow-lg">
           <h3 className="text-xl font-bold mb-4 rpg-font text-white w-full border-b border-gray-700 pb-2">Radar de Habilidades</h3>
           <StatSpiderChart stats={stats} />
        </div>
      </div>
    </div>
  );

  const renderQuestLog = () => {
    // 1. Filter Active Quests
    let activeQuests = quests.filter(q => !q.completed);

    // 2. Apply Type & Stat Filters
    if (filterType !== 'ALL') {
      activeQuests = activeQuests.filter(q => q.type === filterType);
    }
    if (filterStat !== 'ALL') {
      activeQuests = activeQuests.filter(q => q.statAssoc === filterStat);
    }

    // 3. Apply Sorting
    const displayedQuests = [...activeQuests].sort((a, b) => {
      if (sortBy === 'XP') return b.xpReward - a.xpReward;
      if (sortBy === 'COINS') return b.coinReward - a.coinReward;
      if (sortBy === 'NEWEST') {
         return Number(b.id) - Number(a.id); 
      }
      return Number(a.id) - Number(b.id);
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold rpg-font text-white">Diario de Misiones</h2>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleGenerateAIQuest}
              disabled={isGenerating}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(147,51,234,0.3)]"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Invocando...' : 'Misión IA'}
            </button>
            <button 
              onClick={() => setNewQuestFormOpen(!newQuestFormOpen)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              {newQuestFormOpen ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />} 
              {newQuestFormOpen ? 'Cancelar' : 'Crear Misión'}
            </button>
          </div>
        </div>

        {/* Filters & Sorting Toolbar */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2 text-gray-400 text-sm min-w-[80px]">
            <ListFilter size={16} />
            <span className="font-semibold">Filtrar:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-gray-900 border border-gray-600 text-sm rounded px-3 py-1.5 text-white focus:border-blue-500 outline-none flex-grow md:flex-grow-0"
            >
              <option value="ALL">Todos los Tipos</option>
              {Object.values(QuestType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
              value={filterStat} 
              onChange={(e) => setFilterStat(e.target.value as any)}
              className="bg-gray-900 border border-gray-600 text-sm rounded px-3 py-1.5 text-white focus:border-blue-500 outline-none flex-grow md:flex-grow-0"
            >
              <option value="ALL">Todas las Stats</option>
              {Object.values(StatType).map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
            </select>
          </div>

          <div className="hidden md:block w-px h-6 bg-gray-700 mx-2"></div>

          <div className="flex items-center gap-2 text-gray-400 text-sm min-w-[80px]">
            <ArrowUpDown size={16} />
            <span className="font-semibold">Ordenar:</span>
          </div>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-900 border border-gray-600 text-sm rounded px-3 py-1.5 text-white focus:border-blue-500 outline-none w-full md:w-auto"
          >
            <option value="NEWEST">Más Recientes</option>
            <option value="OLDEST">Más Antiguas</option>
            <option value="XP">Mayor XP</option>
            <option value="COINS">Mayor Oro</option>
          </select>

          {(filterType !== 'ALL' || filterStat !== 'ALL') && (
            <button 
              onClick={() => { setFilterType('ALL'); setFilterStat('ALL'); }}
              className="text-xs text-red-400 hover:text-red-300 underline ml-auto md:ml-2"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Add Quest Form */}
        {newQuestFormOpen && (
          <form onSubmit={handleAddQuest} className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 space-y-4 animate-in slide-in-from-top-4 shadow-2xl ring-1 ring-blue-900">
            
            {/* Mode Toggles */}
            <div className="flex space-x-2 border-b border-gray-700 pb-2 mb-2">
              <button
                type="button"
                onClick={() => setIsQuestBatchMode(false)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition ${!isQuestBatchMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <FileText size={14} /> Individual
              </button>
              <button
                 type="button"
                 onClick={() => setIsQuestBatchMode(true)}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition ${isQuestBatchMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Layers size={14} /> Masivo (Batch)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                <select 
                  value={newQuestType} onChange={(e) => setNewQuestType(e.target.value as QuestType)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                >
                  {Object.values(QuestType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nivel</label>
                <select 
                  value={newQuestLevel} onChange={(e) => setNewQuestLevel(e.target.value as QuestLevel)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                >
                  {Object.values(QuestLevel).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stat Asociada</label>
                <select 
                  value={newQuestStat} onChange={(e) => setNewQuestStat(e.target.value as StatType)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                >
                  {Object.values(StatType).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">XP</label>
                    <input 
                      type="number" min="1"
                      value={newQuestXP} onChange={(e) => setNewQuestXP(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coins</label>
                    <input 
                      type="number" min="0"
                      value={newQuestCoins} onChange={(e) => setNewQuestCoins(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
               <label className="block text-sm text-gray-300 mb-2">
                 {isQuestBatchMode ? 'Lista de Misiones (Una por línea)' : 'Nombre de la Misión'}
               </label>
               
               {isQuestBatchMode ? (
                 <textarea
                    required
                    value={bulkQuestNames}
                    onChange={(e) => setBulkQuestNames(e.target.value)}
                    placeholder={"Leer libro 30 min\nHacer 20 flexiones\nLimpiar escritorio"}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white h-32 focus:outline-none focus:border-blue-500 font-mono text-sm"
                 />
               ) : (
                 <input 
                  type="text" required
                  value={newQuestName} onChange={(e) => setNewQuestName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Stream de 2 horas"
                />
               )}
               {isQuestBatchMode && <p className="text-xs text-gray-500 mt-1">Se crearán múltiples misiones con la configuración de arriba.</p>}
            </div>

            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold transition">
              {isQuestBatchMode ? 'Crear Múltiples Misiones' : 'Añadir Misión'}
            </button>
          </form>
        )}

        {/* Quest List */}
        <div className="grid gap-4">
          {displayedQuests.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-lg">
               <p className="text-gray-500 italic mb-2">
                 {(filterType !== 'ALL' || filterStat !== 'ALL') 
                   ? 'No se encontraron misiones con estos filtros.' 
                   : 'No hay misiones activas.'}
               </p>
               <p className="text-sm text-gray-600">¡Crea una nueva o invoca a la IA!</p>
            </div>
          )}
          
          {displayedQuests.map(quest => (
            <div key={quest.id} className={`bg-gray-800 rounded-lg p-4 border-l-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:bg-gray-750 ${quest.isAiGenerated ? 'border-purple-500' : 'border-blue-500'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${quest.type === QuestType.DAILY ? 'bg-green-900 text-green-300' : quest.type === QuestType.WEEKLY ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'}`}>
                    {quest.type}
                  </span>
                  {quest.isAiGenerated && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-900 text-purple-300 flex items-center gap-1">
                      <Sparkles size={10} /> AI
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{quest.levelAssoc}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{quest.name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  +{quest.xpReward} XP ({quest.statAssoc.split(' ')[0]}) | +{quest.coinReward} Coins
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                  onClick={() => handleCompleteQuest(quest.id)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition shadow-[0_0_10px_rgba(22,163,74,0.3)]"
                >
                  <CheckCircle2 size={18} /> Completar
                </button>
                <button 
                  onClick={() => handleDeleteQuest(quest.id)}
                  className="p-2 text-gray-500 hover:text-red-500 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStore = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold rpg-font text-white">Tienda del Héroe</h2>
        <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
          <div className="bg-gray-800 px-4 py-2 rounded-lg border border-yellow-600/50 flex items-center gap-2">
            <Coins className="text-yellow-500" />
            <span className="text-yellow-400 font-bold text-xl">{userProfile.totalCoins}</span>
          </div>
          <button 
            onClick={() => setNewRewardFormOpen(!newRewardFormOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-sm font-bold transition"
          >
            {newRewardFormOpen ? <X size={16} /> : <PlusCircle size={16} />}
            {newRewardFormOpen ? 'Cancelar' : 'Crear Recompensa'}
          </button>
        </div>
      </div>

      {/* New Reward Form */}
      {newRewardFormOpen && (
        <form onSubmit={handleAddReward} className="bg-gray-800 p-4 rounded-lg border border-yellow-600/30 mb-6 space-y-4 animate-in slide-in-from-top-4 shadow-xl">
          <div className="flex space-x-2 border-b border-gray-700 pb-2 mb-2">
              <button
                type="button"
                onClick={() => setIsRewardBatchMode(false)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition ${!isRewardBatchMode ? 'bg-yellow-600 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                <FileText size={14} /> Individual
              </button>
              <button
                 type="button"
                 onClick={() => setIsRewardBatchMode(true)}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition ${isRewardBatchMode ? 'bg-yellow-600 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                <Layers size={14} /> Masivo (Batch)
              </button>
            </div>

            {isRewardBatchMode ? (
              <div>
                <label className="block text-sm text-gray-300 mb-2">Lista de Recompensas (Formato: Nombre | Costo)</label>
                <textarea
                    required
                    value={bulkRewardText}
                    onChange={(e) => setBulkRewardText(e.target.value)}
                    placeholder={"Pizza Familiar | 80\nCine VIP | 60\nSkin LoL | 120"}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white h-32 focus:outline-none focus:border-yellow-500 font-mono text-sm"
                 />
                 <p className="text-xs text-gray-500 mt-1">Un ítem por línea. Si no pones costo, será 50 por defecto.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Nombre del Item</label>
                  <input 
                    type="text" required
                    value={newRewardName} onChange={(e) => setNewRewardName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Ej: Cena de Sushi"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Costo (Monedas)</label>
                  <input 
                    type="number" min="1"
                    value={newRewardCost} onChange={(e) => setNewRewardCost(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            )}

            <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-2 rounded font-bold transition shadow-lg">
              {isRewardBatchMode ? 'Añadir Items a la Tienda' : 'Crear Item'}
            </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map(reward => {
          const canAfford = userProfile.totalCoins >= reward.cost;
          return (
            <div key={reward.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col justify-between hover:border-gray-500 transition group relative overflow-hidden">
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteReward(reward.id); }}
                className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition z-10"
                title="Eliminar recompensa"
              >
                <Trash2 size={16} />
              </button>

              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition pointer-events-none">
                <ShoppingBag size={64} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 pr-6">{reward.name}</h3>
                <div className="text-3xl font-bold text-yellow-500 mb-4 rpg-font flex items-center gap-1">
                  {reward.cost} <span className="text-sm text-yellow-700">GP</span>
                </div>
              </div>
              <button
                onClick={() => handleBuyReward(reward)}
                disabled={!canAfford}
                className={`w-full py-3 rounded-lg font-bold transition flex items-center justify-center gap-2
                  ${canAfford 
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-[0_0_15px_rgba(202,138,4,0.4)]' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              >
                {canAfford ? 'Canjear Recompensa' : 'Insuficiente Oro'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
       <h2 className="text-2xl font-bold rpg-font text-white">Proyectos Épicos</h2>
       {projects.map(project => {
         const completedCount = project.items.filter(i => i.completed).length;
         const totalCount = project.items.length;
         const progress = (completedCount / totalCount) * 100;
         
         return (
           <div key={project.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
             <div className="p-6 border-b border-gray-700 bg-gray-800/50">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="text-yellow-400" size={20} />
                    {project.name}
                   </h3>
                   <p className="text-gray-400 text-sm">{project.description}</p>
                 </div>
                 <span className="font-mono text-blue-400">{Math.round(progress)}%</span>
               </div>
               <div className="w-full bg-gray-900 rounded-full h-2 mt-2">
                 <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                 ></div>
               </div>
             </div>
             <div className="p-4">
               {project.items.map(item => (
                 <div 
                  key={item.id} 
                  onClick={() => handleToggleProjectItem(project.id, item.id)}
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition ${item.completed ? 'bg-green-900/20' : 'hover:bg-gray-700/50'}`}
                 >
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                     {item.completed && <CheckCircle2 size={14} className="text-white" />}
                   </div>
                   <span className={item.completed ? 'text-gray-500 line-through' : 'text-gray-200'}>{item.name}</span>
                 </div>
               ))}
             </div>
           </div>
         )
       })}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 font-sans pb-20 md:pb-0 md:pl-20">
      
      {/* Navigation Mobile (Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 z-50 flex justify-around items-center p-2 safe-area-pb">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={24} />} label="Stats" />
        <NavButton active={view === 'quests'} onClick={() => setView('quests')} icon={<Scroll size={24} />} label="Misiones" />
        <NavButton active={view === 'projects'} onClick={() => setView('projects')} icon={<Hammer size={24} />} label="Proyectos" />
        <NavButton active={view === 'store'} onClick={() => setView('store')} icon={<ShoppingBag size={24} />} label="Tienda" />
      </nav>

      {/* Navigation Desktop (Left Sidebar) */}
      <nav className="hidden md:flex fixed top-0 left-0 h-full w-20 bg-slate-900 border-r border-slate-800 flex-col items-center py-8 space-y-8 z-50">
        <div className="bg-blue-600 p-2 rounded-lg mb-4">
          <Zap className="text-white" size={28} />
        </div>
        <NavButtonDesktop active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={24} />} label="Stats" />
        <NavButtonDesktop active={view === 'quests'} onClick={() => setView('quests')} icon={<Scroll size={24} />} label="Misiones" />
        <NavButtonDesktop active={view === 'projects'} onClick={() => setView('projects')} icon={<Hammer size={24} />} label="Proyectos" />
        <NavButtonDesktop active={view === 'store'} onClick={() => setView('store')} icon={<ShoppingBag size={24} />} label="Tienda" />
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 pt-6">
        <header className="flex justify-between items-center mb-8">
           <div>
             <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight rpg-font">
               LIFE QUEST <span className="text-blue-500">RPG</span>
             </h1>
             <p className="text-gray-500 text-sm">Streamer Divino Edition v1.0</p>
           </div>
           <div className="hidden md:block text-right">
             <p className="font-bold text-white">{userProfile.name}</p>
             <p className="text-xs text-gray-400">Nivel {stats.reduce((acc, curr) => acc + curr.level, 0)} (Total)</p>
           </div>
        </header>

        {view === 'dashboard' && renderDashboard()}
        {view === 'quests' && renderQuestLog()}
        {view === 'projects' && renderProjects()}
        {view === 'store' && renderStore()}
      </main>

    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg transition ${active ? 'text-blue-400' : 'text-gray-500'}`}
  >
    {icon}
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </button>
);

const NavButtonDesktop = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`relative group flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
  >
    {icon}
    <span className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap border border-gray-700">
      {label}
    </span>
  </button>
);

export default App;
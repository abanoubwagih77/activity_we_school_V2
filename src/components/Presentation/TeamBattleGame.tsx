import React, { useState } from 'react';
import { Question, Team } from '../../types';
import { soundEngine } from '../../utils/audio';
import { QuestionDisplay } from './QuestionDisplay';
import { 
  Terminal, Rocket, Shield, Bot, Code, Cpu, 
  ArrowRight, ArrowLeft, Plus, Minus, Trophy, CheckCircle, Eye, Swords, Sparkles, RefreshCcw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface TeamBattleGameProps {
  questions: Question[];
  teams: Team[];
  onUpdateTeamScore: (teamId: string, delta: number) => void;
  onSetTeamScore: (teamId: string, newScore: number) => void;
  onFinish: () => void;
  timerDuration?: number;
}

export const TeamBattleGame: React.FC<TeamBattleGameProps> = ({
  questions,
  teams,
  onUpdateTeamScore,
  onSetTeamScore,
  onFinish,
  timerDuration = 20,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [awardedTeamId, setAwardedTeamId] = useState<string | null>(null);
  const [deductOnWrong, setDeductOnWrong] = useState<boolean>(true);
  const [isBattleOver, setIsBattleOver] = useState<boolean>(false);
  
  // Track which team's turn it is for the current question
  const [activeTeamId, setActiveTeamId] = useState<string>(teams[0]?.id || 't1');

  // Track result of the current question for UI banner
  const [lastActionResult, setLastActionResult] = useState<{
    teamName: string;
    teamColor: string;
    points: number;
    isCorrect: boolean;
  } | null>(null);

  const currentQuestion = questions[currentIndex];
  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];

  const renderIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'rocket': return <Rocket className={className} />;
      case 'shield': return <Shield className={className} />;
      case 'bot': return <Bot className={className} />;
      case 'code': return <Code className={className} />;
      case 'cpu': return <Cpu className={className} />;
      case 'terminal':
      default:
        return <Terminal className={className} />;
    }
  };

  const handleSelectAnswer = (option: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(option);

    const isCorrect =
      option !== '' &&
      option !== '__TIME_UP__' &&
      option.trim().toLowerCase() === currentQuestion.correctAnswer?.trim().toLowerCase();

    const points = currentQuestion.points || 10;

    if (isCorrect) {
      soundEngine.playCorrect();
      onUpdateTeamScore(activeTeam.id, points);
      setAwardedTeamId(activeTeam.id);
      setLastActionResult({
        teamName: activeTeam.name,
        teamColor: activeTeam.color,
        points: points,
        isCorrect: true,
      });
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } else {
      if (option !== '__TIME_UP__') {
        soundEngine.playWrong();
      }
      const penalty = deductOnWrong ? points : 0;
      if (penalty > 0) {
        onUpdateTeamScore(activeTeam.id, -penalty);
      }
      setAwardedTeamId(activeTeam.id);
      setLastActionResult({
        teamName: activeTeam.name,
        teamColor: activeTeam.color,
        points: penalty,
        isCorrect: false,
      });
    }

    setIsRevealed(true);
  };

  const handleManualAwardTeam = (teamId: string, points: number) => {
    onUpdateTeamScore(teamId, points);
    setAwardedTeamId(teamId);
    soundEngine.playCorrect();
  };

  const handleManualDeductTeam = (teamId: string, penalty = 10) => {
    onUpdateTeamScore(teamId, -penalty);
    setAwardedTeamId(teamId);
    soundEngine.playWrong();
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setIsRevealed(false);
      setAwardedTeamId(null);
      setLastActionResult(null);

      // Automatically advance to the next team in round-robin order
      const nextTeam = teams[nextIndex % teams.length];
      if (nextTeam) {
        setActiveTeamId(nextTeam.id);
      }

      soundEngine.playCardFlip();
    } else {
      // Finished all questions - show winning podium
      setIsBattleOver(true);
      soundEngine.playVictory();
      try {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
      } catch {}
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setSelectedAnswer(null);
      setIsRevealed(false);
      setAwardedTeamId(null);
      setLastActionResult(null);

      const prevTeam = teams[prevIndex % teams.length];
      if (prevTeam) {
        setActiveTeamId(prevTeam.id);
      }

      soundEngine.playClick();
    }
  };

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const winningTeam = sortedTeams[0];

  // Battle Podium View when all questions finish
  if (isBattleOver) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 p-4 sm:p-8" dir="rtl">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center shadow-2xl relative overflow-hidden"
        >
          <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 border border-amber-400/40">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1 rounded-full border border-amber-400/20 mb-2">
            انتهت المعركة والمسابقة!
          </span>

          <h2 className="text-2xl sm:text-4xl font-black text-white mb-2">
            🏆 الفريق الفائز بالمركز الأول:
          </h2>

          <div 
            className="px-6 py-3 rounded-2xl text-xl sm:text-3xl font-black text-white shadow-xl flex items-center gap-3 my-2"
            style={{ backgroundColor: winningTeam?.color || '#3b82f6' }}
          >
            <span>{winningTeam?.name}</span>
            <span className="bg-black/25 px-3 py-1 rounded-xl font-mono text-xl">
              {winningTeam?.score} نقطة
            </span>
          </div>

          {/* Leaderboard Table of Teams */}
          <div className="w-full max-w-xl mt-6 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 text-right px-2 mb-2">
              الترتيب النهائي لجميع الفرق:
            </h4>
            {sortedTeams.map((team, idx) => (
              <div
                key={team.id}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  idx === 0
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-sm">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-bold text-sm">{team.name}</span>
                </div>
                <span className="font-mono font-black text-base" style={{ color: team.color }}>
                  {team.score} نقطة
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <button
              onClick={() => {
                setIsBattleOver(false);
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setIsRevealed(false);
                setLastActionResult(null);
                soundEngine.playClick();
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors border border-slate-700"
            >
              <RefreshCcw className="w-4 h-4" />
              إعادة المعركة من البداية
            </button>
            <button
              onClick={onFinish}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              تسجيل وحفظ النتائج في السجل
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-5 p-2 sm:p-4" dir="rtl">
      {/* Live Team Scoreboard on Top */}
      <div className="w-full bg-slate-800/90 dark:bg-slate-900/90 p-4 md:p-5 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-extrabold tracking-wide text-slate-200">
              لوحة نتائج معركة الفرق المباشرة
            </h3>
          </div>

          <div className="flex items-center gap-4">
            {/* Deduct penalty toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deductOnWrong}
                onChange={(e) => setDeductOnWrong(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>خصم نقاط عند الإجابة الخاطئة (-{currentQuestion?.points || 10})</span>
            </label>

            <div className="text-xs text-slate-400 font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 font-mono">
              السؤال {currentIndex + 1} من {questions.length}
            </div>
          </div>
        </div>

        {/* Teams Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {teams.map((team) => {
            const isTurn = activeTeamId === team.id;
            const isAwarded = awardedTeamId === team.id;

            return (
              <motion.div
                key={team.id}
                animate={isAwarded ? { scale: [1, 1.06, 1], y: [-3, 0] } : {}}
                onClick={() => {
                  setActiveTeamId(team.id);
                  soundEngine.playClick();
                }}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between transition-all relative overflow-hidden cursor-pointer ${
                  isTurn
                    ? 'ring-2 ring-indigo-400 border-indigo-400 bg-indigo-950/40 shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Active turn indicator ribbon */}
                {isTurn && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg">
                    دوره الآن 🎯
                  </div>
                )}

                {/* Team header banner */}
                <div className="flex items-center justify-between gap-1.5 mb-1 mt-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="p-1 rounded-lg text-white shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {renderIcon(team.icon, 'w-3.5 h-3.5')}
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {team.name}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-2xl font-black font-mono my-1 text-center" style={{ color: team.color }}>
                  {team.score}
                </div>

                {/* Quick Points Manual Override */}
                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualAwardTeam(team.id, currentQuestion?.points || 10);
                    }}
                    className="flex-1 py-1 px-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-0.5 shadow-sm cursor-pointer"
                    title={`إضافة +${currentQuestion?.points || 10} نقاط`}
                  >
                    <Plus className="w-3 h-3" />
                    +{currentQuestion?.points || 10}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualDeductTeam(team.id, currentQuestion?.points || 10);
                    }}
                    className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-200 border border-slate-700 text-xs font-bold cursor-pointer"
                    title={`خصم -${currentQuestion?.points || 10} نقاط`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* WHOSE TURN PROMINENT BANNER (Directly above question) */}
      <motion.div
        key={activeTeam.id}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-3 shadow-lg"
        style={{
          backgroundColor: `${activeTeam.color}15`,
          borderColor: activeTeam.color,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: activeTeam.color }}
          >
            {renderIcon(activeTeam.icon, 'w-6 h-6')}
          </span>
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              السؤال الحالي موجه لفريق:
            </div>
            <div className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>{activeTeam.name}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-white/20 text-white">
                رصيد الفريق: {activeTeam.score} نقطة
              </span>
            </div>
          </div>
        </div>

        {/* Change turn manually if teacher desires */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">تحويل السؤال لفريق آخر:</span>
          <div className="flex items-center gap-1.5">
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTeamId(t.id);
                  soundEngine.playClick();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  t.id === activeTeamId
                    ? 'ring-2 ring-white text-white font-black'
                    : 'opacity-60 hover:opacity-100 text-slate-300 bg-slate-800'
                }`}
                style={t.id === activeTeamId ? { backgroundColor: t.color } : {}}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Result feedback banner after answer */}
      <AnimatePresence>
        {lastActionResult && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-sm font-bold shadow-md ${
              lastActionResult.isCorrect
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {lastActionResult.isCorrect ? '🎉' : '❌'}
              </span>
              <span>
                {lastActionResult.isCorrect
                  ? `إجابة صحيحة! تم إضافة +${lastActionResult.points} نقطة لـ (${lastActionResult.teamName})`
                  : lastActionResult.points > 0
                  ? `إجابة خاطئة! تم خصم -${lastActionResult.points} نقاط من (${lastActionResult.teamName})`
                  : `إجابة خاطئة! لم يحصل (${lastActionResult.teamName}) على أي نقاط`}
              </span>
            </div>
            <span className="text-xs text-slate-300 font-normal">
              اضغط على "السؤال التالي" للانتقال للدور القادم
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Navigation Bar */}
      <div className="w-full flex items-center justify-between bg-slate-800/80 px-6 py-3 rounded-2xl border border-slate-700">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 cursor-pointer"
          title="السؤال السابق"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
          <span>الجولة #{currentIndex + 1}</span>
          <span className="text-slate-500">•</span>
          <span className="text-indigo-400">قيمة السؤال: {currentQuestion?.points || 10} نقاط</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRevealed(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">كشف الإجابة</span>
          </button>
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30 transition-transform hover:scale-105"
          >
            <span>{currentIndex === questions.length - 1 ? 'إنهاء المعركة والنتائج 🏆' : 'السؤال التالي (الدور القادم)'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Question Display */}
      {currentQuestion && (
        <div className="w-full">
          <QuestionDisplay
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            isAnswerRevealed={isRevealed}
            onSelectAnswer={handleSelectAnswer}
            timerDuration={timerDuration}
            onTimeUp={() => handleSelectAnswer('__TIME_UP__')}
          />
        </div>
      )}
    </div>
  );
};

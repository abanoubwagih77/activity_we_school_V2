import React, { useState, useEffect } from 'react';
import { Question, Team } from '../../types';
import { soundEngine } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Trophy, Flag, RotateCcw, ChevronLeft, Volume2, 
  Sparkles, Flame, CheckCircle, XCircle, Award, 
  ArrowRight, ShieldAlert
} from 'lucide-react';
import { QuestionDisplay } from './QuestionDisplay';

interface RaceTrackGameProps {
  questions: Question[];
  teams: Team[];
  onUpdateTeamScore: (teamId: string, delta: number) => void;
  onSetTeamScore?: (teamId: string, score: number) => void;
  onFinish: () => void;
  timerDuration?: number;
}

export const RaceTrackGame: React.FC<RaceTrackGameProps> = ({
  questions,
  teams: initialTeams,
  onUpdateTeamScore,
  onFinish,
  timerDuration = 20,
}) => {
  const [vehicleMode, setVehicleMode] = useState<'horse' | 'car'>('horse');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  
  // Track positions (0 to 100%)
  const [progresses, setProgresses] = useState<{ [teamId: string]: number }>(() => {
    const init: { [teamId: string]: number } = {};
    initialTeams.forEach(t => { init[t.id] = 0; });
    return init;
  });

  const [winner, setWinner] = useState<Team | null>(null);
  const [nitroTeamId, setNitroTeamId] = useState<string | null>(null);

  const activeTeams = initialTeams && initialTeams.length > 0 ? initialTeams : [
    { id: 't1', name: 'الفريق الأحمر', color: '#ef4444', icon: 'rocket', score: 0 },
    { id: 't2', name: 'الفريق الأزرق', color: '#3b82f6', icon: 'shield', score: 0 },
  ];

  const currentTeam = activeTeams[currentTeamIndex % activeTeams.length];
  const currentQuestion = questions[currentQuestionIndex % Math.max(1, questions.length)];

  // Step size per correct answer: reaches 100% in around 4-5 steps or based on question count
  const stepPercent = Math.max(15, Math.min(30, Math.floor(100 / Math.max(4, Math.min(8, questions.length)))));

  const handleSelectAnswer = (ans: string) => {
    if (isAnswered || winner) return;

    setSelectedAnswer(ans);
    setIsAnswered(true);

    const correct = currentQuestion ? ans.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() : false;
    setIsCorrect(correct);

    const questionPoints = currentQuestion?.points || 10;

    if (correct) {
      soundEngine.playEngineRev();
      setTimeout(() => soundEngine.playCorrect(), 200);

      // Boost racer
      setNitroTeamId(currentTeam.id);
      setTimeout(() => setNitroTeamId(null), 1500);

      const nextProg = Math.min(100, (progresses[currentTeam.id] || 0) + stepPercent);
      setProgresses(prev => ({ ...prev, [currentTeam.id]: nextProg }));
      onUpdateTeamScore(currentTeam.id, questionPoints);

      setFeedbackMessage(`إجابة صحيحة خارقة! تقدم ${currentTeam.name} وحصل على +${questionPoints} نقطة 🚀`);

      // Check if finished
      if (nextProg >= 100) {
        setTimeout(() => {
          setWinner(currentTeam);
          soundEngine.playVictory();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }, 800);
      }
    } else {
      soundEngine.playWrong();
      const penalty = Math.min(questionPoints, 10);
      onUpdateTeamScore(currentTeam.id, -penalty);
      setFeedbackMessage(`إجابة خاطئة! تم خصم ${penalty} نقاط وتعطلت حركة ${currentTeam.name} مؤقتاً ⚠️`);
    }
  };

  const handleNextTurn = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFeedbackMessage(null);
    setNitroTeamId(null);

    // Rotate team and question
    setCurrentTeamIndex(prev => prev + 1);
    setCurrentQuestionIndex(prev => (prev + 1) % questions.length);
    soundEngine.playClick();
  };

  const handleManualNudge = (teamId: string, deltaPercent: number) => {
    setProgresses(prev => {
      const cur = prev[teamId] || 0;
      const next = Math.max(0, Math.min(100, cur + deltaPercent));
      if (next >= 100 && !winner) {
        const teamObj = activeTeams.find(t => t.id === teamId);
        if (teamObj) {
          setWinner(teamObj);
          soundEngine.playVictory();
          confetti({ particleCount: 120, spread: 80 });
        }
      }
      return { ...prev, [teamId]: next };
    });
  };

  // Podium sorting
  const rankedTeams = [...activeTeams].sort((a, b) => {
    const progDiff = (progresses[b.id] || 0) - (progresses[a.id] || 0);
    if (progDiff !== 0) return progDiff;
    return b.score - a.score;
  });

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 p-2 sm:p-4 select-none" dir="rtl">
      {/* Top Banner: Mode & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-2xl shadow-inner">
            {vehicleMode === 'horse' ? '🐎' : '🏎️'}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{vehicleMode === 'horse' ? 'مضمار سباق الخيول الأصيلة' : 'حلبة سباق السيارات الخارقة'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                Classroom Grand Prix
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              كل إجابة صحيحة تمنح الفريق انطلاقة نارية نحو خط النهاية!
            </p>
          </div>
        </div>

        {/* Vehicle Switcher & Actions */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setVehicleMode('horse');
                soundEngine.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                vehicleMode === 'horse'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>🐎</span>
              <span>خيول</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVehicleMode('car');
                soundEngine.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                vehicleMode === 'car'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>🏎️</span>
              <span>سيارات</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onFinish}
            className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-all"
          >
            إنهاء السباق
          </button>
        </div>
      </div>

      {/* RACE TRACK VIEWPORT */}
      <div className="bg-slate-950 rounded-3xl p-4 sm:p-6 border-4 border-slate-800 shadow-2xl relative overflow-hidden text-white">
        {/* Track header distance labels */}
        <div className="flex justify-between items-center px-12 text-[10px] sm:text-xs font-mono text-slate-400 mb-2 border-b border-slate-800 pb-1">
          <span>🚩 نقطة الانطلاق (0%)</span>
          <span>⚡ 25%</span>
          <span>🔥 50% نصف المضمار</span>
          <span>🚀 75%</span>
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <Flag className="w-3.5 h-3.5" /> خط النهاية (100%)
          </span>
        </div>

        {/* Lanes Container */}
        <div className="space-y-3 relative">
          {/* Finish Line Ribbon */}
          <div className="absolute top-0 bottom-0 left-[2%] w-4 bg-[repeating-linear-gradient(45deg,#000,#000_6px,#fff_6px,#fff_12px)] opacity-60 z-0 pointer-events-none rounded" />

          {activeTeams.map((team, idx) => {
            const prog = progresses[team.id] || 0;
            const isTurn = currentTeam.id === team.id;
            const isNitro = nitroTeamId === team.id;

            return (
              <div
                key={team.id}
                className={`relative p-2.5 rounded-2xl transition-all duration-300 ${
                  isTurn
                    ? 'bg-slate-900/90 ring-2 ring-amber-400 shadow-lg shadow-amber-400/10'
                    : 'bg-slate-900/40 hover:bg-slate-900/60'
                } border border-slate-800`}
              >
                {/* Lane Info Header */}
                <div className="flex items-center justify-between text-xs mb-1.5 px-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-black text-slate-200">{team.name}</span>
                    {isTurn && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold animate-pulse">
                        الدور الحالي
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-amber-400 font-bold">{team.score} نقطة</span>
                    <span className="text-[11px] font-mono text-slate-400">{Math.round(prog)}%</span>
                    
                    {/* Manual teacher nudge buttons */}
                    <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleManualNudge(team.id, 10)}
                        title="تقديم يدوي +10%"
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleManualNudge(team.id, -10)}
                        title="تأخير يدوي -10%"
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                {/* Track Lane Bar */}
                <div className="relative h-12 sm:h-14 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center">
                  {/* Road asphalt / turf lines */}
                  <div className="absolute inset-0 flex items-center justify-around opacity-20 pointer-events-none">
                    <div className="h-0.5 w-8 bg-white" />
                    <div className="h-0.5 w-8 bg-white" />
                    <div className="h-0.5 w-8 bg-white" />
                    <div className="h-0.5 w-8 bg-white" />
                  </div>

                  {/* Progress Fill Indicator */}
                  <div
                    className="absolute top-0 bottom-0 right-0 opacity-20 transition-all duration-700 ease-out"
                    style={{
                      width: `${prog}%`,
                      backgroundColor: team.color,
                    }}
                  />

                  {/* Animated Racer Token */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out z-10 flex items-center"
                    style={{
                      right: `calc(${prog}% - 24px)`,
                    }}
                  >
                    {/* Nitro Flame */}
                    {isNitro && (
                      <div className="flex items-center gap-0.5 -mr-4 text-orange-500 animate-bounce">
                        <Flame className="w-5 h-5 fill-orange-500" />
                      </div>
                    )}

                    {/* Racer Icon Circle */}
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shadow-xl flex items-center justify-center text-xl transition-transform ${
                        isNitro ? 'scale-125' : 'hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: team.color,
                        boxShadow: `0 0 15px ${team.color}66`,
                      }}
                    >
                      <span className="transform -scale-x-100">
                        {vehicleMode === 'horse' ? '🐎' : '🏎️'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WINNER PODIUM MODAL */}
      {winner && (
        <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 text-center text-white space-y-4 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-3xl bg-amber-500 text-white flex items-center justify-center mx-auto text-4xl shadow-xl shadow-amber-500/30 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              بطل السباق الخارق!
            </span>
            <h3 className="text-2xl sm:text-3xl font-black mt-2 text-amber-300">
              مبروك لفريق {winner.name} الفوز بالمركز الأول! 🏆
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              أنهى السباق برصيد <strong className="text-amber-400 font-mono text-base">{winner.score}</strong> نقطة وتفوق باهر!
            </p>
          </div>

          {/* Ranking list */}
          <div className="max-w-md mx-auto grid grid-cols-1 gap-2 pt-2">
            {rankedTeams.map((t, idx) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-900' : 'bg-amber-800 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <span>{t.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">{Math.round(progresses[t.id] || 0)}% مضمار</span>
                  <span className="text-amber-400 font-mono">{t.score} نقطة</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                const init: { [k: string]: number } = {};
                activeTeams.forEach(t => { init[t.id] = 0; });
                setProgresses(init);
                setWinner(null);
                soundEngine.playClick();
              }}
              className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> جولة سباق جديدة
            </button>
            <button
              type="button"
              onClick={onFinish}
              className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-all"
            >
              إنهاء النشاط وحفظ النتيجة
            </button>
          </div>
        </div>
      )}

      {/* QUESTION & INTERACTION CARD */}
      {!winner && currentQuestion && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-5">
          {/* Turn header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full ring-4 ring-offset-2 dark:ring-offset-slate-900"
                style={{ backgroundColor: currentTeam.color }}
              />
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">سؤال مخصص للفريق:</span>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{currentTeam.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                    +{currentQuestion.points || 10} نقطة
                  </span>
                </h4>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              سؤال {currentQuestionIndex + 1} من {questions.length}
            </div>
          </div>

          {/* Question Display Component */}
          <QuestionDisplay
            question={currentQuestion}
            onSelectAnswer={handleSelectAnswer}
            disabled={isAnswered}
            selectedAnswer={selectedAnswer}
            isAnswerRevealed={isAnswered}
            timerDuration={timerDuration}
            onTimeUp={() => {
              if (!isAnswered) {
                handleSelectAnswer('__TIMEOUT__');
              }
            }}
          />

          {/* Feedback & Next Button */}
          {feedbackMessage && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{feedbackMessage}</span>
              </div>

              <button
                type="button"
                onClick={handleNextTurn}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 shrink-0"
              >
                <span>السؤال التالي لفريق {activeTeams[(currentTeamIndex + 1) % activeTeams.length].name}</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

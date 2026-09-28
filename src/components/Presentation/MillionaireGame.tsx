import React, { useState, useEffect } from 'react';
import { Question } from '../../types';
import { soundEngine } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Trophy, HelpCircle, Users, RefreshCw, Award, 
  CheckCircle, XCircle, ChevronLeft, ShieldCheck, 
  Sparkles, DollarSign, Volume2
} from 'lucide-react';

interface MillionaireGameProps {
  questions: Question[];
  onAwardPoints: (points: number, isCorrect: boolean) => void;
  onFinish: () => void;
  timerDuration?: number;
}

const LADDER_VALUES = [
  100, 200, 300, 500, 1000, 
  2000, 4000, 8000, 16000, 32000, 
  64000, 125000, 250000, 500000, 1000000
];

const SAFE_HAVENS = [4, 9]; // indices for 1000 and 32000

export const MillionaireGame: React.FC<MillionaireGameProps> = ({
  questions,
  onAwardPoints,
  onFinish,
  timerDuration = 30,
}) => {
  const [currentLevel, setCurrentLevel] = useState(0); // 0 to 14
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Lifelines state
  const [lifeline5050Used, setLifeline5050Used] = useState(false);
  const [lifelineAudienceUsed, setLifelineAudienceUsed] = useState(false);
  const [lifelineSkipUsed, setLifelineSkipUsed] = useState(false);

  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceVotes, setAudienceVotes] = useState<{ [opt: string]: number }>({});

  // Answer state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerStage, setAnswerStage] = useState<'idle' | 'suspense' | 'revealed'>('idle');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [bankedPoints, setBankedPoints] = useState(0);

  // Select next question
  const pickQuestion = (excludeIds: string[] = []): Question | null => {
    const available = questions.filter(q => !excludeIds.includes(q.id));
    if (available.length === 0) {
      return questions[Math.floor(Math.random() * questions.length)] || null;
    }
    return available[Math.floor(Math.random() * available.length)];
  };

  useEffect(() => {
    if (questions.length > 0 && !currentQuestion) {
      const q = pickQuestion([]);
      if (q) {
        setCurrentQuestion(q);
        setUsedQuestionIds([q.id]);
      }
    }
  }, [questions]);

  // Options normalization
  const getOptions = (q: Question): string[] => {
    if (q.type === 'true_false') {
      return ['صح (True)', 'خطأ (False)'];
    }
    if (q.options && q.options.length > 0) {
      return q.options;
    }
    // Fallback if question options are empty
    return [q.correctAnswer, 'خيار بديل 1', 'خيار بديل 2', 'خيار بديل 3'];
  };

  const handleSelectOption = (opt: string) => {
    if (answerStage !== 'idle' || gameOver || gameWon) return;

    setSelectedOption(opt);
    setAnswerStage('suspense');
    soundEngine.playTension();

    // Suspense delay
    setTimeout(() => {
      if (!currentQuestion) return;

      const normAns = opt.trim().toLowerCase();
      const normCorrect = currentQuestion.correctAnswer.trim().toLowerCase();
      const isRight = normAns === normCorrect || 
        (normCorrect === 'true' && normAns.includes('صح')) ||
        (normCorrect === 'false' && normAns.includes('خطأ'));

      setIsCorrect(isRight);
      setAnswerStage('revealed');

      const prize = LADDER_VALUES[Math.min(currentLevel, LADDER_VALUES.length - 1)];

      if (isRight) {
        soundEngine.playCorrect();
        onAwardPoints(prize, true);

        if (currentLevel >= LADDER_VALUES.length - 1) {
          // Reached 1 Million!
          setGameWon(true);
          setBankedPoints(1000000);
          soundEngine.playVictory();
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
        }
      } else {
        soundEngine.playWrong();
        onAwardPoints(0, false);

        // Fallback to last safe haven
        let safeHavenPrize = 0;
        if (currentLevel >= SAFE_HAVENS[1]) {
          safeHavenPrize = LADDER_VALUES[SAFE_HAVENS[1]];
        } else if (currentLevel >= SAFE_HAVENS[0]) {
          safeHavenPrize = LADDER_VALUES[SAFE_HAVENS[0]];
        }
        setBankedPoints(safeHavenPrize);
        setGameOver(true);
      }
    }, 1800);
  };

  // Next level question
  const handleNextLevel = () => {
    const nextLvl = currentLevel + 1;
    setCurrentLevel(nextLvl);
    setSelectedOption(null);
    setAnswerStage('idle');
    setIsCorrect(null);
    setHiddenOptions([]);

    const nextQ = pickQuestion(usedQuestionIds);
    if (nextQ) {
      setCurrentQuestion(nextQ);
      setUsedQuestionIds(prev => [...prev, nextQ.id]);
    }
    soundEngine.playClick();
  };

  // Lifeline 50:50
  const useLifeline5050 = () => {
    if (lifeline5050Used || !currentQuestion || answerStage !== 'idle') return;
    setLifeline5050Used(true);
    soundEngine.playLifeline();

    const options = getOptions(currentQuestion);
    const correct = currentQuestion.correctAnswer.trim().toLowerCase();

    const wrongOpts = options.filter(opt => {
      const norm = opt.trim().toLowerCase();
      return norm !== correct && !(correct === 'true' && norm.includes('صح')) && !(correct === 'false' && norm.includes('خطأ'));
    });

    // Pick 2 wrong options to hide
    const shuffled = [...wrongOpts].sort(() => 0.5 - Math.random());
    setHiddenOptions(shuffled.slice(0, 2));
  };

  // Lifeline Ask Audience
  const useLifelineAudience = () => {
    if (lifelineAudienceUsed || !currentQuestion || answerStage !== 'idle') return;
    setLifelineAudienceUsed(true);
    soundEngine.playLifeline();

    const options = getOptions(currentQuestion);
    const correct = currentQuestion.correctAnswer.trim().toLowerCase();

    // High percentage for correct answer (60-80%)
    const correctPercent = Math.floor(Math.random() * 20) + 60;
    const remaining = 100 - correctPercent;
    const otherOpts = options.filter(o => o.toLowerCase() !== correct);
    
    const votes: { [k: string]: number } = {};
    let allocated = 0;

    options.forEach(opt => {
      const isRight = opt.trim().toLowerCase() === correct || 
        (correct === 'true' && opt.includes('صح')) ||
        (correct === 'false' && opt.includes('خطأ'));

      if (isRight) {
        votes[opt] = correctPercent;
      } else {
        const share = Math.floor(remaining / Math.max(1, otherOpts.length));
        votes[opt] = share;
        allocated += share;
      }
    });

    setAudienceVotes(votes);
    setShowAudienceModal(true);
  };

  // Lifeline Skip Question
  const useLifelineSkip = () => {
    if (lifelineSkipUsed || answerStage !== 'idle') return;
    setLifelineSkipUsed(true);
    soundEngine.playLifeline();

    const nextQ = pickQuestion(usedQuestionIds);
    if (nextQ) {
      setCurrentQuestion(nextQ);
      setUsedQuestionIds(prev => [...prev, nextQ.id]);
      setHiddenOptions([]);
      setSelectedOption(null);
    }
  };

  const handleWalkAway = () => {
    const currentPrize = currentLevel > 0 ? LADDER_VALUES[currentLevel - 1] : 0;
    setBankedPoints(currentPrize);
    setGameOver(true);
    soundEngine.playVictory();
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 p-2 sm:p-4 select-none text-slate-100" dir="rtl">
      {/* Top Bar: Lifelines & Game Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-amber-500/30 p-4 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20">
            🏆
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>من سيربح المليون (سلم النجاة)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Classroom Millionaire
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              الجائزة الحالية: <strong className="text-amber-400 font-mono text-sm">{LADDER_VALUES[currentLevel].toLocaleString('en-US')}</strong> نقطة
            </p>
          </div>
        </div>

        {/* 3 Iconic Lifelines */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 ml-1">وسائل المساعدة:</span>

          {/* 50:50 */}
          <button
            type="button"
            onClick={useLifeline5050}
            disabled={lifeline5050Used || answerStage !== 'idle'}
            title="حذف إجابتين (50:50)"
            className={`w-11 h-11 rounded-2xl font-black text-xs flex items-center justify-center transition-all cursor-pointer border ${
              lifeline5050Used
                ? 'bg-slate-800 text-slate-600 border-slate-700 opacity-40 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-600/30 hover:scale-105'
            }`}
          >
            50:50
          </button>

          {/* Ask Audience */}
          <button
            type="button"
            onClick={useLifelineAudience}
            disabled={lifelineAudienceUsed || answerStage !== 'idle'}
            title="رأي وتصويت الجمهور / طلاب الصف"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer border ${
              lifelineAudienceUsed
                ? 'bg-slate-800 text-slate-600 border-slate-700 opacity-40 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-600/30 hover:scale-105'
            }`}
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Skip question */}
          <button
            type="button"
            onClick={useLifelineSkip}
            disabled={lifelineSkipUsed || answerStage !== 'idle'}
            title="تخطي واستبدال السؤال"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer border ${
              lifelineSkipUsed
                ? 'bg-slate-800 text-slate-600 border-slate-700 opacity-40 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30 hover:scale-105'
            }`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Walk away button */}
          {currentLevel > 0 && answerStage === 'idle' && !gameOver && (
            <button
              type="button"
              onClick={handleWalkAway}
              className="px-3.5 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer mr-2"
            >
              انسحاب بالرصيد ({LADDER_VALUES[currentLevel - 1].toLocaleString('en-US')})
            </button>
          )}

          <button
            type="button"
            onClick={onFinish}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
          >
            خروج
          </button>
        </div>
      </div>

      {/* MAIN GAME AREA: LADDER + QUESTION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left/Side: Prize Ladder */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col justify-between order-2 lg:order-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> سلم الجوائز والمكافآت
            </span>
            <span className="text-[10px] text-slate-500">15 مرحلة</span>
          </div>

          <div className="flex flex-col-reverse gap-1 font-mono text-xs">
            {LADDER_VALUES.map((val, idx) => {
              const isCurrent = idx === currentLevel;
              const isPassed = idx < currentLevel;
              const isMilestone = SAFE_HAVENS.includes(idx) || idx === 14;

              return (
                <div
                  key={val}
                  className={`flex items-center justify-between px-3 py-1 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-[1.03]'
                      : isPassed
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold'
                      : isMilestone
                      ? 'bg-amber-950/30 text-amber-400 font-bold border border-amber-500/20'
                      : 'text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] opacity-70 w-5">{idx + 1}</span>
                    {isMilestone && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span>{val.toLocaleString('en-US')} 💎</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center/Right: Active Question & Interactive Options */}
        <div className="lg:col-span-3 bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between order-1 lg:order-2 min-h-[460px]">
          {/* Question Box */}
          {currentQuestion && !gameOver && !gameWon && (
            <div className="space-y-6">
              {/* Question Text in Gold Hexagon Banner */}
              <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-amber-500/40 shadow-xl text-center space-y-3">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 inline-block">
                  السؤال رقم {currentLevel + 1} على {LADDER_VALUES[currentLevel].toLocaleString('en-US')} نقطة
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
                  {currentQuestion.text}
                </h3>
                {currentQuestion.codeSnippet && (
                  <pre className="mt-3 p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs sm:text-sm text-emerald-400 text-left overflow-x-auto" dir="ltr">
                    {currentQuestion.codeSnippet}
                  </pre>
                )}
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                {getOptions(currentQuestion).map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx); // A, B, C, D
                  const isHidden = hiddenOptions.includes(opt);
                  const isSelected = selectedOption === opt;
                  const isCorrectAnswer = opt.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() ||
                    (currentQuestion.correctAnswer.toLowerCase() === 'true' && opt.includes('صح')) ||
                    (currentQuestion.correctAnswer.toLowerCase() === 'false' && opt.includes('خطأ'));

                  let btnStyle = 'bg-slate-900/90 text-slate-100 border-slate-700 hover:border-amber-400 hover:bg-slate-800';

                  if (answerStage === 'suspense' && isSelected) {
                    btnStyle = 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse font-black shadow-lg shadow-amber-500/30';
                  } else if (answerStage === 'revealed') {
                    if (isCorrectAnswer) {
                      btnStyle = 'bg-emerald-600 text-white border-emerald-400 font-black shadow-lg shadow-emerald-600/30 animate-bounce';
                    } else if (isSelected && !isCorrectAnswer) {
                      btnStyle = 'bg-rose-600 text-white border-rose-400 font-black';
                    }
                  }

                  if (isHidden) {
                    return (
                      <div
                        key={opt}
                        className="h-16 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 opacity-20 pointer-events-none"
                      />
                    );
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={answerStage !== 'idle'}
                      onClick={() => handleSelectOption(opt)}
                      className={`min-h-[64px] p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-500/30">
                          {letter}
                        </span>
                        <span className="text-sm sm:text-base font-bold">{opt}</span>
                      </div>
                      {answerStage === 'revealed' && isCorrectAnswer && (
                        <CheckCircle className="w-6 h-6 text-white shrink-0" />
                      )}
                      {answerStage === 'revealed' && isSelected && !isCorrectAnswer && (
                        <XCircle className="w-6 h-6 text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Next Question Button after reveal */}
              {answerStage === 'revealed' && isCorrect && !gameWon && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={handleNextLevel}
                    className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 animate-bounce"
                  >
                    <span>الصعود إلى السؤال القادم ({LADDER_VALUES[currentLevel + 1]?.toLocaleString('en-US') || 0} نقطة)</span>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GAME WON SCREEN (MILLIONAIRE!) */}
          {gameWon && (
            <div className="text-center py-10 space-y-5 animate-in zoom-in-95">
              <div className="w-24 h-24 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto text-5xl shadow-2xl shadow-amber-500/50 animate-bounce">
                👑
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-amber-300">
                ألف مبروك! فزتم بالمليون نقطة! 🏆
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                إنجاز تاريخي مبهر في الفصل الدراسي! تم اجتياز جميع الـ 15 سؤالاً الصعبة بنجاح ساحق.
              </p>
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentLevel(0);
                    setGameOver(false);
                    setGameWon(false);
                    setLifeline5050Used(false);
                    setLifelineAudienceUsed(false);
                    setLifelineSkipUsed(false);
                    setAnswerStage('idle');
                    setSelectedOption(null);
                    setHiddenOptions([]);
                    const q = pickQuestion([]);
                    if (q) setCurrentQuestion(q);
                  }}
                  className="px-6 py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg hover:bg-amber-400 transition-all"
                >
                  بدء جولة مليون جديدة
                </button>
                <button
                  type="button"
                  onClick={onFinish}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  إنهاء وتوثيق النتيجة
                </button>
              </div>
            </div>
          )}

          {/* GAME OVER SCREEN */}
          {gameOver && (
            <div className="text-center py-10 space-y-5 animate-in fade-in">
              <div className="w-20 h-20 rounded-3xl bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto text-3xl">
                <XCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white">انتهت جولة التحدي</h3>
              <p className="text-sm text-slate-300">
                الرصيد النهائي المضمون الذي حصلتم عليه: <strong className="text-amber-400 font-mono text-lg">{bankedPoints.toLocaleString('en-US')}</strong> نقطة
              </p>
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentLevel(0);
                    setGameOver(false);
                    setGameWon(false);
                    setLifeline5050Used(false);
                    setLifelineAudienceUsed(false);
                    setLifelineSkipUsed(false);
                    setAnswerStage('idle');
                    setSelectedOption(null);
                    setHiddenOptions([]);
                    const q = pickQuestion([]);
                    if (q) setCurrentQuestion(q);
                  }}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg transition-all"
                >
                  محاولة جديدة من البداية
                </button>
                <button
                  type="button"
                  onClick={onFinish}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  إنهاء النشاط
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audience Poll Modal */}
      {showAudienceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">نتائج تصويت طلاب الفصل (الجمهور)</h3>
            <div className="space-y-2 pt-2">
              {Object.entries(audienceVotes).map(([opt, pct]) => (
                <div key={opt} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="truncate max-w-[240px] text-slate-200">{opt}</span>
                    <span className="text-cyan-400 font-mono">{pct}%</span>
                  </div>
                  <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-700 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAudienceModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
            >
              إغلاق والعودة للسؤال
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

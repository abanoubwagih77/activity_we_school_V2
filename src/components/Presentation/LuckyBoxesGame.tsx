import React, { useState } from 'react';
import { Question } from '../../types';
import { soundEngine } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Package, Sparkles, Shield, Zap, Gift, 
  Crown, Star, CheckCircle, XCircle, ChevronLeft, 
  RotateCcw, Trophy, Award, Lock, Unlock
} from 'lucide-react';
import { QuestionDisplay } from './QuestionDisplay';

interface LuckyBoxesGameProps {
  questions: Question[];
  onAwardPoints: (points: number, isCorrect: boolean) => void;
  onFinish: () => void;
  timerDuration?: number;
}

type MysteryModifier = 'x2' | 'shield' | 'instant50' | 'golden_chest' | 'speed_boost' | 'lucky_star';

interface BoxState {
  id: number;
  question: Question;
  modifier: MysteryModifier;
  status: 'closed' | 'opened_correct' | 'opened_wrong';
}

const MODIFIER_DETAILS: Record<MysteryModifier, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  x2: { label: 'مضاعفة النقاط x2', icon: <Sparkles className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/20 border-amber-500/40', desc: 'كل نقطة تحصل عليها في هذا السؤال ستحسب بالضعف!' },
  shield: { label: 'درع الحماية الذهبي 🛡️', icon: <Shield className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/20 border-blue-500/40', desc: 'إذا أخطأت في الإجابة، لن يتم خصم أي نقاط منك!' },
  instant50: { label: 'هدية كنز فورية (+50)', icon: <Gift className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40', desc: 'حصلت على 50 نقطة هدية مجانية مضافة لرصيدك فوراً!' },
  golden_chest: { label: 'الكنز الملكي الأكبر (+100)', icon: <Crown className="w-4 h-4" />, color: 'text-purple-400 bg-purple-500/20 border-purple-500/40', desc: 'سؤال الكنز الملكي! إجابة صحيحة تمنحك 100 نقطة إضافية!' },
  speed_boost: { label: 'بونس السرعة الخارقة ⚡', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40', desc: 'بونس سرعة إضافي يضاعف حماس الفريق!' },
  lucky_star: { label: 'نجمة الحظ السعيدة 🌟', icon: <Star className="w-4 h-4" />, color: 'text-rose-400 bg-rose-500/20 border-rose-500/40', desc: 'نجمة الحظ تجلب لك +30 نقطة تشجيعية عند الإجابة!' },
};

export const LuckyBoxesGame: React.FC<LuckyBoxesGameProps> = ({
  questions,
  onAwardPoints,
  onFinish,
  timerDuration = 25,
}) => {
  const [boxes, setBoxes] = useState<BoxState[]>(() => {
    const modifiers: MysteryModifier[] = ['x2', 'shield', 'instant50', 'golden_chest', 'speed_boost', 'lucky_star'];
    const count = Math.max(8, Math.min(18, questions.length));
    
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      question: questions[i % questions.length],
      modifier: modifiers[i % modifiers.length],
      status: 'closed',
    }));
  });

  const [activeBox, setActiveBox] = useState<BoxState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [totalGamePoints, setTotalGamePoints] = useState(0);

  const closedCount = boxes.filter(b => b.status === 'closed').length;

  const handleOpenBox = (box: BoxState) => {
    if (box.status !== 'closed' || activeBox) return;

    soundEngine.playChestOpen();
    setActiveBox(box);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedback(null);

    // If instant gift, award immediately
    if (box.modifier === 'instant50') {
      setTotalGamePoints(prev => prev + 50);
      onAwardPoints(50, true);
    }
  };

  const handleAnswer = (ans: string) => {
    if (!activeBox || isAnswered) return;

    setSelectedAnswer(ans);
    setIsAnswered(true);

    const right = ans.trim().toLowerCase() === activeBox.question.correctAnswer.trim().toLowerCase();
    setIsCorrect(right);

    let earned = activeBox.question.points || 10;

    if (right) {
      soundEngine.playCorrect();

      // Apply modifiers
      if (activeBox.modifier === 'x2') earned *= 2;
      if (activeBox.modifier === 'golden_chest') earned += 100;
      if (activeBox.modifier === 'lucky_star') earned += 30;
      if (activeBox.modifier === 'speed_boost') earned += 20;

      setTotalGamePoints(prev => prev + earned);
      onAwardPoints(earned, true);
      confetti({ particleCount: 80, spread: 70 });
      setFeedback(`إجابة صحيحة خارقة! تم فتح الصندوق بنجاح وحصدت +${earned} نقطة 🎁`);

      setBoxes(prev => prev.map(b => b.id === activeBox.id ? { ...b, status: 'opened_correct' } : b));
    } else {
      soundEngine.playWrong();
      if (activeBox.modifier === 'shield') {
        setFeedback('إجابة غير صحيحة، ولكن درع الحماية الذهبي 🛡️ حماك من خصم أي نقاط!');
        onAwardPoints(0, false);
      } else {
        const penalty = 5;
        setTotalGamePoints(prev => Math.max(0, prev - penalty));
        onAwardPoints(-penalty, false);
        setFeedback(`إجابة خاطئة! تم خصم ${penalty} نقاط وأغلق سر هذا الصندوق.`);
      }
      setBoxes(prev => prev.map(b => b.id === activeBox.id ? { ...b, status: 'opened_wrong' } : b));
    }
  };

  const handleCloseActiveBox = () => {
    setActiveBox(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedback(null);
    soundEngine.playClick();
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 p-2 sm:p-4 select-none" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20">
            📦
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>فتح الصناديق الغامضة (صندوق الحظ)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                Mystery Lucky Chests
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              اختر صندوقاً غامضاً، اكتشف مفاجأة الحظ المخفية وأجب عن السؤال لتفوز بالكنز!
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-bold text-amber-800 dark:text-amber-300">
            الصناديق المتبقية: <strong className="font-mono text-sm">{closedCount}</strong>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            إجمالي النقاط: <strong className="font-mono text-sm">{totalGamePoints}</strong>
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
          >
            إنهاء النشاط
          </button>
        </div>
      </div>

      {/* BOXES GRID VIEW */}
      {!activeBox && (
        <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 border-b border-slate-800 pb-3">
            <span>اضغط على أي صندوق لفتحه والكشف عن المفاجأة والسؤال:</span>
            <span className="font-mono text-amber-400 font-bold">{boxes.length} صندوق في الساحة</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {boxes.map((box) => {
              const isClosed = box.status === 'closed';
              const isCorrectOpened = box.status === 'opened_correct';
              const isWrongOpened = box.status === 'opened_wrong';

              return (
                <button
                  key={box.id}
                  type="button"
                  disabled={!isClosed}
                  onClick={() => handleOpenBox(box)}
                  className={`group relative h-36 rounded-3xl border-2 p-3 flex flex-col items-center justify-between transition-all duration-300 ${
                    isClosed
                      ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-amber-500/40 hover:border-amber-400 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/20 cursor-pointer'
                      : isCorrectOpened
                      ? 'bg-emerald-950/40 border-emerald-800/60 opacity-60 cursor-default'
                      : 'bg-rose-950/30 border-rose-900/40 opacity-40 cursor-default'
                  }`}
                >
                  {/* Top Badge (Box Number) */}
                  <div className="w-full flex justify-between items-center text-[10px] font-mono">
                    <span className="w-6 h-6 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center font-bold">
                      #{box.id}
                    </span>
                    {isClosed ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:animate-bounce" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>

                  {/* 3D Chest Visual */}
                  <div className="my-auto text-4xl sm:text-5xl transition-transform group-hover:scale-110">
                    {isClosed ? '🎁' : isCorrectOpened ? '💎' : '💨'}
                  </div>

                  {/* Status footer */}
                  <div className="text-[11px] font-bold text-center">
                    {isClosed && (
                      <span className="text-amber-300 font-bold group-hover:underline">
                        صندوق الحظ #{box.id}
                      </span>
                    )}
                    {isCorrectOpened && (
                      <span className="text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" /> تم كشف الكنز
                      </span>
                    )}
                    {isWrongOpened && (
                      <span className="text-rose-400 flex items-center justify-center gap-1">
                        <XCircle className="w-3 h-3" /> تم استهلاكه
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE OPENED BOX MODAL / VIEW */}
      {activeBox && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/50 p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
          {/* Mystery Modifier Reveal Banner */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${MODIFIER_DETAILS[activeBox.modifier].color}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-sm">
                {MODIFIER_DETAILS[activeBox.modifier].icon}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                  مفاجأة الصندوق الغامض رقم #{activeBox.id}
                </span>
                <h4 className="text-sm sm:text-base font-black">
                  {MODIFIER_DETAILS[activeBox.modifier].label}
                </h4>
              </div>
            </div>
            <p className="text-xs max-w-sm">
              {MODIFIER_DETAILS[activeBox.modifier].desc}
            </p>
          </div>

          {/* Question Display */}
          <QuestionDisplay
            question={activeBox.question}
            onSelectAnswer={handleAnswer}
            disabled={isAnswered}
            selectedAnswer={selectedAnswer}
            isAnswerRevealed={isAnswered}
            timerDuration={timerDuration}
            onTimeUp={() => {
              if (!isAnswered) {
                handleAnswer('__TIMEOUT__');
              }
            }}
          />

          {/* Feedback & Return to Grid */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-bold animate-in fade-in ${
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
                <span>{feedback}</span>
              </div>

              <button
                type="button"
                onClick={handleCloseActiveBox}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <span>العودة لساحة الصناديق</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

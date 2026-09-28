import React, { useState, useEffect } from 'react';
import { Question } from '../../types';
import { soundEngine } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Crosshair, Target, Zap, Trophy, CheckCircle, 
  XCircle, ChevronLeft, RotateCcw, Flame, Award
} from 'lucide-react';
import { QuestionDisplay } from './QuestionDisplay';

interface TargetShootGameProps {
  questions: Question[];
  onAwardPoints: (points: number, isCorrect: boolean) => void;
  onFinish: () => void;
  timerDuration?: number;
}

export const TargetShootGame: React.FC<TargetShootGameProps> = ({
  questions,
  onAwardPoints,
  onFinish,
  timerDuration = 20,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Shooting animation state
  const [isFiring, setIsFiring] = useState(false);
  const [hitRing, setHitRing] = useState<'bullseye' | 'inner' | 'middle' | 'outer' | 'miss' | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [accuracyHits, setAccuracyHits] = useState({ hits: 0, total: 0 });

  const currentQuestion = questions[currentIdx % Math.max(1, questions.length)];

  const handleShootAnswer = (ans: string) => {
    if (isAnswered || isFiring || !currentQuestion) return;

    setSelectedAnswer(ans);
    setIsFiring(true);
    soundEngine.playShoot();

    const correct = ans.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

    // Trigger hit or miss animation after trajectory delay
    setTimeout(() => {
      setIsFiring(false);
      setIsAnswered(true);
      setIsCorrect(correct);

      setAccuracyHits(prev => ({
        hits: prev.hits + (correct ? 1 : 0),
        total: prev.total + 1,
      }));

      if (correct) {
        soundEngine.playBullseye();
        const newStreak = streak + 1;
        setStreak(newStreak);

        // Calculate precision bonus based on streak
        const streakMultiplier = newStreak >= 3 ? 2 : newStreak >= 2 ? 1.5 : 1;
        const ringHit = newStreak >= 3 ? 'bullseye' : 'inner';
        setHitRing(ringHit);

        const basePoints = currentQuestion.points || 10;
        const earned = Math.round(basePoints * streakMultiplier);

        setTotalScore(prev => prev + earned);
        onAwardPoints(earned, true);

        if (newStreak >= 2) {
          confetti({ particleCount: 70, spread: 60 });
        }

        setFeedback(`إصابة الهدف في المنتصف بدقة متناهية (Bullseye 🎯)! +${earned} نقطة ${newStreak >= 2 ? `(كومبو ضربات متتالية x${streakMultiplier} 🔥)` : ''}`);
      } else {
        soundEngine.playWrong();
        setStreak(0);
        setHitRing('miss');
        const penalty = 5;
        setTotalScore(prev => Math.max(0, prev - penalty));
        onAwardPoints(-penalty, false);
        setFeedback(`أخطأ السهم الهدف! تم خصم ${penalty} نقاط وانكسرت سلسلة الكومبو.`);
      }
    }, 600);
  };

  const handleNextTarget = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setHitRing(null);
    setFeedback(null);
    setCurrentIdx(prev => (prev + 1) % questions.length);
    soundEngine.playClick();
  };

  const accuracyPercent = accuracyHits.total > 0
    ? Math.round((accuracyHits.hits / accuracyHits.total) * 100)
    : 100;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 p-2 sm:p-4 select-none" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-black text-2xl shadow-inner">
            🎯
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>تصويب الهدف وضرب الأهداف (Target Shoot Out)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                Precision Archery Range
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              صوب نحو الإجابة الصحيحة لتطلق سهم الدقة نحو منتصف الهدف وتضاعف الكومبو!
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-xs font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>الكومبو: <strong className="font-mono text-sm">{streak}</strong> متتالي</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            دقة الرماية: <strong className="font-mono text-sm">{accuracyPercent}%</strong>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            النقاط: <strong className="font-mono text-sm">{totalScore}</strong>
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

      {/* TARGET RANGE DISPLAY */}
      <div className="bg-slate-950 rounded-3xl p-6 border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-around gap-6">
        {/* Archery Target Graphic */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center shadow-2xl shrink-0">
          {/* Outer Ring - White/Slate */}
          <div className="absolute inset-0 rounded-full bg-slate-200 border-4 border-slate-400 flex items-center justify-center">
            {/* Black Ring */}
            <div className="w-[78%] h-[78%] rounded-full bg-slate-900 border-4 border-slate-700 flex items-center justify-center">
              {/* Blue Ring */}
              <div className="w-[74%] h-[74%] rounded-full bg-cyan-600 border-4 border-cyan-400 flex items-center justify-center">
                {/* Red Ring */}
                <div className="w-[70%] h-[70%] rounded-full bg-rose-600 border-4 border-rose-400 flex items-center justify-center">
                  {/* Yellow Gold Bullseye */}
                  <div className={`w-[60%] h-[60%] rounded-full bg-amber-400 border-2 border-amber-300 flex items-center justify-center transition-all ${
                    hitRing === 'bullseye' ? 'scale-125 ring-8 ring-amber-300 animate-ping' : ''
                  }`}>
                    <div className="w-3 h-3 rounded-full bg-rose-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Crosshair Overlay */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-transform ${
            isFiring ? 'scale-90 text-rose-500' : 'text-slate-400 opacity-60'
          }`}>
            <Crosshair className="w-24 h-24 stroke-[1.5]" />
          </div>

          {/* Hit Sparkles or Arrow Impact */}
          {hitRing && hitRing !== 'miss' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <span className="text-4xl animate-bounce">🎯💥</span>
            </div>
          )}

          {hitRing === 'miss' && (
            <div className="absolute -top-3 -right-3 z-20 pointer-events-none text-rose-500 font-black text-sm bg-rose-950/80 px-2 py-1 rounded-lg border border-rose-800">
              طاشت الرمية! 💨
            </div>
          )}
        </div>

        {/* Range Information & Motivation */}
        <div className="text-center md:text-right text-white space-y-2 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
            <Target className="w-3.5 h-3.5" /> ميدان الرماية التفاعلي المباشر
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            صوب بدقة نحو الهدف!
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            الرميات المتتالية الصحيحة تشعل نار الكومبو وتمنحك مضاعف نقاط استثنائي (x1.5 و x2)! احذر من الخطأ حتى لا تفقد تصدرك.
          </p>
        </div>
      </div>

      {/* QUESTION INTERACTIVE CARD */}
      {currentQuestion && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>الهدف رقم {currentIdx + 1} من {questions.length}</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              +{currentQuestion.points || 10} نقطة إصابة
            </span>
          </div>

          {/* Question Display */}
          <QuestionDisplay
            question={currentQuestion}
            onSelectAnswer={handleShootAnswer}
            disabled={isAnswered || isFiring}
            selectedAnswer={selectedAnswer}
            isAnswerRevealed={isAnswered}
            timerDuration={timerDuration}
            onTimeUp={() => {
              if (!isAnswered && !isFiring) {
                handleShootAnswer('__TIMEOUT__');
              }
            }}
          />

          {/* Feedback & Next Button */}
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
                onClick={handleNextTarget}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <span>تصويب الهدف التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

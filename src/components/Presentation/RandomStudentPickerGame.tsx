import React, { useState, useEffect, useRef } from 'react';
import { ClassroomGroup, Question } from '../../types';
import { soundEngine } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Users, Shuffle, RotateCcw, UserX, Award, Sparkles, Check, HelpCircle, ArrowLeft, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionDisplay } from './QuestionDisplay';

interface RandomStudentPickerGameProps {
  classes: ClassroomGroup[];
  defaultClassId?: string;
  questions?: Question[];
  timerDuration?: number;
  onAwardPoints?: (points: number, isCorrect: boolean) => void;
}

export const RandomStudentPickerGame: React.FC<RandomStudentPickerGameProps> = ({
  classes,
  defaultClassId,
  questions = [],
  timerDuration = 20,
  onAwardPoints,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    defaultClassId || (classes[0]?.id || '')
  );
  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  // Options
  const [pickCount, setPickCount] = useState<number>(1);
  const [allowRepeats, setAllowRepeats] = useState<boolean>(false);
  
  // State
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [displayedName, setDisplayedName] = useState<string>('جاهز للاختيار!');
  const [pickedWinners, setPickedWinners] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [excludedNames, setExcludedNames] = useState<Set<string>>(new Set());

  // Questions for picked student state
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [activeStudentName, setActiveStudentName] = useState<string | null>(null);
  const [studentResult, setStudentResult] = useState<{ isCorrect: boolean; points: number } | null>(null);

  const activeRoster = currentClass ? currentClass.students.map(s => s.name) : [];
  
  // Eligible students
  const eligibleStudents = activeRoster.filter(name => {
    if (excludedNames.has(name)) return false;
    if (!allowRepeats && history.includes(name)) return false;
    return true;
  });

  const animIntervalRef = useRef<number | null>(null);

  const getRandomQuestion = () => {
    if (!questions || questions.length === 0) return null;
    const unasked = questions.filter(q => !askedQuestionIds.includes(q.id));
    const pool = unasked.length > 0 ? unasked : questions;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const startPicking = () => {
    if (isPicking || eligibleStudents.length === 0) return;

    setIsPicking(true);
    setPickedWinners([]);
    setActiveQuestion(null);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setStudentResult(null);

    let duration = 2200; // ms
    let intervalTime = 60;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const randomIdx = Math.floor(Math.random() * eligibleStudents.length);
      const randomStudent = eligibleStudents[randomIdx];
      setDisplayedName(randomStudent);
      soundEngine.playTick(600 + Math.random() * 200);

      if (elapsed < duration) {
        // Slow down toward the end
        if (elapsed > duration * 0.7) {
          intervalTime += 15;
        }
        animIntervalRef.current = window.setTimeout(tick, intervalTime);
      } else {
        // Pick winner(s)
        finalizePick();
      }
    };

    tick();
  };

  const finalizePick = () => {
    setIsPicking(false);

    // Shuffle eligible students and take `pickCount`
    const shuffled = [...eligibleStudents].sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, Math.min(pickCount, eligibleStudents.length));

    setPickedWinners(winners);
    setDisplayedName(winners.join(' & '));

    // Update history
    setHistory(prev => [...winners, ...prev]);

    // Audio & Confetti
    soundEngine.playVictory();
    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.55 },
      });
    } catch {}

    // If activity has questions, automatically prepare a question for the picked student!
    if (questions && questions.length > 0 && winners.length > 0) {
      const chosenStudent = winners[0];
      setActiveStudentName(chosenStudent);
      const q = getRandomQuestion();
      if (q) {
        // Transition to question after brief moment
        window.setTimeout(() => {
          setActiveQuestion(q);
          setAskedQuestionIds(prev => [...prev, q.id]);
          setSelectedAnswer(null);
          setIsAnswerRevealed(false);
          setStudentResult(null);
        }, 1200);
      }
    }
  };

  const handleSelectStudentAnswer = (option: string) => {
    if (!activeQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(option);

    const isCorrect =
      option !== '' &&
      option !== '__TIME_UP__' &&
      option.trim().toLowerCase() === activeQuestion.correctAnswer?.trim().toLowerCase();

    const points = activeQuestion.points || 10;

    if (isCorrect) {
      soundEngine.playCorrect();
      onAwardPoints?.(points, true);
      setStudentResult({ isCorrect: true, points });
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } else {
      if (option !== '__TIME_UP__') {
        soundEngine.playWrong();
      }
      onAwardPoints?.(0, false);
      setStudentResult({ isCorrect: false, points: 0 });
    }

    setIsAnswerRevealed(true);
  };

  const handleRerollQuestion = () => {
    const q = getRandomQuestion();
    if (q) {
      setActiveQuestion(q);
      setAskedQuestionIds(prev => [...prev, q.id]);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
      setStudentResult(null);
      soundEngine.playClick();
    }
  };

  const handleDismissQuestion = () => {
    setActiveQuestion(null);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setStudentResult(null);
    soundEngine.playClick();
  };

  const toggleExclude = (name: string) => {
    setExcludedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    soundEngine.playClick();
  };

  const resetSession = () => {
    setHistory([]);
    setPickedWinners([]);
    setDisplayedName('جاهز للاختيار!');
    setExcludedNames(new Set());
    setActiveQuestion(null);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setStudentResult(null);
    soundEngine.playClick();
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center p-2 sm:p-4" dir="rtl">
      {/* Configuration Header */}
      <div className="w-full bg-slate-800/90 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-slate-700 mb-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Class selector */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">فصل الطلاب الحالي</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  resetSession();
                }}
                className="bg-slate-900 border border-slate-700 text-white font-bold text-xs sm:text-sm rounded-xl px-3 py-1.5 mt-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students.length} طالب)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Controls: Pick count & Repeat toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-semibold">عدد الطلاب:</span>
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => setPickCount(num)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pickCount === num
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {num} {num === 1 ? 'طالب' : 'طلاب'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAllowRepeats(!allowRepeats)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                allowRepeats
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {allowRepeats ? 'تكرار الاختيار: مسموح' : 'تكرار الاختيار: ممنوع (عادل)'}
            </button>

            {questions && questions.length > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
                {questions.length} سؤال متاح
              </span>
            )}

            <button
              onClick={resetSession}
              className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer transition-colors"
              title="إعادة تعيين السجل"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* QUESTION STAGE IF A QUESTION IS ACTIVE FOR THE STUDENT */}
      <AnimatePresence>
        {activeQuestion && activeStudentName ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full flex flex-col gap-4 mb-6"
          >
            {/* Student Banner Bar */}
            <div className="w-full bg-gradient-to-r from-amber-500/20 via-indigo-600/30 to-purple-600/20 p-4 sm:p-5 rounded-3xl border-2 border-amber-400 shadow-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30">
                  🎓
                </span>
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    سؤال الحصة موجه للطالب:
                  </div>
                  <div className="text-xl sm:text-3xl font-black text-white">
                    {activeStudentName}
                  </div>
                </div>
              </div>

              {/* Action buttons on Question */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRerollQuestion}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-600 transition-colors"
                  title="استبدال بسؤال عشوائي آخر"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>سؤال آخر</span>
                </button>

                <button
                  onClick={startPicking}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 transition-transform hover:scale-105"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>اختيار طالب تالي</span>
                </button>

                <button
                  onClick={handleDismissQuestion}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  title="إغلاق السؤال والعودة لشاشة الاختيار"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Answer Result Banner */}
            {studentResult && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-bold shadow-md ${
                  studentResult.isCorrect
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-500 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{studentResult.isCorrect ? '🎉' : '❌'}</span>
                  <span>
                    {studentResult.isCorrect
                      ? `إجابة صحيحة ومتميزة من الطالب (${activeStudentName})! تم احتساب ${studentResult.points} نقطة.`
                      : `إجابة غير صحيحة من الطالب (${activeStudentName}). يمكنك توضيح الإجابة الصحيحة المعروضة بالأسفل.`}
                  </span>
                </div>
                <button
                  onClick={startPicking}
                  className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold cursor-pointer"
                >
                  اختيار طالب آخر 🎲
                </button>
              </motion.div>
            )}

            {/* Full Question Display Component */}
            <div className="w-full">
              <QuestionDisplay
                question={activeQuestion}
                selectedAnswer={selectedAnswer}
                isAnswerRevealed={isAnswerRevealed}
                onSelectAnswer={handleSelectStudentAnswer}
                timerDuration={timerDuration}
                onTimeUp={() => handleSelectStudentAnswer('__TIME_UP__')}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Main Showcase Stage for Projector */}
      {(!activeQuestion || !activeStudentName) && (
        <div className="w-full relative py-12 px-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/30 shadow-2xl flex flex-col items-center justify-center text-center overflow-hidden">
          {/* Glow ambient circle */}
          <div className="absolute w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            الطلاب المتاحين للقرعة: {eligibleStudents.length} من أصل {activeRoster.length} طالب
          </div>

          {/* Displayed Student Banner (Huge Projector Typography) */}
          <div className="min-h-[160px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={isPicking ? 'picking' : pickedWinners.join(',')}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="flex flex-col items-center"
              >
                {pickedWinners.length > 0 && !isPicking && (
                  <div className="flex items-center gap-2 text-amber-400 text-base sm:text-lg font-bold mb-2">
                    <Award className="w-6 h-6" />
                    الطالب المختار!
                  </div>
                )}

                <h1 className={`text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight ${
                  isPicking
                    ? 'text-indigo-300 blur-[0.5px] scale-105'
                    : pickedWinners.length > 0
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 drop-shadow-[0_4px_25px_rgba(245,158,11,0.3)]'
                    : 'text-slate-300'
                }`}>
                  {displayedName}
                </h1>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pick Button */}
          <motion.button
            whileHover={!isPicking ? { scale: 1.05 } : {}}
            whileTap={!isPicking ? { scale: 0.95 } : {}}
            onClick={startPicking}
            disabled={isPicking || eligibleStudents.length === 0}
            className="mt-8 px-10 sm:px-14 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xl sm:text-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Shuffle className={`w-7 h-7 ${isPicking ? 'animate-spin' : ''}`} />
            {isPicking ? 'جاري السحب العشوائي...' : 'اختر طالباً عشوائياً 🎲'}
          </motion.button>
        </div>
      )}

      {/* Student Roster & Exclusions */}
      <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Active Class Roster */}
        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/80">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>قائمة طلاب الفصل ({activeRoster.length})</span>
            <span className="text-[11px] text-slate-400 font-normal">اضغط لاستبعاد أو إعادة طالب</span>
          </h4>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
            {activeRoster.length === 0 ? (
              <p className="text-slate-500 text-xs italic">لا يوجد طلاب مسجلين في هذا الفصل حالياً.</p>
            ) : (
              activeRoster.map(name => {
                const isExcluded = excludedNames.has(name);
                const isAlreadyPicked = !allowRepeats && history.includes(name);

                return (
                  <button
                    key={name}
                    onClick={() => toggleExclude(name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isExcluded
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80 line-through opacity-60'
                        : isAlreadyPicked
                        ? 'bg-slate-800 text-slate-500 border border-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                    }`}
                  >
                    {name}
                    {isExcluded && <UserX className="w-3 h-3 text-rose-400" />}
                    {isAlreadyPicked && !isExcluded && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected History this session */}
        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/80">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>الطلاب الذين تم اختيارهم في هذه الجلسة ({history.length})</span>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                مسح السجل
              </button>
            )}
          </h4>
          {history.length === 0 ? (
            <p className="text-slate-500 text-xs italic">لم يتم اختيار أي طالب بعد في هذه الجلسة.</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {history.map((name, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5"
                >
                  <span className="text-indigo-400 text-[10px] font-mono">#{history.length - idx}</span>
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

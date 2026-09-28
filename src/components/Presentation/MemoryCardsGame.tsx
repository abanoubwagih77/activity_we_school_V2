import React, { useState, useEffect, useMemo } from 'react';
import { MatchingPair, Question } from '../../types';
import { extractMatchingPairs } from '../../utils/matchingPairs';
import { soundEngine } from '../../utils/audio';
import { Sparkles, RefreshCcw, Layers, HelpCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface MemoryCardsGameProps {
  pairs?: MatchingPair[];
  questions?: Question[];
  onAwardPoints: (points: number, isCorrect: boolean) => void;
  onFinish?: () => void;
}

interface CardItem {
  uid: string; // unique card id in the deck
  pairId: string;
  text: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const PAIRS_PER_ROUND = 6; // 12 cards per grid (4x3)

export const MemoryCardsGame: React.FC<MemoryCardsGameProps> = ({
  pairs,
  questions,
  onAwardPoints,
  onFinish,
}) => {
  // Resolve all pairs from either explicit pairs or questions
  const allPairs = useMemo(() => {
    return extractMatchingPairs(questions, pairs);
  }, [questions, pairs]);

  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [moves, setMoves] = useState<number>(0);

  const totalRounds = Math.max(1, Math.ceil(allPairs.length / PAIRS_PER_ROUND));

  const currentRoundPairs = useMemo(() => {
    if (allPairs.length === 0) return [];
    const start = roundIndex * PAIRS_PER_ROUND;
    return allPairs.slice(start, start + PAIRS_PER_ROUND);
  }, [allPairs, roundIndex]);

  useEffect(() => {
    initDeck(currentRoundPairs);
  }, [currentRoundPairs]);

  const initDeck = (items: MatchingPair[]) => {
    if (items.length === 0) {
      setCards([]);
      setFlippedUids([]);
      setIsProcessing(false);
      setMoves(0);
      return;
    }

    const deck: CardItem[] = [];
    items.forEach((p) => {
      deck.push({
        uid: `c-${p.id}-left`,
        pairId: p.id,
        text: p.left,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        uid: `c-${p.id}-right`,
        pairId: p.id,
        text: p.right,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle deck
    const shuffled = deck.sort(() => 0.5 - Math.random());
    setCards(shuffled);
    setFlippedUids([]);
    setIsProcessing(false);
    setMoves(0);
  };

  const handleResetCurrentDeck = () => {
    initDeck(currentRoundPairs);
    soundEngine.playClick();
  };

  const handleNextRound = () => {
    if (roundIndex < totalRounds - 1) {
      setRoundIndex(prev => prev + 1);
      soundEngine.playClick();
    } else if (onFinish) {
      onFinish();
    }
  };

  const handleCardClick = (uid: string) => {
    if (isProcessing) return;

    const clickedCard = cards.find(c => c.uid === uid);
    if (!clickedCard || clickedCard.isMatched || clickedCard.isFlipped) return;

    soundEngine.playCardFlip();

    // Flip card
    const updatedCards = cards.map(c => c.uid === uid ? { ...c, isFlipped: true } : c);
    setCards(updatedCards);

    const newFlipped = [...flippedUids, uid];
    setFlippedUids(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsProcessing(true);

      const [firstUid, secondUid] = newFlipped;
      const card1 = updatedCards.find(c => c.uid === firstUid);
      const card2 = updatedCards.find(c => c.uid === secondUid);

      if (card1 && card2 && card1.pairId === card2.pairId) {
        // MATCH!
        setTimeout(() => {
          soundEngine.playCorrect();
          onAwardPoints(20, true);

          const matchedCards = updatedCards.map(c => 
            c.uid === firstUid || c.uid === secondUid
              ? { ...c, isMatched: true }
              : c
          );
          setCards(matchedCards);
          setFlippedUids([]);
          setIsProcessing(false);

          // Check if all matched
          const allDone = matchedCards.every(c => c.isMatched);
          if (allDone) {
            soundEngine.playVictory();
            try {
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
            } catch {}
          }
        }, 500);
      } else {
        // NO MATCH
        setTimeout(() => {
          soundEngine.playWrong();
          setCards(prev => prev.map(c => 
            c.uid === firstUid || c.uid === secondUid
              ? { ...c, isFlipped: false }
              : c
          ));
          setFlippedUids([]);
          setIsProcessing(false);
        }, 1100);
      }
    }
  };

  const matchedPairsCount = cards.filter(c => c.isMatched).length / 2;
  const isAllMatched = cards.length > 0 && cards.every(c => c.isMatched);

  // Empty state if no pairs found
  if (allPairs.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-slate-900/90 border border-slate-700 text-center flex flex-col items-center gap-4 text-slate-200" dir="rtl">
        <div className="p-4 rounded-2xl bg-purple-500/20 text-purple-400">
          <HelpCircle className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-white">لم يتم العثور على كروت ذاكرة</h3>
        <p className="text-sm text-slate-400 max-w-md leading-relaxed">
          هذا النشاط لا يحتوي على أسئلة أو كروت حتى الآن. يرجى تعديل النشاط واختيار مجموعة من الأسئلة من بنك الأسئلة (حيث يقوم النظام بتحويل الأسئلة وإجاباتها إلى كروت ذاكرة تفاعلية).
        </p>
        {onFinish && (
          <button
            onClick={onFinish}
            className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md"
          >
            العودة للأنشطة
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-6 p-2 sm:p-4" dir="rtl">
      {/* Game Header */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-800/90 dark:bg-slate-900/90 px-6 py-4 rounded-3xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <span>لعبة كروت الذاكرة</span>
              {totalRounds > 1 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                  الجولة {roundIndex + 1} من {totalRounds}
                </span>
              )}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              اقلب كرتين معاً لاكتشاف السؤال وإجابته المطابقة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm font-bold text-slate-300">
            المحاولات: <strong className="text-indigo-400 font-mono text-base">{moves}</strong>
          </span>
          <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs sm:text-sm font-bold text-emerald-300 font-mono">
            {matchedPairsCount} / {currentRoundPairs.length} أزواج
          </span>
          <button
            onClick={handleResetCurrentDeck}
            className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer transition-colors"
            title="إعادة خلط الكروت"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards Matrix Grid (4 columns on desktop, 3 on tablet, 2 on mobile) */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          return (
            <motion.div
              key={card.uid}
              whileHover={!card.isMatched && !card.isFlipped && !isProcessing ? { scale: 1.02 } : {}}
              whileTap={!card.isMatched && !card.isFlipped && !isProcessing ? { scale: 0.98 } : {}}
              onClick={() => handleCardClick(card.uid)}
              className={`h-36 sm:h-40 rounded-2xl border-2 p-3 sm:p-4 flex items-center justify-center text-center cursor-pointer select-none transition-all duration-300 shadow-lg relative overflow-hidden ${
                card.isMatched
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-emerald-500/20'
                  : card.isFlipped
                  ? 'bg-indigo-950/90 border-indigo-500 text-white shadow-indigo-500/30'
                  : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-slate-500 text-slate-400'
              }`}
            >
              {card.isFlipped || card.isMatched ? (
                <motion.div
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  className="font-bold text-xs sm:text-sm md:text-base leading-snug line-clamp-4"
                >
                  {card.text}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-70">
                  <span className="font-mono text-[10px] font-black uppercase text-indigo-400 tracking-wider">كارت</span>
                  <span className="text-2xl font-black text-slate-500">#{idx + 1}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Finished Banner */}
      {isAllMatched && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full p-6 rounded-3xl bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border-2 border-indigo-500 text-center flex flex-col items-center gap-3 shadow-2xl"
        >
          <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
          <h3 className="text-2xl font-black text-white">
            {roundIndex < totalRounds - 1 
              ? `أحسنت! تم إنهاء هذه الجولة في ${moves} محاولة 🌟`
              : `رائع جداً! تم كشف جميع الكروت في ${moves} محاولة 🏆`}
          </h3>
          <p className="text-indigo-200 text-sm">
            {roundIndex < totalRounds - 1 
              ? `متبقي ${allPairs.length - (roundIndex + 1) * PAIRS_PER_ROUND} سؤال للجولات القادمة.`
              : 'أداء ذاكرة وتذكر متميز من الطلاب في استرجاع المعلومات.'}
          </p>

          <div className="flex items-center gap-3 mt-2">
            {roundIndex < totalRounds - 1 ? (
              <button
                onClick={handleNextRound}
                className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105"
              >
                <span>الجولة التالية</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            ) : onFinish ? (
              <button
                onClick={onFinish}
                className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm cursor-pointer shadow-lg shadow-emerald-600/30 transition-transform hover:scale-105"
              >
                إنهاء النشاط وحفظ النتيجة 🏆
              </button>
            ) : null}
          </div>
        </motion.div>
      )}
    </div>
  );
};

import { Question, MatchingPair } from '../types';

/**
 * Extracts matching pairs from a list of questions or preconfigured pairs.
 * If questions are multiple-choice, true/false, or complete, it pairs question text -> correct answer.
 * If questions are of matching type, it extracts their specific matching pairs.
 */
export function extractMatchingPairs(
  questions?: Question[],
  explicitPairs?: MatchingPair[]
): MatchingPair[] {
  // 1. If explicit pairs are configured and not empty, use them
  if (explicitPairs && explicitPairs.length > 0) {
    const validExplicit = explicitPairs.filter(p => p && p.left?.trim() && p.right?.trim());
    if (validExplicit.length > 0) return validExplicit;
  }

  if (!questions || questions.length === 0) {
    return [];
  }

  const pairs: MatchingPair[] = [];

  questions.forEach((q, qIndex) => {
    // A. If question is already of type matching and has matchingPairs
    if (q.type === 'matching' && Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0) {
      q.matchingPairs.forEach((pair, pIndex) => {
        if (pair.left?.trim() && pair.right?.trim()) {
          pairs.push({
            id: pair.id || `q-${q.id}-pair-${pIndex}`,
            left: pair.left.trim(),
            right: pair.right.trim(),
          });
        }
      });
    }
    // B. If question has a correct answer (MCQ, True/False, Complete, Code Output)
    else if (q.correctAnswer && q.correctAnswer.trim()) {
      pairs.push({
        id: `q-${q.id || qIndex}`,
        left: q.text.trim(),
        right: q.correctAnswer.trim(),
      });
    }
  });

  return pairs;
}

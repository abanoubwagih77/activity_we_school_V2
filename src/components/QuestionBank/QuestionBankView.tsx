import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Question, QuestionType, Difficulty, Lesson, LessonItem } from '../../types';
import { 
  Plus, Upload, Download, Search, Filter, Trash2, 
  Edit3, Code2, Check, HelpCircle, 
  Folder, FolderPlus, Layers, ChevronRight, ChevronLeft,
  ArrowRight, ArrowLeft, CheckCircle2, LayoutGrid, List,
  MoveHorizontal, AlertTriangle, X
} from 'lucide-react';
import { QuestionFormModal } from './QuestionFormModal';
import { CsvImportModal } from './CsvImportModal';
import { soundEngine } from '../../utils/audio';

export const QuestionBankView: React.FC = () => {
  const { 
    questions, 
    lessons,
    addQuestion, 
    updateQuestion, 
    deleteQuestion, 
    importQuestions, 
    addLesson,
    updateLesson,
    deleteLesson,
    addLessonItem,
    updateLessonItem,
    deleteLessonItem,
    moveQuestionToLessonItem,
    authUser 
  } = useApp();

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'folders' | 'flat'>('folders');
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('all');

  // Question Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Lesson & Item Modals
  const [isNewLessonOpen, setIsNewLessonOpen] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');

  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonDesc, setEditLessonDesc] = useState('');

  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [deleteLessonWithQuestions, setDeleteLessonWithQuestions] = useState(false);

  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  const [editingItem, setEditingItem] = useState<{ lessonId: string; item: LessonItem } | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemDesc, setEditItemDesc] = useState('');

  const [deletingItem, setDeletingItem] = useState<{ lessonId: string; itemId: string; title: string } | null>(null);
  const [deleteItemWithQuestions, setDeleteItemWithQuestions] = useState(false);

  // Move Question Modal
  const [movingQuestion, setMovingQuestion] = useState<Question | null>(null);
  const [targetLessonId, setTargetLessonId] = useState<string>('');
  const [targetItemId, setTargetItemId] = useState<string>('');

  // Active Lesson and Item objects
  const activeLesson = useMemo(() => {
    return lessons.find(l => l.id === currentLessonId) || null;
  }, [lessons, currentLessonId]);

  const activeItem = useMemo(() => {
    return activeLesson?.items?.find(it => it.id === currentItemId) || null;
  }, [activeLesson, currentItemId]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => { if (q.category) set.add(q.category); });
    return Array.from(set);
  }, [questions]);

  // Filtered questions for Flat View
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.text.toLowerCase().includes(query);
        const matchesCategory = q.category?.toLowerCase().includes(query);
        const matchesTags = q.tags?.some(t => t.toLowerCase().includes(query));
        const matchesCode = q.codeSnippet?.toLowerCase().includes(query);
        const matchesLesson = q.lessonTitle?.toLowerCase().includes(query);
        const matchesItem = q.itemTitle?.toLowerCase().includes(query);
        if (!matchesText && !matchesCategory && !matchesTags && !matchesCode && !matchesLesson && !matchesItem) {
          return false;
        }
      }

      if (selectedCategory !== 'all' && q.category !== selectedCategory) {
        return false;
      }

      if (selectedType !== 'all' && q.type !== selectedType) {
        return false;
      }

      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) {
        return false;
      }

      if (selectedLessonFilter !== 'all') {
        if (selectedLessonFilter === 'none') {
          if (q.lessonId) return false;
        } else if (q.lessonId !== selectedLessonFilter) {
          return false;
        }
      }

      return true;
    });
  }, [questions, searchQuery, selectedCategory, selectedType, selectedDifficulty, selectedLessonFilter]);

  // Questions specific to the currently open Item
  const itemQuestions = useMemo(() => {
    if (!currentLessonId || !currentItemId) return [];
    return questions.filter(q => q.lessonId === currentLessonId && q.itemId === currentItemId);
  }, [questions, currentLessonId, currentItemId]);

  // Questions specific to the current Lesson without an item
  const lessonUnassignedQuestions = useMemo(() => {
    if (!currentLessonId) return [];
    return questions.filter(q => q.lessonId === currentLessonId && !q.itemId);
  }, [questions, currentLessonId]);

  // Total questions in the active lesson across all items
  const activeLessonTotalQuestions = useMemo(() => {
    if (!currentLessonId) return 0;
    return questions.filter(q => q.lessonId === currentLessonId).length;
  }, [questions, currentLessonId]);

  // Unassigned questions (not in any lesson)
  const unassignedQuestions = useMemo(() => {
    return questions.filter(q => !q.lessonId);
  }, [questions]);

  // Helper counts per lesson
  const getLessonQuestionCount = (lessonId: string) => {
    return questions.filter(q => q.lessonId === lessonId).length;
  };

  const getItemQuestionCount = (lessonId: string, itemId: string) => {
    return questions.filter(q => q.lessonId === lessonId && q.itemId === itemId).length;
  };

  // Handlers for Lesson CRUD
  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    const created = addLesson(newLessonTitle.trim(), newLessonDesc.trim() || undefined);
    setIsNewLessonOpen(false);
    setNewLessonTitle('');
    setNewLessonDesc('');
    setCurrentLessonId(created.id);
    setCurrentItemId(null);
    setFeedbackBanner(`تم إنشاء درس "${created.title}" بنجاح.`);
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const handleUpdateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editLessonTitle.trim()) return;
    updateLesson({
      ...editingLesson,
      title: editLessonTitle.trim(),
      description: editLessonDesc.trim() || undefined,
    });
    setEditingLesson(null);
    setFeedbackBanner('تم تحديث بيانات الدرس بنجاح.');
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const handleDeleteLesson = () => {
    if (!deletingLesson) return;
    deleteLesson(deletingLesson.id, deleteLessonWithQuestions);
    if (currentLessonId === deletingLesson.id) {
      setCurrentLessonId(null);
      setCurrentItemId(null);
    }
    setDeletingLesson(null);
    setDeleteLessonWithQuestions(false);
    setFeedbackBanner('تم حذف الدرس بنجاح.');
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  // Handlers for Item CRUD
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLessonId || !newItemTitle.trim()) return;
    const created = addLessonItem(currentLessonId, newItemTitle.trim(), newItemDesc.trim() || undefined);
    setIsNewItemOpen(false);
    setNewItemTitle('');
    setNewItemDesc('');
    if (created) {
      setCurrentItemId(created.id);
      setFeedbackBanner(`تم إنشاء عنصر "${created.title}" بنجاح.`);
      setTimeout(() => setFeedbackBanner(null), 3500);
    }
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemTitle.trim()) return;
    updateLessonItem(editingItem.lessonId, {
      ...editingItem.item,
      title: editItemTitle.trim(),
      description: editItemDesc.trim() || undefined,
    });
    setEditingItem(null);
    setFeedbackBanner('تم تحديث بيانات العنصر بنجاح.');
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const handleDeleteItem = () => {
    if (!deletingItem) return;
    deleteLessonItem(deletingItem.lessonId, deletingItem.itemId, deleteItemWithQuestions);
    if (currentItemId === deletingItem.itemId) {
      setCurrentItemId(null);
    }
    setDeletingItem(null);
    setDeleteItemWithQuestions(false);
    setFeedbackBanner('تم حذف العنصر بنجاح.');
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  // Move question handler
  const handleMoveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingQuestion) return;
    moveQuestionToLessonItem(
      movingQuestion.id,
      targetLessonId || undefined,
      (targetLessonId && targetItemId) ? targetItemId : undefined
    );
    setMovingQuestion(null);
    setTargetLessonId('');
    setTargetItemId('');
    setFeedbackBanner('تم نقل السؤال بنجاح.');
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const handleExportCsv = () => {
    const headers = ['Text', 'Type', 'Options', 'CorrectAnswer', 'Category', 'Difficulty', 'Points', 'Lesson', 'Item', 'CodeSnippet', 'Explanation'];
    const rows = questions.map(q => [
      `"${q.text.replace(/"/g, '""')}"`,
      `"${q.type}"`,
      `"${(q.options || []).join('|').replace(/"/g, '""')}"`,
      `"${q.correctAnswer.replace(/"/g, '""')}"`,
      `"${(q.category || '').replace(/"/g, '""')}"`,
      `"${q.difficulty}"`,
      q.points,
      `"${(q.lessonTitle || '').replace(/"/g, '""')}"`,
      `"${(q.itemTitle || '').replace(/"/g, '""')}"`,
      `"${(q.codeSnippet || '').replace(/"/g, '""')}"`,
      `"${(q.explanation || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'classtech_questions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundEngine.playClick();
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'mcq': return 'اختيار من متعدد (MCQ)';
      case 'true_false': return 'صح أو خطأ (T/F)';
      case 'complete': return 'أكمل الفراغ (Complete)';
      case 'matching': return 'مطابقة وتوصيل (Match)';
      case 'code_output': return 'توقع ناتج الكود (Code)';
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: QuestionType) => {
    switch (type) {
      case 'mcq': return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'true_false': return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'complete': return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'matching': return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'code_output': return 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case 'easy': return 'سهل';
      case 'medium': return 'متوسط';
      case 'hard': return 'متقدم';
    }
  };

  const confirmDelete = (id: string) => {
    deleteQuestion(id);
    setDeletingId(null);
    soundEngine.playClick();
    setFeedbackBanner('تم حذف السؤال بنجاح.');
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Header with Title & Action CTAs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-[#5B2D82] dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
              مادة: {authUser?.subject || 'عام'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              حساب الأستاذ {authUser?.fullName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            بنك الأسئلة والمجلدات التعليمية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            قسّم أسئلتك في مجلدات (الدروس وعناصرها) لتتمكن من اختيار أسئلة أي عنصر للأنشطة والمسابقات بدقة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle Button */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setViewMode('folders');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'folders'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>تصفح المجلدات (الدروس والعناصر)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setViewMode('flat');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>قائمة كل الأسئلة ({questions.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsImportOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>استيراد ملف</span>
          </button>
          {questions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>تصدير CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 1: HIERARCHICAL FOLDERS VIEW (الدروس -> عناصر الدرس -> الأسئلة)
         ========================================================================= */}
      {viewMode === 'folders' && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCurrentLessonId(null);
                  setCurrentItemId(null);
                }}
                className={`flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer ${
                  !currentLessonId ? 'text-purple-700 dark:text-purple-300 font-extrabold' : ''
                }`}
              >
                <Folder className="w-4 h-4 text-purple-600" />
                <span>كل الدروس ({lessons.length})</span>
              </button>

              {activeLesson && (
                <>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setCurrentItemId(null);
                    }}
                    className={`flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer ${
                      currentLessonId && !currentItemId ? 'text-purple-700 dark:text-purple-300 font-extrabold' : ''
                    }`}
                  >
                    <span>📁 {activeLesson.title}</span>
                  </button>
                </>
              )}

              {activeItem && (
                <>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                  <span className="text-purple-700 dark:text-purple-300 font-extrabold flex items-center gap-1">
                    <span>📑 {activeItem.title}</span>
                  </span>
                </>
              )}
            </div>

            {/* Back Button if inside a folder */}
            <div className="flex items-center gap-2">
              {currentItemId ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setCurrentItemId(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>رجوع لعناصر {activeLesson?.title}</span>
                </button>
              ) : currentLessonId ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setCurrentLessonId(null);
                    setCurrentItemId(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>رجوع لقائمة الدروس</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* LEVEL 1: ALL LESSONS ROOT */}
          {!currentLessonId && (
            <div className="space-y-6">
              {/* Root Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  اختر درساً لفتح عناصره وأسئلته، أو أنشئ درساً جديداً:
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setIsNewLessonOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>إنشاء درس جديد (New Lesson)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setEditingQuestion(null);
                      setIsFormOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سؤال سريع</span>
                  </button>
                </div>
              </div>

              {/* Lessons Cards Grid */}
              {lessons.length === 0 && unassignedQuestions.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4">
                    <FolderPlus className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا توجد دروس أو مجلدات مضافة بعد</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                    ابدأ بإنشاء أول درس لك (مثال: Lesson 1 أو Lesson 2)، ثم أنشئ بداخله العناصر الخاصة به (Item 1, Item 2...) وضع الأسئلة بداخلها لتنظيم مثالي!
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setIsNewLessonOpen(true);
                      }}
                      className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02]"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>إنشاء أول درس الآن</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setIsImportOpen(true);
                      }}
                      className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-all flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>استيراد ملف Excel جاهز</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Lesson Cards */}
                  {lessons.map(lesson => {
                    const questionCount = getLessonQuestionCount(lesson.id);
                    const itemsCount = lesson.items?.length || 0;
                    return (
                      <div
                        key={lesson.id}
                        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg transition-all group flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                              <Folder className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  setEditingLesson(lesson);
                                  setEditLessonTitle(lesson.title);
                                  setEditLessonDesc(lesson.description || '');
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="تعديل اسم الدرس"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  setDeletingLesson(lesson);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="حذف الدرس"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {lesson.title}
                            </h3>
                            {lesson.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                                {lesson.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-100 dark:border-purple-900/40 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{itemsCount} عناصر (Items)</span>
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                              {questionCount} سؤال
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setCurrentLessonId(lesson.id);
                              setCurrentItemId(null);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 hover:text-white text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group-hover:bg-purple-600 group-hover:text-white"
                          >
                            <span>فتح مجلد الدرس واستعراض العناصر</span>
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unassigned Questions Card if any exist */}
                  {unassignedQuestions.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-300 transition-all flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-sm">
                          <Folder className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                            أسئلة عامة (غير مصنفة تحت درس)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            تحتوي على {unassignedQuestions.length} سؤال يمكنك نقلها وتصنيفها لأي درس تريده
                          </p>
                        </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setViewMode('flat');
                            setSelectedLessonFilter('none');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <span>عرض الأسئلة غير المصنفة ({unassignedQuestions.length})</span>
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 2: INSIDE A LESSON (VIEWING ITEMS OF THIS LESSON) */}
          {currentLessonId && !currentItemId && activeLesson && (
            <div className="space-y-6">
              {/* Lesson Banner / Header */}
              <div className="bg-gradient-to-l from-purple-900/10 via-purple-600/5 to-transparent dark:from-purple-950/40 p-6 rounded-3xl border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-bold">
                      مجلد الدرس
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {activeLesson.items?.length || 0} عناصر • {activeLessonTotalQuestions} أسئلة إجمالاً
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📁 {activeLesson.title}</span>
                  </h2>
                  {activeLesson.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {activeLesson.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setIsNewItemOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء عنصر جديد (New Item)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setEditingQuestion(null);
                      setIsFormOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سؤال في هذا الدرس</span>
                  </button>
                </div>
              </div>

              {/* Items Cards Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>عناصر ومواضيع هذا الدرس (Items):</span>
                </h3>

                {(!activeLesson.items || activeLesson.items.length === 0) ? (
                  <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
                      <Layers className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      لا توجد عناصر (Items) في هذا الدرس بعد
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                      أنشئ عناصر الدرس مثل (Item 1: المتغيرات، Item 2: الجمل الشرطية...)، ثم ضع الأسئلة بداخل كل عنصر لتستطيع استدعاءها بسهولة في النشاط!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setIsNewItemOpen(true);
                      }}
                      className="mt-5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md mx-auto cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إنشاء أول عنصر لهذا الدرس (Create First Item)</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeLesson.items.map(item => {
                      const count = getItemQuestionCount(activeLesson.id, item.id);
                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Layers className="w-5 h-5" />
                              </div>
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    setEditingItem({ lessonId: activeLesson.id, item });
                                    setEditItemTitle(item.title);
                                    setEditItemDesc(item.description || '');
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                                  title="تعديل اسم العنصر"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    setDeletingItem({
                                      lessonId: activeLesson.id,
                                      itemId: item.id,
                                      title: item.title,
                                    });
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="حذف العنصر"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                📑 {item.title}
                              </h4>
                              {item.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                              {count} أسئلة مسجلة في هذا العنصر
                            </div>
                          </div>

                          <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setCurrentItemId(item.id);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span>دخول واستعراض الأسئلة</span>
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Questions in this lesson without an Item */}
              {lessonUnassignedQuestions.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    أسئلة عامة مسجلة في هذا الدرس (غير موزعة على عنصر فرعي): ({lessonUnassignedQuestions.length})
                  </h3>
                  <div className="space-y-2">
                    {lessonUnassignedQuestions.map(q => (
                      <div
                        key={q.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}`}>
                            {getTypeLabel(q.type)}
                          </span>
                          <span dir="ltr" className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {q.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setMovingQuestion(q);
                              setTargetLessonId(q.lessonId || '');
                              setTargetItemId(q.itemId || '');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                          >
                            نقل إلى عنصر
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setEditingQuestion(q);
                              setIsFormOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: INSIDE AN ITEM (SHOWING QUESTIONS IN THIS ITEM) */}
          {currentLessonId && currentItemId && activeLesson && activeItem && (
            <div className="space-y-6">
              {/* Item Header */}
              <div className="bg-gradient-to-l from-indigo-900/10 via-indigo-600/5 to-transparent dark:from-indigo-950/40 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-bold">
                      عنصر دراسي
                    </span>
                    <span className="text-xs text-purple-700 dark:text-purple-300 font-bold">
                      تابع لـ: 📁 {activeLesson.title}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📑 {activeItem.title}</span>
                  </h2>
                  {activeItem.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {activeItem.description}
                    </p>
                  )}
                  <div className="text-xs text-slate-500 pt-1">
                    إجمالي الأسئلة في هذا العنصر: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{itemQuestions.length}</strong> سؤال
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setEditingQuestion(null);
                      setIsFormOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سؤال لهذا العنصر ({activeItem.title})</span>
                  </button>
                </div>
              </div>

              {/* Questions List for this Item */}
              {itemQuestions.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                    <Code2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    لا توجد أسئلة مسجلة في هذا العنصر ({activeItem.title}) بعد
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    اضغط على الزر أدناه لإضافة أول سؤال مخصص لهذا الجزء من الدرس، وسيتم حفظه وربطه بهذا العنصر تلقائياً!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setEditingQuestion(null);
                      setIsFormOpen(true);
                    }}
                    className="mt-5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md mx-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سؤال جديد الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {itemQuestions.map(q => (
                    <div
                      key={q.id}
                      className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all flex flex-col md:flex-row items-start justify-between gap-6"
                    >
                      <div className="flex-1 space-y-3 min-w-0 w-full">
                        {/* Badges strip */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getTypeBadgeClass(q.type)}`}>
                            {getTypeLabel(q.type)}
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-sans">
                            {q.category}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            q.difficulty === 'easy'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : q.difficulty === 'medium'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          }`}>
                            {getDifficultyLabel(q.difficulty)}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mr-auto font-bold">
                            {q.points} نقطة • {q.timeLimit || 30} ثانية
                          </span>
                        </div>

                        {/* Question Text in English */}
                        <div dir="ltr" className="text-left">
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                            {q.text}
                          </h4>
                        </div>

                        {/* Answers / Options / Pairs Display */}
                        {q.type === 'complete' ? (
                          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-amber-900 dark:text-amber-300 block">الإجابة النموذجية للفراغ:</span>
                            <span dir="ltr" className="inline-block font-mono font-bold text-amber-800 dark:text-amber-200 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-700">
                              {q.correctAnswer}
                            </span>
                          </div>
                        ) : q.type === 'matching' && q.matchingPairs ? (
                          <div className="space-y-1.5 p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/60 rounded-xl text-xs">
                            <span className="font-bold text-purple-900 dark:text-purple-300 block mb-1">أزواج المطابقة والتوصيل:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="ltr">
                              {q.matchingPairs.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-purple-100 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                                  <span className="font-bold text-purple-700 dark:text-purple-400">{p.left}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-slate-600 dark:text-slate-300">{p.right}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5" dir="ltr">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {q.options?.map((opt, idx) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between text-left ${
                                      isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-300/40'
                                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span className="truncate">{opt}</span>
                                    {isCorrect && (
                                      <span className="shrink-0 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-bold font-sans ml-2" dir="rtl">
                                        <Check className="w-3.5 h-3.5" /> صحيح
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Explanation if present */}
                        {q.explanation && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700" dir="ltr">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Explanation: </span>
                            <span>{q.explanation}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex md:flex-col items-center gap-2 shrink-0 self-end md:self-start">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setEditingQuestion(q);
                            setIsFormOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setMovingQuestion(q);
                            setTargetLessonId(q.lessonId || '');
                            setTargetItemId(q.itemId || '');
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <MoveHorizontal className="w-3.5 h-3.5" />
                          <span>نقل</span>
                        </button>

                        {deletingId === q.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 p-1 rounded-xl border border-rose-200 dark:border-rose-800">
                            <button
                              type="button"
                              onClick={() => confirmDelete(q.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(q.id)}
                            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: FLAT ALL QUESTIONS LIST VIEW (عرض قائمة وجدول كل الأسئلة)
         ========================================================================= */}
      {viewMode === 'flat' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالنص، الدرس، العنصر..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Lesson Filter */}
              <select
                value={selectedLessonFilter}
                onChange={(e) => setSelectedLessonFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">جميع الدروس ({lessons.length})</option>
                <option value="none">بدون درس (عام)</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>📁 {l.title}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">جميع التصنيفات ({categories.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Question Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">جميع أنواع الأسئلة</option>
                <option value="mcq">اختيار من متعدد (MCQ)</option>
                <option value="true_false">صح أو خطأ (True / False)</option>
                <option value="complete">إكمال الفراغ (Complete)</option>
                <option value="matching">مطابقة وتوصيل (Matching)</option>
                <option value="code_output">توقع ناتج كود (Code Output)</option>
              </select>

              {/* Difficulty Filter */}
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">جميع المستويات</option>
                <option value="easy">سهل (Easy)</option>
                <option value="medium">متوسط (Medium)</option>
                <option value="hard">متقدم (Hard)</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>يتم عرض {filteredQuestions.length} من إجمالي {questions.length} سؤال</span>
              {(searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || selectedDifficulty !== 'all' || selectedLessonFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedType('all');
                    setSelectedDifficulty('all');
                    setSelectedLessonFilter('all');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* Questions Cards List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">بنك الأسئلة فارغ حالياً</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                  لم تتم إضافة أي أسئلة بعد. يمكنك الآن إضافة أسئلتك البرمجية والتقنية باللغة الإنجليزية، أو تقسيمها في دروس ومجلدات.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setEditingQuestion(null);
                      setIsFormOpen(true);
                    }}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول سؤال لك الآن</span>
                  </button>
                </div>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <Filter className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد أسئلة تطابق شروط البحث أو التصفية</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">جرّب تغيير كلمات البحث أو إعادة تعيين الفلاتر</p>
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all flex flex-col md:flex-row items-start justify-between gap-6"
                >
                  <div className="flex-1 space-y-3 min-w-0 w-full">
                    {/* Badges strip */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getTypeBadgeClass(q.type)}`}>
                        {getTypeLabel(q.type)}
                      </span>
                      {q.lessonTitle && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                          <span>📁 {q.lessonTitle}</span>
                          {q.itemTitle && <span className="opacity-80">&gt; 📑 {q.itemTitle}</span>}
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-sans">
                        {q.category}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        q.difficulty === 'easy'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : q.difficulty === 'medium'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      }`}>
                        {getDifficultyLabel(q.difficulty)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mr-auto font-bold">
                        {q.points} نقطة • {q.timeLimit || 30} ثانية
                      </span>
                    </div>

                    {/* Question Text in English */}
                    <div dir="ltr" className="text-left">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {q.text}
                      </h3>
                    </div>

                    {/* Answers / Options / Pairs Display */}
                    {q.type === 'complete' ? (
                      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-amber-900 dark:text-amber-300 block">الإجابة النموذجية للفراغ:</span>
                        <span dir="ltr" className="inline-block font-mono font-bold text-amber-800 dark:text-amber-200 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-700">
                          {q.correctAnswer}
                        </span>
                      </div>
                    ) : q.type === 'matching' && q.matchingPairs ? (
                      <div className="space-y-1.5 p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/60 rounded-xl text-xs">
                        <span className="font-bold text-purple-900 dark:text-purple-300 block mb-1">أزواج المطابقة والتوصيل:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="ltr">
                          {q.matchingPairs.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-purple-100 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                              <span className="font-bold text-purple-700 dark:text-purple-400">{p.left}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-slate-600 dark:text-slate-300">{p.right}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5" dir="ltr">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options?.map((opt, idx) => {
                            const isCorrect = opt === q.correctAnswer;
                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-left ${
                                  isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-300/40'
                                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="truncate">{opt}</span>
                                {isCorrect && (
                                  <span className="shrink-0 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-bold font-sans ml-2" dir="rtl">
                                    <Check className="w-3.5 h-3.5" /> صحيح
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Explanation if present */}
                    {q.explanation && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700" dir="ltr">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Explanation: </span>
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex md:flex-col items-center gap-2 shrink-0 self-end md:self-start">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setEditingQuestion(q);
                        setIsFormOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setMovingQuestion(q);
                        setTargetLessonId(q.lessonId || '');
                        setTargetItemId(q.itemId || '');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MoveHorizontal className="w-3.5 h-3.5" />
                      <span>نقل</span>
                    </button>

                    {deletingId === q.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 p-1 rounded-xl border border-rose-200 dark:border-rose-800">
                        <button
                          type="button"
                          onClick={() => confirmDelete(q.id)}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          تأكيد
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(q.id)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. Create New Lesson Modal */}
      {isNewLessonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-purple-600" />
                <span>إنشاء درس جديد (New Lesson)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewLessonOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  اسم أو عنوان الدرس: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="مثال: Lesson 2 أو الوحدة الثانية: القوائم"
                  required
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  وصف مختصر للدرس (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={newLessonDesc}
                  onChange={(e) => setNewLessonDesc(e.target.value)}
                  placeholder="مثال: يغطي المفاهيم الأساسية، العمليات، والتطبيق العملي"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewLessonOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  إنشاء الدرس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600" />
                <span>تعديل بيانات الدرس</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLesson} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  اسم أو عنوان الدرس: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editLessonTitle}
                  onChange={(e) => setEditLessonTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  الوصف (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={editLessonDesc}
                  onChange={(e) => setEditLessonDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Lesson Modal */}
      {deletingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  حذف درس: {deletingLesson.title}
                </h3>
                <p className="text-xs text-slate-500">
                  هل أنت متأكد من رغبتك في حذف هذا المجلد؟
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteLessonWithQuestions}
                  onChange={(e) => setDeleteLessonWithQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-rose-700 dark:text-rose-400">
                  حذف جميع الأسئلة التابعة لهذا الدرس أيضاً ({getLessonQuestionCount(deletingLesson.id)} سؤال)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mr-6">
                إذا لم تحدد هذا الخيار، سيتم حذف المجلد فقط والاحتفاظ بالأسئلة كـ "أسئلة عامة" دون ضياعها.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLesson(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteLesson}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Create New Item Modal */}
      {isNewItemOpen && activeLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>إنشاء عنصر جديد داخل {activeLesson.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewItemOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  اسم أو عنوان العنصر: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="مثال: Item 1 أو المتغيرات وأنواع البيانات"
                  required
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  وصف مختصر للعنصر (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="مثال: أسئلة تعريف المتغيرات وتخصيص القيم"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  إنشاء العنصر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>تعديل اسم العنصر</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  اسم أو عنوان العنصر: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editItemTitle}
                  onChange={(e) => setEditItemTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  الوصف (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={editItemDesc}
                  onChange={(e) => setEditItemDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Item Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  حذف عنصر: {deletingItem.title}
                </h3>
                <p className="text-xs text-slate-500">
                  هل أنت متأكد من رغبتك في حذف هذا العنصر؟
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteItemWithQuestions}
                  onChange={(e) => setDeleteItemWithQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-rose-700 dark:text-rose-400">
                  حذف الأسئلة التابعة لهذا العنصر أيضاً ({getItemQuestionCount(deletingItem.lessonId, deletingItem.itemId)} سؤال)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mr-6">
                إذا لم تحدد هذا الخيار، سيتم حذف العنصر فقط والاحتفاظ بالأسئلة تابعة للدرس دون ضياعها.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Move Question Modal */}
      {movingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MoveHorizontal className="w-5 h-5 text-purple-600" />
                <span>نقل السؤال إلى درس أو عنصر آخر</span>
              </h3>
              <button
                type="button"
                onClick={() => setMovingQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs" dir="ltr">
              <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                {movingQuestion.text}
              </p>
            </div>

            <form onSubmit={handleMoveQuestion} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  اختر الدرس الجديد:
                </label>
                <select
                  value={targetLessonId}
                  onChange={(e) => {
                    setTargetLessonId(e.target.value);
                    setTargetItemId('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">بدون درس (سؤال عام في البنك)</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>📁 {l.title}</option>
                  ))}
                </select>
              </div>

              {targetLessonId && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    اختر عنصر الدرس الجديد:
                  </label>
                  <select
                    value={targetItemId}
                    onChange={(e) => setTargetItemId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="">عام في هذا الدرس (بدون عنصر فرعي)</option>
                    {lessons.find(l => l.id === targetLessonId)?.items?.map(it => (
                      <option key={it.id} value={it.id}>📑 {it.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMovingQuestion(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  تأكيد النقل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Question Create/Edit Modal */}
      {isFormOpen && (
        <QuestionFormModal
          initialQuestion={editingQuestion}
          initialLessonId={currentLessonId || undefined}
          initialItemId={currentItemId || undefined}
          onSave={(q) => {
            if (editingQuestion) {
              updateQuestion(q as Question);
              setFeedbackBanner('تم تحديث بيانات السؤال بنجاح.');
            } else {
              addQuestion(q as any);
              setFeedbackBanner('تمت إضافة السؤال الجديد إلى البنك بنجاح!');
            }
            setTimeout(() => setFeedbackBanner(null), 3500);
          }}
          onClose={() => {
            setIsFormOpen(false);
            setEditingQuestion(null);
          }}
        />
      )}

      {/* 9. CSV Import Modal */}
      {isImportOpen && (
        <CsvImportModal
          onImport={(imported) => {
            const count = importQuestions(imported);
            setIsImportOpen(false);
            setFeedbackBanner(`تم استيراد ${count} سؤال بنجاح إلى بنك الأسئلة!`);
            setTimeout(() => setFeedbackBanner(null), 3500);
            soundEngine.playCorrect();
          }}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </div>
  );
};

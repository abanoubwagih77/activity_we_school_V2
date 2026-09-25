import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActivityConfig, ActivityType, ScoreMode, Team } from '../../types';
import { 
  X, Check, Plus, Trash2, RotateCw, Box, UserCheck, 
  CheckCircle, Zap, Link2, Layers, Swords, Grid3X3, HelpCircle, Folder, CheckSquare
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface ActivityBuilderModalProps {
  initialActivity?: ActivityConfig | null;
  onClose: () => void;
}

export const ActivityBuilderModal: React.FC<ActivityBuilderModalProps> = ({
  initialActivity,
  onClose,
}) => {
  const { questions, lessons, classes, addActivity, updateActivity } = useApp();

  const [title, setTitle] = useState(initialActivity?.title || '');
  const [description, setDescription] = useState(initialActivity?.description || '');
  const [type, setType] = useState<ActivityType>(initialActivity?.type || 'spin_wheel');
  const [classId, setClassId] = useState<string>(initialActivity?.classId || (classes[0]?.id || ''));
  const [scoreMode, setScoreMode] = useState<ScoreMode>(initialActivity?.scoreMode || 'class');
  const [timerDuration, setTimerDuration] = useState<number>(initialActivity?.timerDuration || 20);
  const [hasTimer, setHasTimer] = useState<boolean>(initialActivity?.timerDuration ? true : false);
  const [preventRepeats, setPreventRepeats] = useState<boolean>(initialActivity?.preventQuestionRepeats ?? true);

  // Selected Question IDs
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    initialActivity?.questionIds || questions.slice(0, 10).map(q => q.id)
  );

  // Teams
  const [teams, setTeams] = useState<Team[]>(
    initialActivity?.teams && initialActivity.teams.length > 0
      ? initialActivity.teams
      : [
          { id: 't1', name: 'الفريق الأزرق (Alpha)', color: '#3b82f6', icon: 'terminal', score: 0 },
          { id: 't2', name: 'الفريق الأخضر (Beta)', color: '#10b981', icon: 'cpu', score: 0 },
        ]
  );

  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('all');
  const [selectedItemFilter, setSelectedItemFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const activityTypes: { id: ActivityType; nameAr: string; icon: React.ReactNode }[] = [
    { id: 'spin_wheel', nameAr: 'عجلة الحظ الدوارة', icon: <RotateCw className="w-4 h-4" /> },
    { id: 'question_boxes', nameAr: 'صناديق الأسئلة', icon: <Box className="w-4 h-4" /> },
    { id: 'student_picker', nameAr: 'اختيار الطلاب', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'true_false', nameAr: 'تحدي صح أو خطأ', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'speed_quiz', nameAr: 'مسابقة السرعة', icon: <Zap className="w-4 h-4" /> },
    { id: 'matching', nameAr: 'المطابقة والتوصيل', icon: <Link2 className="w-4 h-4" /> },
    { id: 'memory_cards', nameAr: 'كروت الذاكرة', icon: <Layers className="w-4 h-4" /> },
    { id: 'team_battle', nameAr: 'معركة الفرق', icon: <Swords className="w-4 h-4" /> },
    { id: 'jeopardy', nameAr: 'شبكة جيبوردي', icon: <Grid3X3 className="w-4 h-4" /> },
  ];

  const handleToggleQuestion = (id: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const ids = questions.map(q => q.id);
    setSelectedQuestionIds(ids);
  };

  const handleDeselectAll = () => {
    setSelectedQuestionIds([]);
  };

  const handleAddTeam = () => {
    if (teams.length >= 6) return;
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const icons = ['shield', 'bot', 'rocket', 'code'];
    const nextIdx = teams.length;
    setTeams([
      ...teams,
      {
        id: `t${Date.now()}`,
        name: `الفريق ${String.fromCharCode(65 + nextIdx)}`,
        color: colors[nextIdx % colors.length],
        icon: icons[nextIdx % icons.length],
        score: 0,
      },
    ]);
  };

  const handleRemoveTeam = (id: string) => {
    if (teams.length <= 2) return;
    setTeams(teams.filter(t => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى إدخال عنوان النشاط');
      soundEngine.playWrong();
      return;
    }

    if (type !== 'student_picker' && selectedQuestionIds.length === 0) {
      setError('يرجى اختيار سؤال واحد على الأقل لهذا النشاط');
      soundEngine.playWrong();
      return;
    }

    const activityData: Omit<ActivityConfig, 'id' | 'createdAt'> = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      classId: classId || undefined,
      scoreMode: type === 'team_battle' ? 'team' : scoreMode,
      teams: (scoreMode === 'team' || type === 'team_battle') ? teams : undefined,
      timerDuration: hasTimer ? timerDuration : 0,
      questionIds: selectedQuestionIds,
      preventQuestionRepeats: preventRepeats,
    };

    if (initialActivity) {
      updateActivity({
        ...activityData,
        id: initialActivity.id,
        createdAt: initialActivity.createdAt,
      });
    } else {
      addActivity(activityData);
    }

    onClose();
  };

  // Categories in bank
  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean)));

  const selectedLessonObj = lessons.find(l => l.id === selectedLessonFilter);

  const filteredQuestions = questions.filter(q => {
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
    if (selectedLessonFilter !== 'all') {
      if (selectedLessonFilter === 'none') {
        if (q.lessonId) return false;
      } else if (q.lessonId !== selectedLessonFilter) {
        return false;
      }
    }
    if (selectedItemFilter !== 'all') {
      if (selectedItemFilter === 'none') {
        if (q.itemId) return false;
      } else if (q.itemId !== selectedItemFilter) {
        return false;
      }
    }
    return true;
  });

  const handleSelectFilteredQuestions = () => {
    const idsToAdd = filteredQuestions.map(q => q.id);
    setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
    soundEngine.playCorrect();
  };

  const handleDeselectFilteredQuestions = () => {
    const idsToRemove = new Set(filteredQuestions.map(q => q.id));
    setSelectedQuestionIds(prev => prev.filter(id => !idsToRemove.has(id)));
    soundEngine.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 transition-colors animate-in fade-in duration-150">
        
        {/* Header (Fixed at top) */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {initialActivity ? 'تعديل النشاط الصفي' : 'إنشاء نشاط صفي تفاعلي جديد'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اختر قالب النشاط المناسب، وحدد الأسئلة من بنكك، واضبط قواعد التنافس
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

          {/* STEP 1: Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان النشاط (Activity Title) *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: تحدي بايثون الأسبوعي - المصفوفات والقوائم"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                وصف اختياري للنشاط
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مراجعة سريعة قبل بدء التطبيق العملي..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* STEP 2: Choose Activity Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              اختر قالب العرض التفاعلي:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {activityTypes.map((t) => {
                const isSelected = type === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      setType(t.id);
                      soundEngine.playClick();
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {t.icon}
                    </div>
                    <span className="text-xs">{t.nameAr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Linked Class & Score Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ربط بقائمة فصل دراسي (اختياري)
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">بدون ربط فصل (مفتوح للجميع)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.students?.length || 0} طالب)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نظام احتساب النقاط
              </label>
              <select
                value={scoreMode}
                onChange={(e) => setScoreMode(e.target.value as ScoreMode)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="class">نقاط الفصل الإجمالية / فردي</option>
                <option value="team">منافسة فرق وتحدي جماعي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                العداد الزمني للسؤال
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTimer}
                    onChange={(e) => setHasTimer(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>تفعيل</span>
                </label>
                {hasTimer && (
                  <input
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Number(e.target.value))}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono text-center"
                  />
                )}
                {hasTimer && <span className="text-xs text-slate-500">ثوانٍ</span>}
              </div>
            </div>
          </div>

          {/* Teams Setup if team mode */}
          {(scoreMode === 'team' || type === 'team_battle') && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">
                  فرق المنافسة الصفية ({teams.length} فرق):
                </span>
                {teams.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddTeam}
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    + إضافة فريق آخر
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teams.map((t, idx) => (
                  <div key={t.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => {
                        const updated = [...teams];
                        updated[idx].color = e.target.value;
                        setTeams(updated);
                      }}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => {
                        const updated = [...teams];
                        updated[idx].name = e.target.value;
                        setTeams(updated);
                      }}
                      className="flex-1 bg-transparent border-0 text-xs font-bold text-slate-800 focus:outline-none"
                    />
                    {teams.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTeam(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Select Questions */}
          {type !== 'student_picker' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    حدد الأسئلة التي ترغب في تضمينها بهذا النشاط:
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    تم تحديد {selectedQuestionIds.length} من إجمالي {questions.length} سؤال
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    تحديد كل البنك
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Lesson & Item Filter Toolbar */}
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Lesson Filter */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      الدرس (Lesson):
                    </label>
                    <select
                      value={selectedLessonFilter}
                      onChange={(e) => {
                        setSelectedLessonFilter(e.target.value);
                        setSelectedItemFilter('all');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">كل الدروس ({lessons.length})</option>
                      <option value="none">أسئلة عامة (بدون درس)</option>
                      {lessons.map(l => (
                        <option key={l.id} value={l.id}>
                          📁 {l.title} ({l.items?.length || 0} عناصر)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Item Filter (Active when a lesson is picked) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      عنصر الدرس (Lesson Item):
                    </label>
                    <select
                      value={selectedItemFilter}
                      onChange={(e) => setSelectedItemFilter(e.target.value)}
                      disabled={selectedLessonFilter === 'all' || selectedLessonFilter === 'none'}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <option value="all">كل عناصر هذا الدرس</option>
                      <option value="none">بدون عنصر فرعي</option>
                      {selectedLessonObj?.items?.map(it => (
                        <option key={it.id} value={it.id}>
                          📑 {it.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      المادة / التصنيف:
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">كل التصنيفات ({categories.length})</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bulk Select by Filtered Lesson / Item */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-purple-100 dark:border-purple-900/30 text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    الأسئلة المعروضة حسب التصفية: <strong className="text-slate-800 dark:text-slate-200">{filteredQuestions.length}</strong> سؤال
                  </span>

                  {filteredQuestions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectFilteredQuestions}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>
                          {selectedItemFilter !== 'all' && selectedItemFilter !== 'none'
                            ? `تحديد كل أسئلة ${selectedLessonObj?.items?.find(it => it.id === selectedItemFilter)?.title || 'هذا العنصر'}`
                            : selectedLessonFilter !== 'all' && selectedLessonFilter !== 'none'
                            ? `تحديد كل أسئلة ${selectedLessonObj?.title || 'هذا الدرس'}`
                            : 'تحديد الأسئلة المعروضة'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeselectFilteredQuestions}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        إلغاء تحديد هذه المجموعة
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-center space-y-2">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    بنك الأسئلة فارغ حالياً!
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    يرجى أولاً إضافة بعض الأسئلة باللغة الإنجليزية في بنك الأسئلة حتى تتمكن من اختيارها لهذا النشاط.
                  </p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                  لا توجد أسئلة تطابق الفلتر المحدد حالياً. جرب اختيار درس أو عنصر آخر.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                  {filteredQuestions.map((q) => {
                    const isChecked = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestion(q.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-slate-900 dark:text-white ring-1 ring-indigo-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none shrink-0"
                          />
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            {q.type.toUpperCase()}
                          </span>

                          {/* Lesson & Item Badges */}
                          {q.lessonTitle && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 flex items-center gap-1">
                              <span>📁 {q.lessonTitle}</span>
                              {q.itemTitle && <span className="opacity-80">&gt; 📑 {q.itemTitle}</span>}
                            </span>
                          )}

                          <span dir="ltr" className="text-xs font-medium text-left truncate flex-1">
                            {q.text}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                          {q.points}ن
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          </div>

          {/* Action buttons (Fixed Footer) */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shrink-0 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer transition-all hover:scale-[1.02]"
            >
              {initialActivity ? 'حفظ التعديلات' : 'إنشاء النشاط والبدء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

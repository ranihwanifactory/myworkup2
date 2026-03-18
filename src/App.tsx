import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  setDoc,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  LogOut, 
  LogIn, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  FileJson,
  ShieldCheck,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, signInWithGoogle, logout, ADMIN_EMAIL } from './firebase';
import { handleFirestoreError, OperationType } from './utils/firestore';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface WorkLog {
  id: string;
  date: string;
  title: string;
  content: string;
  author: string;
  authorEmail: string;
  createdAt: any;
  updatedAt: any;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  // Auth & Profile Listener
  useEffect(() => {
    // Test Connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check/Create Profile
        const userDoc = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDoc);
        
        const isAdmin = user.email === ADMIN_EMAIL;
        const role = isAdmin ? 'admin' : 'user';

        const profileData: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '사용자',
          photoURL: user.photoURL || '',
          role: role as 'admin' | 'user'
        };

        if (!userSnap.exists()) {
          await setDoc(userDoc, profileData);
        }
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Logs Listener
  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }

    const q = query(collection(db, 'worklogs'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkLog[];
      setLogs(logsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'worklogs');
    });

    return () => unsubscribe();
  }, [user]);

  // Calendar Logic
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const logsByDate = useMemo(() => {
    const map: Record<string, WorkLog[]> = {};
    logs.forEach(log => {
      if (!map[log.date]) map[log.date] = [];
      map[log.date].push(log);
    });
    return map;
  }, [logs]);

  // Handlers
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const logData = {
      date: dateStr,
      title: formData.title,
      content: formData.content,
      author: profile.displayName,
      authorEmail: profile.email,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingLog) {
        await updateDoc(doc(db, 'worklogs', editingLog.id), logData);
      } else {
        await addDoc(collection(db, 'worklogs'), {
          ...logData,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setEditingLog(null);
      setFormData({ title: '', content: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'worklogs');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'worklogs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `worklogs/${id}`);
    }
  };

  const handleEditLog = (log: WorkLog) => {
    setEditingLog(log);
    setFormData({ title: log.title, content: log.content });
    setSelectedDate(parseISO(log.date));
    setIsModalOpen(true);
  };

  // JSON Fetch & Store Logic
  const handleFetchJson = async () => {
    if (!profile || profile.role !== 'admin') {
      alert("관리자만 이용 가능한 기능입니다.");
      return;
    }

    setIsSyncing(true);
    try {
      // In a real app, this would be a fetch call to an external API
      // Here we simulate fetching a JSON array of logs
      const mockJsonData = [
        {
          date: format(new Date(), 'yyyy-MM-dd'),
          title: "자동 기록된 업무일지",
          content: "JSON 데이터를 통해 자동으로 기록된 내용입니다.",
          author: "시스템",
          authorEmail: ADMIN_EMAIL
        }
      ];

      for (const item of mockJsonData) {
        await addDoc(collection(db, 'worklogs'), {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      alert("데이터가 성공적으로 동기화되었습니다.");
    } catch (error) {
      console.error("Sync Error:", error);
      alert("동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-50 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 text-zinc-50 shadow-xl">
              <CalendarIcon size={40} />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900">젊은인력 업무일지</h1>
          <p className="mb-8 text-zinc-500">Google 계정으로 로그인하여 업무일지를 관리하세요.</p>
          <button 
            onClick={signInWithGoogle}
            className="btn btn-primary w-full gap-2 py-4 text-lg"
          >
            <LogIn size={20} />
            Google 계정으로 시작하기
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-bottom border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-zinc-900">업무일지 달력</h1>
              <p className="text-xs text-zinc-500">젊은인력</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && (
              <button 
                onClick={handleFetchJson}
                disabled={isSyncing}
                className="btn btn-secondary gap-2 text-xs"
              >
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <FileJson size={14} />}
                JSON 동기화
              </button>
            )}
            <div className="flex items-center gap-3 border-l border-zinc-200 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-zinc-900">{profile?.displayName}</p>
                <p className="text-xs text-zinc-500">{profile?.role === 'admin' ? '관리자' : '일반 사용자'}</p>
              </div>
              <button onClick={logout} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Calendar Section */}
          <div className="lg:col-span-8">
            <div className="card mb-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">
                  {format(currentMonth, 'yyyy년 MMMM', { locale: ko })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn btn-secondary p-2">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentMonth(new Date())} className="btn btn-secondary px-3 text-xs">오늘</button>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn btn-secondary p-2">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-100 bg-zinc-100">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="bg-zinc-50 py-2 text-center text-xs font-semibold text-zinc-500">
                    {day}
                  </div>
                ))}
                {/* Padding for start of month */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="bg-white p-4" />
                ))}
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayLogs = logsByDate[dateStr] || [];
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative flex h-24 flex-col gap-1 bg-white p-2 text-left transition-colors hover:bg-zinc-50",
                        isSelected && "bg-zinc-50 ring-2 ring-inset ring-zinc-900 z-10",
                        isToday && "bg-zinc-50"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium",
                        isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-zinc-50" : "text-zinc-900"
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {dayLogs.slice(0, 2).map(log => (
                          <div key={log.id} className="truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                            {log.title}
                          </div>
                        ))}
                        {dayLogs.length > 2 && (
                          <div className="text-[10px] font-medium text-zinc-400">
                            +{dayLogs.length - 2}개 더보기
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <div className="card">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                      {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
                    </h3>
                    <h2 className="text-xl font-bold text-zinc-900">업무 일지</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingLog(null);
                      setFormData({ title: '', content: '' });
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary h-10 w-10 rounded-full p-0"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {(logsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 rounded-full bg-zinc-100 p-3 text-zinc-400">
                        <Plus size={24} />
                      </div>
                      <p className="text-sm text-zinc-500">기록된 업무일지가 없습니다.</p>
                      <p className="text-xs text-zinc-400">새로운 일지를 추가해보세요.</p>
                    </div>
                  ) : (
                    logsByDate[format(selectedDate, 'yyyy-MM-dd')].map(log => (
                      <div key={log.id} className="group relative rounded-xl border border-zinc-100 bg-zinc-50 p-4 transition-all hover:border-zinc-200 hover:shadow-sm">
                        <div className="mb-2 flex items-start justify-between">
                          <h4 className="font-bold text-zinc-900">{log.title}</h4>
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {(profile?.role === 'admin' || log.authorEmail === user.email) && (
                              <>
                                <button onClick={() => handleEditLog(log)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-zinc-900">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteLog(log.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-red-600">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="mb-3 text-sm text-zinc-600 whitespace-pre-wrap">{log.content}</p>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-400">
                          <UserIcon size={10} />
                          <span>{log.author}</span>
                          <span>•</span>
                          <span>{log.authorEmail}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {profile?.role === 'admin' && (
                <div className="card border-zinc-900 bg-zinc-900 text-zinc-50">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="text-emerald-400" size={20} />
                    <h3 className="font-bold">관리자 모드</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">모든 사용자의 일지를 관리하고 시스템 데이터를 동기화할 수 있습니다.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">전체 일지</p>
                      <p className="text-xl font-bold">{logs.length}</p>
                    </div>
                    <div className="rounded-lg bg-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">이번 달</p>
                      <p className="text-xl font-bold">
                        {logs.filter(l => l.date.startsWith(format(currentMonth, 'yyyy-MM'))).length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="border-b border-zinc-100 p-6">
                <h2 className="text-xl font-bold text-zinc-900">
                  {editingLog ? '업무일지 수정' : '새 업무일지 작성'}
                </h2>
                <p className="text-sm text-zinc-500">
                  {format(selectedDate, 'yyyy년 M월 d일', { locale: ko })}
                </p>
              </div>
              
              <form onSubmit={handleSaveLog} className="p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">제목</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="업무 제목을 입력하세요"
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">내용</label>
                  <textarea 
                    required
                    rows={6}
                    value={formData.content}
                    onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="상세 업무 내용을 입력하세요"
                    className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-2.5 text-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary flex-1"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {editingLog ? '수정 완료' : '기록하기'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Add Button */}
      <div className="fixed bottom-8 right-8 sm:hidden">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-zinc-50 shadow-2xl hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={28} />
        </button>
      </div>
    </div>
  );
}

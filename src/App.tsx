/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2, 
  Download, 
  Upload,
  Users,
  TrendingUp,
  DollarSign,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Eraser,
  Lock,
  LogIn
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO,
  isToday,
  subDays,
  startOfToday,
  endOfToday,
  startOfYear,
  endOfYear,
  subYears
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface WorkLog {
  id: string;
  date: string;
  workType: string;
  unitPrice: number;
  workerCount: number;
  totalAmount: number;
  commissionRate: number;
  commission: number;
  workerNames: string;
  notes: string;
  createdAt: string;
}

// --- Constants ---
const STORAGE_KEY = 'workLogs_v2';
const WORK_TYPE_COLORS: Record<string, string> = {
  '건설': 'bg-blue-100 text-blue-700 border-blue-200',
  '청소': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '포장': 'bg-amber-100 text-amber-700 border-amber-200',
  '철거': 'bg-rose-100 text-rose-700 border-rose-200',
  '운반': 'bg-purple-100 text-purple-700 border-purple-200',
  '기타': 'bg-slate-100 text-slate-700 border-slate-200',
};

const getWorkTypeColor = (type: string) => {
  for (const key in WORK_TYPE_COLORS) {
    if (type.includes(key)) return WORK_TYPE_COLORS[key];
  }
  return WORK_TYPE_COLORS['기타'];
};

// --- Components ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'dashboard' | 'logs' | 'certificate' | 'settings'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setWorkLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse logs', e);
      }
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workLogs));
  }, [workLogs]);

  // --- Handlers ---
  const handleAddLogs = (logs: Omit<WorkLog, 'id' | 'createdAt'>[]) => {
    const newLogs: WorkLog[] = logs.map(log => ({
      ...log,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    setWorkLogs(prev => [...prev, ...newLogs]);
    setIsFormOpen(false);
  };

  const handleUpdateLog = (id: string, updatedFields: Partial<WorkLog>) => {
    setWorkLogs(prev => prev.map(log => log.id === id ? { ...log, ...updatedFields } : log));
    setEditingLog(null);
    setIsFormOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setWorkLogs(prev => prev.filter(log => log.id !== id));
    }
  };

  // --- Derived State ---
  const filteredLogs = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return workLogs.filter(log => log.date === dateStr);
  }, [workLogs, selectedDate]);

  const stats = useMemo(() => {
    const currentMonthStr = format(currentDate, 'yyyy-MM');
    const monthLogs = workLogs.filter(log => log.date.startsWith(currentMonthStr));
    
    return {
      totalCommission: monthLogs.reduce((sum, log) => sum + log.commission, 0),
      totalWorkers: monthLogs.reduce((sum, log) => sum + log.workerCount, 0),
      workDays: new Set(monthLogs.map(log => log.date)).size,
      totalAmount: monthLogs.reduce((sum, log) => sum + log.totalAmount, 0),
    };
  }, [workLogs, currentDate]);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#141414] font-sans">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-6 py-3 flex justify-around items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-full md:border-t-0 md:border-r">
        <div className="hidden md:flex items-center justify-center h-16 mb-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold">젊</div>
        </div>
        <NavItem icon={<CalendarIcon size={20} />} active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} label="달력" />
        <NavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="통계" />
        <NavItem icon={<ClipboardList size={20} />} active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} label="일지" />
        <NavItem icon={<FileText size={20} />} active={activeTab === 'certificate'} onClick={() => setActiveTab('certificate')} label="확인증" />
        <NavItem icon={<Settings size={20} />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="설정" />
      </nav>

      {/* Main Content */}
      <main className="pb-24 md:pb-0 md:pl-20 min-h-screen">
        <header className="p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {activeTab === 'calendar' && '업무 일정 관리'}
              {activeTab === 'dashboard' && '업무 통계 분석'}
              {activeTab === 'logs' && '전체 업무 일지'}
              {activeTab === 'certificate' && '임금 이체 확인증'}
              {activeTab === 'settings' && '시스템 설정'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setEditingLog(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span>새 일지 작성</span>
            </button>
          </div>
        </header>

        <div className="px-6 md:px-10 max-w-7xl mx-auto">
          {activeTab === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Calendar Section */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                <CalendarHeader 
                  currentDate={currentDate} 
                  onPrev={() => setCurrentDate(subMonths(currentDate, 1))}
                  onNext={() => setCurrentDate(addMonths(currentDate, 1))}
                  onToday={() => setCurrentDate(new Date())}
                />
                <CalendarGrid 
                  currentDate={currentDate} 
                  workLogs={workLogs} 
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onAddLog={() => {
                    setEditingLog(null);
                    setIsFormOpen(true);
                  }}
                />
              </div>

              {/* Detail Section */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      {selectedDate ? format(selectedDate, 'MM월 dd일') : '날짜 선택'} 업무 내역
                    </h3>
                    {selectedDate && (
                      <button 
                        onClick={() => {
                          setEditingLog(null);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-black transition-colors"
                        title="이 날짜에 새 일지 추가"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map(log => (
                        <WorkLogCard 
                          key={log.id} 
                          log={log} 
                          onEdit={() => {
                            setEditingLog(log);
                            setIsFormOpen(true);
                          }}
                          onDelete={() => handleDeleteLog(log.id)}
                        />
                      ))
                    ) : (
                      <div className="py-12 text-center text-slate-400">
                        <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                        <p>기록된 업무가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Summary Mini Card */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg shadow-slate-200">
                  <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">이번 달 요약</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{stats.totalCommission.toLocaleString()}원</p>
                      <p className="text-slate-400 text-[10px]">총 수수료</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.workDays}일</p>
                      <p className="text-slate-400 text-[10px]">총 업무일</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && <Dashboard workLogs={workLogs} stats={stats} />}
          {activeTab === 'logs' && (
            <LogsTable 
              workLogs={workLogs} 
              onEdit={(log) => {
                setEditingLog(log);
                setIsFormOpen(true);
              }} 
              onDelete={handleDeleteLog} 
            />
          )}
          {activeTab === 'certificate' && <CertificateView workLogs={workLogs} />}
          {activeTab === 'settings' && <SettingsView workLogs={workLogs} setWorkLogs={setWorkLogs} />}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isFormOpen && (
          <WorkLogForm 
            initialData={editingLog}
            onClose={() => {
              setIsFormOpen(false);
              setEditingLog(null);
            }}
            onSubmit={(data) => {
              if (editingLog) {
                handleUpdateLog(editingLog.id, data[0]);
              } else {
                handleAddLogs(data);
              }
            }}
            defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center gap-1 md:gap-3 md:w-full md:px-4 py-2 rounded-xl transition-all",
        active ? "text-black md:bg-slate-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      <div className={cn("p-2 rounded-lg", active && "bg-white shadow-sm md:bg-transparent md:shadow-none")}>
        {icon}
      </div>
      <span className="text-[10px] md:text-sm font-medium md:hidden lg:block">{label}</span>
      {active && <motion.div layoutId="activeNav" className="hidden md:block absolute left-0 w-1 h-6 bg-black rounded-r-full" />}
    </button>
  );
}

function CalendarHeader({ currentDate, onPrev, onNext, onToday }: { currentDate: Date, onPrev: () => void, onNext: () => void, onToday: () => void }) {
  return (
    <div className="p-6 border-bottom border-black/5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold">
          {format(currentDate, 'yyyy년 MM월', { locale: ko })}
        </h2>
        <button 
          onClick={onToday}
          className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        >
          오늘
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => window.print()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-black mr-2"
          title="달력 인쇄"
        >
          <Printer size={20} />
        </button>
        <button onClick={onPrev} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft size={20} />
        </button>
        <button onClick={onNext} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

function CalendarGrid({ currentDate, workLogs, selectedDate, onSelectDate, onAddLog }: { currentDate: Date, workLogs: WorkLog[], selectedDate: Date | null, onSelectDate: (d: Date) => void, onAddLog: () => void }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const logsByDate = useMemo(() => {
    const map: Record<string, WorkLog[]> = {};
    workLogs.forEach(log => {
      if (!map[log.date]) map[log.date] = [];
      map[log.date].push(log);
    });
    return map;
  }, [workLogs]);

  return (
    <div className="grid grid-cols-7 border-t border-black/5">
      {['일', '월', '화', '수', '목', '금', '토'].map(day => (
        <div key={day} className="py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-black/5">
          {day}
        </div>
      ))}
      {days.map((day, idx) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayLogs = logsByDate[dateStr] || [];
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const totalCommission = dayLogs.reduce((sum, log) => sum + log.commission, 0);

        return (
          <div 
            key={idx}
            onClick={() => onSelectDate(day)}
            className={cn(
              "min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-black/5 cursor-pointer transition-all relative group",
              !isCurrentMonth && "bg-slate-50/50 text-slate-300 print:bg-white print:text-slate-200",
              isSelected && "bg-blue-50/30 ring-1 ring-inset ring-blue-200 z-10 print:bg-white print:ring-0",
              "hover:bg-slate-50 print:bg-white"
            )}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={cn(
                "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                isToday(day) ? "bg-black text-white print:bg-slate-100 print:text-black print:border print:border-black" : isSelected ? "text-blue-600 font-bold print:text-black" : ""
              )}>
                {format(day, 'd')}
              </span>
              <div className="flex items-center gap-1">
                {totalCommission > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded print:bg-white print:border print:border-emerald-200">
                    {(totalCommission / 1000).toFixed(0)}k
                  </span>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(day);
                    onAddLog();
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-black transition-all"
                  title="이 날짜에 일지 추가"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1 overflow-hidden">
              {dayLogs.slice(0, 3).map(log => (
                <div 
                  key={log.id}
                  className={cn(
                    "text-[9px] md:text-[10px] px-1.5 py-0.5 rounded border truncate leading-tight",
                    getWorkTypeColor(log.workType)
                  )}
                >
                  <span className="font-bold mr-1">{log.workerCount}</span>
                  {log.workType}
                </div>
              ))}
              {dayLogs.length > 3 && (
                <div className="text-[9px] text-slate-400 pl-1">
                  외 {dayLogs.length - 3}건 더보기
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface WorkLogCardProps {
  log: WorkLog;
  onEdit: () => void;
  onDelete: () => void;
}

const WorkLogCard: React.FC<WorkLogCardProps> = ({ log, onEdit, onDelete }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-black/5 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border mb-2 inline-block", getWorkTypeColor(log.workType))}>
            {log.workType}
          </span>
          <h4 className="font-bold text-slate-900">{log.workType} 현장</h4>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Users size={14} />
          <span>인원: <span className="text-slate-900 font-medium">{log.workerCount}명</span></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <DollarSign size={14} />
          <span>단가: <span className="text-slate-900 font-medium">{log.unitPrice.toLocaleString()}원</span></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 col-span-2">
          <TrendingUp size={14} />
          <span>수수료: <span className="text-emerald-600 font-bold">{log.commission.toLocaleString()}원</span></span>
        </div>
      </div>

      {log.workerNames && (
        <div className="mt-3 pt-3 border-t border-black/5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">투입 인력</p>
          <p className="text-xs text-slate-600 line-clamp-2">{log.workerNames}</p>
        </div>
      )}
    </motion.div>
  );
}

interface WorkLogFormProps {
  initialData: WorkLog | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  defaultDate?: string;
}

function WorkLogForm({ initialData, onClose, onSubmit, defaultDate }: WorkLogFormProps) {
  const [formData, setFormData] = useState({
    date: initialData?.date || defaultDate || format(new Date(), 'yyyy-MM-dd'),
    endDate: initialData?.date || defaultDate || format(new Date(), 'yyyy-MM-dd'),
    isContinuous: false,
    includeSat: true,
    includeSun: true,
    workType: initialData?.workType || '',
    unitPrice: initialData?.unitPrice || 150000,
    workerCount: initialData?.workerCount || 1,
    commissionRate: initialData?.commissionRate || 10,
    workerNames: initialData?.workerNames || '',
    notes: initialData?.notes || '',
  });

  const totalAmount = formData.unitPrice * formData.workerCount;
  const commission = Math.round(totalAmount * (formData.commissionRate / 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.isContinuous && !initialData) {
      const start = parseISO(formData.date);
      const end = parseISO(formData.endDate);
      
      if (start > end) {
        alert('종료 날짜는 시작 날짜보다 빨라야 합니다.');
        return;
      }

      const dates = eachDayOfInterval({ start, end });
      const logs = dates
        .filter(date => {
          const day = date.getDay();
          if (day === 0 && !formData.includeSun) return false;
          if (day === 6 && !formData.includeSat) return false;
          return true;
        })
        .map(date => ({
          date: format(date, 'yyyy-MM-dd'),
          workType: formData.workType,
          unitPrice: formData.unitPrice,
          workerCount: formData.workerCount,
          commissionRate: formData.commissionRate,
          workerNames: formData.workerNames,
          notes: formData.notes,
          totalAmount,
          commission,
        }));

      if (logs.length === 0) {
        alert('선택한 조건에 해당하는 날짜가 없습니다.');
        return;
      }

      onSubmit(logs);
    } else {
      onSubmit([{
        date: formData.date,
        workType: formData.workType,
        unitPrice: formData.unitPrice,
        workerCount: formData.workerCount,
        commissionRate: formData.commissionRate,
        workerNames: formData.workerNames,
        notes: formData.notes,
        totalAmount,
        commission,
      }]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-bold">{initialData ? '일지 수정' : '새 일지 작성'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
          {!initialData && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <input 
                type="checkbox" 
                id="isContinuous"
                checked={formData.isContinuous}
                onChange={e => setFormData(prev => ({ ...prev, isContinuous: e.target.checked }))}
                className="w-4 h-4 rounded border-black/10 text-black focus:ring-black/5"
              />
              <label htmlFor="isContinuous" className="text-sm font-bold text-blue-700 cursor-pointer">연속 일정 일괄 기록</label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">{formData.isContinuous ? '시작 날짜' : '날짜'}</label>
              <input 
                type="date" 
                required
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
            {formData.isContinuous && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">종료 날짜</label>
                <input 
                  type="date" 
                  required
                  value={formData.endDate}
                  onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">업무 종류</label>
              <input 
                type="text" 
                required
                placeholder="예: 건설, 청소 등"
                value={formData.workType}
                onChange={e => setFormData(prev => ({ ...prev, workType: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
          </div>

          {formData.isContinuous && (
            <div className="flex gap-6 p-4 bg-slate-50 rounded-xl border border-black/5">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="includeSat"
                  checked={formData.includeSat}
                  onChange={e => setFormData(prev => ({ ...prev, includeSat: e.target.checked }))}
                  className="w-4 h-4 rounded border-black/10 text-black focus:ring-black/5"
                />
                <label htmlFor="includeSat" className="text-sm font-medium text-slate-700 cursor-pointer">토요일 포함</label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="includeSun"
                  checked={formData.includeSun}
                  onChange={e => setFormData(prev => ({ ...prev, includeSun: e.target.checked }))}
                  className="w-4 h-4 rounded border-black/10 text-black focus:ring-black/5"
                />
                <label htmlFor="includeSun" className="text-sm font-medium text-slate-700 cursor-pointer">일요일 포함</label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">단가</label>
              <input 
                type="number" 
                required
                value={formData.unitPrice}
                onChange={e => setFormData(prev => ({ ...prev, unitPrice: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">인원</label>
              <input 
                type="number" 
                required
                min="1"
                value={formData.workerCount}
                onChange={e => setFormData(prev => ({ ...prev, workerCount: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">수수료율(%)</label>
              <input 
                type="number" 
                required
                step="0.1"
                value={formData.commissionRate}
                onChange={e => setFormData(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">투입 인력 명단</label>
            <textarea 
              placeholder="이름을 쉼표로 구분하여 입력하세요"
              value={formData.workerNames}
              onChange={e => setFormData(prev => ({ ...prev, workerNames: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all h-20 resize-none"
            />
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 text-white flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">예상 수수료</p>
              <p className="text-xl font-bold text-emerald-400">{commission.toLocaleString()}원</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">총 금액</p>
              <p className="text-lg font-medium">{totalAmount.toLocaleString()}원</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-black/10 font-bold hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-black text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              {initialData ? '수정 완료' : '저장하기'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface DashboardProps {
  workLogs: WorkLog[];
  stats: {
    totalCommission: number;
    totalWorkers: number;
    workDays: number;
    totalAmount: number;
  };
}

function Dashboard({ workLogs, stats }: DashboardProps) {
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const monthLogs = workLogs.filter(log => log.date.startsWith(currentMonthStr));
  
  const typeStats = useMemo(() => {
    const statsMap: Record<string, number> = {};
    monthLogs.forEach(log => {
      statsMap[log.workType] = (statsMap[log.workType] || 0) + log.commission;
    });
    return Object.entries(statsMap).sort((a, b) => b[1] - a[1]);
  }, [monthLogs]);

  const trendData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return format(d, 'yyyy-MM');
    });

    return last6Months.map(month => {
      const logs = workLogs.filter(log => log.date.startsWith(month));
      return {
        month: format(parseISO(`${month}-01`), 'M월'),
        commission: logs.reduce((sum, log) => sum + log.commission, 0),
        amount: logs.reduce((sum, log) => sum + log.totalAmount, 0),
      };
    });
  }, [workLogs]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="이번 달 수수료" value={`${stats.totalCommission.toLocaleString()}원`} icon={<DollarSign className="text-emerald-500" />} color="emerald" />
        <StatCard title="총 투입 인원" value={`${stats.totalWorkers}명`} icon={<Users className="text-blue-500" />} color="blue" />
        <StatCard title="업무 수행일" value={`${stats.workDays}일`} icon={<CalendarIcon className="text-purple-500" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
          <h3 className="text-lg font-bold mb-6">월별 수수료 추이</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(val) => `${(val / 10000).toFixed(0)}만`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [`${val.toLocaleString()}원`, '수수료']}
                />
                <Area 
                  type="monotone" 
                  dataKey="commission" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorComm)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
          <h3 className="text-lg font-bold mb-6">업무 종류별 비중</h3>
          <div className="space-y-6">
            {typeStats.map(([type, amount]) => {
              const percentage = stats.totalCommission > 0 ? (amount / stats.totalCommission) * 100 : 0;
              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{type}</span>
                    <span className="text-slate-500">{amount.toLocaleString()}원 ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={cn("h-full rounded-full", getWorkTypeColor(type).split(' ')[0].replace('-100', '-500'))}
                    />
                  </div>
                </div>
              );
            })}
            {typeStats.length === 0 && <p className="text-center text-slate-400 py-10">데이터가 없습니다.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-5">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${color}-50`)}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function LogsTable({ workLogs, onEdit, onDelete }: { workLogs: WorkLog[], onEdit: (l: WorkLog) => void, onDelete: (id: string) => void }) {
  const sortedLogs = useMemo(() => [...workLogs].sort((a, b) => b.date.localeCompare(a.date)), [workLogs]);

  return (
    <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-black/5">
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">날짜</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">업무 종류</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">인원</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">수수료</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">투입 인력</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {sortedLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">{log.date}</td>
                <td className="px-6 py-4">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getWorkTypeColor(log.workType))}>
                    {log.workType}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-right font-medium">{log.workerCount}명</td>
                <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600">{log.commission.toLocaleString()}원</td>
                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{log.workerNames || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(log)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(log.id)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-rose-600 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400">데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CertificateView({ workLogs }: { workLogs: WorkLog[] }) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedWorker, setSelectedWorker] = useState<string>('all');

  const workers = useMemo(() => {
    const names = new Set<string>();
    workLogs.forEach(log => {
      if (log.workerNames) {
        log.workerNames.split(',').forEach(n => names.add(n.trim()));
      }
    });
    return Array.from(names).sort();
  }, [workLogs]);

  const filteredLogs = useMemo(() => {
    return workLogs.filter(log => {
      const isWithinRange = log.date >= startDate && log.date <= endDate;
      if (!isWithinRange) return false;
      if (selectedWorker === 'all') return true;
      return log.workerNames?.split(',').map(n => n.trim()).includes(selectedWorker);
    });
  }, [workLogs, startDate, endDate, selectedWorker]);

  const workerStats = useMemo(() => {
    const stats: Record<string, any> = {};
    
    filteredLogs.forEach(log => {
      const logWorkers = log.workerNames?.split(',').map(n => n.trim()).filter(n => n) || [];
      const netAmount = log.totalAmount - log.commission;
      const amountPerWorker = logWorkers.length > 0 ? netAmount / logWorkers.length : 0;
      const commissionPerWorker = logWorkers.length > 0 ? log.commission / logWorkers.length : 0;
      const totalPerWorker = logWorkers.length > 0 ? log.totalAmount / logWorkers.length : 0;

      logWorkers.forEach(worker => {
        if (selectedWorker !== 'all' && worker !== selectedWorker) return;

        if (!stats[worker]) {
          stats[worker] = {
            name: worker,
            totalDays: 0,
            totalAmount: 0,
            totalCommission: 0,
            totalNetAmount: 0,
            details: []
          };
        }

        stats[worker].totalDays += 1;
        stats[worker].totalAmount += totalPerWorker;
        stats[worker].totalCommission += commissionPerWorker;
        stats[worker].totalNetAmount += amountPerWorker;
        stats[worker].details.push({
          date: log.date,
          workType: log.workType,
          unitPrice: log.unitPrice,
          totalWorkers: logWorkers.length,
          amountPerWorker
        });
      });
    });

    return Object.values(stats).sort((a, b) => b.totalNetAmount - a.totalNetAmount);
  }, [filteredLogs, selectedWorker]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 print:p-0 print:m-0">
      {/* Filter Section */}
      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">시작일</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">종료일</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">작업자 선택</label>
            <select 
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all bg-white"
            >
              <option value="all">전체 작업자</option>
              {workers.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-2">
          <QuickFilterBtn label="최근 7일" onClick={() => {
            setStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
            setEndDate(format(new Date(), 'yyyy-MM-dd'));
          }} />
          <QuickFilterBtn label="이번 달" onClick={() => {
            setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
          }} />
          <QuickFilterBtn label="지난 달" onClick={() => {
            const lastMonth = subMonths(new Date(), 1);
            setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
          }} />
          <QuickFilterBtn label="올해 전체" onClick={() => {
            setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'));
            setEndDate(format(endOfYear(new Date()), 'yyyy-MM-dd'));
          }} />
          <button 
            onClick={handlePrint}
            className="ml-auto flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            <Printer size={16} />
            인쇄하기
          </button>
        </div>
      </div>

      {/* Certificates List */}
      <div className="space-y-10">
        {workerStats.length > 0 ? (
          workerStats.map((stats, idx) => (
            <CertificateCard key={idx} stats={stats} startDate={startDate} endDate={endDate} />
          ))
        ) : (
          <div className="bg-white p-20 rounded-3xl border border-black/5 text-center text-slate-400 print:hidden">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>해당 기간에 기록된 업무가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickFilterBtn({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all"
    >
      {label}
    </button>
  );
}

interface CertificateCardProps {
  stats: any;
  startDate: string;
  endDate: string;
}

const CertificateCard: React.FC<CertificateCardProps> = ({ stats, startDate, endDate }) => {
  return (
    <div className="certificate-container bg-white p-10 rounded-3xl border-2 border-slate-900 shadow-xl max-w-3xl mx-auto print:shadow-none print:border-slate-900 print:rounded-none print:p-8 print:m-0 print:w-full print:max-w-none page-break-after-always">
      <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
        <h2 className="text-3xl font-black tracking-tighter uppercase">임금 이체 확인증</h2>
        <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest">WAGE PAYMENT CERTIFICATE</p>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
        <h3 className="text-2xl font-black mb-4 text-slate-900">{stats.name}</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex justify-between pr-4 border-r border-slate-200">
            <span className="text-slate-500 font-bold">대상 기간</span>
            <span className="font-medium">{startDate} ~ {endDate}</span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-slate-500 font-bold">작업 일수</span>
            <span className="font-medium">{stats.totalDays}일</span>
          </div>
          <div className="flex justify-between pr-4 border-r border-slate-200">
            <span className="text-slate-500 font-bold">발행일</span>
            <span className="font-medium">{format(new Date(), 'yyyy-MM-dd')}</span>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 border-2 border-emerald-500/20 p-6 rounded-2xl mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-emerald-700 font-bold text-sm">총 작업금액</span>
          <span className="text-slate-600 font-medium">{Math.round(stats.totalAmount).toLocaleString()}원</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-emerald-700 font-bold text-sm">수수료 공제</span>
          <span className="text-rose-500 font-medium">-{Math.round(stats.totalCommission).toLocaleString()}원</span>
        </div>
        <div className="pt-4 border-t border-emerald-500/20 flex justify-between items-center">
          <span className="text-emerald-900 font-black text-lg">실 지급액</span>
          <span className="text-emerald-600 font-black text-2xl">{Math.round(stats.totalNetAmount).toLocaleString()}원</span>
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">작업 상세 내역</h4>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-bold">날짜</th>
                <th className="px-4 py-2 font-bold">작업종류</th>
                <th className="px-4 py-2 font-bold text-right">단가</th>
                <th className="px-4 py-2 font-bold text-center">인원</th>
                <th className="px-4 py-2 font-bold text-right">배분금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.details.map((d: any, i: number) => (
                <tr key={i}>
                  <td className="px-4 py-2">{d.date}</td>
                  <td className="px-4 py-2 font-medium">{d.workType}</td>
                  <td className="px-4 py-2 text-right">{d.unitPrice.toLocaleString()}원</td>
                  <td className="px-4 py-2 text-center">{d.totalWorkers}명</td>
                  <td className="px-4 py-2 text-right font-bold">{Math.round(d.amountPerWorker).toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-12">
        <SignatureBox label="근로자 서명" />
        <SignatureBox label="사업주 서명" />
      </div>

      <div className="mt-12 pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400">
        <p>※ 본 확인증은 임금 지급 내역을 확인하는 문서입니다.</p>
        <p>※ 문의사항이 있으시면 사업주에게 연락하시기 바랍니다.</p>
      </div>
    </div>
  );
}

interface SignatureBoxProps {
  label: string;
}

const SignatureBox: React.FC<SignatureBoxProps> = ({ label }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  return (
    <div className="text-center">
      <p className="text-xs font-black text-slate-900 mb-3 uppercase tracking-widest">{label}</p>
      <div className="relative group">
        <canvas 
          ref={canvasRef}
          width={250}
          height={100}
          className="border-2 border-slate-200 rounded-xl bg-slate-50 cursor-crosshair w-full h-[100px] touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <button 
          onClick={clear}
          className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-rose-500 print:hidden"
        >
          <Eraser size={14} />
        </button>
      </div>
    </div>
  );
}

function SettingsView({ workLogs, setWorkLogs }: { workLogs: WorkLog[], setWorkLogs: (logs: WorkLog[]) => void }) {
  const handleExport = () => {
    const data = JSON.stringify({ workLogs, version: '2.0', exportDate: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `인력_업무일지_${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.workLogs && Array.isArray(data.workLogs)) {
          if (confirm(`${data.workLogs.length}개의 데이터를 불러오시겠습니까? 기존 데이터는 유지됩니다.`)) {
            setWorkLogs([...workLogs, ...data.workLogs]);
          }
        }
      } catch (err) {
        alert('올바른 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
        <h3 className="text-lg font-bold mb-6">데이터 관리</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-black/5">
            <div>
              <p className="font-bold">데이터 내보내기</p>
              <p className="text-xs text-slate-500">모든 업무 일지를 JSON 파일로 저장합니다.</p>
            </div>
            <button onClick={handleExport} className="p-3 bg-white rounded-xl border border-black/10 hover:bg-slate-50 transition-all shadow-sm">
              <Download size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-black/5">
            <div>
              <p className="font-bold">데이터 가져오기</p>
              <p className="text-xs text-slate-500">백업된 JSON 파일을 불러옵니다.</p>
            </div>
            <label className="p-3 bg-white rounded-xl border border-black/10 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
              <Upload size={20} />
              <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-100">
            <div>
              <p className="font-bold text-rose-700">전체 데이터 초기화</p>
              <p className="text-xs text-rose-600/70">모든 기록을 영구적으로 삭제합니다.</p>
            </div>
            <button 
              onClick={() => {
                if (confirm('정말 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  setWorkLogs([]);
                }
              }}
              className="p-3 bg-white rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
        <h3 className="text-lg font-bold mb-4">시스템 정보</h3>
        <div className="space-y-2 text-sm text-slate-500">
          <div className="flex justify-between">
            <span>버전</span>
            <span className="font-mono">2.1.0-react</span>
          </div>
          <div className="flex justify-between">
            <span>총 데이터 수</span>
            <span className="font-mono">{workLogs.length}건</span>
          </div>
          <div className="flex justify-between">
            <span>마지막 업데이트</span>
            <span className="font-mono">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0615') {
      onLogin();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-white/10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">시스템 접속</h1>
            <p className="text-slate-500 mt-2 font-medium">관리자 비밀번호를 입력해주세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <motion.input
                  animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className={cn(
                    "w-full bg-slate-50 border-2 px-6 py-5 rounded-2xl outline-none transition-all text-xl font-bold tracking-widest text-center",
                    error ? "border-rose-500" : "border-slate-100 focus:border-slate-900"
                  )}
                  autoFocus
                />
                {error && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-rose-500 text-xs font-bold text-center mt-2 uppercase tracking-wider"
                  >
                    잘못된 비밀번호입니다
                  </motion.p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <LogIn size={20} />
              접속하기
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              인력 업무 관리 시스템 v2.1
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

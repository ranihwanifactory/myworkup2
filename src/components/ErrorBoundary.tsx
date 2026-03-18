import React, { Component } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let message = "문제가 발생했습니다.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error.includes('insufficient permissions')) {
          message = "권한이 없습니다. 관리자에게 문의하세요.";
        }
      } catch (e) {
        message = error.message || message;
      }
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-black/5 text-center max-w-md">
            <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">오류 발생</h2>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-black text-white rounded-xl font-bold"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

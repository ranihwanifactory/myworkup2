import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "알 수 없는 오류가 발생했습니다.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
          errorMessage = "권한이 없습니다. 관리자에게 문의하세요.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center">
          <div className="mb-6 rounded-full bg-red-100 p-4 text-red-600">
            <AlertCircle size={48} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">문제가 발생했습니다</h1>
          <p className="mb-8 max-w-md text-zinc-500">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary gap-2"
          >
            <RefreshCw size={18} />
            페이지 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

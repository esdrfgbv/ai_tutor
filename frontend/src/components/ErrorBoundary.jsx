import React from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-red-50 dark:bg-red-950">
          <div className="max-w-md rounded-lg bg-white dark:bg-black p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
            <h1 className="text-xl font-bold text-red-700 dark:text-red-200">Oops! Something went wrong</h1>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{this.state.error?.message}</p>
            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-4 cursor-pointer text-left">
                <summary className="font-mono text-xs text-red-500 underline">Details</summary>
                <pre className="mt-2 overflow-auto bg-red-100 dark:bg-red-900 p-2 text-xs font-mono text-red-800 dark:text-red-100">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

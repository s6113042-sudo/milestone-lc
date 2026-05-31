import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props  { children: ReactNode }
interface State  { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 600, margin: '80px auto', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: 16 }}>頁面發生錯誤</h2>
          <pre style={{
            textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 16, fontSize: 12, overflow: 'auto', color: 'var(--text)',
          }}>
            {this.state.error.message}
          </pre>
          <button
            className="btn btn-primary"
            style={{ marginTop: 24 }}
            onClick={() => this.setState({ error: null })}
          >
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

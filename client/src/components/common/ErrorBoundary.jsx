import { Component } from 'react';
import ErrorPage from '../../pages/ErrorPage';

/**
 * Top-level error boundary.
 * Catches render-time crashes anywhere in the tree and shows the branded
 * error page instead of a blank screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surfaced in the browser console; wire to a logging service in production.
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-ink-50">
          <ErrorPage error={this.state.error} />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

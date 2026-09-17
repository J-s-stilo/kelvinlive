import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "string") {
    return new Error(value);
  }

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({
  error,
  resetError,
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#070a12] p-6 text-white">
      <div className="w-full max-w-lg text-center">
        <p className="eyebrow">Application error</p>

        <h1 className="mt-4 text-2xl font-bold">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm text-slate-400">
          This part of the app encountered an error. You can try loading it
          again.
        </p>

        {import.meta.env.DEV ? (
          <pre className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-4 text-left text-xs text-slate-300">
            {error.message || String(error)}
          </pre>
        ) : null}

        <button
          type="button"
          onClick={resetError}
          className="btn-primary mt-6 rounded-xl px-5 py-3 text-sm font-semibold"
          data-testid="button-error-try-again"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): ErrorBoundaryState {
    return {
      error: toError(error),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      "ErrorBoundary caught an error:",
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      error: null,
    });
  };

  render(): ReactNode {
    const { error } = this.state;

    if (error === null) {
      return this.props.children;
    }

    const Fallback =
      this.props.FallbackComponent ?? DefaultFallback;

    return (
      <Fallback
        error={error}
        resetError={this.resetError}
      />
    );
  }
}

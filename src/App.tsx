import { type ReactNode } from "react";
import {
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
} from "wouter";

import { ErrorBoundary } from "@/components/error-boundary";
import { StudioShell } from "@/components/studio-shell";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Studio from "@/pages/studio";
import { FeedbackPage } from "@/pages/FeedbackPage";
import {
  AiObsPage,
  AnalyticsPage,
  CreditsPage,
  FeedPage,
  SettingsPage,
  TransactionsPage,
  TutorialPage,
} from "@/pages/workspace";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={Auth} />

        <Route path="/studio">
          <StudioShell>
            <Studio />
          </StudioShell>
        </Route>

        <Route path="/feed">
          <StudioShell>
            <FeedPage />
          </StudioShell>
        </Route>

        <Route path="/feedback">
          <StudioShell>
            <FeedbackPage />
          </StudioShell>
        </Route>

        <Route path="/ai-obs">
          <StudioShell>
            <AiObsPage />
          </StudioShell>
        </Route>

        <Route path="/analytics">
          <StudioShell>
            <AnalyticsPage />
          </StudioShell>
        </Route>

        <Route path="/credits">
          <StudioShell>
            <CreditsPage />
          </StudioShell>
        </Route>

        <Route path="/transactions">
          <StudioShell>
            <TransactionsPage />
          </StudioShell>
        </Route>

        <Route path="/tutorial">
          <StudioShell>
            <TutorialPage />
          </StudioShell>
        </Route>

        <Route path="/settings">
          <StudioShell>
            <SettingsPage />
          </StudioShell>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      {children}
    </ErrorBoundary>
  );
}

function App() {
  const basePath = import.meta.env.BASE_URL.replace(
    /\/$/,
    "",
  );

  return (
    <WouterRouter base={basePath}>
      <Router />
    </WouterRouter>
  );
}

export default App;

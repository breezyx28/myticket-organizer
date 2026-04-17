import { RequireOrganizer } from '@/components/auth/RequireOrganizer';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizerShell } from '@/layouts/OrganizerShell';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { HomePage } from '@/pages/dashboard/HomePage';
import { AttendancePage } from '@/pages/analytics/AttendancePage';
import { SalesAnalyticsPage } from '@/pages/analytics/SalesAnalyticsPage';
import { EventArchivePage } from '@/pages/events/EventArchivePage';
import { EventEditorPage } from '@/pages/events/EventEditorPage';
import { EventListPage } from '@/pages/events/EventListPage';
import { FinancialOverviewPage } from '@/pages/finance/FinancialOverviewPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { RatingsPage } from '@/pages/ratings/RatingsPage';
import { ScannerManagementPage } from '@/pages/scanners/ScannerManagementPage';
import { Navigate, Route, Routes } from 'react-router-dom';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        <Route path="/" element={<RequireOrganizer />}>
          <Route element={<OrganizerShell />}>
            <Route index element={<HomePage />} />
            <Route path="events" element={<EventListPage />} />
            <Route path="events/archive" element={<EventArchivePage />} />
            <Route path="events/:id" element={<EventEditorPage />} />
            <Route path="scanners" element={<ScannerManagementPage />} />
            <Route path="analytics/sales" element={<SalesAnalyticsPage />} />
            <Route path="analytics/attendance" element={<AttendancePage />} />
            <Route path="finance" element={<FinancialOverviewPage />} />
            <Route path="ratings" element={<RatingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

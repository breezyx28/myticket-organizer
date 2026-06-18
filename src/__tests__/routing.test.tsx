import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { RequireOrganizer } from '@/components/auth/RequireOrganizer';
import { LoginPage } from '@/pages/auth/LoginPage';
import { renderWithI18n } from '@/test/i18nTestUtils';

describe('routing', () => {
  it('redirects unauthenticated users away from protected routes', async () => {
    renderWithI18n(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireOrganizer />}>
              <Route path="/" element={<div>Protected</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeTruthy();
    });
  });
});

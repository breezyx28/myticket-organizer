import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { RequireOrganizer } from '@/components/auth/RequireOrganizer';
import { LoginPage } from '@/pages/auth/LoginPage';

describe('routing', () => {
  it('redirects unauthenticated users away from protected routes', async () => {
    render(
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

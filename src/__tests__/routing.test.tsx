import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { RequireOrganizer } from '@/components/auth/RequireOrganizer';
import { LoginPage } from '@/pages/auth/LoginPage';
import { store } from '@/store/store';

describe('routing', () => {
  it('redirects unauthenticated users away from protected routes', async () => {
    render(
      <Provider store={store}>
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
      </Provider>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeTruthy();
    });
  });
});

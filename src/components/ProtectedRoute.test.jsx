import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock AuthContext
const mockAuthContext = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('ProtectedRoute', () => {
  it('shows loading spinner when isLoading is true', () => {
    mockAuthContext.isLoading = true;
    mockAuthContext.isAuthenticated = false;

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockAuthContext.isLoading = false;
    mockAuthContext.isAuthenticated = false;

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    mockAuthContext.isLoading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = { isFirstLogin: false };

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to change password when isFirstLogin is true', () => {
    mockAuthContext.isLoading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = { isFirstLogin: true };

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/change-password" element={<div>Change Password</div>} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('allows access to change password page when isFirstLogin is true', () => {
    mockAuthContext.isLoading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = { isFirstLogin: true };

    render(
      <MemoryRouter initialEntries={['/change-password']}>
        <ProtectedRoute>
          <div>Change Password Page</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Change Password Page')).toBeInTheDocument();
  });
});

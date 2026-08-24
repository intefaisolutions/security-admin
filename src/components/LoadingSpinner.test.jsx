import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Custom loading text" />);
    expect(screen.getByText('Custom loading text')).toBeInTheDocument();
  });

  it('renders without text when text prop is empty', () => {
    render(<LoadingSpinner text="" />);
    expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
  });

  it('renders with correct container class', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toHaveClass('loading-spinner-container');
  });

  it('renders with size class', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    expect(container.firstChild).toHaveClass('large');
  });
});

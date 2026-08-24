import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders null when no status is provided', () => {
    const { container } = render(<StatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with active status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders success variant for active status', () => {
    const { container } = render(<StatusBadge status="active" />);
    expect(container.firstChild).toHaveClass('badge-success');
  });

  it('renders warning variant for pending status', () => {
    const { container } = render(<StatusBadge status="pending" />);
    expect(container.firstChild).toHaveClass('badge-warning');
  });

  it('renders danger variant for inactive status', () => {
    const { container } = render(<StatusBadge status="inactive" />);
    expect(container.firstChild).toHaveClass('badge-danger');
  });

  it('renders info variant for day status', () => {
    const { container } = render(<StatusBadge status="day" />);
    expect(container.firstChild).toHaveClass('badge-info');
  });

  it('renders default variant for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown" />);
    expect(container.firstChild).toHaveClass('badge-default');
  });

  it('handles case insensitive status', () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    expect(container.firstChild).toHaveClass('badge-success');
  });
});

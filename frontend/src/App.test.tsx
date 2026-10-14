import { render, screen } from '@testing-library/react';
import App from './App';

it('dựng được ứng dụng', () => {
  render(<App />);
  expect(screen.getByText(/mems/i)).toBeInTheDocument();
});

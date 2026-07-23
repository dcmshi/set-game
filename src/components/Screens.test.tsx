import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartScreen } from './StartScreen';
import { WinModal } from './WinModal';

it('start screen starts the game and shows best time when present', async () => {
  const onStart = vi.fn();
  render(<StartScreen bestMs={65400} onStart={onStart} />);
  expect(screen.getByText(/1:05\.4/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(onStart).toHaveBeenCalled();
});

it('start screen omits best time when null', () => {
  render(<StartScreen bestMs={null} onStart={() => {}} />);
  expect(screen.queryByText(/best/i)).not.toBeInTheDocument();
});

it('win modal shows the final time, a record badge, and replays', async () => {
  const onPlayAgain = vi.fn();
  render(<WinModal timeMs={90000} bestMs={90000} isRecord={true} onPlayAgain={onPlayAgain} />);
  expect(screen.getByText('1:30.0')).toBeInTheDocument();
  expect(screen.getByText(/new record/i)).toBeInTheDocument();
  expect(screen.getByText(/best time/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /play again/i }));
  expect(onPlayAgain).toHaveBeenCalled();
});

it('win modal hides the record badge when not a record', () => {
  render(<WinModal timeMs={90000} bestMs={80000} isRecord={false} onPlayAgain={() => {}} />);
  expect(screen.queryByText(/new record/i)).not.toBeInTheDocument();
});

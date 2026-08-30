import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../test/renderWithI18n';
import { StartScreen } from './StartScreen';
import { WinModal } from './WinModal';

it('start screen starts the game, shows best time, and opens how-to', async () => {
  const onStart = vi.fn();
  const onHowToPlay = vi.fn();
  renderWithI18n(
    <StartScreen bestMs={65400} onStart={onStart} onHowToPlay={onHowToPlay} onMultiplayer={() => {}} />
  );
  expect(screen.getByText(/1:05\.4/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(onStart).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: /how to play/i }));
  expect(onHowToPlay).toHaveBeenCalled();
});

it('start screen omits best time when null', () => {
  renderWithI18n(
    <StartScreen bestMs={null} onStart={() => {}} onHowToPlay={() => {}} onMultiplayer={() => {}} />
  );
  expect(screen.queryByText(/best time/i)).not.toBeInTheDocument();
});

it('win modal shows the final time, a record badge, and replays', async () => {
  const onPlayAgain = vi.fn();
  renderWithI18n(
    <WinModal timeMs={90000} bestMs={90000} isRecord={true} previousBestMs={null} mistakes={0} hintsUsed={0} onPlayAgain={onPlayAgain} />
  );
  expect(screen.getByText('1:30.0')).toBeInTheDocument();
  expect(screen.getByText(/new record/i)).toBeInTheDocument();
  expect(screen.getByText(/best time/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /play again/i }));
  expect(onPlayAgain).toHaveBeenCalled();
});

it('win modal hides the record badge when not a record', () => {
  renderWithI18n(
    <WinModal timeMs={90000} bestMs={80000} isRecord={false} previousBestMs={80000} mistakes={2} hintsUsed={1} onPlayAgain={() => {}} />
  );
  expect(screen.queryByText(/new record/i)).not.toBeInTheDocument();
});

it('win modal shows run stats and the delta over the previous best', () => {
  renderWithI18n(
    <WinModal timeMs={90000} bestMs={90000} isRecord={true} previousBestMs={102300} mistakes={2} hintsUsed={1} onPlayAgain={() => {}} />
  );
  expect(screen.getByText(/12\.3 faster than your previous best/i)).toBeInTheDocument();
  expect(screen.getByText(/mistakes/i).querySelector('strong')).toHaveTextContent('2');
  expect(screen.getByText(/hints/i).querySelector('strong')).toHaveTextContent('1');
});

it('win modal copies a shareable result line', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  renderWithI18n(
    <WinModal timeMs={161000} bestMs={161000} isRecord={true} previousBestMs={null} mistakes={1} hintsUsed={0} onPlayAgain={() => {}} />
  );
  await userEvent.click(screen.getByRole('button', { name: /copy result/i }));
  expect(writeText).toHaveBeenCalledWith('Cleared Set in 2:41.0 — mistakes: 1, hints: 0');
  expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
});

it('start screen offers a cue that jumps to the rules section', () => {
  renderWithI18n(
    <StartScreen bestMs={null} onStart={() => {}} onHowToPlay={() => {}} onMultiplayer={() => {}} />
  );
  const cue = screen.getByRole('link', { name: /rules & faq/i });
  expect(cue).toHaveAttribute('href', '#site-content');
});

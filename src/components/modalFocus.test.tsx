import { useState, type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HowToPlay } from './HowToPlay';
import { ConfirmDialog } from './ConfirmDialog';
import { WinModal } from './WinModal';

// A trigger before the modal and a plain button after it, so Tab escaping the
// dialog has somewhere real to land — without them the trap would look like it
// works simply because the dialog holds every focusable element on the page.
function Harness({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      {open && children(() => setOpen(false))}
      <button type="button">behind</button>
    </>
  );
}

const MODALS: { name: string; label: RegExp; body: (close: () => void) => ReactNode }[] = [
  {
    name: 'HowToPlay',
    label: /how to play/i,
    body: (close) => <HowToPlay onClose={close} />,
  },
  {
    name: 'ConfirmDialog',
    label: /quit game/i,
    body: (close) => (
      <ConfirmDialog
        title="Quit game?"
        body="Your time will be lost."
        confirmLabel="Quit"
        cancelLabel="Keep playing"
        onConfirm={close}
        onCancel={close}
      />
    ),
  },
  {
    name: 'WinModal',
    label: /you won/i,
    body: (close) => (
      <WinModal timeMs={65400} bestMs={65400} isRecord={false} previousBestMs={65400} mistakes={0} hintsUsed={0} onPlayAgain={close} />
    ),
  },
];

describe.each(MODALS)('$name focus management', ({ label, body }) => {
  const open = async () => {
    render(<Harness>{body}</Harness>);
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    return screen.getByRole('dialog', { name: label });
  };

  it('wraps Tab from the last control back to the first', async () => {
    const dialog = await open();
    const controls = within(dialog).getAllByRole('button');
    controls[controls.length - 1].focus();

    await userEvent.tab();

    expect(document.activeElement).toBe(controls[0]);
  });

  it('wraps Shift+Tab from the first control back to the last', async () => {
    const dialog = await open();
    const controls = within(dialog).getAllByRole('button');
    controls[0].focus();

    await userEvent.tab({ shift: true });

    expect(document.activeElement).toBe(controls[controls.length - 1]);
  });

  it('returns focus to the trigger when it closes', async () => {
    const dialog = await open();
    const trigger = screen.getByRole('button', { name: 'open' });
    expect(dialog).not.toContainElement(trigger);

    await userEvent.click(within(dialog).getAllByRole('button')[0]);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

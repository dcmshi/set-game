import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useT } from './LanguageContext';

function Probe() {
  const { t, lang, setLang } = useT();
  return (
    <div>
      <span data-testid="deck">{t('hud.deck')}</span>
      <span data-testid="best">{t('win.best', { time: '01:23.4' })}</span>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang('zh')}>to-zh</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

it('defaults to English, interpolates params', () => {
  render(<LanguageProvider><Probe /></LanguageProvider>);
  expect(screen.getByTestId('deck').textContent).toBe('Deck');
  expect(screen.getByTestId('best').textContent).toBe('Best time 01:23.4');
});

it('switches language and persists the choice', async () => {
  render(<LanguageProvider><Probe /></LanguageProvider>);
  await userEvent.click(screen.getByText('to-zh'));
  expect(screen.getByTestId('deck').textContent).toBe('牌堆');
  expect(localStorage.getItem('set-game:lang')).toBe('zh');
});

it('uses the stored language on mount', () => {
  localStorage.setItem('set-game:lang', 'zh');
  render(<LanguageProvider><Probe /></LanguageProvider>);
  expect(screen.getByTestId('lang').textContent).toBe('zh');
});

it('falls back to an English default with no provider', () => {
  render(<Probe />);
  expect(screen.getByTestId('deck').textContent).toBe('Deck');
});

// index.html ships a static lang="en" and nothing used to update it, so a French
// UI was announced to screen readers — and offered to translation tools — as
// English.
describe('the document language', () => {
  it('follows a switch', async () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(document.documentElement.lang).toBe('en');

    await userEvent.click(screen.getByText('to-zh'));
    expect(document.documentElement.lang).toBe('zh');
  });

  // A language restored from storage or detected from the browser never passes
  // through a press, so writing the attribute from the toggle would leave these
  // players mislabelled.
  it('is written for a language the player never pressed for', () => {
    localStorage.setItem('set-game:lang', 'ja');
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(document.documentElement.lang).toBe('ja');
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../test/renderWithI18n';
import { LanguageToggle } from './LanguageToggle';
import { useT } from '../i18n/LanguageContext';

function Probe() {
  const { t } = useT();
  return <span data-testid="probe">{t('hud.deck')}</span>;
}

beforeEach(() => localStorage.clear());

it('marks EN active by default and switches to Chinese on click', async () => {
  renderWithI18n(<><LanguageToggle /><Probe /></>);
  expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('probe').textContent).toBe('Deck');

  await userEvent.click(screen.getByRole('button', { name: '中' }));

  expect(screen.getByRole('button', { name: '中' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('probe').textContent).toBe('牌堆');
});

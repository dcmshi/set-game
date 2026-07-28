import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../test/renderWithI18n';
import { LanguageToggle } from './LanguageToggle';
import { useT } from '../i18n/LanguageContext';
import { LANGS } from '../i18n/detectLang';

function Probe() {
  const { t } = useT();
  return <span data-testid="probe">{t('hud.deck')}</span>;
}

beforeEach(() => localStorage.clear());

it('offers every supported language', () => {
  renderWithI18n(<LanguageToggle />);
  const options = [...screen.getByRole('combobox').querySelectorAll('option')];
  expect(options.map((o) => o.value)).toEqual([...LANGS]);
  expect(options.map((o) => o.textContent)).toEqual(['EN', '中文', 'FR', 'ES', '日本語']);
});

it('defaults to English and retranslates the UI on selection', async () => {
  renderWithI18n(<><LanguageToggle /><Probe /></>);
  const select = screen.getByRole('combobox', { name: 'Language' });
  expect(select).toHaveValue('en');
  expect(screen.getByTestId('probe').textContent).toBe('Deck');

  await userEvent.selectOptions(select, 'ja');
  expect(screen.getByTestId('probe').textContent).toBe('山札');

  await userEvent.selectOptions(screen.getByRole('combobox'), 'fr');
  expect(screen.getByTestId('probe').textContent).toBe('Pioche');
});

it('persists the choice', async () => {
  renderWithI18n(<LanguageToggle />);
  await userEvent.selectOptions(screen.getByRole('combobox'), 'es');
  expect(localStorage.getItem('set-game:lang')).toBe('es');
});

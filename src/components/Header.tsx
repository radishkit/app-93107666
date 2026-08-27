import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="radish-header">
      <h1 className="radish-header__title">{title}</h1>
      <div className="radish-header__actions">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}

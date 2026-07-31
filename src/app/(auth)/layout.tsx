import { ThemeSwitcher } from '@/components/theme/theme-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="flex justify-end p-4">
        <ThemeSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-4 pb-16">{children}</main>
    </div>
  );
}

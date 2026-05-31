import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

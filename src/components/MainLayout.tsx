import { Outlet, NavLink } from 'react-router-dom';
import { Home, Compass, Flame, MessageCircle, User } from 'lucide-react';
import clsx from 'clsx';

export default function MainLayout() {
  const navItems = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/discover', icon: Compass, label: 'Discover' },
    { to: '/sparks', icon: Flame, label: 'Sparks' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-color)] border-t border-black/10 dark:border-white/10 flex items-center justify-around px-2 z-40 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              "flex flex-col items-center justify-center w-16 h-full transition-colors",
              isActive ? "text-[var(--accent-color)]" : "opacity-50 hover:opacity-100"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

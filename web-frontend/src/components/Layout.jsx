import { NavLink } from 'react-router-dom';
import { Home, Briefcase, PlusCircle, Users, User } from 'lucide-react';

export default function Layout({ children }) {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/add', icon: PlusCircle, label: 'Add' },
    { to: '/contacts', icon: Users, label: 'Contacts' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20">{children}</main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 rounded-lg transition ${
                  isActive ? 'text-blue-500' : 'text-gray-500'
                }`
              }
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

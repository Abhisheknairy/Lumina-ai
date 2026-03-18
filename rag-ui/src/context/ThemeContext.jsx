import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage on initial load
    const saved = localStorage.getItem('theme');
    console.log('Initial theme from localStorage:', saved);
    return saved === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    console.log('Theme changed to:', isDark ? 'dark' : 'light');
    
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('Added dark class to HTML');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('Removed dark class from HTML');
    }
    
    // Verify it was added
    console.log('HTML has dark class:', root.classList.contains('dark'));
  }, [isDark]);

  const toggleTheme = () => {
    console.log('Toggle clicked! Current:', isDark);
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
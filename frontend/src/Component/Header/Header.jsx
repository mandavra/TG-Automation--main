import React from 'react';
import { MdLightMode } from "react-icons/md";
import { IoMoon } from "react-icons/io5";
import { useTheme } from '../Theme/ThemeContext';

const Header = () => {
  const { darkMode, setDarkMode } = useTheme();

  return (
    <header className="max-w-4xl mx-auto bg-gray-200 sm:rounded-xl px-6 py-3 flex items-center justify-between sm:fixed left-0 right-0 top-5 z-50 animate-fade-in-down">
      <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-sans font-medium text-lg select-none animate-bounce-slow">
        E 
      </div>
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="bg-blue-600 text-white text-base font-sans rounded-lg px-4 py-2 hover:scale-110 transition-transform duration-300"
      >
        {darkMode ? <MdLightMode /> : <IoMoon />}
      </button>
    </header>
  );
};

export default Header;

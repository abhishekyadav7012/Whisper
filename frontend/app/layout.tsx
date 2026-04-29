"use client"
import "./globals.css";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMood, setUserMood] = useState("😊");

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsLoggedIn(!!token);
    const savedMood = localStorage.getItem('currentMood');
    if (savedMood) setUserMood(savedMood);
  }, []);

  return (
    <html lang="en">
      <body className="bg-black text-white overflow-x-hidden">
        {/* Navbar remains the same */}
        <nav className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 sticky top-0 bg-black z-[100]">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-black text-blue-500 italic tracking-tighter">WHISPER.IO</Link>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <>
                <Link href="/login" className="text-sm font-bold hover:text-zinc-300 px-4">Log In</Link>
                <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 px-5 py-1.5 rounded-full text-sm font-bold transition text-white">Sign Up</Link>
              </>
            ) : (
              <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center text-xl border border-zinc-700">
                {userMood}
              </div>
            )}
          </div>
        </nav>

        {/* REMOVED THE <aside> TAG HERE */}
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 bg-black w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
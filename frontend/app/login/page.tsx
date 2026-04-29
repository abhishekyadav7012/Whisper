"use client"
import { useState } from 'react';
import Link from 'next/link';

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user.username);
        document.cookie = `token=${data.token}; path=/; max-age=3600`; 
        window.location.href = "/";
      } else {
        setError(data.msg || "Login failed.");
      }
    } catch (err) {
      setError("Server Error.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white px-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
        <h2 className="text-3xl font-black italic text-blue-500 mb-6 text-center">Welcome Back</h2>
        {error && <p className="bg-red-500/10 text-red-500 p-3 rounded-xl mb-4 text-xs border border-red-500/20 text-center">{error}</p>}
        <div className="space-y-4">
          <input className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl outline-none focus:border-blue-500 transition" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl outline-none focus:border-blue-500 transition" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold transition shadow-lg shadow-blue-900/20">Login</button>
        </div>
        <p className="mt-6 text-center text-zinc-500 text-sm">
          New here? <Link href="/signup" className="text-blue-400 hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
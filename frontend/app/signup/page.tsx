"use client"
import { useState } from 'react';
import Link from 'next/link';

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '', rePassword: '' });
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");

  const handleSignup = async () => {
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) setStep(2);
  };

  const handleVerify = async () => {
    const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, otp })
    });
    if (res.ok) window.location.href = '/login';
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-3xl font-black italic text-blue-500 mb-6">Create Account</h2>
            <input className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl outline-none focus:border-blue-500 transition" placeholder="Username" onChange={e => setForm({...form, username: e.target.value})} />
            <input className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl outline-none focus:border-blue-500 transition" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
            <input className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl outline-none focus:border-blue-500 transition" type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
            <input className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl outline-none focus:border-blue-500 transition" type="password" placeholder="Confirm Password" onChange={e => setForm({...form, rePassword: e.target.value})} />
            <button onClick={handleSignup} className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold transition shadow-lg shadow-blue-900/20">Get OTP</button>
            
            {/* Added Login Link */}
            <p className="text-center text-zinc-500 text-sm mt-4">
              Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Enter OTP</h2>
            <input className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-center tracking-widest text-xl" placeholder="000000" onChange={e => setOtp(e.target.value)} />
            <button onClick={handleVerify} className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold transition">Verify Account</button>
          </div>
        )}
      </div>
    </div>
  );
}
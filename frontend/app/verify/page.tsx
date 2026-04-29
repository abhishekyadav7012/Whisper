"use client"
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Verify() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    const id = searchParams.get('id');
    const token = searchParams.get('token');

    if (id && token) {
      fetch(`http://localhost:5000/api/auth/verify?id=${id}&token=${token}`)
        .then(res => res.json())
        .then(data => setStatus(data.msg))
        .catch(() => setStatus("Verification failed."));
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen text-white">
      <div className="bg-zinc-900 p-10 rounded-xl border border-zinc-800 text-center">
        <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
        <p className="text-blue-400 font-mono">{status}</p>
        <a href="/login" className="mt-6 inline-block text-zinc-500 hover:text-white underline">Go to Login</a>
      </div>
    </div>
  );
}
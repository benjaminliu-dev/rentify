"use client";
import Image from "next/image";
import { useState, type FormEvent } from "react";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const form = { firstName, lastName, email, password, neighbourhood };
    fetch("/api/user/register",  {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            neighborhood: neighbourhood,
            email,
            password,
            name: `${firstName} ${lastName}`,
        }),

    });
    console.log("Sign up form submitted:");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100" style={{ fontFamily: 'League Spartan, sans-serif' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 mb-3 bg-green-200 rounded-full flex items-center justify-center p-3">
            <Image
              src="/bloom-logo.png"
              alt="Bloom Logo"
              width={112}
              height={112}
              className="w-full h-full object-contain"
              unoptimized
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">bloom.</h2>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="neighbourhood" className="block text-sm font-medium text-gray-700 mb-1">
              Neighbourhood
            </label>
            <input
              id="neighbourhood"
              type="text"
              name="neighbourhood"
              placeholder="Enter your neighbourhood"
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition mt-6 shadow-md"
          >
            Sign up
          </button>
        </form>
      </div>
    </div>
  );
}

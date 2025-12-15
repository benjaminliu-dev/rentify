"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { setIdTokenCookie, withIdTokenHeader } from "@/app/lib/id_token";

export default function Signup() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        ...withIdTokenHeader({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            neighborhood: neighbourhood,
            email,
            password,
            name: `${firstName} ${lastName}`,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Registration failed (${res.status})`);
      }

      const data = await res.json();

      // Save credentials to localStorage
      if (data.idToken) {
        localStorage.setItem("idToken", data.idToken);
        localStorage.setItem("id_token", data.idToken);
        setIdTokenCookie(data.idToken);
      }
      if (data.user?.uid) {
        localStorage.setItem("user_uuid", data.user.uid);
        localStorage.setItem("userUuid", data.user.uid);
      }
      if (data.user?.email) {
        localStorage.setItem("user_email", data.user.email);
      }
      if (data.user?.name) {
        localStorage.setItem("user_name", data.user.name);
      }
      if (data.user?.neighborhood) {
        localStorage.setItem("user_neighborhood", data.user.neighborhood);
      }

      // Redirect to Browse page
      router.push("/page/browse");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100" style={{ fontFamily: 'League Spartan, sans-serif' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 mb-3 bg-green-200 rounded-full flex items-center justify-center p-3">
            <Image
              src="/bloom-logo.png"
              alt="bloom. Logo"
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
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition disabled:opacity-50"
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
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition disabled:opacity-50"
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
              required
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition disabled:opacity-50"
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
              required
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition disabled:opacity-50"
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
              required
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition mt-6 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing up..." : "Sign up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-green-600 font-medium hover:text-green-700 transition"
            >
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

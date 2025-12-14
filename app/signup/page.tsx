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

    }
    console.log("Signup form submitted:", form);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Signup</h1>
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="text"
          name="neighbourhood"
          placeholder="Neighbourhood"
          value={neighbourhood}
          onChange={(e) => setNeighbourhood(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="w-full bg-foreground text-background py-2 rounded hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Sign up
        </button>
      </form>
    </div>
  );
}

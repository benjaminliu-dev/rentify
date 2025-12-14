import Image from "next/image";

export default function Listing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
          <form>
            <h1>Login</h1>
            <input type="text" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded hover:bg-[#383838] dark:hover:bg-[#ccc]">
              Login
            </button>
          </form>
    </div>
  );
}
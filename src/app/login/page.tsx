"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { BookOpen, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { MagicCard } from "@/components/magicui/magic-card";
import { InteractiveGridPattern } from "@/components/magicui/interactive-grid-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ModeToggle";
import { cn } from "@/lib/utils";
import { loginPatron } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.target as HTMLFormElement);

    startTransition(async () => {
      const result = await loginPatron(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push("/dashboard");
      }
    });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      {/* 1. The Interactive Background */}
      <InteractiveGridPattern
        // width={40} height={40} // Optional: Adjusts box size (default is 40)
        className={cn(
          // 1. Full Screen Coverage: removed skew and negative margins
          "absolute inset-0 h-full w-full",
          // 2. Base Grid Color: Make lines subtle (optional)
          "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
        )}
        // 3. Hover Color: This changes the gray to your brand color (Primary) with 20% opacity
        squaresClassName="hover:fill-primary/20 dark:hover:fill-primary/40"
      />

      {/* Top Right: Theme Toggle */}
      <div className="absolute right-4 top-4 z-50">
        <ModeToggle />
      </div>

      {/* 2. The Login Card */}
      <div className="z-10 w-full max-w-md px-8">
        <MagicCard
          className="flex flex-col items-center justify-center p-8 shadow-2xl"
          gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
        >
          {/* Logo */}
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen size={24} />
          </div>

          <h1 className="mb-2 text-2xl font-bold tracking-tight">Welcome Back</h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Enter your MIT-WPU credentials to access the library portal.
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="w-full space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Input
                name="username"
                type="email"
                placeholder="student@mitwpu.edu.in"
                pattern="^[a-zA-Z0-9._%+-]+@mitwpu\\.edu\\.in$"
                title="Please use your official @mitwpu.edu.in email address"
                required
                className="bg-background/50 backdrop-blur-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  className="bg-background/50 pr-10 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button className="group w-full" disabled={isPending}>
              {isPending ? "Authenticating..." : "Sign In"}
              {!isPending && (
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>
          </form>

          <div className="mt-6 text-xs text-muted-foreground">
            Forgot password?{" "}
            <span className="cursor-pointer underline hover:text-primary">Contact Admin</span>
          </div>
        </MagicCard>
      </div>
    </div>
  );
}

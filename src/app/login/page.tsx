"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { BookOpen, ArrowRight } from "lucide-react";
import { MagicCard } from "@/components/magicui/magic-card";
import { InteractiveGridPattern } from "@/components/magicui/interactive-grid-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ModeToggle";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API delay for dramatic effect
    setTimeout(() => {
      router.push("/dashboard"); // Redirect to Landing Page
    }, 1500);
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
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* 2. The Login Card */}
      <div className="z-10 w-full max-w-md px-8">
        <MagicCard
          className="flex flex-col items-center justify-center p-8 shadow-2xl"
          gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
        >
          {/* Logo */}
          <div className="mb-6 h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <BookOpen size={24} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-center mb-8 text-sm">
            Enter your MIT-WPU credentials to access the library portal.
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="student@mitwpu.edu.in" 
                required 
                className="bg-background/50 backdrop-blur-sm"
              />
            </div>
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="••••••••" 
                required 
                className="bg-background/50 backdrop-blur-sm"
              />
            </div>
            
            <Button className="w-full group" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Sign In"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>

          <div className="mt-6 text-xs text-muted-foreground">
            Forgot password? <span className="underline cursor-pointer hover:text-primary">Contact Admin</span>
          </div>
        </MagicCard>
      </div>
    </div>
  );
}
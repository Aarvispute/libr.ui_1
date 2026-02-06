"use client";

import Link from "next/link";
import { 
  BookOpen, 
  Menu, 
  Search, 
  User, 
  Filter, 
  Bell, 
  MessageSquare, 
  Clock, 
  MapPin, 
  Image as ImageIcon 
} from "lucide-react";
import { useState } from "react"; // Import useState
import { SpinningWheel, WHEEL_ITEMS } from "@/components/SpinningWheel";
import { NewArrivals } from "@/components/explore/NewArrivals";
import { Gallery } from "@/components/explore/Gallery";
import { Locations } from "@/components/explore/Locations";
import { Feedback } from "@/components/explore/Feedback";
import Image from "next/image";
import {FlickeringGrid} from "@/components/magicui/flickering-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/ModeToggle"; 
import { X } from "lucide-react";

function Navbar() {
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Rules", href: "/rules" },
    { name: "P.Y.Q", href: "/papers" },
    { name: "E-Resources", href: "/resources" },
    { name: "Book Rooms", href: "/rooms" },
  ];

  return (
    <nav className="relative w-full h-24 border-b bg-background/5">
      
      {/* 2. BACKGROUND: FLICKERING GRID */}
      <div className="absolute inset-0 z-0">
         <FlickeringGrid
            className="size-full"
            squareSize={4}
            gridGap={6}
            color="#6B7280"
            maxOpacity={0.2}
            flickerChance={0.1}
            height={96} 
            width={2000} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90" />
      </div>

      {/* 3. CONTENT LAYER */}
      {/* items-start is crucial here: it lets the HUD stick to the top */}
      <div className="container relative z-10 h-full flex items-start px-4">
        
        {/* LEFT: LOGO (Self-Center forces it to middle vertically) */}
        <div className="flex self-center mr-4">
            <div className="md:hidden mr-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <div className="flex flex-col gap-4 mt-8">
                    {navLinks.map((link) => (
                      <Link key={link.name} href={link.href} className="text-lg font-medium">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <Link href="/" className="relative h-12 w-48 transition-opacity hover:opacity-80">
                {/* Replaced Text with larger Logo Area */}
                <Image 
                  src="/mit-logo.avif" 
                  alt="MIT-WPU Logo" 
                  fill 
                  className="object-contain object-left" // object-left aligns it to the start
                  priority
                />
            </Link>
        </div>

        {/* CENTER: HANGING HUD */}
        {/* flex-1 means: "Occupy all space between Logo and Profile" */}
        {/* justify-center means: "Center the HUD within that specific space" */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="flex items-center gap-1 rounded-b-2xl rounded-t-none border-x border-b border-t-0 bg-background/60 backdrop-blur-xl px-6 py-4 shadow-sm mt-[-1px]">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-all"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT: PROFILE (Self-Center forces it to middle vertically) */}
        <div className="flex items-center gap-2 ml-4 self-center">
          <ModeToggle />
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Button>
        </div>

      </div>
    </nav>
  );
}

// --- 2. MAIN PAGE LAYOUT ---
export default function Home() {
  const [activeSection, setActiveSection] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false); // ✅ Necessary state

  // Render Helper
  const renderContent = () => {
    switch (activeSection) {
        case 0: return <NewArrivals />; // ✅ No props passed here anymore
        case 1: return <Gallery />;
        case 2: return <Locations />;
        case 3: return <Feedback />;
        default: return <NewArrivals />;
    }
  };

  const activeItem = WHEEL_ITEMS[activeSection];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 h-[calc(100vh-5rem)]">
        
        {/* LEFT SECTION (Dashboard) */}
        <div className="flex-1 flex flex-col gap-8">
           {/* Search Bar */}
           <div className="flex gap-2">
            <Button variant="outline" className="gap-2 hidden sm:flex"><Filter className="h-4 w-4" /> Filter</Button>
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search catalog..." className="pl-9 h-10 w-full" /></div>
            <Button size="icon"><Search className="h-4 w-4" /></Button>
           </div>
           
           {/* Grid Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">AI Assistant</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Ask Me</div><p className="text-xs text-muted-foreground mt-1">"Where is the shelf for Operating Systems?"</p></CardContent></Card>
              <Card className="hover:shadow-md transition-all"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Notifications</CardTitle><Bell className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent className="space-y-2"><div className="flex justify-between items-center"><span className="text-sm">Pending Returns</span><Badge variant="destructive">0</Badge></div><div className="flex justify-between items-center"><span className="text-sm">Alerts</span><Badge variant="secondary">2</Badge></div></CardContent></Card>
              <Card className="hover:shadow-md transition-all md:col-span-1"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Your Books</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between border-b pb-2"><div><p className="text-sm font-medium">Adv. CPP</p><p className="text-xs text-muted-foreground">Due: 2/2/2026</p></div><Clock className="h-4 w-4 text-yellow-500" /></div><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Adv. Java</p><p className="text-xs text-muted-foreground">Due: 4/2/2026</p></div><Clock className="h-4 w-4 text-green-500" /></div></CardContent></Card>
              <Card className="hover:shadow-md transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Publications</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">2</div><p className="text-xs text-muted-foreground">New papers uploaded this week.</p></CardContent></Card>
           </div>
        </div>

        {/* RIGHT SECTION (Wheel) */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          <div className="hidden lg:flex flex-col h-full gap-4">
              
              {/* Dynamic Content Display */}
              <div className="h-[45%] flex flex-col">
                   <div className={`flex items-center gap-2 text-sm font-bold tracking-widest mb-3 uppercase transition-colors duration-300 ${activeItem.color}`}>
                      <activeItem.icon className="h-4 w-4" />
                      {activeItem.label}
                  </div>
                  <div className="flex-1 relative rounded-2xl border bg-background/40 backdrop-blur-xl p-1 overflow-hidden shadow-sm ring-1 ring-border/50">
                    <div className="h-full w-full rounded-xl overflow-hidden bg-background/40">
                        {renderContent()}
                    </div>
                  </div>
              </div>

              {/* Control Wheel */}
              <div className="h-[55%] flex items-end justify-center pb-4">
                  {/* ✅ FIXED: Clean props that match SpinningWheel.tsx */}
                  <SpinningWheel 
                    activeId={activeSection} 
                    onIdChange={setActiveSection}
                    onOpenGallery={() => setIsGalleryOpen(true)}
                  />
              </div>

          </div>
        </div>

      </main>

      {/* Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
            <button 
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white border border-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="w-full max-w-6xl h-[80vh] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
               <Gallery />
            </div>
        </div>
      )}

    </div>
  );
}
"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

const libraries = [
  { name: "Agastya (Central Campus)", query: "Agastya (Knowledge Resource Center)" },
  { name: "Vyas", query: "Vyas Library" },
  { name: "Law School Library", query: "Sarswati - MIT School of Law" },
  { name: "Vivekanand Library", query: "Shri Sant Dnyaneshwar World Peace Library" },
  { name: "Digital Library", query: "Agastya MIT-WPU Central Library" },
];


export function Locations() {
  const [value, setValue] = useState<string | undefined>();
  const [selectKey, setSelectKey] = useState(0); // 🔑 force remount

const handleSelect = (query: string) => {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Native map app
    window.location.href = `geo:0,0?q=${encodeURIComponent(query)}`;
  } else {
    // Desktop fallback
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
};


  return (
    <div className="h-full w-full flex flex-col justify-center p-4">
      <div className="flex items-center gap-2 mb-4 text-red-500">
        <MapPin className="h-6 w-6" />
        <h3 className="text-lg font-semibold">Find a Library</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Select a department below to open its exact location on Google Maps.
      </p>

      <Select
  key={selectKey}
  value={value}
  onValueChange={handleSelect}
>
  <SelectTrigger className="w-full h-14 text-base bg-background/50 backdrop-blur-sm">
    <SelectValue placeholder="Select Department..." />
  </SelectTrigger>

  <SelectContent>
    {libraries.map((lib) => (
      <SelectItem key={lib.name} value={lib.query}>
        {lib.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

    </div>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

export function Feedback() {
  return (
    <div className="h-full w-full flex flex-col p-2">
      <div className="flex items-center gap-2 mb-2 text-yellow-500">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-base font-semibold">Quick Feedback</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Suggest a purchase, report an issue, or tell us what you think.
      </p>
      <Textarea 
        placeholder="Type your message here..." 
        className="flex-1 mb-4 resize-none bg-background/50 backdrop-blur-sm" 
      />
      <Button className="w-full gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
        Send Message <MessageSquare className="h-4 w-4" />
      </Button>
    </div>
  );
}
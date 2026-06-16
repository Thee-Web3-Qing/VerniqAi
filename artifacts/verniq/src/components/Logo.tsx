import { Sparkles } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={"flex items-center gap-2 " + (className || "")}>
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-primary-foreground" />
      </div>
      <span className="font-bold text-sm tracking-widest uppercase text-foreground">VERNIQ</span>
    </div>
  );
}
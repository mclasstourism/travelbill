import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";

interface ThemeToggleProps {
  variant?: "ghost" | "outline";
}

export function ThemeToggle({ variant = "ghost" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      className="relative"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

import { type FormEvent, KeyboardEvent, useState } from "react";
import { CornerDownLeft } from "lucide-react";

type StarterInputProps = {
  onSubmit: (value: string) => void;
};

const StarterInput = ({ onSubmit }: StarterInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = inputValue.trim();
    if (!prompt) {
      return;
    }

    onSubmit(prompt);
  };

  const showAnimatedPrompt = !isFocused && inputValue.trim() === "";

  return (
    <form
      className="flex w-full items-center justify-between gap-4"
      onSubmit={handleSubmit}
    >
      <div className="relative min-w-0 flex-1">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm transition-opacity ${showAnimatedPrompt ? "opacity-100" : "opacity-0"}`}
        >
          <span data-typing-target className="typing-text text-white " />
          <span
            data-typing-cursor
            className="typing-cursor inline-block h-4 w-0.5 bg-zinc-300"
          />
        </div>

        <label htmlFor="landing-starter-input" className="sr-only">
          Describe what you want to generate
        </label>
        <input
          id="landing-starter-input"
          className="mono w-full border-none bg-transparent text-white placeholder:text-zinc-500 focus:outline-none"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter" && !event.shiftKey) {
              onSubmit(inputValue.trim());
            }
          }}
          placeholder={
            isFocused ? "Generate a sleek fintech mobile app..." : ""
          }
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <button
        type="submit"
        className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Submit prompt"
        disabled={inputValue.trim().length === 0}
      >
        <CornerDownLeft className="h-4 w-4 transition-transform group-hover:-translate-y-px" />
      </button>
    </form>
  );
};

export default StarterInput;

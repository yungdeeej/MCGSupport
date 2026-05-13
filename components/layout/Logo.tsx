export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden
        className="h-8 w-8"
      >
        <rect width="32" height="32" rx="8" fill="#fa991d" />
        <path
          d="M9 23V9h3.6l3.5 9.4L19.6 9H23v14h-3v-9l-3.2 9h-1.6l-3.2-9v9H9z"
          fill="#fff"
        />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold tracking-tightish">MCG Support</span>
        <span className="text-[11px] text-muted-foreground">Career College · Alberta</span>
      </span>
    </span>
  );
}

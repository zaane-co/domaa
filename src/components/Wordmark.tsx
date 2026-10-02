export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-medium tracking-tight ${className}`}>
      <span className="h-[1.1em] w-[1.1em] rounded-full border-2 border-current" aria-hidden />
      domaa
    </span>
  );
}

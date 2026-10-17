// A ring that turns while something is awaited. It is hidden from a screen
// reader, so what is awaited must be said beside it in words. It keeps still
// for those who ask for less motion, and is drawn in the colour of the text
// around it, so that it stands out from what it sits on as that text does.
export default function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
      className={`${className} motion-safe:animate-spin`}
    >
      <circle cx="12" cy="12" r="9" strokeOpacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}

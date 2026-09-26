import Button from "./Button";

export default function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="h-11 w-11 rounded-md bg-signal-red/10 flex items-center justify-center text-signal-red">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.36 20h17.28a1.5 1.5 0 001.25-2.32L13.71 3.86a1.5 1.5 0 00-2.42 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink-900">Couldn't load this data</p>
        <p className="text-sm text-steel-500 max-w-sm">{message}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

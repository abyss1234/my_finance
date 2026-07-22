type Props = {
  rows?: number;
  className?: string;
};

export default function LoadingSkeleton({ rows = 3, className = '' }: Props) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-10 rounded-md bg-zinc-100"
          style={{ width: `${100 - (index % 3) * 9}%` }}
        />
      ))}
    </div>
  );
}

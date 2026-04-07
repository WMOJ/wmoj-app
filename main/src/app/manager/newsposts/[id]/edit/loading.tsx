export default function Loading() {
  return (
    <div className="w-full space-y-6 animate-pulse max-w-4xl">
      <div className="h-7 w-48 bg-surface-2 rounded-md" />
      <div className="h-4 w-72 bg-surface-2 rounded-md" />
      <div className="h-10 w-full bg-surface-2 rounded-md" />
      <div className="h-[500px] w-full bg-surface-2 rounded-md" />
    </div>
  );
}

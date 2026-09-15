export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="h-16 w-full animate-pulse border-b border-gold/10 bg-cream-100/60 motion-reduce:animate-none" />
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 py-24">
        <div className="h-4 w-48 animate-pulse rounded bg-cream-100 motion-reduce:animate-none" />
        <div className="h-10 w-full max-w-xl animate-pulse rounded bg-cream-100 motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-cream-100 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

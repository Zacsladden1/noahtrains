export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="animate-spin rounded-full border-2 border-white/20 border-t-gold h-10 w-10" />
    </div>
  );
}



export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full border-2 border-gold/30 border-t-gold h-10 w-10" />
    </div>
  );
}



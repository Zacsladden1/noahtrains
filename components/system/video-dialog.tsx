'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';

type VideoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
};

export function VideoDialog({ open, onOpenChange, url, title }: VideoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-black border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-base">
            {title || 'Video'}
          </DialogTitle>
        </DialogHeader>
        <div className="w-full">
          <AspectRatio ratio={16 / 9}>
            <video
              className="h-full w-full rounded-md bg-black"
              src={url}
              controls
              playsInline
              // @ts-ignore - vendor attribute for iOS inline playback in PWAs
              webkit-playsinline="true"
              preload="metadata"
            />
          </AspectRatio>
        </div>
      </DialogContent>
    </Dialog>
  );
}



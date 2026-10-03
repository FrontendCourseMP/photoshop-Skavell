import { forwardRef, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import type { DialogProps } from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import type { PaperProps } from '@mui/material/Paper';
import { useForkRef } from '@mui/material/utils';
import OpenWithIcon from '@mui/icons-material/OpenWith';

const HANDLE = '[data-dialog-drag-handle]';
const GAP = 8;

const DraggablePaper = forwardRef<HTMLDivElement, PaperProps>(function DraggablePaper(props, ref) {
  const paperRef = useRef<HTMLDivElement>(null);
  const mergedRef = useForkRef(paperRef, ref);
  const offset = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  // Move the paper only: dragging must not rerun image processing or remount inputs.
  function move(dx: number, dy: number) {
    const paper = paperRef.current;
    if (!paper) return;
    const rect = paper.getBoundingClientRect();
    const viewport = paper.ownerDocument.documentElement;
    offset.current.x += Math.max(GAP - rect.left, Math.min(dx, viewport.clientWidth - GAP - rect.right));
    offset.current.y += Math.max(GAP - rect.top, Math.min(dy, viewport.clientHeight - GAP - rect.bottom));
    paper.style.translate = `${offset.current.x}px ${offset.current.y}px`;
  }

  useEffect(() => {
    const paper = paperRef.current;
    const win = paper?.ownerDocument.defaultView;
    if (!paper || !win) return;
    const constrain = () => move(0, 0);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(constrain);
    observer?.observe(paper);
    win.addEventListener('resize', constrain);
    return () => {
      observer?.disconnect();
      win.removeEventListener('resize', constrain);
    };
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || drag.current) return;
    const handle = (event.target as Element).closest<HTMLElement>(HANDLE);
    if (!handle) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.dataset.dragging = 'true';
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = drag.current;
    if (!previous || previous.id !== event.pointerId) return;
    move(event.clientX - previous.x, event.clientY - previous.y);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.target as Element).matches(HANDLE)) return;
    const step = event.shiftKey ? 40 : 10;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    move(...delta);
  }

  return <Paper {...props} ref={mergedRef} onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}
    onLostPointerCapture={stopDrag} onKeyDown={handleKeyDown} />;
});

type Props = Pick<DialogProps, 'open' | 'onClose' | 'maxWidth' | 'children'> & { title: string };

export function DraggableDialog({ title, children, ...props }: Props) {
  const titleId = useId();
  return (
    <Dialog {...props} fullWidth aria-labelledby={titleId} PaperComponent={DraggablePaper}
      slotProps={{ backdrop: { invisible: true } }}>
      <DialogTitle id={titleId} data-dialog-drag-handle tabIndex={0}
        title="Перетащите за заголовок или используйте стрелки клавиатуры"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1, cursor: 'grab',
          touchAction: 'none', userSelect: 'none',
          '[data-dragging="true"] &': { cursor: 'grabbing' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }}>
        <OpenWithIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
        {title}
      </DialogTitle>
      {children}
    </Dialog>
  );
}

import { useEffect, useLayoutEffect, useRef, useState, ReactNode } from 'react';

interface ChartContainerProps {
  minHeight?: number;
  className?: string;
  children: (ready: boolean, dims: { w: number; h: number }) => ReactNode;
}

export default function ChartContainer({
  minHeight = 260,
  className = '',
  children
}: ChartContainerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const updateDimensions = () => {
      const rect = el.getBoundingClientRect();
      setDims({
        w: Math.floor(rect.width),
        h: Math.max(minHeight, Math.floor(rect.height))
      });
    };

    const ro = new ResizeObserver(updateDimensions);
    ro.observe(el);
    updateDimensions();

    return () => ro.disconnect();
  }, [minHeight]);

  const ready = dims.w > 0 && dims.h >= minHeight;

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: `${minHeight}px` }}
    >
      {children(ready, dims)}
    </div>
  );
}

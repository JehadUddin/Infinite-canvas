import React, { memo } from 'react';
import { Handle } from '../types';

interface ResizeHandlesProps {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>, handle: Handle) => void;
}

export const ResizeHandles = memo(({ onPointerDown }: ResizeHandlesProps) => {
    const handles: Handle[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'];
    return (
        <>
            {handles.map(handle => (
                <div
                    key={handle}
                    className={`resize-handle ${handle.replace('-', ' ')}`}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onPointerDown(e, handle);
                    }}
                />
            ))}
        </>
    );
});
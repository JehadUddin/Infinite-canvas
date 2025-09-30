import React, { memo } from 'react';
import { ShapeType } from '../types';
import { CylinderIcon, TerminatorIcon, DecisionIcon, StarIcon } from './Icons';

interface ShapePickerProps {
    onShapeSelect: (shape: ShapeType) => void;
}

export const ShapePicker = memo(({ onShapeSelect }: ShapePickerProps) => {
    const shapes: { name: ShapeType; icon: React.ReactNode }[] = [
        { name: 'cylinder', icon: <CylinderIcon /> },
        { name: 'terminator', icon: <TerminatorIcon /> },
        { name: 'decision', icon: <DecisionIcon /> },
        { name: 'star', icon: <StarIcon /> },
    ];
    return (
        <div className="shape-picker">
            {shapes.map(({ name, icon }) => (
                <button
                    key={name}
                    className="tool-button"
                    onClick={() => onShapeSelect(name)}
                    title={name.charAt(0).toUpperCase() + name.slice(1)}
                >
                    {icon}
                </button>
            ))}
        </div>
    );
});

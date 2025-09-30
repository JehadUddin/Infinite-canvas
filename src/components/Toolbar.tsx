import React, { memo } from 'react';
import { Tool } from '../types';
import { ArrowIcon, PanningIcon, StickyNoteIcon, RectangleIcon, EllipseIcon, TextIcon, FrameIcon } from './Icons';

interface ToolbarProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    onMoreShapesClick: () => void;
}

export const Toolbar = memo(({ activeTool, onToolChange, onMoreShapesClick }: ToolbarProps) => {
    const tools: { name: Tool; icon: React.ReactNode }[] = [
        { name: 'select', icon: <ArrowIcon isToolbarIcon /> },
        { name: 'pan', icon: <PanningIcon isToolbarIcon /> },
        { name: 'frame', icon: <FrameIcon className="w-6 h-6"/> },
        { name: 'sticky-note', icon: <StickyNoteIcon className="w-6 h-6"/> },
        { name: 'rectangle', icon: <RectangleIcon className="w-6 h-6"/> },
        { name: 'ellipse', icon: <EllipseIcon className="w-6 h-6"/> },
        { name: 'text', icon: <TextIcon className="w-6 h-6"/> },
    ];

    return (
        <div className="toolbar">
            {tools.map(({ name, icon }) => (
                <button
                    key={name}
                    className={`tool-button ${activeTool === name ? 'active' : ''}`}
                    onClick={() => onToolChange(name)}
                    title={name.charAt(0).toUpperCase() + name.slice(1)}
                >
                    {icon}
                </button>
            ))}
            <button className="tool-button" onClick={onMoreShapesClick} title="More shapes">
                <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M8 8H4V4h4v4zm6 12h-4v-4h4v4zm-6 0H4v-4h4v4zm0-6H4v-4h4v4zm6 0h-4v-4h4v4zm6-10v4h-4V4h4zm-6 4h-4V4h4v4zm6 6h-4v-4h4v4zm0 6h-4v-4h4v4z"></path></svg>
            </button>
        </div>
    );
});
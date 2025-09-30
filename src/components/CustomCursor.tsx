import React from 'react';
import { createPortal } from 'react-dom';
import { InteractionMode, Tool, INTERACTION_MODE } from '../types';
import { allShapeTypes } from '../constants';
import { ArrowIcon, PanningIcon, GrabbingIcon, CrosshairIcon } from './Icons';

interface CustomCursorProps {
  mousePosition: { x: number; y: number };
  interactionMode: InteractionMode;
  activeTool: Tool;
  isVisible: boolean;
}

export const CustomCursor = ({ mousePosition, interactionMode, activeTool, isVisible }: CustomCursorProps) => {
    if (!isVisible) return null;

    let cursorIcon;
    if (interactionMode === INTERACTION_MODE.PANNING) {
        cursorIcon = <PanningIcon />;
    } else if (interactionMode === INTERACTION_MODE.DRAGGING_ITEMS) {
        cursorIcon = <GrabbingIcon />;
    } else if (interactionMode === INTERACTION_MODE.RESIZING_ITEM) {
        return null;
    } else if (allShapeTypes.includes(activeTool as any)) {
        cursorIcon = <CrosshairIcon />;
    } else {
        cursorIcon = <ArrowIcon />;
    }

    return createPortal(
        <div
            className="fixed top-0 left-0 pointer-events-none"
            style={{
                transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
                zIndex: 9999,
            }}
        >
            {cursorIcon}
        </div>,
        document.body
    );
};

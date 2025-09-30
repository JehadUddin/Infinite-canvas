import React, { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Item, Handle } from '../types';
import { ResizeHandles } from './ResizeHandles';

interface ItemCardProps {
  item: Item;
  onTextChange: (itemId: string, newText: string) => void;
  onTextCommit: (itemId: string, from: string, to: string) => void;
  isSelected: boolean;
  isSinglySelected: boolean;
  isHovered: boolean;
  isGroupMemberOfSelection: boolean;
  onResizePointerDown: (e: React.PointerEvent<HTMLDivElement>, handle: Handle, item: Item) => void;
  startEditing?: boolean;
}

export const ItemCard = memo(({ item, onTextChange, onTextCommit, isSelected, isSinglySelected, isHovered, onResizePointerDown, startEditing = false }: ItemCardProps) => {
  const [isEditing, setIsEditing] = useState(startEditing);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const initialTextOnEdit = useRef<string>('');

  const isTextualItem = item.type === 'text' || item.type === 'sticky-note';

  useEffect(() => {
    if (startEditing && isTextualItem) {
        initialTextOnEdit.current = item.text;
        setIsEditing(true);
    }
  }, [startEditing, item.text, isTextualItem]);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (isTitleEditing) {
      initialTextOnEdit.current = item.text;
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isTitleEditing, item.text]);

  const handleDoubleClick = () => {
    if (item.isLocked || !isTextualItem) return;
    if (!isEditing) {
        initialTextOnEdit.current = item.text;
        setIsEditing(true);
    }
  }

  const handleBlur = () => {
    if (initialTextOnEdit.current !== item.text) {
        onTextCommit(item.id, initialTextOnEdit.current, item.text);
    }
    setIsEditing(false);
  }

  const handleTitleDoubleClick = () => {
    if (item.isLocked) return;
    setIsTitleEditing(true);
  };

  const handleTitleBlur = () => {
    if (initialTextOnEdit.current !== item.text) {
        onTextCommit(item.id, initialTextOnEdit.current, item.text);
    }
    setIsTitleEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleBlur();
    if (e.key === 'Escape') {
      onTextChange(item.id, initialTextOnEdit.current);
      setIsTitleEditing(false);
    }
    e.stopPropagation();
  };

  // Groups retain their unique styling.
  if (item.type === 'group') {
      return (
          <motion.div
              data-item-id={item.id}
              className={`item-card absolute pointer-events-none group-item ${isSelected ? 'selected' : ''}`}
              style={{ x: item.x, y: item.y, touchAction: 'none', width: item.width, height: item.height, opacity: item.opacity ?? 1 }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: item.opacity ?? 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
      );
  }

  // All other items are styled as "Frames".
  const borderClass = isSinglySelected
    ? 'border-2 border-blue-500'
    : isSelected
    ? 'border-2 border-blue-300'
    : isHovered
    ? 'border border-purple-400'
    : 'border border-stone-200';

  const containerClasses = `item-card absolute flex flex-col items-center justify-center ${borderClass} ${item.type === 'frame' ? 'overflow-hidden' : ''}`;
  
  let itemSpecificContent;
  const fill = item.backgroundColor || 'transparent';

  switch (item.type) {
    case 'image':
      itemSpecificContent = <img src={item.imageUrl} alt={item.text} className="w-full h-full object-cover pointer-events-none" onDragStart={(e) => e.preventDefault()} />;
      break;
    case 'shape': {
      const w = item.width;
      const h = item.height;
      const stroke = item.strokeColor || '#000000';
      const strokeWidth = item.strokeWidth ?? 1;
      let shapeSvg;

      switch(item.shapeType) {
        case 'rectangle': 
            shapeSvg = <rect x={strokeWidth/2} y={strokeWidth/2} width={w-strokeWidth} height={h-strokeWidth} rx="10" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>;
            break;
        case 'ellipse':
            shapeSvg = <ellipse cx={w/2} cy={h/2} rx={w/2 - strokeWidth/2} ry={h/2 - strokeWidth/2} fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>;
            break;
        case 'terminator':
            shapeSvg = <rect x={strokeWidth/2} y={strokeWidth/2} width={w-strokeWidth} height={h-strokeWidth} rx={(h-strokeWidth)/2} fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>;
            break;
        case 'decision':
            shapeSvg = <polygon points={`${w/2},${strokeWidth/2} ${strokeWidth/2},${h/2} ${w/2},${h-strokeWidth/2} ${w-strokeWidth/2},${h/2}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>;
            break;
        case 'cylinder': {
            const rx = w / 2;
            const ry = Math.min(h * 0.2, rx / 2);
            shapeSvg = (
                <g fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
                    <ellipse cx={rx} cy={ry} rx={rx-strokeWidth/2} ry={ry > strokeWidth/2 ? ry-strokeWidth/2: ry} />
                    <path d={`M ${strokeWidth/2},${ry} L ${strokeWidth/2},${h - ry} A ${rx-strokeWidth/2},${ry-strokeWidth/2} 0 0 0 ${w-strokeWidth/2},${h - ry} L ${w-strokeWidth/2},${ry}`} fill={fill} />
                    <path d={`M ${strokeWidth/2},${ry} A ${rx-strokeWidth/2},${ry-strokeWidth/2} 0 0 1 ${w-strokeWidth/2},${ry}`} fill="none" />
                </g>
            );
            break;
        }
        case 'star': {
            const cx = w / 2;
            const cy = h / 2;
            const outerRadius = Math.min(w, h) / 2 - strokeWidth;
            const innerRadius = outerRadius / 2.5;
            let points = "";
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                points += `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)} `;
            }
            shapeSvg = <polygon points={points.trim()} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        }
      }

      itemSpecificContent = (
        <svg width="100%" height="100%" className="absolute top-0 left-0 pointer-events-none">
            {shapeSvg}
        </svg>
      );
      break;
    }
  }

  return (
    <motion.div
      data-item-id={item.id}
      className={containerClasses}
      style={{ 
        x: item.x, 
        y: item.y, 
        touchAction: 'none', 
        width: item.width, 
        height: item.height, 
        backgroundColor: item.type !== 'shape' ? item.backgroundColor : 'transparent',
        opacity: item.opacity ?? 1,
      }}
      onDoubleClick={handleDoubleClick}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: item.opacity ?? 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {isSinglySelected && !item.isLocked && (
        <>
            <div
              className="absolute -top-6 left-0 z-10"
              style={{ pointerEvents: 'auto' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isTitleEditing ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={item.text}
                  onChange={(e) => onTextChange(item.id, e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="text-xs text-gray-700 bg-white border border-blue-500 px-1 py-0.5 rounded-sm focus:outline-none"
                />
              ) : (
                <div 
                  className="text-xs text-gray-700 bg-white px-1.5 py-0.5 rounded-sm select-none"
                  onDoubleClick={handleTitleDoubleClick}>
                  Frame
                </div>
              )}
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full z-10 select-none pointer-events-none">
                {Math.round(item.width)} &times; {Math.round(item.height)}
            </div>
            <ResizeHandles onPointerDown={(e, handle) => onResizePointerDown(e, handle, item)} />
        </>
      )}

      <div className="w-full h-full relative overflow-hidden">
        {itemSpecificContent}
        
        {isTextualItem && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={item.text}
                        onChange={(e) => onTextChange(item.id, e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') handleBlur();
                            e.stopPropagation(); 
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`w-full h-full text-center rounded resize-none border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 text-stone-700`}
                    />
                ) : (
                    <div className="text-center text-stone-700 p-1 select-none pointer-events-none">
                        {item.text}
                    </div>
                )}
            </div>
        )}
      </div>
    </motion.div>
  );
});
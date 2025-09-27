import React, { useState, useRef, WheelEvent, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { motion, useMotionValue, useMotionValueEvent } from 'framer-motion';
import './index.css';

// --- TYPES & CONSTANTS ---
type ItemType = 'image' | 'shape' | 'sticky-note' | 'text';
type ShapeType = 'rectangle' | 'ellipse' | 'cylinder' | 'terminator' | 'decision' | 'star';

interface Item {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  type: ItemType;
  // Optional properties
  imageUrl?: string;
  shapeType?: ShapeType;
  backgroundColor?: string;
}

type Tool = 'select' | 'pan' | 'sticky-note' | ShapeType | 'text';

const INTERACTION_MODE = {
  IDLE: 'IDLE',
  PANNING: 'PANNING',
  MARQUEE_SELECT: 'MARQUEE_SELECT',
  DRAGGING_ITEMS: 'DRAGGING_ITEMS',
  RESIZING_ITEM: 'RESIZING_ITEM',
  DRAWING: 'DRAWING',
} as const;

type InteractionMode = typeof INTERACTION_MODE[keyof typeof INTERACTION_MODE];

interface InteractionState {
    mode: InteractionMode;
    data: any;
}

type Command =
  | { type: 'MOVE'; data: { items: { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[] } }
  | { type: 'RESIZE'; data: { itemId: string; from: { x: number; y: number, width: number, height: number }; to: { x: number; y: number, width: number, height: number } } }
  | { type: 'UPDATE_TEXT'; data: { itemId: string; from: string; to: string } }
  | { type: 'ADD'; data: { items: Item[] } }
  | { type: 'DELETE'; data: { items: Item[] } }
  | { type: 'REORDER'; data: { from: Item[], to: Item[] }};

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const DRAG_THRESHOLD = 5;
const DEFAULT_ITEM_WIDTH = 250;
const DEFAULT_ITEM_HEIGHT = 300;
const MIN_ITEM_WIDTH = 20;
const MIN_ITEM_HEIGHT = 20;


const initialItems: Item[] = [
    { id: "img1", type: 'image', x: 100, y: 200, width: DEFAULT_ITEM_WIDTH, height: DEFAULT_ITEM_HEIGHT, imageUrl: "https://images.unsplash.com/photo-1715931653261-5ce1055744a9?q=80&w=600", text: "Concept A" },
    { id: "img2", type: 'image', x: 450, y: 350, width: DEFAULT_ITEM_WIDTH, height: DEFAULT_ITEM_HEIGHT, imageUrl: "https://images.unsplash.com/photo-1715425257975-7a0d6f265814?q=80&w=600", text: "Related Idea" },
    { id: "img3", type: 'image', x: 200, y: 600, width: DEFAULT_ITEM_WIDTH, height: DEFAULT_ITEM_HEIGHT, imageUrl: "https://images.unsplash.com/photo-1715942436323-28fed21098a5?q=80&w=600", text: "Further Exploration" }
];

// --- SVG ICONS ---
const ArrowIcon = ({isToolbarIcon = false}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={isToolbarIcon ? {} : { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z" fill={isToolbarIcon ? 'currentColor' : '#FFF'} stroke={isToolbarIcon ? 'none' : '#000'} strokeWidth="1.5" />
    </svg>
);

const PanningIcon = ({isToolbarIcon = false}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={isToolbarIcon ? {} : { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M4.75 12.5h-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm3.5-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm4.5 2h-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm3.5-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" fill={isToolbarIcon ? 'currentColor' : 'white'} stroke={isToolbarIcon ? 'none' : 'black'} strokeWidth="1.25"/>
    </svg>
);

const GrabbingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M4.5 12.5a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4-2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4.5 2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4-2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Z" fill="white" stroke="black" strokeWidth="1.25"/>
    </svg>
);

const CrosshairIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4V8M12 16V20M20 12H16M8 12H4M12 12H12.01" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const StickyNoteIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.54 3.5L19 6.96V20.5H5.5V3.5h10.04M15.54 2H5.5C4.67 2 4 2.67 4 3.5v17c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V6.25L15.54 2m-8.08 15h9.08v1.5H7.46v-1.5m0-4.5h9.08v1.5H7.46v-1.5m0-4.5h6.08v1.5H7.46v-1.5Z"/></svg>
const RectangleIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6v12h16V6H4m14 10H6V8h12v8Z"/></svg>
const EllipseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 6c-5.4 0-10 2.89-10 6.5S6.6 19 12 19s10-2.89 10-6.5S17.4 6 12 6m0 11c-4.29 0-8-2-8-4.5S7.71 8 12 8s8 2 8 4.5-3.71 4.5-8 4.5Z"/></svg>
const TextIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18.5 4H5.5C4.67 4 4 4.67 4 5.5v3h1.5v-3h5v12h-2v1.5h7v-1.5h-2v-12h5v3H20v-3c0-.83-.67-1.5-1.5-1.5Z"/></svg>
const CylinderIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 3.57 5 5.5V18.5c0 1.93 3.13 3.5 7 3.5s7-1.57 7-3.5V5.5C19 3.57 15.87 2 12 2M5 7.31c0-1.13 2.5-2.2 5.69-2.62C11.53 7.82 12 11.23 12 15v5.5c-3.87 0-7-1.57-7-3.5V7.31Z"/></svg>
const TerminatorIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 9v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/></svg>
const DecisionIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 12l10 10l10-10L12 2Z"/></svg>
const StarIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m12 17.27l4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.72l3.67-3.18c.67-.58.31-1.68-.57-1.75l-4.83-.41l-1.89-4.46c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18l-1.1 4.72c-.2.86.73 1.54 1.49 1.08z"/></svg>

const allShapeTypes: ShapeType[] = ['rectangle', 'ellipse', 'cylinder', 'terminator', 'decision', 'star'];

// --- COMPONENT: CustomCursor ---
interface CustomCursorProps {
  mousePosition: { x: number; y: number };
  interactionMode: InteractionMode;
  activeTool: Tool;
  isVisible: boolean;
}

const CustomCursor = ({ mousePosition, interactionMode, activeTool, isVisible }: CustomCursorProps) => {
    if (!isVisible) return null;

    let cursorIcon;
    if (interactionMode === INTERACTION_MODE.PANNING) {
        cursorIcon = <PanningIcon />;
    } else if (interactionMode === INTERACTION_MODE.DRAGGING_ITEMS) {
        cursorIcon = <GrabbingIcon />;
    } else if (interactionMode === INTERACTION_MODE.RESIZING_ITEM) {
        return null;
    } else if (allShapeTypes.includes(activeTool as ShapeType)) {
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

// --- COMPONENT: ShapePicker ---
interface ShapePickerProps {
    onShapeSelect: (shape: ShapeType) => void;
}

const ShapePicker = memo(({ onShapeSelect }: ShapePickerProps) => {
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


// --- COMPONENT: Toolbar ---
interface ToolbarProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    onMoreShapesClick: () => void;
}

const Toolbar = memo(({ activeTool, onToolChange, onMoreShapesClick }: ToolbarProps) => {
    const tools: { name: Tool; icon: React.ReactNode }[] = [
        { name: 'select', icon: <ArrowIcon isToolbarIcon /> },
        { name: 'pan', icon: <PanningIcon isToolbarIcon /> },
        { name: 'sticky-note', icon: <StickyNoteIcon /> },
        { name: 'rectangle', icon: <RectangleIcon /> },
        { name: 'ellipse', icon: <EllipseIcon /> },
        { name: 'text', icon: <TextIcon /> },
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


// --- COMPONENT: ResizeHandles ---
type Handle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
interface ResizeHandlesProps {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>, handle: Handle) => void;
}
const ResizeHandles = memo(({ onPointerDown }: ResizeHandlesProps) => {
    const handles: Handle[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'];
    return (
        <>
            {handles.map(handle => (
                <div
                    key={handle}
                    className={`resize-handle ${handle}`}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onPointerDown(e, handle);
                    }}
                />
            ))}
        </>
    );
});

// --- COMPONENT: ItemCard ---
interface ItemCardProps {
  item: Item;
  onTextChange: (itemId: string, newText: string) => void;
  onTextCommit: (itemId: string, from: string, to: string) => void;
  isSelected: boolean;
  isSinglySelected: boolean;
  isHovered: boolean;
  onResizePointerDown: (e: React.PointerEvent<HTMLDivElement>, handle: Handle, item: Item) => void;
  startEditing?: boolean;
}

const ItemCard = memo(({ item, onTextChange, onTextCommit, isSelected, isSinglySelected, isHovered, onResizePointerDown, startEditing = false }: ItemCardProps) => {
  const [isEditing, setIsEditing] = useState(startEditing);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialTextOnEdit = useRef<string>('');

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);
  
  const handleDoubleClick = () => {
    if (item.type === 'text' && !isEditing) {
        initialTextOnEdit.current = item.text;
        setIsEditing(true);
    } else if (item.text !== undefined) {
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

  const selectionClass = isSelected 
    ? 'ring-2 ring-blue-500 shadow-blue-300' 
    : isHovered 
    ? 'ring-2 ring-purple-400'
    : 'ring-0';

  let itemContent;
  let containerClasses = "item-card absolute p-2 bg-white rounded-lg shadow-xl border border-stone-200 transition-shadow flex flex-col";
  
  switch (item.type) {
    case 'image':
      containerClasses += ` ${selectionClass}`;
      itemContent = (
        <>
            <div className="w-full h-[70%] object-cover rounded-md pointer-events-none flex-shrink-0">
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover rounded-md" onDragStart={(e) => e.preventDefault()} />
            </div>
            <div className="flex-grow flex items-center justify-center p-1 min-h-0">
                {/* Text content shared below */}
            </div>
        </>
      );
      break;
    case 'shape': {
      containerClasses += ` ${selectionClass} bg-transparent border-none shadow-none p-0`;
      const w = item.width;
      const h = item.height;
      let shapeSvg;

      switch(item.shapeType) {
        case 'rectangle': 
            shapeSvg = <rect x="1" y="1" width={w-2} height={h-2} rx="10" fill={item.backgroundColor || '#E0E7FF'} stroke="#6366F1" strokeWidth="2"/>;
            break;
        case 'ellipse':
            shapeSvg = <ellipse cx={w/2} cy={h/2} rx={w/2 - 1} ry={h/2 - 1} fill={item.backgroundColor || '#E0F2FE'} stroke="#0EA5E9" strokeWidth="2"/>;
            break;
        case 'terminator':
            shapeSvg = <rect x="1" y="1" width={w-2} height={h-2} rx={(h-2)/2} fill={item.backgroundColor || '#D1FAE5'} stroke="#10B981" strokeWidth="2"/>;
            break;
        case 'decision':
            shapeSvg = <polygon points={`${w/2},1 1,${h/2} ${w/2},${h-1} ${w-1},${h/2}`} fill={item.backgroundColor || '#FEF3C7'} stroke="#F59E0B" strokeWidth="2"/>;
            break;
        case 'cylinder': {
            const rx = w / 2;
            const ry = Math.min(h * 0.2, rx / 2);
            shapeSvg = (
                <g fill={item.backgroundColor || '#E5E7EB'} stroke="#6B7280" strokeWidth="2">
                    <ellipse cx={rx} cy={ry} rx={rx-1} ry={ry > 1 ? ry-1: ry} />
                    <path d={`M 1,${ry} L 1,${h - ry} A ${rx-1},${ry-1} 0 0 0 ${w-1},${h - ry} L ${w-1},${ry}`} fill={item.backgroundColor || '#E5E7EB'} />
                    <path d={`M 1,${ry} A ${rx-1},${ry-1} 0 0 1 ${w-1},${ry}`} fill="none" />
                </g>
            );
            break;
        }
        case 'star': {
            const cx = w / 2;
            const cy = h / 2;
            const outerRadius = Math.min(w, h) / 2 - 1;
            const innerRadius = outerRadius / 2.5;
            let points = "";
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                points += `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)} `;
            }
            shapeSvg = <polygon points={points.trim()} fill={item.backgroundColor || '#FEE2E2'} stroke="#EF4444" strokeWidth="2" />;
            break;
        }
      }

      itemContent = (
        <svg width="100%" height="100%" className="absolute top-0 left-0 pointer-events-none">
            {shapeSvg}
        </svg>
      );
      break;
    }
    case 'sticky-note':
        containerClasses += ` ${selectionClass} sticky-note`;
        // No extra content needed, just the text
        break;
    case 'text':
        containerClasses = `item-card absolute transition-shadow text-item ${selectionClass}`;
        break;
  }
  
  return (
    <motion.div
      data-item-id={item.id}
      className={containerClasses}
      style={{ x: item.x, y: item.y, touchAction: 'none', width: item.width, height: item.height, backgroundColor: item.type === 'sticky-note' ? item.backgroundColor : undefined }}
      onDoubleClick={handleDoubleClick}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: item.type !== 'text' ? 1.05 : 1, zIndex: 10 }}
    >
      {isSinglySelected && <ResizeHandles onPointerDown={(e, handle) => onResizePointerDown(e, handle, item)} />}
      {itemContent}
       <div className={`flex-grow flex items-center justify-center min-h-0 ${item.type !== 'image' ? 'w-full h-full p-4' : 'p-1'}`}>
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
                className={`w-full h-full text-center rounded resize-none border-none focus:outline-none focus:ring-1 focus:ring-blue-500 ${item.type === 'text' ? 'text-editor-text' : 'text-editor-card'}`}
            />
        ) : (
             <div className="text-center text-stone-700 p-1 select-none pointer-events-none w-full h-full flex items-center justify-center">
                {item.text || (item.type !== 'text' ? "Double-click to edit" : "")}
            </div>
        )}
       </div>
    </motion.div>
  );
});

// --- COMPONENT: LayersPanel ---
interface LayersPanelProps {
    items: Item[];
    selectedItemIds: string[];
    onSelectionChange: (clickedId: string, isShiftKey: boolean, isCtrlKey: boolean) => void;
    onHoverChange: (id: string | null) => void;
    onReorder: (from: Item[], to: Item[], shouldAddToHistory?: boolean) => void;
}

const LayersPanel = memo(({ items, selectedItemIds, onSelectionChange, onHoverChange, onReorder }: LayersPanelProps) => {
    const [activeTab, setActiveTab] = useState('Layers');
    const dragItemId = useRef<string | null>(null);
    const initialItemsOrder = useRef<Item[]>([]);
    const itemsRef = useRef<Item[]>(items);
    useEffect(() => { itemsRef.current = items; }, [items]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: Item) => {
        dragItemId.current = item.id;
        initialItemsOrder.current = items;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            e.currentTarget.classList.add('dragging');
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('dragging');
        const finalItems = itemsRef.current;
        if (finalItems && JSON.stringify(initialItemsOrder.current) !== JSON.stringify(finalItems)) {
            onReorder(initialItemsOrder.current, finalItems);
        }
        dragItemId.current = null;
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetItem: Item) => {
        e.preventDefault();
        if (!dragItemId.current || dragItemId.current === targetItem.id) return;
        
        const currentItems = itemsRef.current;
        const draggedItem = currentItems.find(i => i.id === dragItemId.current)!;
        const remainingItems = currentItems.filter(i => i.id !== dragItemId.current);
        
        const targetIndex = remainingItems.findIndex(i => i.id === targetItem.id);
        
        const newItems = [
            ...remainingItems.slice(0, targetIndex),
            draggedItem,
            ...remainingItems.slice(targetIndex)
        ];
        itemsRef.current = newItems; 
        onReorder(currentItems, newItems, false);
    };
    
    return (
        <div className="layers-panel">
            <div className="panel-tabs">
                <button className={activeTab === 'Pages' ? 'active' : ''} onClick={() => setActiveTab('Pages')}>Pages</button>
                <button className={activeTab === 'Layers' ? 'active' : ''} onClick={() => setActiveTab('Layers')}>Layers</button>
                <button className={activeTab === 'Assets' ? 'active' : ''} onClick={() => setActiveTab('Assets')}>Assets</button>
            </div>

            <div className="panel-content">
                <div className="panel-toolbar">
                    <div className="dropdown">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M4,10V21H10V15H14V21H20V10L12,3Z"></path></svg>
                        <span>Home</span>
                        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7,10L12,15L17,10H7Z"></path></svg>
                    </div>
                    <div className="search-bar">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"></path></svg>
                        <input type="text" placeholder="Search..." />
                    </div>
                </div>

                <div className="layer-list">
                    {[...items].reverse().map((item, index) => (
                        <div
                            key={item.id}
                            className={`layer-item ${selectedItemIds.includes(item.id) ? 'selected' : ''}`}
                            onClick={(e) => onSelectionChange(item.id, e.shiftKey, e.metaKey || e.ctrlKey)}
                            onMouseEnter={() => onHoverChange(item.id)}
                            onMouseLeave={() => onHoverChange(null)}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, item)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" className="layer-icon"><path fill="currentColor" d="M19,19H5V5H19M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M10,17L6,13L7.41,11.58L10,14.17L16.59,7.58L18,9L10,17Z"></path></svg>
                            <span>{item.text || 'Untitled'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});


// --- COMPONENT: InfiniteCanvas ---
const InfiniteCanvas = () => {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [interactionState, setInteractionState] = useState<InteractionState>({ mode: INTERACTION_MODE.IDLE, data: {} });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseInWindow, setIsMouseInWindow] = useState(true);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [itemToStartEditing, setItemToStartEditing] = useState<string | null>(null);
  const [isShapePickerOpen, setIsShapePickerOpen] = useState(false);
  
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const motionScale = useMotionValue(1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const interactionStateRef = useRef(interactionState);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const undoStackRef = useRef<Command[]>([]);
  const redoStackRef = useRef<Command[]>([]);

  const updateInteractionState = useCallback((newState: InteractionState | ((prevState: InteractionState) => InteractionState)) => {
    const resolvedState = typeof newState === 'function' ? newState(interactionStateRef.current) : newState;
    interactionStateRef.current = resolvedState;
    setInteractionState(resolvedState);
  }, []);

  useMotionValueEvent(motionScale, "change", (latest) => {
    if (canvasRef.current) {
        const dotSpace = 22;
        canvasRef.current.style.backgroundSize = `${dotSpace * latest}px ${dotSpace * latest}px`;
    }
  });
  useMotionValueEvent(motionX, "change", (latest) => {
    if (canvasRef.current) {
        canvasRef.current.style.backgroundPositionX = `${latest}px`;
    }
  });
  useMotionValueEvent(motionY, "change", (latest) => {
    if (canvasRef.current) {
        canvasRef.current.style.backgroundPositionY = `${latest}px`;
    }
  });

  const addToHistory = useCallback((command: Command) => {
    undoStackRef.current.push(command);
    redoStackRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const command = undoStackRef.current.pop()!;
    redoStackRef.current.push(command);
    setSelectedItemIds([]);

    setItems(currentItems => {
        switch (command.type) {
            case 'MOVE': {
                const moveMap = new Map(command.data.items.map(i => [i.id, i.from]));
                return currentItems.map(item =>
                    moveMap.has(item.id) ? { ...item, ...moveMap.get(item.id)! } : item
                );
            }
            case 'RESIZE':
                 return currentItems.map(item =>
                    item.id === command.data.itemId ? { ...item, ...command.data.from } : item
                );
            case 'UPDATE_TEXT':
                return currentItems.map(item =>
                    item.id === command.data.itemId ? { ...item, text: command.data.from } : item
                );
            case 'ADD': {
                const idsToRemove = new Set(command.data.items.map(i => i.id));
                return currentItems.filter(item => !idsToRemove.has(item.id));
            }
            case 'DELETE':
                return [...currentItems, ...command.data.items];
            case 'REORDER':
                return command.data.from;
            default:
                return currentItems;
        }
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const command = redoStackRef.current.pop()!;
    undoStackRef.current.push(command);
    setSelectedItemIds([]);

    setItems(currentItems => {
        switch (command.type) {
            case 'MOVE': {
                const moveMap = new Map(command.data.items.map(i => [i.id, i.to]));
                return currentItems.map(item =>
                    moveMap.has(item.id) ? { ...item, ...moveMap.get(item.id)! } : item
                );
            }
            case 'RESIZE':
                 return currentItems.map(item =>
                    item.id === command.data.itemId ? { ...item, ...command.data.to } : item
                );
            case 'UPDATE_TEXT':
                return currentItems.map(item =>
                    item.id === command.data.itemId ? { ...item, text: command.data.to } : item
                );
            case 'ADD':
                return [...currentItems, ...command.data.items];
            case 'DELETE': {
                const idsToRemove = new Set(command.data.items.map(i => i.id));
                return currentItems.filter(item => !idsToRemove.has(item.id));
            }
            case 'REORDER':
                return command.data.to;
            default:
                return currentItems;
        }
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    const handleMouseLeave = () => setIsMouseInWindow(false);
    const handleMouseEnter = () => setIsMouseInWindow(true);
  
    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);
  
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
            handleRedo();
        } else {
            handleUndo();
        }
        return;
      }
      
      if (e.key === ' ') {
        setIsSpacePressed(true);
      } else if (e.key === 'Escape') {
        setSelectedItemIds([]);
        setActiveTool('select');
        setIsShapePickerOpen(false);
      } else if (selectedItemIds.length > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        const itemsToDelete = itemsRef.current.filter(item => selectedItemIds.includes(item.id));
        if (itemsToDelete.length > 0) {
            addToHistory({ type: 'DELETE', data: { items: itemsToDelete } });
            setItems(currentItems => currentItems.filter(item => !selectedItemIds.includes(item.id)));
            setSelectedItemIds([]);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedItemIds, handleUndo, handleRedo, addToHistory]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData || !canvasRef.current) return;
      const clipboardItems = e.clipboardData.items;
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const file = clipboardItems[i].getAsFile();
          if (!file) continue;

          const imageUrl = URL.createObjectURL(file);
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const worldX = (mousePosition.x - canvasRect.left - motionX.get()) / motionScale.get();
          const worldY = (mousePosition.y - canvasRect.top - motionY.get()) / motionScale.get();

          const newItem: Item = {
            id: `item_${Date.now()}`, 
            type: 'image',
            x: worldX, y: worldY, 
            width: DEFAULT_ITEM_WIDTH, height: DEFAULT_ITEM_HEIGHT,
            imageUrl: imageUrl, text: 'New Image'
          };

          addToHistory({ type: 'ADD', data: { items: [newItem] } });
          setItems(currentItems => [...currentItems, newItem]);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mousePosition, motionScale, addToHistory, canvasRef, motionX, motionY]);

  useEffect(() => {
    if (interactionState.mode === INTERACTION_MODE.RESIZING_ITEM || (allShapeTypes.includes(activeTool as ShapeType) && interactionState.mode === INTERACTION_MODE.IDLE)) {
        document.body.classList.remove('cursor-none');
        canvasRef.current?.classList.add('crosshair-cursor');
    } else {
        document.body.classList.add('cursor-none');
        canvasRef.current?.classList.remove('crosshair-cursor');
    }
    return () => {
        document.body.classList.remove('cursor-none');
        canvasRef.current?.classList.remove('crosshair-cursor');
    }
  }, [interactionState.mode, activeTool]);

  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      const currentInteraction = interactionStateRef.current;
      const currentItems = itemsRef.current;

      if (currentInteraction.mode === INTERACTION_MODE.DRAGGING_ITEMS) {
        const { triggerItemId, isDragging, initialItems: initialDragState } = currentInteraction.data;

        if (isDragging) {
            const finalItems = itemsRef.current;
            const moveCommandData = initialDragState.map((initial: any) => {
                const finalItem = finalItems.find(i => i.id === initial.id)!;
                return {
                    id: initial.id,
                    from: { x: initial.x, y: initial.y },
                    to: { x: finalItem.x, y: finalItem.y }
                };
            }).filter((d: any) => d.from.x !== d.to.x || d.from.y !== d.to.y);

            if (moveCommandData.length > 0) {
                addToHistory({ type: 'MOVE', data: { items: moveCommandData } });
            }
        } else { 
          if (e.shiftKey) {
            setSelectedItemIds(currentIds => 
                currentIds.includes(triggerItemId) 
                ? currentIds.filter(id => id !== triggerItemId) 
                : [...currentIds, triggerItemId]);
          } else {
             setSelectedItemIds([triggerItemId]);
          }
        }
      } else if (currentInteraction.mode === INTERACTION_MODE.RESIZING_ITEM) {
        const { initialItemState } = currentInteraction.data;
        const finalItem = itemsRef.current.find(i => i.id === initialItemState.id)!;
        const from = { x: initialItemState.x, y: initialItemState.y, width: initialItemState.width, height: initialItemState.height };
        const to = { x: finalItem.x, y: finalItem.y, width: finalItem.width, height: finalItem.height };

        if (from.x !== to.x || from.y !== to.y || from.width !== to.width || from.height !== to.height) {
            addToHistory({ type: 'RESIZE', data: { itemId: initialItemState.id, from, to } });
        }
      } else if (currentInteraction.mode === INTERACTION_MODE.MARQUEE_SELECT) {
        const { start, end } = currentInteraction.data;
        const top = Math.min(start.y, end.y);
        const left = Math.min(start.x, end.x);
        const right = Math.max(start.x, end.x);
        const bottom = Math.max(start.y, end.y);

        const idsInMarquee = currentItems.filter(item => {
            const itemBounds = {
                left: item.x, right: item.x + item.width,
                top: item.y, bottom: item.y + item.height,
            };
            return itemBounds.right > left && itemBounds.left < right && itemBounds.bottom > top && itemBounds.top < bottom;
        }).map(item => item.id);
        
        if (e.shiftKey) {
            setSelectedItemIds(currentIds => {
                const combinedIds = new Set(currentIds);
                idsInMarquee.forEach(id => combinedIds.add(id));
                return Array.from(combinedIds);
            });
        } else {
            const screenDragDistance = Math.hypot(start.x - end.x, start.y - end.y) * motionScale.get();

            if (screenDragDistance < DRAG_THRESHOLD) {
                setSelectedItemIds([]);
            } else {
                setSelectedItemIds(idsInMarquee);
            }
        }
      } else if (currentInteraction.mode === INTERACTION_MODE.DRAWING) {
        const { start, end, tool } = currentInteraction.data;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(start.x - end.x);
        const height = Math.abs(start.y - end.y);
        
        if (width > DRAG_THRESHOLD && height > DRAG_THRESHOLD) {
            const colors: Record<ShapeType, { bg: string }> = {
                rectangle: { bg: '#E0E7FF' },
                ellipse: { bg: '#E0F2FE' },
                terminator: { bg: '#D1FAE5' },
                decision: { bg: '#FEF3C7' },
                cylinder: { bg: '#E5E7EB' },
                star: { bg: '#FEE2E2' },
            };
            const newItem: Item = {
                id: `item_${Date.now()}`,
                type: 'shape',
                shapeType: tool as ShapeType,
                x, y, width, height,
                text: '',
                backgroundColor: colors[tool as ShapeType].bg
            };
            addToHistory({ type: 'ADD', data: { items: [newItem] } });
            setItems(current => [...current, newItem]);
            setSelectedItemIds([newItem.id]);
        }
        setActiveTool('select');
      }
      updateInteractionState({ mode: INTERACTION_MODE.IDLE, data: {} });
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [addToHistory, motionScale, updateInteractionState]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    const { clientX, clientY } = e;
    let { deltaY } = e;
    deltaY = Math.max(-150, Math.min(150, deltaY));

    const currentScale = motionScale.get();
    const scaleFactor = 1 - deltaY * 0.002;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * scaleFactor));
    if (newScale === currentScale) return;

    const mouseWorldX = (clientX - canvasRect.left - motionX.get()) / currentScale;
    const mouseWorldY = (clientY - canvasRect.top - motionY.get()) / currentScale;

    const newMotionX = clientX - canvasRect.left - (mouseWorldX * newScale);
    const newMotionY = clientY - canvasRect.top - (mouseWorldY * newScale);
    
    motionX.set(newMotionX);
    motionY.set(newMotionY);
    motionScale.set(newScale);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    // Close shape picker if clicking on canvas
    if (isShapePickerOpen) {
        setIsShapePickerOpen(false);
    }
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const worldX = (e.clientX - canvasRect.left - motionX.get()) / motionScale.get();
    const worldY = (e.clientY - canvasRect.top - motionY.get()) / motionScale.get();

    // Tool-based creation logic
    if (activeTool === 'sticky-note') {
        const newItem: Item = {
            id: `item_${Date.now()}`, type: 'sticky-note',
            x: worldX - 125, y: worldY - 125, width: 250, height: 250,
            text: '', backgroundColor: '#FEF9C3'
        };
        addToHistory({ type: 'ADD', data: { items: [newItem] } });
        setItems(current => [...current, newItem]);
        setSelectedItemIds([newItem.id]);
        setActiveTool('select');
        return;
    }
    if (activeTool === 'text') {
        const newItem: Item = {
            id: `item_${Date.now()}`, type: 'text',
            x: worldX, y: worldY, width: 200, height: 50, text: 'Your text here'
        };
        addToHistory({ type: 'ADD', data: { items: [newItem] } });
        setItems(current => [...current, newItem]);
        setSelectedItemIds([newItem.id]);
        setItemToStartEditing(newItem.id); // Flag to start editing
        setActiveTool('select');
        return;
    }
     if (allShapeTypes.includes(activeTool as ShapeType)) {
        updateInteractionState({
            mode: INTERACTION_MODE.DRAWING,
            data: { start: { x: worldX, y: worldY }, end: { x: worldX, y: worldY }, tool: activeTool }
        });
        return;
    }
    
    // Default selection/pan logic
    let clickedItem: Item | null = null;
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      if (
        worldX >= item.x && worldX <= item.x + item.width &&
        worldY >= item.y && worldY <= item.y + item.height
      ) {
        clickedItem = item;
        break;
      }
    }
    
    if (clickedItem) {
        const itemId = clickedItem.id;
        const isClickedItemSelected = selectedItemIds.includes(itemId);
        const itemsToDrag = isClickedItemSelected
            ? itemsRef.current.filter(i => selectedItemIds.includes(i.id))
            : [clickedItem];
        
        updateInteractionState({
            mode: INTERACTION_MODE.DRAGGING_ITEMS,
            data: {
                initialMousePos: { x: e.clientX, y: e.clientY },
                initialItems: itemsToDrag.map(i => ({ id: i.id, x: i.x, y: i.y })),
                triggerItemId: itemId, isDragging: false,
            },
        });
    } else {
        if (isSpacePressed || activeTool === 'pan') {
            updateInteractionState({ mode: INTERACTION_MODE.PANNING, data: {} });
        } else {
            updateInteractionState({
                mode: INTERACTION_MODE.MARQUEE_SELECT,
                data: { start: { x: worldX, y: worldY }, end: { x: worldX, y: worldY } },
            });
        }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const currentInteraction = interactionStateRef.current;
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const worldX = (e.clientX - canvasRect.left - motionX.get()) / motionScale.get();
    const worldY = (e.clientY - canvasRect.top - motionY.get()) / motionScale.get();

    switch (currentInteraction.mode) {
        case INTERACTION_MODE.DRAGGING_ITEMS: {
            const { initialMousePos, initialItems, isDragging } = currentInteraction.data;
            const dx = e.clientX - initialMousePos.x;
            const dy = e.clientY - initialMousePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < DRAG_THRESHOLD && !isDragging) return;
            if (!isDragging) { updateInteractionState(s => ({...s, data: {...s.data, isDragging: true}})); }

            const worldDeltaX = dx / motionScale.get();
            const worldDeltaY = dy / motionScale.get();

            const newPositions = new Map<string, { x: number, y: number }>();
            initialItems.forEach((item: any) => {
                newPositions.set(item.id, { x: item.x + worldDeltaX, y: item.y + worldDeltaY });
            });
            setItems(currentItems =>
                currentItems.map(item =>
                    newPositions.has(item.id) ? { ...item, ...newPositions.get(item.id)! } : item
                )
            );
            break;
        }
        case INTERACTION_MODE.PANNING: {
            motionX.set(motionX.get() + e.movementX);
            motionY.set(motionY.get() + e.movementY);
            break;
        }
        case INTERACTION_MODE.MARQUEE_SELECT:
        case INTERACTION_MODE.DRAWING: {
            updateInteractionState(s => ({ ...s, data: { ...s.data, end: { x: worldX, y: worldY } } }));
            break;
        }
        case INTERACTION_MODE.RESIZING_ITEM: {
            const { initialItemState, handle, initialMousePos, aspectRatio } = currentInteraction.data;
            const worldDeltaX = (e.clientX - initialMousePos.x) / motionScale.get();
            const worldDeltaY = (e.clientY - initialMousePos.y) / motionScale.get();

            let { x, y, width, height } = initialItemState;
            
            if (handle.includes('right')) { width = Math.max(MIN_ITEM_WIDTH, initialItemState.width + worldDeltaX); }
            if (handle.includes('left')) {
                const newWidth = initialItemState.width - worldDeltaX;
                if (newWidth >= MIN_ITEM_WIDTH) { width = newWidth; x = initialItemState.x + worldDeltaX; }
            }
            if (handle.includes('bottom')) { height = Math.max(MIN_ITEM_HEIGHT, initialItemState.height + worldDeltaY); }
            if (handle.includes('top')) {
                const newHeight = initialItemState.height - worldDeltaY;
                if (newHeight >= MIN_ITEM_HEIGHT) { height = newHeight; y = initialItemState.y + worldDeltaY; }
            }
            
            if (handle.includes('left') || handle.includes('right')) {
                if (handle.includes('top') || handle.includes('bottom')) {
                    const newAspectRatio = width / height;
                    if (newAspectRatio > aspectRatio) {
                        height = width / aspectRatio;
                        if (handle.includes('top')) {
                            y = initialItemState.y + (initialItemState.height - height);
                        }
                    } else {
                        width = height * aspectRatio;
                        if (handle.includes('left')) {
                            x = initialItemState.x + (initialItemState.width - width);
                        }
                    }
                }
            }

            setItems(currentItems => currentItems.map(item => item.id === initialItemState.id ? { ...item, x, y, width, height } : item));
            break;
        }
    }
  };

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, handle: Handle, item: Item) => {
    e.stopPropagation();
    updateInteractionState({
        mode: INTERACTION_MODE.RESIZING_ITEM,
        data: {
            initialMousePos: { x: e.clientX, y: e.clientY },
            initialItemState: { ...item },
            handle,
            aspectRatio: item.width / item.height,
        }
    })
  }, [updateInteractionState]);

  const handleTextChange = useCallback((itemId: string, newText: string) => {
      setItems(currentItems => currentItems.map(item => item.id === itemId ? { ...item, text: newText } : item));
  }, []);
  
  const handleTextCommit = useCallback((itemId: string, from: string, to: string) => {
    if (from !== to) {
        addToHistory({ type: 'UPDATE_TEXT', data: { itemId, from, to } });
    }
  }, [addToHistory]);
  
  const handleLayerSelection = useCallback((clickedId: string, isShiftKey: boolean, isCtrlKey: boolean) => {
    setSelectedItemIds(currentIds => {
      const currentItems = itemsRef.current;
      if (isShiftKey && currentIds.length > 0) {
        const lastSelectedId = currentIds[currentIds.length - 1];
        const lastIndex = currentItems.findIndex(item => item.id === lastSelectedId);
        const clickedIndex = currentItems.findIndex(item => item.id === clickedId);
        
        const start = Math.min(lastIndex, clickedIndex);
        const end = Math.max(lastIndex, clickedIndex);

        const newSelection = new Set(currentIds);
        for (let i = start; i <= end; i++) {
          newSelection.add(currentItems[i].id);
        }
        return Array.from(newSelection);
      } else if (isCtrlKey) {
        const newSelection = new Set(currentIds);
        if (newSelection.has(clickedId)) {
          newSelection.delete(clickedId);
        } else {
          newSelection.add(clickedId);
        }
        return Array.from(newSelection);
      } else {
        return [clickedId];
      }
    });
  }, []);
  
  const handleLayerReorder = useCallback((from: Item[], to: Item[], shouldAddToHistory = true) => {
      setItems(to);
      if (shouldAddToHistory) {
          addToHistory({ type: 'REORDER', data: { from, to } });
      }
  }, [addToHistory]);

  const handleToolChange = useCallback((tool: Tool) => {
    setActiveTool(tool);
    setIsShapePickerOpen(false);
  }, []);

  const handleMoreShapesClick = useCallback(() => {
    setIsShapePickerOpen(prev => !prev);
  }, []);


  return (
    <>
      <LayersPanel 
        items={items}
        selectedItemIds={selectedItemIds}
        onSelectionChange={handleLayerSelection}
        onHoverChange={setHoveredItemId}
        onReorder={handleLayerReorder}
      />
      {isShapePickerOpen && <ShapePicker onShapeSelect={handleToolChange} />}
      <Toolbar 
        activeTool={activeTool} 
        onToolChange={handleToolChange}
        onMoreShapesClick={handleMoreShapesClick}
      />
      <CustomCursor 
        mousePosition={mousePosition}
        interactionMode={isSpacePressed || activeTool === 'pan' ? INTERACTION_MODE.PANNING : interactionState.mode}
        activeTool={activeTool}
        isVisible={isMouseInWindow}
      />
      <div
        ref={canvasRef}
        className="canvas-container"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <motion.div
          className="w-full h-full relative canvas-bg"
          style={{
            x: motionX,
            y: motionY,
            scale: motionScale,
            transformOrigin: 'top left',
          }}
        >
          {interactionState.mode === INTERACTION_MODE.MARQUEE_SELECT && (
            <div
              className="absolute bg-blue-500 bg-opacity-20 border border-blue-500 pointer-events-none"
              style={{
                top: Math.min(interactionState.data.start.y, interactionState.data.end.y),
                left: Math.min(interactionState.data.start.x, interactionState.data.end.x),
                width: Math.abs(interactionState.data.start.x - interactionState.data.end.x),
                height: Math.abs(interactionState.data.start.y - interactionState.data.end.y),
              }}
            />
          )}
          {interactionState.mode === INTERACTION_MODE.DRAWING && (
            <div
              className="absolute bg-blue-500 bg-opacity-20 border border-blue-500 pointer-events-none"
              style={{
                top: Math.min(interactionState.data.start.y, interactionState.data.end.y),
                left: Math.min(interactionState.data.start.x, interactionState.data.end.x),
                width: Math.abs(interactionState.data.start.x - interactionState.data.end.x),
                height: Math.abs(interactionState.data.start.y - interactionState.data.end.y),
              }}
            />
          )}
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              isSelected={selectedItemIds.includes(item.id)}
              isSinglySelected={selectedItemIds.length === 1 && selectedItemIds[0] === item.id}
              isHovered={hoveredItemId === item.id}
              onTextChange={handleTextChange}
              onTextCommit={handleTextCommit}
              onResizePointerDown={handleResizePointerDown}
              startEditing={item.id === itemToStartEditing}
            />
          ))}
        </motion.div>
      </div>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<InfiniteCanvas />);
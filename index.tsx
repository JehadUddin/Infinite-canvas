import React, { useState, useRef, WheelEvent, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { motion, useMotionValue } from 'framer-motion';
import './index.css';

// --- TYPES & CONSTANTS ---
interface Item {
  id: string;
  x: number;
  y: number;
  imageUrl: string;
  text: string;
}

const INTERACTION_MODE = {
  IDLE: 'IDLE',
  PANNING: 'PANNING',
  MARQUEE_SELECT: 'MARQUEE_SELECT',
  DRAGGING_ITEMS: 'DRAGGING_ITEMS',
} as const;

type InteractionMode = typeof INTERACTION_MODE[keyof typeof INTERACTION_MODE];

interface InteractionState {
    mode: InteractionMode;
    data: any;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const DRAG_THRESHOLD = 5;

const initialItems: Item[] = [
    { id: "img1", x: 100, y: 200, imageUrl: "https://images.unsplash.com/photo-1715931653261-5ce1055744a9?q=80&w=600", text: "Concept A" },
    { id: "img2", x: 450, y: 350, imageUrl: "https://images.unsplash.com/photo-1715425257975-7a0d6f265814?q=80&w=600", text: "Related Idea" },
    { id: "img3", x: 200, y: 600, imageUrl: "https://images.unsplash.com/photo-1715942436323-28fed21098a5?q=80&w=600", text: "Further Exploration" }
];

// --- SVG ICONS ---
const ArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z" fill="#FFF" stroke="#000" strokeWidth="1.5" />
    </svg>
);

const PanningIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M4.75 12.5h-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm3.5-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm4.5 2h-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm3.5-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" fill="white" stroke="black" strokeWidth="1.25"/>
    </svg>
);

const GrabbingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M4.5 12.5a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4-2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4.5 2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4-2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Z" fill="white" stroke="black" strokeWidth="1.25"/>
    </svg>
);

// --- COMPONENT: CustomCursor ---
interface CustomCursorProps {
  mousePosition: { x: number; y: number };
  interactionMode: InteractionMode;
  isVisible: boolean;
}

const CustomCursor = ({ mousePosition, interactionMode, isVisible }: CustomCursorProps) => {
    if (!isVisible) return null;

    let cursorIcon;
    if (interactionMode === INTERACTION_MODE.PANNING) {
        cursorIcon = <PanningIcon />;
    } else if (interactionMode === INTERACTION_MODE.DRAGGING_ITEMS) {
        cursorIcon = <GrabbingIcon />;
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

// --- COMPONENT: ItemCard ---
interface ItemCardProps {
  item: Item;
  // FIX: Updated onTextChange to accept itemId and newText to match the parent handler's signature.
  onTextChange: (itemId: string, newText: string) => void;
  isSelected: boolean;
}

const ItemCard = memo(({ item, onTextChange, isSelected }: ItemCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  return (
    <motion.div
      data-item-id={item.id}
      className={`item-card absolute p-2 bg-white rounded-lg shadow-xl border border-stone-200 transition-shadow flex flex-col ${isSelected ? 'ring-2 ring-blue-500 shadow-blue-300' : 'ring-0'}`}
      style={{ x: item.x, y: item.y, touchAction: 'none', width: 250, height: 300 }}
      onDoubleClick={() => setIsEditing(true)}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
    >
      <img 
        src={item.imageUrl} 
        alt="" 
        className="w-full h-[220px] object-cover rounded-md pointer-events-none"
        onDragStart={(e) => e.preventDefault()}
       />
       <div className="flex-grow flex items-center justify-center p-1">
        {isEditing ? (
            <textarea
                ref={textareaRef}
                value={item.text}
                // FIX: Pass the item.id along with the new text to the parent handler.
                onChange={(e) => onTextChange(item.id, e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsEditing(false);
                    e.stopPropagation(); // Prevents deleting item while typing backspace
                }}
                onPointerDown={(e) => e.stopPropagation()} // Stop drag from initiating
                className="w-full h-full bg-stone-100 text-center rounded resize-none border-none p-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
        ) : (
            <div className="text-center text-stone-700 p-1 select-none pointer-events-none">
                {item.text || "Double-click to edit"}
            </div>
        )}
       </div>
    </motion.div>
  );
});

// --- COMPONENT: InfiniteCanvas ---
const InfiniteCanvas = () => {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [interactionState, setInteractionState] = useState<InteractionState>({ mode: INTERACTION_MODE.IDLE, data: {} });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseInWindow, setIsMouseInWindow] = useState(true);
  
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const motionScale = useMotionValue(1);

  // --- Refs for stable event listeners ---
  const interactionStateRef = useRef(interactionState);
  useEffect(() => { interactionStateRef.current = interactionState; }, [interactionState]);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Effect for global mouse tracking for the custom cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    const handleMouseLeave = () => setIsMouseInWindow(false);
    const handleMouseEnter = () => setIsMouseInWindow(true);
  
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
  
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  // Effect to listen for spacebar press & other keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') setIsSpacePressed(true);
      if (selectedItemIds.length > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        setItems(currentItems => currentItems.filter(item => !selectedItemIds.includes(item.id)));
        setSelectedItemIds([]);
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
  }, [selectedItemIds]);

  // Effect to handle pasting images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const clipboardItems = e.clipboardData.items;
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const file = clipboardItems[i].getAsFile();
          if (!file) continue;

          const imageUrl = URL.createObjectURL(file);
          const worldX = (mousePosition.x - motionX.get()) / motionScale.get();
          const worldY = (mousePosition.y - motionY.get()) / motionScale.get();

          const newItem: Item = {
            id: `item_${Date.now()}`, x: worldX, y: worldY, imageUrl: imageUrl, text: 'New Item'
          };

          setItems(currentItems => [...currentItems, newItem]);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mousePosition, motionX, motionY, motionScale]);

  // Effect to fire the OS cursor
  useEffect(() => {
    document.body.classList.add('cursor-none');
    return () => document.body.classList.remove('cursor-none');
  }, []);

  // Global listener for pointerup to robustly end interactions
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      const currentInteraction = interactionStateRef.current;
      const currentItems = itemsRef.current;

      if (currentInteraction.mode === INTERACTION_MODE.DRAGGING_ITEMS) {
        const { triggerItemId, isDragging } = currentInteraction.data;
        if (!isDragging) { // This was a click
          if (e.shiftKey) {
            setSelectedItemIds(currentIds => 
                currentIds.includes(triggerItemId) 
                ? currentIds.filter(id => id !== triggerItemId) 
                : [...currentIds, triggerItemId]);
          } else {
             setSelectedItemIds(currentIds => currentIds.includes(triggerItemId) && currentIds.length === 1 ? [] : [triggerItemId]);
          }
        }
      } else if (currentInteraction.mode === INTERACTION_MODE.MARQUEE_SELECT) {
        const { start, end } = currentInteraction.data;
        const top = Math.min(start.y, end.y);
        const left = Math.min(start.x, end.x);
        const right = Math.max(start.x, end.x);
        const bottom = Math.max(start.y, end.y);

        const newSelectedIds = currentItems.filter(item => {
            const itemBounds = {
                left: item.x, right: item.x + 250,
                top: item.y, bottom: item.y + 300,
            };
            return itemBounds.right > left && itemBounds.left < right && itemBounds.bottom > top && itemBounds.top < bottom;
        }).map(item => item.id);
        setSelectedItemIds(newSelectedIds);
      }
      setInteractionState({ mode: INTERACTION_MODE.IDLE, data: {} });
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, []);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { clientX, clientY, deltaY } = e;
    const currentScale = motionScale.get();
    const scaleFactor = Math.pow(1.005, -deltaY);
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * scaleFactor));
    const mouseWorldX = (clientX - motionX.get()) / currentScale;
    const mouseWorldY = (clientY - motionY.get()) / currentScale;
    const newX = clientX - mouseWorldX * newScale;
    const newY = clientY - mouseWorldY * newScale;
    motionX.set(newX);
    motionY.set(newY);
    motionScale.set(newScale);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const targetElement = e.target as HTMLElement;
    const itemCard = targetElement.closest('.item-card');
    
    if (itemCard && itemCard.getAttribute('data-item-id')) {
        const itemId = itemCard.getAttribute('data-item-id')!;
        const itemsToDrag = selectedItemIds.includes(itemId)
            ? items.filter(i => selectedItemIds.includes(i.id))
            : [items.find(i => i.id === itemId)!];
        
        setInteractionState({
            mode: INTERACTION_MODE.DRAGGING_ITEMS,
            data: {
                initialMousePos: { x: e.clientX, y: e.clientY },
                initialItems: itemsToDrag.map(i => ({ id: i.id, x: i.x, y: i.y })),
                triggerItemId: itemId,
                isDragging: false,
            },
        });
    } else {
        if (isSpacePressed) {
            setInteractionState({ mode: INTERACTION_MODE.PANNING, data: {} });
        } else {
            const worldX = (e.clientX - motionX.get()) / motionScale.get();
            const worldY = (e.clientY - motionY.get()) / motionScale.get();
            setInteractionState({
                mode: INTERACTION_MODE.MARQUEE_SELECT,
                data: { start: { x: worldX, y: worldY }, end: { x: worldX, y: worldY } },
            });
            setSelectedItemIds([]);
        }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    switch (interactionState.mode) {
        case INTERACTION_MODE.DRAGGING_ITEMS: {
            const { initialMousePos, initialItems } = interactionState.data;
            const dx = e.clientX - initialMousePos.x;
            const dy = e.clientY - initialMousePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < DRAG_THRESHOLD && !interactionState.data.isDragging) return;
            
            if (!interactionState.data.isDragging) {
              setInteractionState(s => ({...s, data: {...s.data, isDragging: true}}));
            }

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
        case INTERACTION_MODE.MARQUEE_SELECT: {
            const worldX = (e.clientX - motionX.get()) / motionScale.get();
            const worldY = (e.clientY - motionY.get()) / motionScale.get();
            setInteractionState(s => ({ ...s, data: { ...s.data, end: { x: worldX, y: worldY } } }));
            break;
        }
    }
  };

  const handleTextChange = useCallback((itemId: string, newText: string) => {
      setItems(currentItems => currentItems.map(item => item.id === itemId ? { ...item, text: newText } : item));
  }, []);

  return (
    <>
      <CustomCursor 
        mousePosition={mousePosition}
        interactionMode={interactionState.mode}
        isVisible={isMouseInWindow}
      />
      <motion.div
        className="w-full h-full relative canvas-bg"
        style={{
          x: motionX,
          y: motionY,
          scale: motionScale,
          transformOrigin: 'top left',
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
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
        {items.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            isSelected={selectedItemIds.includes(item.id)}
            onTextChange={handleTextChange}
          />
        ))}
      </motion.div>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<InfiniteCanvas />);

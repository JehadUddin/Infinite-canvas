import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Item, Page, Tool, InteractionState, InteractionMode, INTERACTION_MODE, Handle, Command, ShapeType, ItemPositionAndSize
} from '../types';
import { Toolbar } from './Toolbar';
import { ShapePicker } from './ShapePicker';
import { ItemCard } from './ItemCard';
import { LayersPanel } from './LayersPanel';
import { ControlPanel } from './ControlPanel';
import { CustomCursor } from './CustomCursor';
import { allShapeTypes, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, DEFAULT_ITEM_HEIGHT, DEFAULT_ITEM_WIDTH, DEFAULT_TEXT_HEIGHT, DEFAULT_TEXT_WIDTH, DEFAULT_FRAME_HEIGHT, DEFAULT_FRAME_WIDTH, DEFAULT_STICKY_NOTE_HEIGHT, DEFAULT_STICKY_NOTE_WIDTH } from '../constants';

const nanoid = () => Math.random().toString(36).substring(2, 11);

const getBounds = (items: Item[]) => {
  if (items.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  items.forEach(item => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const doRectanglesOverlap = (rect1: ItemPositionAndSize, rect2: ItemPositionAndSize) => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

const resizeItem = (item: Item, handle: Handle, dx: number, dy: number, isShiftPressed: boolean): ItemPositionAndSize => {
    let { x, y, width, height } = item;
    const aspectRatio = item.width / item.height;

    switch (handle) {
        case 'bottom-right':
            width += dx;
            height += dy;
            if (isShiftPressed) {
                const newWidth = Math.max(width, height * aspectRatio);
                height = newWidth / aspectRatio;
                width = newWidth;
            }
            break;
        case 'bottom-left':
            x += dx;
            width -= dx;
            height += dy;
            if (isShiftPressed) {
                const newWidth = Math.max(width, height * aspectRatio);
                height = newWidth / aspectRatio;
                x -= newWidth - width;
                width = newWidth;
            }
            break;
        case 'top-right':
            y += dy;
            width += dx;
            height -= dy;
            if (isShiftPressed) {
                const newWidth = Math.max(width, height * aspectRatio);
                y -= newWidth / aspectRatio - height;
                height = newWidth / aspectRatio;
                width = newWidth;
            }
            break;
        case 'top-left':
            x += dx;
            y += dy;
            width -= dx;
            height -= dy;
            if (isShiftPressed) {
                const newWidth = Math.max(width, height * aspectRatio);
                const newHeight = newWidth / aspectRatio;
                x -= newWidth - width;
                y -= newHeight - height;
                width = newWidth;
                height = newHeight;
            }
            break;
        case 'top':
            y += dy;
            height -= dy;
            break;
        case 'bottom':
            height += dy;
            break;
        case 'left':
            x += dx;
            width -= dx;
            break;
        case 'right':
            width += dx;
            break;
    }

    return { x, y, width: Math.max(width, 10), height: Math.max(height, 10) };
};

const initialPageId = nanoid();
const initialItems = [
    { id: nanoid(), type: 'sticky-note', x: 100, y: 100, width: 150, height: 150, text: 'Welcome to Paper!', backgroundColor: '#FFF9C4', isVisible: true } as Item,
    { id: nanoid(), type: 'shape', shapeType: 'rectangle', x: 300, y: 150, width: 200, height: 100, text: 'This is a shape', backgroundColor: '#B3E5FC', strokeColor: '#01579B', strokeWidth: 2, isVisible: true } as Item,
];

export const InfiniteCanvas = () => {
    const [pages, setPages] = useState<Page[]>([{ id: initialPageId, name: 'Page 1', backgroundColor: '#2d2d2d' }]);
    const [activePageId, setActivePageId] = useState<string>(initialPageId);
    const [itemsByPage, setItemsByPage] = useState<Record<string, Item[]>>({ [initialPageId]: initialItems });

    const items = useMemo(() => itemsByPage[activePageId] || [], [itemsByPage, activePageId]);
    const setItems = (newItemsOrUpdater: Item[] | ((prev: Item[]) => Item[])) => {
        setItemsByPage(prev => ({
            ...prev,
            [activePageId]: typeof newItemsOrUpdater === 'function' ? newItemsOrUpdater(prev[activePageId] || []) : newItemsOrUpdater,
        }));
    };
    
    const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
    const [interactionState, setInteractionState] = useState<InteractionState>({ mode: INTERACTION_MODE.IDLE, data: {} });
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [isShapePickerOpen, setIsShapePickerOpen] = useState(false);
    
    const [history, setHistory] = useState<Command[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const canvasRef = useRef<HTMLDivElement>(null);
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isMouseOnCanvas, setIsMouseOnCanvas] = useState(false);

    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        const canvasBounds = canvasRef.current?.getBoundingClientRect();
        if (!canvasBounds) return { x: 0, y: 0 };
        return {
            x: (screenX - canvasBounds.left - camera.x) / camera.zoom,
            y: (screenY - canvasBounds.top - camera.y) / camera.zoom,
        };
    }, [camera]);
    
    const handleToolChange = useCallback((tool: Tool) => {
        setActiveTool(tool);
        setSelectedItemIds([]);
        if (tool !== 'select' && isShapePickerOpen) {
            setIsShapePickerOpen(false);
        }
    }, [isShapePickerOpen]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const worldPos = screenToWorld(e.clientX, e.clientY);
        lastMousePosition.current = { x: e.clientX, y: e.clientY };

        if (activeTool === 'pan' || e.buttons === 4 || e.spaceKey) {
            setInteractionState({ mode: INTERACTION_MODE.PANNING, data: { startCamera: { ...camera } } });
            return;
        }

        const target = e.target as HTMLElement;
        const itemId = target.closest('[data-item-id]')?.getAttribute('data-item-id');

        if (activeTool === 'select') {
            if (itemId) {
                const item = itemMap.get(itemId);
                if (item && !item.isLocked) {
                    const newSelection = e.shiftKey ? (selectedItemIds.includes(itemId) ? selectedItemIds.filter(id => id !== itemId) : [...selectedItemIds, itemId]) : [itemId];
                    setSelectedItemIds(newSelection);
                    setInteractionState({
                        mode: INTERACTION_MODE.DRAGGING_ITEMS,
                        data: {
                            draggedItemIds: newSelection,
                            itemsAtStart: newSelection.map(id => ({ ...itemMap.get(id)! })),
                            startPos: worldPos,
                        }
                    });
                }
            } else {
                setSelectedItemIds([]);
                setInteractionState({ mode: INTERACTION_MODE.MARQUEE_SELECT, data: { startPos: worldPos, endPos: worldPos } });
            }
        } else if (allShapeTypes.includes(activeTool as any) || ['sticky-note', 'text', 'frame'].includes(activeTool)) {
            setInteractionState({ mode: INTERACTION_MODE.DRAWING, data: { startPos: worldPos } });
        }
    }, [activeTool, camera, screenToWorld, selectedItemIds, itemMap]);
    
    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const currentMousePosition = { x: e.clientX, y: e.clientY };
        setMousePosition(currentMousePosition);
        const worldPos = screenToWorld(e.clientX, e.clientY);
        const dx = (currentMousePosition.x - lastMousePosition.current.x);
        const dy = (currentMousePosition.y - lastMousePosition.current.y);

        switch (interactionState.mode) {
            case INTERACTION_MODE.PANNING:
                setCamera(cam => ({ ...cam, x: cam.x + dx, y: dy + cam.y }));
                break;
            case INTERACTION_MODE.DRAGGING_ITEMS: {
                const worldDx = dx / camera.zoom;
                const worldDy = dy / camera.zoom;
                setItems(currentItems => currentItems.map(item => {
                    if (interactionState.data.draggedItemIds.includes(item.id)) {
                        const startItem = interactionState.data.itemsAtStart.find((i: Item) => i.id === item.id);
                        if(startItem) return { ...item, x: startItem.x + worldPos.x - interactionState.data.startPos.x, y: startItem.y + worldPos.y - interactionState.data.startPos.y };
                    }
                    return item;
                }));
                break;
            }
            case INTERACTION_MODE.RESIZING_ITEM: {
                const { item, handle, isShiftPressed } = interactionState.data;
                const newPosAndSize = resizeItem(item, handle, dx / camera.zoom, dy / camera.zoom, isShiftPressed);
                setItems(its => its.map(i => i.id === item.id ? { ...i, ...newPosAndSize } : i));
                break;
            }
            case INTERACTION_MODE.MARQUEE_SELECT:
                setInteractionState(s => ({ ...s, data: { ...s.data, endPos: worldPos } }));
                break;
            case INTERACTION_MODE.DRAWING: {
                const { startPos } = interactionState.data;
                const x = Math.min(startPos.x, worldPos.x);
                const y = Math.min(startPos.y, worldPos.y);
                const width = Math.abs(startPos.x - worldPos.x);
                const height = Math.abs(startPos.y - worldPos.y);
                setInteractionState(s => ({ ...s, data: { ...s.data, currentRect: { x, y, width, height } } }));
                break;
            }
        }
        lastMousePosition.current = currentMousePosition;
    }, [interactionState, camera.zoom, screenToWorld, setItems]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        switch (interactionState.mode) {
            case INTERACTION_MODE.DRAGGING_ITEMS:
                // TODO: Add command to history
                break;
            case INTERACTION_MODE.RESIZING_ITEM:
                 // TODO: Add command to history
                break;
            case INTERACTION_MODE.MARQUEE_SELECT: {
                const marqueeRect = {
                    x: Math.min(interactionState.data.startPos.x, worldPos.x),
                    y: Math.min(interactionState.data.startPos.y, worldPos.y),
                    width: Math.abs(interactionState.data.startPos.x - worldPos.x),
                    height: Math.abs(interactionState.data.startPos.y - worldPos.y),
                };
                const selectedIds = items.filter(item => doRectanglesOverlap(item, marqueeRect) && !item.isLocked).map(item => item.id);
                setSelectedItemIds(selectedIds);
                break;
            }
            case INTERACTION_MODE.DRAWING: {
                const { currentRect } = interactionState.data;
                if (!currentRect || currentRect.width < 5 || currentRect.height < 5) break;

                let newItem: Item;
                if (allShapeTypes.includes(activeTool as ShapeType)) {
                    newItem = { ...currentRect, id: nanoid(), type: 'shape', shapeType: activeTool as ShapeType, text: '', backgroundColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 2, isVisible: true };
                } else {
                    let type: 'sticky-note' | 'text' | 'frame' = 'sticky-note';
                    if (activeTool === 'text') type = 'text';
                    if (activeTool === 'frame') type = 'frame';
                    newItem = { ...currentRect, id: nanoid(), type, text: type === 'frame' ? 'Frame' : '', backgroundColor: type === 'sticky-note' ? '#FFF9C4' : 'transparent', isVisible: true };
                }
                setItems(its => [...its, newItem]);
                setActiveTool('select');
                setSelectedItemIds([newItem.id]);
                break;
            }
        }
        setInteractionState({ mode: INTERACTION_MODE.IDLE, data: {} });
    }, [interactionState, screenToWorld, items, activeTool, setItems]);

    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom - e.deltaY * 0.001));
        const mouseWorldPos = screenToWorld(e.clientX, e.clientY);
        const newCameraX = e.clientX - mouseWorldPos.x * newZoom - (canvasRef.current?.getBoundingClientRect().left ?? 0);
        const newCameraY = e.clientY - mouseWorldPos.y * newZoom - (canvasRef.current?.getBoundingClientRect().top ?? 0);
        setCamera({ x: newCameraX, y: newCameraY, zoom: newZoom });
    }, [camera.zoom, screenToWorld]);
    
    const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, handle: Handle, item: Item) => {
        e.stopPropagation();
        setInteractionState({
            mode: INTERACTION_MODE.RESIZING_ITEM,
            data: { item: { ...item }, handle, isShiftPressed: e.shiftKey }
        });
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleTextChange = useCallback((itemId: string, newText: string) => {
        setItems(its => its.map(i => i.id === itemId ? { ...i, text: newText } : i));
    }, [setItems]);
    
    const handleTextCommit = (itemId: string, from: string, to: string) => {
        // TODO: Add command
    };

    const handleUpdateItems = useCallback((itemIds: string[], updates: Partial<Item>) => {
        setItems(its => its.map(i => itemIds.includes(i.id) ? { ...i, ...updates } : i));
    }, [setItems]);

    const activePage = useMemo(() => pages.find(p => p.id === activePageId)!, [pages, activePageId]);
    const selectedItems = useMemo(() => selectedItemIds.map(id => itemMap.get(id)).filter((i): i is Item => !!i), [selectedItemIds, itemMap]);

    return (
        <div className="w-full h-full" style={{ cursor: 'none' }}>
            <LayersPanel
                pages={pages}
                activePageId={activePageId}
                items={items}
                selectedItemIds={selectedItemIds}
                onAddPage={() => { const newId = nanoid(); setPages(p => [...p, { id: newId, name: `Page ${p.length + 1}` }]); setItemsByPage(i => ({...i, [newId]: []})); setActivePageId(newId); }}
                onSwitchPage={(pageId) => setActivePageId(pageId)}
                onDeletePage={(pageId) => { if (pages.length > 1) { setPages(p => p.filter(i => i.id !== pageId)); setActivePageId(pages.find(p => p.id !== pageId)!.id); } }}
                onRenamePage={(pageId, newName) => setPages(p => p.map(i => i.id === pageId ? { ...i, name: newName } : i))}
                onSelectionChange={(id, shift, ctrl) => { setSelectedItemIds(ids => shift ? (ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]) : [id]); }}
                onHoverChange={setHoveredItemId}
                onToggleVisibility={(id) => handleUpdateItems([id], { isVisible: !itemMap.get(id)?.isVisible })}
                onToggleLock={(id) => handleUpdateItems([id], { isLocked: !itemMap.get(id)?.isLocked })}
                onTextChange={handleTextChange}
                onTextCommit={handleTextCommit}
            />
            <div
                ref={canvasRef}
                className="absolute top-0 left-[240px] right-[240px] bottom-0 bg-[#f0f0f0] overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={() => setIsMouseOnCanvas(false)}
                onMouseEnter={() => setIsMouseOnCanvas(true)}
                onWheel={onWheel}
            >
                <div 
                    className="absolute top-0 left-0" 
                    style={{ 
                        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                        transformOrigin: 'top left' 
                    }}
                >
                    {items.filter(i => i.isVisible).map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onTextChange={handleTextChange}
                            onTextCommit={handleTextCommit}
                            isSelected={selectedItemIds.includes(item.id)}
                            isSinglySelected={selectedItemIds.length === 1 && selectedItemIds[0] === item.id}
                            isHovered={hoveredItemId === item.id}
                            onResizePointerDown={handleResizePointerDown}
                        />
                    ))}
                    {interactionState.mode === INTERACTION_MODE.MARQUEE_SELECT && (
                        <div className="absolute border border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none" style={{
                            left: Math.min(interactionState.data.startPos.x, interactionState.data.endPos.x),
                            top: Math.min(interactionState.data.startPos.y, interactionState.data.endPos.y),
                            width: Math.abs(interactionState.data.startPos.x - interactionState.data.endPos.x),
                            height: Math.abs(interactionState.data.startPos.y - interactionState.data.endPos.y)
                        }} />
                    )}
                    {interactionState.mode === INTERACTION_MODE.DRAWING && interactionState.data.currentRect && (
                         <div className="absolute border border-dashed border-gray-500 pointer-events-none" style={{
                            left: interactionState.data.currentRect.x,
                            top: interactionState.data.currentRect.y,
                            width: interactionState.data.currentRect.width,
                            height: interactionState.data.currentRect.height
                        }} />
                    )}
                </div>
            </div>

            <Toolbar 
                activeTool={activeTool} 
                onToolChange={handleToolChange} 
                onMoreShapesClick={() => setIsShapePickerOpen(!isShapePickerOpen)}
            />
            {isShapePickerOpen && <ShapePicker onShapeSelect={(shape) => { setActiveTool(shape); setIsShapePickerOpen(false); }} />}

            <ControlPanel 
                selectedItems={selectedItems} 
                activePage={activePage}
                onUpdateItems={handleUpdateItems}
                onUpdatePage={(pageId, updates) => setPages(ps => ps.map(p => p.id === pageId ? {...p, ...updates} : p))}
            />

            <CustomCursor 
                mousePosition={mousePosition}
                interactionMode={interactionState.mode}
                activeTool={activeTool}
                isVisible={isMouseOnCanvas}
            />
        </div>
    );
};

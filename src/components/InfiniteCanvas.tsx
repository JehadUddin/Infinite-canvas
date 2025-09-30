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
import { allShapeTypes, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT } from '../constants';

const nanoid = () => Math.random().toString(36).substring(2, 11);

const getBounds = (items: Item[]) => {
  if (items.length === 0) return { x: 0, y: 0, width: 0, height: 0, text: 'Frame' };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  items.forEach(item => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  });
  return { x: minX - 10, y: minY - 10, width: maxX - minX + 20, height: maxY - minY + 20, text: 'Frame' };
};

const doRectanglesOverlap = (rect1: ItemPositionAndSize, rect2: ItemPositionAndSize) => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

const resizeItem = (item: Item, handle: Handle, dx: number, dy: number, isShiftPressed: boolean, isAltPressed: boolean): ItemPositionAndSize => {
    let { x, y, width, height } = item;
    const aspectRatio = item.width / item.height;

    if (isAltPressed) {
        x -= dx;
        y -= dy;
        width += dx * 2;
        height += dy * 2;
    } else {
        if (handle.includes('left')) {
            x += dx;
            width -= dx;
        } else if (handle.includes('right')) {
            width += dx;
        }
        if (handle.includes('top')) {
            y += dy;
            height -= dy;
        } else if (handle.includes('bottom')) {
            height += dy;
        }
    }
    
    if (isShiftPressed && !handle.includes('-')) { // Not a side handle
         const newWidth = Math.max(width, height * aspectRatio);
         const newHeight = newWidth / aspectRatio;
         
         if (isAltPressed) {
             x = item.x + item.width / 2 - newWidth / 2;
             y = item.y + item.height / 2 - newHeight / 2;
         } else {
            if (handle.includes('top')) {
                y = item.y + item.height - newHeight;
            }
            if (handle.includes('left')) {
                x = item.x + item.width - newWidth;
            }
         }
         width = newWidth;
         height = newHeight;
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
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    
    const historyByPage = useRef<Record<string, Command[]>>({[activePageId]: []});
    const historyIndexByPage = useRef<Record<string, number>>({[activePageId]: -1});

    const canvasRef = useRef<HTMLDivElement>(null);
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isMouseOnCanvas, setIsMouseOnCanvas] = useState(false);

    const addCommand = useCallback((command: Command) => {
        const history = historyByPage.current[activePageId] || [];
        const historyIndex = historyIndexByPage.current[activePageId] ?? -1;
        history.splice(historyIndex + 1);
        history.push(command);
        historyIndexByPage.current[activePageId] = history.length - 1;
    }, [activePageId]);

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
        if (tool !== 'select') {
            setSelectedItemIds([]);
        }
        if (tool !== 'select' && isShapePickerOpen) {
            setIsShapePickerOpen(false);
        }
    }, [isShapePickerOpen]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        lastMousePosition.current = { x: e.clientX, y: e.clientY };

        if (activeTool === 'pan' || e.buttons === 4 || isSpacePressed) {
            setInteractionState({ mode: INTERACTION_MODE.PANNING, data: { startCamera: { ...camera } } });
            return;
        }

        const target = e.target as HTMLElement;
        const itemId = target.closest('[data-item-id]')?.getAttribute('data-item-id');

        if (activeTool === 'select') {
            if (itemId) {
                const item = itemMap.get(itemId);
                if (item && !item.isLocked) {
                     const isChildOfSelectedGroup = item.parentId && selectedItemIds.includes(item.parentId);
                     const topLevelSelection = isChildOfSelectedGroup ? [item.parentId!] : e.shiftKey ? (selectedItemIds.includes(itemId) ? selectedItemIds.filter(id => id !== itemId) : [...selectedItemIds, itemId]) : [itemId];
                    setSelectedItemIds(topLevelSelection);

                    const allIdsToDrag = new Set<string>();
                    const queue = [...topLevelSelection];
                    while(queue.length > 0) {
                        const id = queue.shift()!;
                        if (allIdsToDrag.has(id)) continue;
                        allIdsToDrag.add(id);
                        const currentItem = itemMap.get(id);
                        if (currentItem?.childIds) queue.push(...currentItem.childIds);
                    }
                    const initialItems = Array.from(allIdsToDrag).map(id => ({...itemMap.get(id)!}));

                    setInteractionState({ mode: INTERACTION_MODE.DRAGGING_ITEMS, data: { initialItems } });
                }
            } else {
                setSelectedItemIds([]);
                const worldPos = screenToWorld(e.clientX, e.clientY);
                setInteractionState({ mode: INTERACTION_MODE.MARQUEE_SELECT, data: { startPos: worldPos, endPos: worldPos } });
            }
        } else if (allShapeTypes.includes(activeTool as any) || ['sticky-note', 'text', 'frame'].includes(activeTool)) {
            const worldPos = screenToWorld(e.clientX, e.clientY);
            setInteractionState({ mode: INTERACTION_MODE.DRAWING, data: { startPos: worldPos } });
        }
    }, [activeTool, camera, screenToWorld, selectedItemIds, itemMap, isSpacePressed]);
    
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
                const { initialItems: draggedItems } = interactionState.data;
                const draggedItemIds = new Set(draggedItems.map((i: Item) => i.id));
                setItems(currentItems => currentItems.map(item => 
                    draggedItemIds.has(item.id) ? { ...item, x: item.x + worldDx, y: item.y + worldDy } : item
                ));
                break;
            }
            case INTERACTION_MODE.RESIZING_ITEM: {
                const { item, handle, isShiftPressed, isAltPressed } = interactionState.data;
                const newPosAndSize = resizeItem(item, handle, dx / camera.zoom, dy / camera.zoom, isShiftPressed, isAltPressed);
                setItems(its => its.map(i => i.id === item.id ? { ...i, ...newPosAndSize } : i));
                interactionState.data.item = {...item, ...newPosAndSize};
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
            case INTERACTION_MODE.DRAGGING_ITEMS: {
                const { initialItems } = interactionState.data;
                const movedItemIds = new Set(initialItems.map((i: Item) => i.id));
                const finalItemsStateAfterMove = items.filter(i => movedItemIds.has(i.id));

                const itemsToCheckForReparenting = initialItems.filter((i: Item) => !i.parentId || !movedItemIds.has(i.parentId));
                const allItemUpdates: Item[] = [];

                itemsToCheckForReparenting.forEach((initialDraggedItem: Item) => {
                    const finalDraggedItem = finalItemsStateAfterMove.find(i => i.id === initialDraggedItem.id)!;
                    const potentialParent = items.find(p => p.type === 'frame' && p.id !== finalDraggedItem.id && !movedItemIds.has(p.id) && doRectanglesOverlap(finalDraggedItem, p));

                    if (potentialParent?.id !== initialDraggedItem.parentId) {
                        allItemUpdates.push({ ...finalDraggedItem, parentId: potentialParent?.id });
                    }
                });

                const hasPositionChanged = initialItems.some((initial: Item) => {
                    const final = finalItemsStateAfterMove.find(f => f.id === initial.id)!;
                    return initial.x !== final.x || initial.y !== final.y;
                });

                if (hasPositionChanged || allItemUpdates.length > 0) {
                    const oldBatch = new Map<string, Item>();
                    initialItems.forEach((i: Item) => oldBatch.set(i.id, i));
                    
                    const newBatch = new Map<string, Item>();
                    finalItemsStateAfterMove.forEach(i => newBatch.set(i.id, i));

                    allItemUpdates.forEach(updatedItem => {
                         const oldParentId = initialItems.find((i:Item) => i.id === updatedItem.id)!.parentId;
                         if (oldParentId) {
                            const oldParent = oldBatch.get(oldParentId) ?? {...itemMap.get(oldParentId)!};
                            oldBatch.set(oldParentId, oldParent);
                            const newOldParent = {...oldParent, childIds: oldParent.childIds?.filter(id => id !== updatedItem.id)};
                            newBatch.set(oldParentId, newOldParent);
                         }
                         if (updatedItem.parentId) {
                            const newParent = newBatch.get(updatedItem.parentId) ?? {...itemMap.get(updatedItem.parentId)!};
                            newBatch.set(newParent.id, newParent);
                            const newNewParent = {...newParent, childIds: [...(newParent.childIds ?? []), updatedItem.id]};
                            newBatch.set(newParent.id, newNewParent);
                         }
                         newBatch.set(updatedItem.id, updatedItem);
                    });

                    addCommand({ type: 'UPDATE_BATCH', data: { oldItems: Array.from(oldBatch.values()), newItems: Array.from(newBatch.values()) } });
                    setItems(currentItems => currentItems.map(item => newBatch.get(item.id) ?? item));
                }
                break;
            }
            case INTERACTION_MODE.RESIZING_ITEM: {
                const { item: initialItem } = interactionState.data;
                const finalItem = items.find(i => i.id === initialItem.id)!;
                if (initialItem.width !== finalItem.width || initialItem.height !== finalItem.height || initialItem.x !== finalItem.x || initialItem.y !== finalItem.y) {
                    addCommand({ type: 'RESIZE', data: { itemId: initialItem.id, from: { x: initialItem.x, y: initialItem.y, width: initialItem.width, height: initialItem.height }, to: { x: finalItem.x, y: finalItem.y, width: finalItem.width, height: finalItem.height } } });
                }
                break;
            }
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
                    const type = activeTool as 'sticky-note' | 'text' | 'frame';
                    newItem = { ...currentRect, id: nanoid(), type, text: type === 'frame' ? 'Frame' : '', backgroundColor: type === 'sticky-note' ? '#FFF9C4' : (type === 'frame' ? '#FFFFFF' : 'transparent'), isVisible: true };
                }
                addCommand({ type: 'ADD', data: { items: [newItem] } });
                setItems(its => [...its, newItem]);
                setActiveTool('select');
                setSelectedItemIds([newItem.id]);
                break;
            }
        }
        setInteractionState({ mode: INTERACTION_MODE.IDLE, data: {} });
    }, [interactionState, screenToWorld, items, activeTool, setItems, addCommand, itemMap]);

    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom - e.deltaY * 0.001));
        const mouseWorldPos = screenToWorld(e.clientX, e.clientY);
        const canvasBounds = canvasRef.current?.getBoundingClientRect();
        if (!canvasBounds) return;
        const newCameraX = e.clientX - mouseWorldPos.x * newZoom - canvasBounds.left;
        const newCameraY = e.clientY - mouseWorldPos.y * newZoom - canvasBounds.top;
        setCamera({ x: newCameraX, y: newCameraY, zoom: newZoom });
    }, [camera.zoom, screenToWorld]);
    
    const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, handle: Handle, item: Item) => {
        e.stopPropagation();
        setInteractionState({
            mode: INTERACTION_MODE.RESIZING_ITEM,
            data: { item: { ...item }, handle, isShiftPressed: e.shiftKey, isAltPressed: e.altKey }
        });
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleTextChange = useCallback((itemId: string, newText: string) => {
        setItems(its => its.map(i => i.id === itemId ? { ...i, text: newText } : i));
    }, [setItems]);
    
    const handleTextCommit = (itemId: string, from: string, to: string) => {
        if (from === to) return;
        addCommand({ type: 'UPDATE_TEXT', data: { itemId, from, to } });
    };

    const handleUpdateItems = useCallback((itemIds: string[], updates: Partial<Item>) => {
        const oldItems = items.filter(i => itemIds.includes(i.id));
        const newItems = oldItems.map(i => ({...i, ...updates}));
        addCommand({ type: 'UPDATE_BATCH', data: { oldItems, newItems }});
        setItems(its => its.map(i => itemIds.includes(i.id) ? { ...i, ...updates } : i));
    }, [setItems, items, addCommand]);
    
    const handleUpdatePage = useCallback((pageId: string, updates: Partial<Page>) => {
        const oldPage = pages.find(p => p.id === pageId)!;
        const oldUpdates: Partial<Page> = {};
        Object.keys(updates).forEach(key => { (oldUpdates as any)[key] = (oldPage as any)[key]; });
        addCommand({ type: 'UPDATE_PAGE', data: { pageId, from: oldUpdates, to: updates }});
        setPages(ps => ps.map(p => p.id === pageId ? {...p, ...updates} : p));
    }, [pages, addCommand]);

    const handleDeleteItems = useCallback(() => {
        if (selectedItemIds.length === 0) return;
        const itemsToDelete = new Set<string>();
        const queue = [...selectedItemIds];
        while (queue.length > 0) {
            const id = queue.shift()!;
            if (itemsToDelete.has(id)) continue;
            itemsToDelete.add(id);
            const item = itemMap.get(id);
            if (item?.childIds) queue.push(...item.childIds);
        }
        const deletedItems = items.filter(item => itemsToDelete.has(item.id));
        addCommand({ type: 'DELETE', data: { items: deletedItems } });
        setItems(its => its.filter(item => !itemsToDelete.has(item.id)));
        setSelectedItemIds([]);
    }, [selectedItemIds, items, itemMap, addCommand, setItems]);

    const handleFrameSelection = useCallback(() => {
        const selected = selectedItemIds.map(id => itemMap.get(id)!).filter(Boolean);
        if (selected.length === 0) return;
        const bounds = getBounds(selected);
        const newFrame: Item = { ...bounds, id: nanoid(), type: 'frame', childIds: selected.map(i => i.id), backgroundColor: '#FFFFFF', isVisible: true };
        const updatedChildren = selected.map(child => ({ id: child.id, oldParentId: child.parentId }));
        addCommand({ type: 'FRAME_SELECTION', data: { createdFrame: newFrame, updatedChildren } });
        setItems(its => [...its.map(i => selectedItemIds.includes(i.id) ? { ...i, parentId: newFrame.id } : i), newFrame]);
        setSelectedItemIds([newFrame.id]);
    }, [selectedItemIds, items, addCommand, setItems, itemMap]);
    
    const handleReorderSelection = useCallback((direction: 'front' | 'back' | 'forward' | 'backward') => {
        const oldItems = [...items];
        let newItems = [...items];
        const selected = new Set(selectedItemIds);
        if (selected.size === 0) return;

        if (direction === 'front') {
            const toMove = newItems.filter(i => selected.has(i.id));
            const others = newItems.filter(i => !selected.has(i.id));
            newItems = [...others, ...toMove];
        } else if (direction === 'back') {
            const toMove = newItems.filter(i => selected.has(i.id));
            const others = newItems.filter(i => !selected.has(i.id));
            newItems = [...toMove, ...others];
        } else if (direction === 'forward') {
            for (let i = newItems.length - 2; i >= 0; i--) {
                if (selected.has(newItems[i].id) && !selected.has(newItems[i+1].id)) {
                    [newItems[i], newItems[i+1]] = [newItems[i+1], newItems[i]];
                }
            }
        } else if (direction === 'backward') {
            for (let i = 1; i < newItems.length; i++) {
                if (selected.has(newItems[i].id) && !selected.has(newItems[i-1].id)) {
                    [newItems[i], newItems[i-1]] = [newItems[i-1], newItems[i]];
                }
            }
        }

        addCommand({ type: 'REORDER', data: { from: oldItems, to: newItems }});
        setItems(newItems);
    }, [items, selectedItemIds, addCommand, setItems]);

    const applyCommand = useCallback((command: Command, isUndo: boolean) => {
        const apply = (updateFunc: (currentItems: Item[]) => Item[]) => setItems(updateFunc);
        const applyPageUpdate = (updateFunc: (currentPages: Page[]) => Page[]) => setPages(updateFunc);
        
        const { type, data } = command;

        switch (type) {
            case 'ADD':
                const idsToAdd = new Set(data.items.map(i => i.id));
                apply(its => isUndo ? its.filter(i => !idsToAdd.has(i.id)) : [...its, ...data.items]);
                break;
            case 'DELETE':
                const idsToDelete = new Set(data.items.map(i => i.id));
                apply(its => isUndo ? [...its, ...data.items] : its.filter(i => !idsToDelete.has(i.id)));
                break;
            case 'UPDATE_TEXT':
                apply(its => its.map(i => i.id === data.itemId ? { ...i, text: isUndo ? data.from : data.to } : i));
                break;
            case 'RESIZE':
                apply(its => its.map(i => i.id === data.itemId ? { ...i, ...(isUndo ? data.from : data.to) } : i));
                break;
            case 'UPDATE_BATCH':
                const itemsToUpdate = isUndo ? data.oldItems : data.newItems;
                const updateMap = new Map(itemsToUpdate.map(i => [i.id, i]));
                apply(its => its.map(i => updateMap.get(i.id) ?? i));
                break;
            case 'REORDER':
                apply(() => isUndo ? data.from : data.to);
                break;
            case 'FRAME_SELECTION':
                if (isUndo) {
                    apply(its => its.filter(i => i.id !== data.createdFrame.id).map(i => {
                        const childUpdate = data.updatedChildren.find(c => c.id === i.id);
                        return childUpdate ? { ...i, parentId: childUpdate.oldParentId } : i;
                    }));
                } else {
                    apply(its => [...its.map(i => {
                        const childUpdate = data.updatedChildren.find(c => c.id === i.id);
                        return childUpdate ? { ...i, parentId: data.createdFrame.id } : i;
                    }), data.createdFrame]);
                }
                break;
            case 'UPDATE_PAGE':
                applyPageUpdate(ps => ps.map(p => p.id === data.pageId ? { ...p, ...(isUndo ? data.from : data.to) } : p));
                break;
        }
    }, [setItems, setPages]);

    const handleUndo = useCallback(() => {
        const history = historyByPage.current[activePageId] || [];
        const historyIndex = historyIndexByPage.current[activePageId] ?? -1;
        if (historyIndex < 0) return;
        
        applyCommand(history[historyIndex], true);
        historyIndexByPage.current[activePageId] = historyIndex - 1;
    }, [activePageId, applyCommand]);

    const handleRedo = useCallback(() => {
        const history = historyByPage.current[activePageId] || [];
        const historyIndex = historyIndexByPage.current[activePageId] ?? -1;
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        applyCommand(history[newIndex], false);
        historyIndexByPage.current[activePageId] = newIndex;
    }, [activePageId, applyCommand]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            if (e.key === ' ') { e.preventDefault(); setIsSpacePressed(true); }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDeleteItems(); }
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); }
        };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') { e.preventDefault(); setIsSpacePressed(false); } };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
    }, [handleDeleteItems, handleUndo, handleRedo]);

    const activePage = useMemo(() => pages.find(p => p.id === activePageId)!, [pages, activePageId]);
    const selectedItems = useMemo(() => selectedItemIds.map(id => itemMap.get(id)).filter((i): i is Item => !!i), [selectedItemIds, itemMap]);

    return (
        <div className="w-full h-full" style={{ cursor: isSpacePressed ? 'grab' : 'none' }}>
            <LayersPanel
                pages={pages}
                activePageId={activePageId}
                items={items}
                selectedItemIds={selectedItemIds}
                onAddPage={() => { const newId = nanoid(); setPages(p => [...p, { id: newId, name: `Page ${p.length + 1}` }]); setItemsByPage(i => ({...i, [newId]: []})); setActivePageId(newId); }}
                onSwitchPage={(pageId) => { setActivePageId(pageId); setSelectedItemIds([]); }}
                onDeletePage={(pageId) => { if (pages.length > 1) { setPages(p => p.filter(i => i.id !== pageId)); setActivePageId(pages.find(p => p.id !== pageId)!.id); } }}
                onRenamePage={(pageId, newName) => setPages(p => p.map(i => i.id === pageId ? { ...i, name: newName } : i))}
                onSelectionChange={(id, shift, ctrl) => { setSelectedItemIds(ids => shift ? (ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]) : [id]); }}
                onHoverChange={setHoveredItemId}
                onToggleVisibility={(id) => handleUpdateItems([id], { isVisible: !itemMap.get(id)?.isVisible })}
                onToggleLock={(id) => handleUpdateItems([id], { isLocked: !itemMap.get(id)?.isLocked })}
                onTextChange={handleTextChange}
                onTextCommit={handleTextCommit}
                onFrameSelection={handleFrameSelection}
                onGroup={() => {}}
                onUngroup={() => {}}
                onReorder={handleReorderSelection}
            />
            <div
                ref={canvasRef}
                className="canvas-container"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={() => setIsMouseOnCanvas(false)}
                onMouseEnter={() => setIsMouseOnCanvas(true)}
                onWheel={onWheel}
                style={{ backgroundColor: activePage?.backgroundColor }}
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
                            isGroupMemberOfSelection={!!item.parentId && selectedItemIds.includes(item.parentId)}
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
                onUpdatePage={handleUpdatePage}
                onDeleteItems={handleDeleteItems}
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
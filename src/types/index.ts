export type ItemType = 'image' | 'shape' | 'sticky-note' | 'text' | 'group' | 'frame';
export type ShapeType = 'rectangle' | 'ellipse' | 'cylinder' | 'terminator' | 'decision' | 'star';

export interface Page {
  id: string;
  name: string;
  backgroundColor?: string;
}

export interface Item {
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
  childIds?: string[];
  parentId?: string;
  isVisible?: boolean;
  isLocked?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface ItemPositionAndSize {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type Tool = 'select' | 'pan' | 'sticky-note' | ShapeType | 'text' | 'frame';

export const INTERACTION_MODE = {
  IDLE: 'IDLE',
  PANNING: 'PANNING',
  MARQUEE_SELECT: 'MARQUEE_SELECT',
  DRAGGING_ITEMS: 'DRAGGING_ITEMS',
  RESIZING_ITEM: 'RESIZING_ITEM',
  DRAWING: 'DRAWING',
} as const;

export type InteractionMode = typeof INTERACTION_MODE[keyof typeof INTERACTION_MODE];

export interface InteractionState {
    mode: InteractionMode;
    data: any;
}

export type Command =
  | { type: 'MOVE'; data: { items: { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[] } }
  | { type: 'RESIZE'; data: { itemId: string; from: ItemPositionAndSize; to: ItemPositionAndSize, childUpdates?: {id: string, from: ItemPositionAndSize, to: ItemPositionAndSize}[] } }
  | { type: 'UPDATE_TEXT'; data: { itemId: string; from: string; to: string } }
  | { type: 'ADD'; data: { items: Item[] } }
  | { type: 'DELETE'; data: { items: Item[] } }
  | { type: 'REORDER'; data: { from: Item[], to: Item[] }}
  | { type: 'GROUP'; data: { createdGroup: Item, updatedChildren: {id: string, oldParentId?: string}[] } }
  | { type: 'UNGROUP'; data: { removedGroup: Item, updatedChildren: {id:string, oldParentId?: string}[] } }
  | { type: 'UPDATE_BATCH'; data: { oldItems: Item[]; newItems: Item[] } }
  | { type: 'UPDATE_PAGE'; data: { pageId: string, from: Partial<Page>, to: Partial<Page> } };

export type Handle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
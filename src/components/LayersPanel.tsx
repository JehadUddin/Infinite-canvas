import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { Item, Page } from '../types';
import { GroupIcon, ImageIcon, TextIcon, StickyNoteIcon, RectangleIcon, EllipseIcon, CylinderIcon, TerminatorIcon, DecisionIcon, StarIcon, PlusIcon, CheckIcon, TrashIcon, FrameIcon } from './Icons';

const LayerIcon = memo(({ item }: { item: Item }) => {
    const iconProps = { className: 'layer-icon' };
    switch (item.type) {
        case 'group': return <GroupIcon {...iconProps} />;
        case 'frame': return <FrameIcon {...iconProps} />;
        case 'image': return <ImageIcon {...iconProps} />;
        case 'text': return <TextIcon {...iconProps} />;
        case 'sticky-note': return <StickyNoteIcon {...iconProps} />;
        case 'shape':
            switch (item.shapeType) {
                case 'rectangle': return <RectangleIcon {...iconProps} />;
                case 'ellipse': return <EllipseIcon {...iconProps} />;
                case 'cylinder': return <CylinderIcon {...iconProps} />;
                case 'terminator': return <TerminatorIcon {...iconProps} />;
                case 'decision': return <DecisionIcon {...iconProps} />;
                case 'star': return <StarIcon {...iconProps} />;
                default: return <RectangleIcon {...iconProps} />;
            }
        default: return null;
    }
});

interface LayerNodeProps {
    itemId: string;
    itemMap: Map<string, Item>;
    depth: number;
    selectedItemIds: Set<string>;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onSelectionChange: (clickedId: string, isShiftKey: boolean, isCtrlKey: boolean) => void;
    onHoverChange: (id: string | null) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    editingId: string | null;
    onStartEditing: (id: string, currentText: string) => void;
    onTextChange: (itemId: string, newText: string) => void;
    onCommitText: (id: string) => void;
    onCancelEditing: (id: string) => void;
}

const LayerNode = memo(({ itemId, itemMap, depth, selectedItemIds, expandedIds, onToggleExpand, onSelectionChange, onHoverChange, onToggleVisibility, onToggleLock, editingId, onStartEditing, onTextChange, onCommitText, onCancelEditing }: LayerNodeProps) => {
    const item = itemMap.get(itemId);
    if (!item) return null;

    const inputRef = useRef<HTMLInputElement>(null);
    const isEditing = editingId === item.id;

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleCommit = () => onCommitText(item.id);
    const handleCancel = () => onCancelEditing(item.id);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommit();
        else if (e.key === 'Escape') handleCancel();
        e.stopPropagation();
    };

    const isExpanded = expandedIds.has(item.id);
    const isContainer = item.type === 'group' || item.type === 'frame';

    const handleExpandClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(item.id);
    };
    
    const layerClasses = `layer-item ${selectedItemIds.has(item.id) ? 'selected' : ''} ${!item.isVisible || item.isLocked ? 'disabled' : ''}`;

    return (
        <>
            <div
                className={layerClasses}
                onClick={(e) => onSelectionChange(item.id, e.shiftKey, e.metaKey || e.ctrlKey)}
                onMouseEnter={() => onHoverChange(item.id)}
                onMouseLeave={() => onHoverChange(null)}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onDoubleClick={(e) => { e.stopPropagation(); onStartEditing(item.id, item.text || ''); }}
            >
                <div className="layer-item-content">
                    {isContainer ? (
                        <button className="expander" onClick={handleExpandClick}>
                            <svg width="16" height="16" viewBox="0 0 16 16" className={isExpanded ? 'expanded' : ''}>
                                <path d="M6 4L10 8L6 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    ) : (
                        <div className="expander-placeholder"></div>
                    )}
                    <LayerIcon item={item} />
                     {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={item.text}
                            onChange={(e) => onTextChange(item.id, e.target.value)}
                            onBlur={handleCommit}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full h-[20px] bg-[#555] border border-[#007aff] text-white rounded-[3px] px-1 text-[13px] font-sans"
                        />
                    ) : (
                        <span>{item.text || item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                    )}
                </div>
                <div className="layer-item-controls">
                    <button onClick={(e) => { e.stopPropagation(); onToggleLock(item.id); }}>
                        {item.isLocked ? 
                            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"></path></svg> : 
                            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"></path></svg>
                        }
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(item.id); }}>
                        {item.isVisible === false ? 
                            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5"></path></svg> : 
                            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3h-.17m-4.3.8l1.55 1.55c-.05.16-.08.33-.08.5a3 3 0 0 0 3 3c.17 0 .34-.03.5-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28l.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.42.42L21.73 22L20.45 20.72L4.27 4.5L2 4.27M12 7a5 5 0 0 1 5 5c0 .64-.13 1.25-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-4 .7l2.17 2.15C10.75 7.13 11.36 7 12 7"></path></svg>
                        }
                    </button>
                </div>
            </div>
            {isContainer && isExpanded && (
                <div className="layer-node-children">
                    {[...(item.childIds || [])].reverse().map(childId => (
                        <LayerNode
                            key={childId}
                            itemId={childId}
                            itemMap={itemMap}
                            depth={depth + 1}
                            selectedItemIds={selectedItemIds}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onSelectionChange={onSelectionChange}
                            onHoverChange={onHoverChange}
                            onToggleVisibility={onToggleVisibility}
                            onToggleLock={onToggleLock}
                            editingId={editingId}
                            onStartEditing={onStartEditing}
                            onTextChange={onTextChange}
                            onCommitText={onCommitText}
                            onCancelEditing={onCancelEditing}
                        />
                    ))}
                </div>
            )}
        </>
    );
});

interface LayersPanelProps {
    pages: Page[];
    activePageId: string;
    items: Item[];
    selectedItemIds: string[];
    onAddPage: () => void;
    onSwitchPage: (pageId: string) => void;
    onDeletePage: (pageId: string) => void;
    onRenamePage: (pageId: string, newName: string) => void;
    onSelectionChange: (clickedId: string, isShiftKey: boolean, isCtrlKey: boolean) => void;
    onHoverChange: (id: string | null) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onTextChange: (itemId: string, newText: string) => void;
    onTextCommit: (itemId: string, from: string, to: string) => void;
}

export const LayersPanel = memo(({ pages, activePageId, items, selectedItemIds, onAddPage, onSwitchPage, onDeletePage, onRenamePage, onSelectionChange, onHoverChange, onToggleVisibility, onToggleLock, onTextChange, onTextCommit }: LayersPanelProps) => {
    const [expandedLayerIds, setExpandedLayerIds] = useState<Set<string>>(new Set());
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const layerTextOnEdit = useRef('');

    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const pageNameOnEdit = useRef('');
    const [isPagesExpanded, setIsPagesExpanded] = useState(true);

    const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
    const rootItemIds = useMemo(() => items.filter(i => !i.parentId).map(i => i.id), [items]);

    // Layer editing handlers
    const handleStartLayerEditing = useCallback((id: string, currentText: string) => { setEditingLayerId(id); layerTextOnEdit.current = currentText; }, []);
    const handleCommitLayerText = useCallback((id: string) => {
        const item = itemMap.get(id);
        if (item && layerTextOnEdit.current !== item.text) {
            onTextCommit(id, layerTextOnEdit.current, item.text);
        }
        setEditingLayerId(null);
    }, [onTextCommit, itemMap]);
    const handleCancelLayerEditing = useCallback((id: string) => { onTextChange(id, layerTextOnEdit.current); setEditingLayerId(null); }, [onTextChange]);

    // Page editing handlers
    const handleStartPageEditing = (page: Page) => { setEditingPageId(page.id); pageNameOnEdit.current = page.name; };
    const handlePageNameChange = (pageId: string, newName: string) => { onRenamePage(pageId, newName); };
    const handleCommitPageName = (pageId: string) => { setEditingPageId(null); };
    const handlePageRenameKeyDown = (e: React.KeyboardEvent, page: Page) => {
        if (e.key === 'Enter') handleCommitPageName(page.id);
        if (e.key === 'Escape') { onRenamePage(page.id, pageNameOnEdit.current); setEditingPageId(null); }
    };

    const selectedIdsSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);

    return (
        <div className="layers-panel">
            <div className="panel-header">Scratchpad</div>

            <div className="panel-content">
                <div className="pages-section">
                    <div className="section-header" onClick={() => setIsPagesExpanded(!isPagesExpanded)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" className={`expander-arrow ${isPagesExpanded ? 'expanded' : ''}`}><path d="M6 4L10 8L6 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span>Pages</span>
                        <button className="add-page-btn" onClick={(e) => { e.stopPropagation(); onAddPage(); }}><PlusIcon width={16} height={16} /></button>
                    </div>
                    {isPagesExpanded && (
                        <div className="pages-list">
                            {pages.map(page => (
                                <div key={page.id} className={`page-item ${page.id === activePageId ? 'active' : ''}`} onClick={() => onSwitchPage(page.id)} onDoubleClick={() => handleStartPageEditing(page)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" className="page-icon"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"></path></svg>
                                    {editingPageId === page.id ? (
                                        <input
                                            type="text"
                                            value={page.name}
                                            onChange={(e) => handlePageNameChange(page.id, e.target.value)}
                                            onBlur={() => handleCommitPageName(page.id)}
                                            onKeyDown={(e) => handlePageRenameKeyDown(e, page)}
                                            className="w-full h-[20px] bg-[#555] border border-[#007aff] text-white rounded-[3px] px-1 text-[13px] font-sans"
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="page-name">{page.name}</span>
                                    )}
                                    {page.id === activePageId && <CheckIcon className="page-active-check" width={16} height={16} />}
                                    <button className="page-delete-btn" onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }}><TrashIcon width={14} height={14}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="panel-separator"></div>

                <div className="section-header">
                    <span>Layers</span>
                </div>
                <div className="layer-list">
                    {[...rootItemIds].reverse().map(id => (
                         <LayerNode
                            key={id}
                            itemId={id}
                            itemMap={itemMap}
                            depth={0}
                            selectedItemIds={selectedIdsSet}
                            expandedIds={expandedLayerIds}
                            onToggleExpand={(id) => setExpandedLayerIds(p => p.has(id) ? new Set([...p].filter(i => i !== id)) : new Set([...p, id]))}
                            onSelectionChange={onSelectionChange}
                            onHoverChange={onHoverChange}
                            onToggleVisibility={onToggleVisibility}
                            onToggleLock={onToggleLock}
                            editingId={editingLayerId}
                            onStartEditing={handleStartLayerEditing}
                            onTextChange={onTextChange}
                            onCommitText={handleCommitLayerText}
                            onCancelEditing={handleCancelLayerEditing}
                        />
                    ))}
                </div>
            </div>

            <div className="panel-footer">
                <span>Paper Alpha</span>
                <span>•</span>
                <span>Feedback</span>
            </div>
        </div>
    );
});
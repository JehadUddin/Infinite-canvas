import React, { useState, useCallback, useMemo, ChangeEvent, useEffect } from 'react';
import { Item, Page } from '../types';

interface ControlPanelProps {
    selectedItems: Item[];
    activePage: Page;
    onUpdateItems: (itemIds: string[], updates: Partial<Item>) => void;
    onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
}

const CollapsibleSection = ({ title, children }: { title: string, children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="cp-section">
            <div className="cp-section-header" onClick={() => setIsOpen(!isOpen)}>
                <svg width="16" height="16" viewBox="0 0 16 16" className={`cp-arrow ${isOpen ? 'expanded' : ''}`}><path d="M6 4L10 8L6 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{title}</span>
            </div>
            {isOpen && <div className="cp-section-content">{children}</div>}
        </div>
    );
};

const NumberInput = ({ label, value, onChange }: { label: string, value: number | 'mixed', onChange: (updates: Partial<Item>) => void }) => {
    const [internalValue, setInternalValue] = useState<string>(value.toString());
    
    useEffect(() => {
        setInternalValue(value === 'mixed' ? '' : value.toString());
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInternalValue(e.target.value);
    };

    const handleBlur = () => {
        const num = parseFloat(internalValue);
        if (!isNaN(num)) {
            onChange({ [label.toLowerCase()]: num });
        } else {
            setInternalValue(value === 'mixed' ? '' : value.toString()); // revert if invalid
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    };

    return (
        <div className="cp-row-half">
            <label className="cp-label">{label}</label>
            <input 
                type="number"
                value={internalValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="cp-input"
                placeholder={value === 'mixed' ? 'Mixed' : ''}
            />
        </div>
    );
};

const ColorInput = ({ label, value, onUpdate }: { label: string, value: string, onUpdate: (updates: Partial<Item | Page>) => void }) => {
    const propertyName = label.toLowerCase().includes('background') ? 'backgroundColor' : 'strokeColor';
    const colorValue = value === 'mixed' ? '#ffffff' : value;

    return (
        <div className="cp-row">
            <label className="cp-label">{label}</label>
            <div className="cp-color-input-wrapper">
                <input 
                    type="color"
                    value={colorValue.startsWith('#') ? colorValue : '#000000'}
                    onChange={(e) => onUpdate({ [propertyName]: e.target.value })}
                    className="cp-color-swatch"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onUpdate({ [propertyName]: e.target.value })}
                    className="cp-input"
                    placeholder={value === 'mixed' ? 'Mixed' : ''}
                />
            </div>
        </div>
    );
};

export const ControlPanel = ({ selectedItems, activePage, onUpdateItems, onUpdatePage }: ControlPanelProps) => {
    
    const getCommonValue = useCallback((key: keyof Item, defaultValue?: any) => {
        if (selectedItems.length === 0) return undefined;
        const firstValue = selectedItems[0][key] ?? defaultValue;
        const allSame = selectedItems.every(item => (item[key] ?? defaultValue) === firstValue);
        return allSame ? firstValue : 'mixed';
    }, [selectedItems]);
    
    const handleUpdate = useCallback((updates: Partial<Item>) => {
        if (selectedItems.length === 0) return;
        const ids = selectedItems.map(i => i.id);
        onUpdateItems(ids, updates);
    }, [selectedItems, onUpdateItems]);

    const commonX = useMemo(() => getCommonValue('x'), [getCommonValue]);
    const commonY = useMemo(() => getCommonValue('y'), [getCommonValue]);
    const commonWidth = useMemo(() => getCommonValue('width'), [getCommonValue]);
    const commonHeight = useMemo(() => getCommonValue('height'), [getCommonValue]);
    
    const commonBackgroundColor = useMemo(() => {
        if (selectedItems.length === 0) return undefined;
        const firstValue = selectedItems[0].backgroundColor || 'transparent';
        const allSame = selectedItems.every(item => (item.backgroundColor || 'transparent') === firstValue);
        return allSame ? firstValue : 'mixed';
    }, [selectedItems]);

    const commonStrokeColor = useMemo(() => getCommonValue('strokeColor', '#000000'), [getCommonValue]);
    const commonStrokeWidth = useMemo(() => getCommonValue('strokeWidth', 1), [getCommonValue]);

    if (selectedItems.length === 0) {
        return (
            <div className="control-panel">
                <div className="cp-header">Document</div>
                <CollapsibleSection title="Page">
                    <ColorInput 
                        label="Background"
                        value={activePage.backgroundColor || '#2d2d2d'}
                        onUpdate={(update) => onUpdatePage(activePage.id, update)}
                    />
                </CollapsibleSection>
            </div>
        );
    }

    return (
        <div className="control-panel">
            <CollapsibleSection title="Layout">
                <div className="cp-row-grid">
                    <NumberInput label="x" value={commonX as number | 'mixed'} onChange={handleUpdate} />
                    <NumberInput label="y" value={commonY as number | 'mixed'} onChange={handleUpdate} />
                </div>
                 <div className="cp-row-grid">
                    <NumberInput label="width" value={commonWidth as number | 'mixed'} onChange={handleUpdate} />
                    <NumberInput label="height" value={commonHeight as number | 'mixed'} onChange={handleUpdate} />
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Fill">
                <ColorInput 
                    label="Background"
                    value={commonBackgroundColor as string}
                    onUpdate={handleUpdate}
                />
            </CollapsibleSection>
            <CollapsibleSection title="Stroke">
                <ColorInput 
                    label="Stroke Color"
                    value={commonStrokeColor as string}
                    onUpdate={handleUpdate}
                />
                <div className="cp-row">
                    <label className="cp-label">Width</label>
                    <input 
                        type="number"
                        value={commonStrokeWidth === 'mixed' ? '' : commonStrokeWidth}
                        onChange={(e) => handleUpdate({ strokeWidth: parseFloat(e.target.value) || 0 })}
                        className="cp-input"
                        placeholder={commonStrokeWidth === 'mixed' ? 'Mixed' : ''}
                    />
                </div>
            </CollapsibleSection>
        </div>
    );
};

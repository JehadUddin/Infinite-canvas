import React from 'react';

export const ArrowIcon = ({isToolbarIcon = false}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={isToolbarIcon ? {} : { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z" fill={isToolbarIcon ? 'currentColor' : '#FFF'} stroke={isToolbarIcon ? 'none' : '#000'} strokeWidth="1.5" />
    </svg>
);

export const PanningIcon = ({isToolbarIcon = false}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={isToolbarIcon ? {} : { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M4.75 12.5h-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm3.5-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm4.5 2h-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm3.5-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" fill={isToolbarIcon ? 'currentColor' : 'white'} stroke={isToolbarIcon ? 'none' : 'black'} strokeWidth="1.25"/>
    </svg>
);

export const GrabbingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
        <path d="M4.5 12.5a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4-2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4.5 2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Zm4-2a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5Z" fill="white" stroke="black" strokeWidth="1.25"/>
    </svg>
);

export const CrosshairIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4V8M12 16V20M20 12H16M8 12H4M12 12H12.01" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const PlusIcon = ({...props}) => <svg {...props} viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>;
export const CheckIcon = ({...props}) => <svg {...props} viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>;
export const TrashIcon = ({...props}) => <svg {...props} viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>

export const FrameIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M3 3h18v2H3V3m0 4h2v10H3V7m4 0h10v2H7V7m0 4h10v2H7v-2m0 4h10v2H7v-2m14-8h2v10h-2V7M3 19h18v2H3v-2Z"/></svg>
export const StickyNoteIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M15.54 3.5L19 6.96V20.5H5.5V3.5h10.04M15.54 2H5.5C4.67 2 4 2.67 4 3.5v17c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V6.25L15.54 2m-8.08 15h9.08v1.5H7.46v-1.5m0-4.5h9.08v1.5H7.46v-1.5m0-4.5h6.08v1.5H7.46v-1.5Z"/></svg>
export const RectangleIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 6v12h16V6H4m14 10H6V8h12v8Z"/></svg>
export const EllipseIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 6c-5.4 0-10 2.89-10 6.5S6.6 19 12 19s10-2.89 10-6.5S17.4 6 12 6m0 11c-4.29 0-8-2-8-4.5S7.71 8 12 8s8 2 8 4.5-3.71 4.5-8 4.5Z"/></svg>
export const TextIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M18.5 4H5.5C4.67 4 4 4.67 4 5.5v3h1.5v-3h5v12h-2v1.5h7v-1.5h-2v-12h5v3H20v-3c0-.83-.67-1.5-1.5-1.5Z"/></svg>
export const CylinderIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 2C8.13 2 5 3.57 5 5.5V18.5c0 1.93 3.13 3.5 7 3.5s7-1.57 7-3.5V5.5C19 3.57 15.87 2 12 2M5 7.31c0-1.13 2.5-2.2 5.69-2.62C11.53 7.82 12 11.23 12 15v5.5c-3.87 0-7-1.57-7-3.5V7.31Z"/></svg>
export const TerminatorIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M20 9v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/></svg>
export const DecisionIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 2L2 12l10 10l10-10L12 2Z"/></svg>
export const StarIcon = ({className = ''}) => <svg width="24" height="24" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="m12 17.27l4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.72l3.67-3.18c.67-.58.31-1.68-.57-1.75l-4.83-.41l-1.89-4.46c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18l-1.1 4.72c-.2.86.73 1.54 1.49 1.08z"/></svg>
export const GroupIcon = ({className = ''}) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M2.5 3.5C2.5 3.22386 2.72386 3 3 3H7.5C7.77614 3 8 3.22386 8 3.5V6.5C8 6.77614 7.77614 7 7.5 7H3C2.72386 7 2.5 6.77614 2.5 6.5V3.5Z" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 9.5C8.5 9.22386 8.72386 9 9 9H13.5C13.7761 9 14 9.22386 14 9.5V12.5C14 12.7761 13.7761 13 13.5 13H9C8.72386 13 8.5 12.7761 8.5 12.5V9.5Z" stroke="currentColor" strokeWidth="1.5"/></svg>
export const ImageIcon = ({className = ''}) => <svg width="16" height="16" viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
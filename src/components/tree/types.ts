/**
 * Color theme configuration for tree views
 */
export interface TreeColors {
  accent: string;           // Primary color (red for places, blue for experiences)
  text: string;
  textMuted: string;
  textDim: string;
  surfaceAlt: string;
  border: string;
  highlightBg: string;      // Entity-specific highlight background
  highlightBorder: string;  // Entity-specific highlight border
}

/**
 * Rendering state passed to node content renderers
 */
export interface NodeRenderState {
  isSelected: boolean;     // Is this node selected
  isHighlighted: boolean;  // Is this node highlighted
  hasChildren: boolean;    // Does node have children
  dragOver: boolean;       // Is drag currently over this node
}

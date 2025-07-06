// src/types.ts
import type { Node, Edge } from 'vis-network';

export interface ExtendedNode extends Node {
  att_goal?: string;
  att_method?: string;
  att_background?: string;
  att_future?: string;
  att_gaps?: string;
  att_url?: string;
  title?: string;
}

export interface ExtendedEdge extends Edge {
  id?: string;
  relation?: string;
  label?: string;
  color?: {
    color?: string;
    highlight?: string;
    hover?: string;
    opacity?: number;
  };
  fromTitle?: string;
  toTitle?: string;
  properties?: {
    description?: string;
    weight?: number;
    explanation?: string;
    similarity?: string;
    keywords?: string;
    type?: string;
  };
  displayDescription?: string;
}


export type Category = string;

export interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  category: Category;
  path: string;
  tag: string;
  content?: string;
  color?: string; // Hex color for the tag/accent
  isFavorite?: boolean;
  userTags?: string[];
  isHidden?: boolean; // If true, only admins can see this prompt
}

export interface Suggestion extends Partial<Prompt> {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  suggestedAt: number;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

export type LabelColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue';

export interface Label {
  id: string;
  text: string;
  color: LabelColor;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface Card {
  id: string;
  content: string;
  description?: string;
  labels: Label[];
  dueDate?: string;
  comments: Comment[];
  attachments: Attachment[];
}

export interface List {
  id: string;
  title: string;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  lists: List[];
  backgroundColor?: string;
}



import { Board } from '../types';

const STORAGE_KEY = 'trellox_boards';

export const saveBoards = (boards: Board[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch (error) {
    console.error('Error saving boards to localStorage:', error);
  }
};

export const loadBoards = (): Board[] => {
  try {
    const storedBoards = localStorage.getItem(STORAGE_KEY);
    if (storedBoards) {
      return JSON.parse(storedBoards);
    }
  } catch (error) {
    console.error('Error loading boards from localStorage:', error);
  }
  
  // Return default boards if none are found
  return [
    {
      id: 'board-1',
      title: 'My First Board',
      lists: [
        {
          id: 'list-1',
          title: 'To Do',
          cards: [
            {
              id: 'card-1',
              content: 'Create a Trello clone',
              description: '',
              labels: [],
              comments: [],
              attachments: [],
              checklists: [],
              createdAt: '',
              createdBy: ''
            },
            {
              id: 'card-2',
              content: 'Add drag and drop functionality',
              description: '',
              labels: [],
              comments: [],
              attachments: [],
              checklists: [],
              createdAt: '',
              createdBy: ''
            },
          ],
        },
        {
          id: 'list-2',
          title: 'In Progress',
          cards: [
            {
              id: 'card-3',
              content: 'Design the UI',
              description: '',
              labels: [],
              comments: [],
              attachments: [],
              checklists: [],
              createdAt: '',
              createdBy: ''
            },
          ],
        },
        {
          id: 'list-3',
          title: 'Done',
          cards: [
            {
              id: 'card-4',
              content: 'Set up the project',
              description: '',
              labels: [],
              comments: [],
              attachments: [],
              checklists: [],
              createdAt: '',
              createdBy: ''
            },
          ],
        },
      ],
      backgroundColor: '#0079bf',
      createdAt: '',
      createdBy: '',
      members: []
    }
  ];
};

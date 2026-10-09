import type { Column } from './model'

export const STORAGE_KEY = 'cafe-stack-kanban'
export const ADD_CARD_INPUT_ID = 'add-card-input'

export const DEFAULT_COLUMNS: ReadonlyArray<Column> = [
  {
    id: 'todo',
    name: 'To Do',
    cards: [
      { id: 'card-1', title: 'Order beans' },
      { id: 'card-2', title: 'Practice latte art' },
    ],
  },
  {
    id: 'doing',
    name: 'Brewing',
    cards: [{ id: 'card-3', title: 'Dial in the V60' }],
  },
  {
    id: 'done',
    name: 'Served',
    cards: [{ id: 'card-4', title: 'Open the café' }],
  },
]
import { Array, Option } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  pointerDown,
  pointerUp,
  role,
  scene,
  text,
} from 'foldkit/scene'
import {
  Command as StoryCommand,
  given as givenBoard,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect as assert, test } from 'vitest'

import { DragAndDrop } from '@foldkit/ui'

import { DEFAULT_COLUMNS } from './constant'
import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import { Message } from './message'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

const initialModel: Model = {
  columns: DEFAULT_COLUMNS,
  dragAndDrop: DragAndDrop.init({ id: 'kanban' }),
  maybeNewCardColumnId: Option.none(),
  newCardTitle: '',
}

const oneColumnModel: Model = {
  ...initialModel,
  columns: [Option.getOrThrow(Array.head(DEFAULT_COLUMNS))],
}

const emptyDoneModel: Model = {
  ...initialModel,
  columns: [
    {
      id: 'todo',
      name: 'To Do',
      cards: [
        { id: 'card-1', title: 'Order beans' },
        { id: 'card-2', title: 'Practice latte art' },
      ],
    },
    { id: 'doing', name: 'Brewing', cards: [] },
    { id: 'done', name: 'Served', cards: [] },
  ],
}

describe('view', () => {
  test('renders the columns and their cards', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(text('To Do')).toExist(),
      expect(text('Brewing')).toExist(),
      expect(text('Served')).toExist(),
      expect(text('Order beans')).toExist(),
      expect(role('button', { name: 'Delete Order beans' })).toExist(),
    )
  })

  test('shows the add card form for the clicked column', () => {
    scene(
      { update, view },
      given(oneColumnModel),
      click(role('button', { name: '+ Add card' })),
      Command.resolve(
        FocusAddCardInput,
        Message.CompletedFocusAddCardInput(),
      ),
      expect(role('textbox', { name: 'New card title' })).toExist(),
    )
  })
})

describe('update', () => {
  test('add card flow trims the title, appends, saves, and closes the form', () => {
    story(
      update,
      givenBoard(initialModel),
      message(Message.ClickedAddCard({ columnId: 'todo' })),
      StoryCommand.resolve(
        FocusAddCardInput,
        Message.CompletedFocusAddCardInput(),
      ),
      message(Message.ChangedNewCardTitle({ value: '  Bloom the grounds  ' })),
      message(Message.SubmittedNewCard()),
      StoryCommand.resolve(
        GenerateCardId,
        Message.CompletedGenerateCardId({
          cardId: 'card-9',
          columnId: 'todo',
          title: 'Bloom the grounds',
        }),
      ),
      StoryCommand.resolve(SaveBoard, Message.CompletedSaveBoard()),
      model(result => {
        const todo = result.columns.find(column => column.id === 'todo')
        assert(todo?.cards.at(-1)?.title).toBe('Bloom the grounds')
        assert(result.maybeNewCardColumnId).toStrictEqual(Option.none())
      }),
    )
  })

  test('pressing a card keeps it in the DOM — pointerdown → Pending must not unrender it', () => {
    scene(
      { update, view },
      given(oneColumnModel),
      pointerDown(text('Order beans')),
      expect(text('Order beans')).toExist(),
      click(role('button', { name: 'Delete Order beans' })),
      Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
      expect(text('Order beans')).toBeAbsent(),
    )
  })
})

describe('update · drag and drop', () => {
  test('pointer drag into an empty column moves the card and saves', () => {
    story(
      update,
      givenBoard(emptyDoneModel),
      message(
        Message.GotDragAndDropMessage({
          message: DragAndDrop.Message.PressedDraggable({
            itemId: 'card-2',
            containerId: 'todo',
            index: 1,
            screenX: 0,
            screenY: 0,
          }),
        }),
      ),
      message(
        Message.GotDragAndDropMessage({
          message: DragAndDrop.Message.MovedPointer({
            screenX: 60,
            screenY: 40,
            clientX: 600,
            clientY: 40,
            maybeDropTarget: Option.some({
              containerId: 'done',
              index: 0,
            }),
          }),
        }),
      ),
      message(
        Message.GotDragAndDropMessage({
          message: DragAndDrop.Message.ReleasedPointer(),
        }),
      ),
      StoryCommand.resolve(SaveBoard, Message.CompletedSaveBoard()),
      model(result => {
        const done = result.columns.find(column => column.id === 'done')
        assert(done?.cards[0]?.title).toBe('Practice latte art')
        const todo = result.columns.find(column => column.id === 'todo')
        const titles = todo?.cards.map(({ title }) => title)
        assert(titles).not.toContain('Practice latte art')
      }),
    )
  })

  test('ClickedDeleteCard removes the card and saves', () => {
    story(
      update,
      givenBoard(initialModel),
      message(
        Message.ClickedDeleteCard({ columnId: 'todo', cardId: 'card-2' }),
      ),
      StoryCommand.resolve(SaveBoard, Message.CompletedSaveBoard()),
      model(result => {
        const titles = result.columns.flatMap(({ cards }) =>
          cards.map(({ title }) => title),
        )
        assert(titles).not.toContain('Practice latte art')
      }),
    )
  })
})
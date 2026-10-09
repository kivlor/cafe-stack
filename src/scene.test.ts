import { Array, Option } from 'effect'
import {
  Command,
  click,
  expect,
  given,
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
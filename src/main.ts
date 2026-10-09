import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Runtime, Subscription } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { DragAndDrop } from '@foldkit/ui'

import { DEFAULT_COLUMNS, STORAGE_KEY } from './constant'
import { Message } from './message'
import { Model, SavedBoard, SavedBoardJsonString } from './model'
import { update } from './update'
import { view } from './view'

// FLAGS

export const Flags = Schema.Struct({
  maybeSavedBoard: Schema.Option(SavedBoard),
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* Schema.decodeEffect(SavedBoardJsonString)(json)
  return Flags.make({ maybeSavedBoard: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedBoard: Option.none() })),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// INIT

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: {
    columns: Option.match(flags.maybeSavedBoard, {
      onNone: () => DEFAULT_COLUMNS,
      onSome: ({ columns }) => columns,
    }),
    dragAndDrop: DragAndDrop.init({ id: 'kanban' }),
    maybeNewCardColumnId: Option.none(),
    newCardTitle: '',
  },
})

// SUBSCRIPTIONS

export const subscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  read: model => Option.some(model.dragAndDrop),
  toParentMessage: message => Message.GotDragAndDropMessage({ message }),
})

export { Message, Model, update, view }
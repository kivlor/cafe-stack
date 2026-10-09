import { Array, Option, Schema, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'

export const Card = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
})
export type Card = typeof Card.Type

export const Column = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  cards: Schema.Array(Card),
})
export type Column = typeof Column.Type

export const SavedBoard = Schema.Struct({
  columns: Schema.Array(Column),
})
export type SavedBoard = typeof SavedBoard.Type

export const SavedBoardJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedBoard),
)

export const Model = Schema.Struct({
  columns: Schema.Array(Column),
  dragAndDrop: DragAndDrop.Model,
  maybeNewCardColumnId: Schema.Option(Schema.String),
  newCardTitle: Schema.String,
})
export type Model = typeof Model.Type

const insertCardAt = (
  cards: ReadonlyArray<Card>,
  card: Card,
  index: number,
): ReadonlyArray<Card> =>
  pipe(
    cards,
    Array.insertAt(Math.min(index, cards.length), card),
    Option.getOrElse(() => Array.append(cards, card)),
  )

export const moveCard = (
  columns: ReadonlyArray<Column>,
  cardId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<Column> =>
  pipe(
    columns,
    Array.findFirst(({ id }) => id === fromContainerId),
    Option.flatMap(({ cards }) =>
      Array.findFirst(cards, ({ id }) => id === cardId),
    ),
    Option.match({
      onNone: () => columns,
      onSome: card =>
        Array.map(columns, column => {
          if (
            column.id !== fromContainerId &&
            column.id !== toContainerId
          ) {
            return column
          }
          const withoutCard = Array.filter(
            column.cards,
            ({ id }) => id !== cardId,
          )
          if (column.id === toContainerId) {
            return modifyFields(column, {
              cards: () => insertCardAt(withoutCard, card, toIndex),
            })
          }
          return modifyFields(column, { cards: () => withoutCard })
        }),
    }),
  )
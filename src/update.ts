import { Array, Option, String, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import { Message } from './message'
import { type Card, type Column, type Model, moveCard } from './model'

type UpdateReturn = Update.Return<Model, Message>

const appendCard = (column: Column, card: Card): Column =>
  modifyFields(column, { cards: () => Array.append(column.cards, card) })

const foldDragAndDropOutMessage =
  (_previousModel: Model) =>
  (outMessage: DragAndDrop.OutMessage) =>
  (model: Model): UpdateReturn =>
    DragAndDrop.OutMessage.match<UpdateReturn>(outMessage, {
      Reordered: ({ itemId, fromContainerId, toContainerId, toIndex }) => {
        const nextColumns = moveCard(
          model.columns,
          itemId,
          fromContainerId,
          toContainerId,
          toIndex,
        )
        return {
          model: modifyFields(model, { columns: () => nextColumns }),
          commands: [SaveBoard({ columns: nextColumns })],
        }
      },
      Cancelled: () => ({ model }),
    })

const foldDragAndDrop = (previousModel: Model) =>
  Update.foldChild({
    update: DragAndDrop.update,
    read: (model: Model) => Option.some(model.dragAndDrop),
    write: (model: Model, nextDragAndDrop: DragAndDrop.Model) =>
      modifyFields(model, { dragAndDrop: () => nextDragAndDrop }),
    toParentMessage: (message: DragAndDrop.Message) =>
      Message.GotDragAndDropMessage({ message }),
    foldOutMessage: foldDragAndDropOutMessage(previousModel),
  })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotDragAndDropMessage: ({ message }) =>
      foldDragAndDrop(model)(model, message),

    ClickedAddCard: ({ columnId }) => ({
      model: modifyFields(model, {
        maybeNewCardColumnId: () => Option.some(columnId),
        newCardTitle: () => '',
      }),
      commands: [FocusAddCardInput()],
    }),

    ChangedNewCardTitle: ({ value }) => ({
      model: modifyFields(model, { newCardTitle: () => value }),
    }),

    SubmittedNewCard: () =>
      Option.match(model.maybeNewCardColumnId, {
        onNone: () => ({ model }),
        onSome: columnId => {
          const title = String.trim(model.newCardTitle)
          if (String.isEmpty(title)) {
            return { model }
          }
          return {
            model,
            commands: [GenerateCardId({ columnId, title })],
          }
        },
      }),

    CompletedGenerateCardId: ({ cardId, columnId, title }) => {
      const nextColumns = Array.map(model.columns, column =>
        column.id === columnId
          ? appendCard(column, { id: cardId, title })
          : column,
      )
      return {
        model: modifyFields(model, {
          columns: () => nextColumns,
          maybeNewCardColumnId: () => Option.none(),
          newCardTitle: () => '',
        }),
        commands: [SaveBoard({ columns: nextColumns })],
      }
    },

    CancelledNewCard: () => ({
      model: modifyFields(model, {
        maybeNewCardColumnId: () => Option.none(),
        newCardTitle: () => '',
      }),
    }),

    ClickedDeleteCard: ({ columnId, cardId }) => {
      const nextColumns = Array.map(model.columns, column =>
        column.id === columnId
          ? modifyFields(column, {
              cards: () =>
                Array.filter(column.cards, ({ id }) => id !== cardId),
            })
          : column,
      )
      return {
        model: modifyFields(model, { columns: () => nextColumns }),
        commands: [SaveBoard({ columns: nextColumns })],
      }
    },

    CompletedSaveBoard: () => ({ model }),
    CompletedFocusAddCardInput: () => ({ model }),
  })
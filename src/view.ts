import { Array, Equal, Option, flow, pipe } from 'effect'
import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'

import { Button, DragAndDrop, Input } from '@foldkit/ui'

import { ADD_CARD_INPUT_ID } from './constant'
import { Message } from './message'
import type { Card, Column, Model } from './model'

const cardContent = (
  card: Card,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
  h.span([h.Class('text-sm font-medium text-gray-800')], [card.title]),
]

const cardView = (
  model: Model,
  card: Card,
  columnId: string,
  index: number,
  toParentMessage: (message: Message) => Message,
  h: HtmlBuilder<Message>,
): Html => {
  const maybeDraggedId = DragAndDrop.maybeDraggedItemId(model.dragAndDrop)
  const isDragged = Option.exists(maybeDraggedId, id => id === card.id)
  const isPointerDragged =
    model.dragAndDrop.dragState._tag === 'Dragging' && isDragged
  const isKeyboardDragged =
    model.dragAndDrop.dragState._tag === 'KeyboardDragging' && isDragged

  return h.keyed('li')(
    card.id,
    [
      h.Class(
        isPointerDragged
          ? 'relative list-none rounded-lg bg-white/50 border-2 border-dashed border-gray-300 p-3 opacity-60'
          : isKeyboardDragged
            ? 'relative list-none rounded-lg bg-white border-2 border-blue-400 shadow-md p-3'
            : 'group relative list-none rounded-lg bg-white border border-gray-200 shadow-sm p-3 pr-8 cursor-grab select-none hover:border-gray-300 transition-colors',
      ),
      ...DragAndDrop.draggable(
        {
          model: model.dragAndDrop,
          toParentMessage: message =>
            toParentMessage(Message.GotDragAndDropMessage({ message })),
          itemId: card.id,
          containerId: columnId,
          index,
        },
        h,
      ),
    ],
    [
      ...cardContent(card, h),
      Button.view(
        {
          onClick: toParentMessage(
            Message.ClickedDeleteCard({ columnId, cardId: card.id }),
          ),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'absolute top-1 right-2 rounded px-1.5 text-sm text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 focus:opacity-100 transition-opacity cursor-pointer',
                ),
                h.AriaLabel(`Delete ${card.title}`),
              ],
              ['✕'],
            ),
        },
        h,
      ),
    ],
  )
}

const dropPlaceholder = (h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    'drop-placeholder',
    [
      h.Class(
        'list-none rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 h-12',
      ),
      h.AriaHidden(true),
    ],
  )

const findDraggedCard = (model: Model): Option.Option<Card> =>
  pipe(
    model.dragAndDrop,
    DragAndDrop.maybeDraggedItemId,
    Option.flatMap(cardId =>
      pipe(
        model.columns,
        Array.flatMap(({ cards }) => cards),
        Array.findFirst(({ id }) => id === cardId),
      ),
    ),
  )

const columnCardElements = (
  model: Model,
  column: Column,
  toParentMessage: (message: Message) => Message,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const allCardElements = Array.map(column.cards, (card, index) =>
    cardView(model, card, column.id, index, toParentMessage, h),
  )

  // NOTE: the dragged card stays rendered through the Pending phase (press,
  // pre-threshold) — hiding it there removes the card from the DOM and the
  // pointerup→click never lands on anything inside it.
  if (!DragAndDrop.isDragging(model.dragAndDrop)) {
    return allCardElements
  }

  const maybeDraggedId = DragAndDrop.maybeDraggedItemId(model.dragAndDrop)
  const visibleCards = Array.filter(column.cards, ({ id }) =>
    Option.match(maybeDraggedId, {
      onNone: () => true,
      onSome: draggedId => draggedId !== id,
    }),
  )
  const cardElements = Array.map(visibleCards, (card, index) =>
    cardView(model, card, column.id, index, toParentMessage, h),
  )

  return Option.match(DragAndDrop.maybeDropTarget(model.dragAndDrop), {
    onNone: () => cardElements,
    onSome: ({ containerId, index }) => {
      if (containerId !== column.id) {
        return cardElements
      }
      const targetIndex = Math.min(index, visibleCards.length)
      const isPointerDrag = model.dragAndDrop.dragState._tag === 'Dragging'
      const insertElement = isPointerDrag
        ? dropPlaceholder(h)
        : Option.match(findDraggedCard(model), {
            onNone: () => dropPlaceholder(h),
            onSome: card =>
              cardView(
                model,
                card,
                column.id,
                targetIndex,
                toParentMessage,
                h,
              ),
          })
      return pipe(
        cardElements,
        Array.insertAt(targetIndex, insertElement),
        Option.getOrElse(() => Array.append(cardElements, insertElement)),
      )
    },
  })
}

const addCardForm = (
  model: Model,
  columnId: string,
  toParentMessage: (message: Message) => Message,
  h: HtmlBuilder<Message>,
): Html => {
  const isAddingToThisColumn = Option.exists(
    model.maybeNewCardColumnId,
    id => id === columnId,
  )

  if (!isAddingToThisColumn) {
    return Button.view(
      {
        onClick: toParentMessage(Message.ClickedAddCard({ columnId })),
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(
                'w-full text-left rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-100/60 transition-colors cursor-pointer',
              ),
            ],
            ['+ Add card'],
          ),
      },
      h,
    )
  }

  return h.form(
    [
      h.Class('flex flex-col gap-2'),
      h.OnSubmit(toParentMessage(Message.SubmittedNewCard())),
    ],
    [
      h.label([h.For(ADD_CARD_INPUT_ID), h.Class('sr-only')], [
        'New card title',
      ]),
      Input.view(
        {
          id: ADD_CARD_INPUT_ID,
          onInput: value =>
            toParentMessage(Message.ChangedNewCardTitle({ value })),
          value: model.newCardTitle,
          placeholder: 'Card title…',
          toView: attributes =>
            h.input([
              ...attributes.input,
              h.Class(
                'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none',
              ),
              h.OnKeyDownPreventDefault(
                flow(
                  Option.liftPredicate(Equal.equals('Escape')),
                  Option.map(() => toParentMessage(Message.CancelledNewCard())),
                ),
              ),
            ]),
        },
        h,
      ),
      h.div([h.Class('flex gap-2 justify-end')], [
        Button.view(
          {
            onClick: toParentMessage(Message.CancelledNewCard()),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    'rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer',
                  ),
                ],
                ['Cancel'],
              ),
          },
          h,
        ),
        Button.view(
          {
            type: 'submit',
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    'rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer',
                  ),
                ],
                ['Add'],
              ),
          },
          h,
        ),
      ]),
    ],
  )
}

const columnView = (
  model: Model,
  column: Column,
  toParentMessage: (message: Message) => Message,
  h: HtmlBuilder<Message>,
): Html => {
  const isDropTarget =
    DragAndDrop.isDragging(model.dragAndDrop) &&
    Option.exists(
      DragAndDrop.maybeDropTarget(model.dragAndDrop),
      ({ containerId }) => containerId === column.id,
    )

  return h.keyed('div')(
    column.id,
    [
      h.Role('region'),
      h.AriaLabel(column.name),
      h.Class(
        `w-72 flex-none flex flex-col rounded-xl shadow-sm p-3 bg-[#ebecf0] border-2 ${
          isDropTarget
            ? 'border-dashed border-blue-400'
            : 'border-transparent'
        }`,
      ),
    ],
    [
      h.div([h.Class('flex items-baseline justify-between px-1 pb-2')], [
        h.h2([h.Class('text-sm font-semibold text-gray-700')], [
          column.name,
        ]),
        h.span([h.Class('text-xs text-gray-500')], [
          String(column.cards.length),
        ]),
      ]),
      h.ul(
        [
          // NOTE: min-h-24 keeps an empty column a droppable hit area —
          // drop targets resolve via elementsFromPoint, so a zero-height ul
          // can never be dropped onto.
          h.Class(
            'flex flex-col gap-2 list-none overflow-y-auto min-h-24 flex-1',
          ),
          ...DragAndDrop.droppable(column.id, column.name),
        ],
        columnCardElements(model, column, toParentMessage, h),
      ),
      h.div([h.Class('pt-2 mt-2')], [
        addCardForm(model, column.id, toParentMessage, h),
      ]),
    ],
  )
}

const ghostElement = (model: Model, h: HtmlBuilder<Message>): Html =>
  pipe(
    DragAndDrop.ghostStyle(model.dragAndDrop),
    Option.flatMap(ghostStyle =>
      Option.map(findDraggedCard(model), card => ({ ghostStyle, card })),
    ),
    Option.match({
      onNone: () => h.empty,
      onSome: ({ ghostStyle, card }) =>
        h.div(
          [h.Style(ghostStyle), h.Class('w-72'), h.AriaHidden(true)],
          [
            h.div(
              [
                h.Class(
                  'rounded-lg bg-white shadow-lg border border-gray-200 p-3 rotate-2',
                ),
              ],
              cardContent(card, h),
            ),
          ],
        ),
    }),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '☕ cafe-stack · kanban',
  body: h.div(
    [h.Class('min-h-screen bg-[#f1f2f4] flex flex-col')],
    [
      h.div(
        [
          h.Class(
            'px-6 py-3 bg-white border-b border-gray-200 flex items-baseline gap-2',
          ),
        ],
        [
          h.h1([h.Class('text-base font-semibold text-gray-800')], [
            '☕ Kanban',
          ]),
          h.span([h.Class('text-xs text-gray-400')], [
            'cafe-stack — Cloudflare · Alchemy · Foldkit · Effect',
          ]),
        ],
      ),
      h.div(
        [h.Class('flex-1 flex gap-4 p-4 items-start overflow-x-auto')],
        Array.map(model.columns, column =>
          columnView(model, column, message => message, h),
        ),
      ),
      ghostElement(model, h),
    ],
  ),
})
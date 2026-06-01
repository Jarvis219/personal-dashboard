import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useI18n } from '../i18n/useI18n'
import { useWidgetsStore } from '../store/useWidgetsStore'
import {
  WIDE_WIDGETS,
  WIDGETS,
  WIDGET_IDS,
  type WidgetId,
} from '../widgets/registry'

function SortableWidget({ id }: { id: WidgetId }) {
  const { t } = useI18n()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const Widget = WIDGETS[id]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        'group/move relative h-full ' +
        (WIDE_WIDGETS.has(id) ? 'md:col-span-2 xl:col-span-3 ' : '') +
        (isDragging ? 'z-30 opacity-70' : '')
      }
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={t('widget.move')}
        title={t('widget.move')}
        className="absolute left-1/2 top-1.5 z-20 flex h-6 w-9 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full bg-black/10 text-xs text-slate-500 opacity-0 backdrop-blur-sm transition hover:bg-black/20 group-hover/move:opacity-100 active:cursor-grabbing dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
      >
        ⠿
      </button>
      <Widget />
    </div>
  )
}

export function WidgetGrid() {
  const { order, hidden, setOrder } = useWidgetsStore()

  // Thứ tự đầy đủ hợp lệ + bổ sung widget mới (nếu sau này thêm).
  const fullOrder = [
    ...new Set([
      ...order.filter((id): id is WidgetId => id in WIDGETS),
      ...WIDGET_IDS,
    ]),
  ]
  const visible = fullOrder.filter((id) => !hidden.includes(id))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
  )

  // Sắp xếp lại trong danh sách hiển thị (giữ đúng hướng), rồi ghép lại vào
  // thứ tự đầy đủ — widget ẩn giữ nguyên vị trí.
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = visible.indexOf(active.id as WidgetId)
    const newIndex = visible.indexOf(over.id as WidgetId)
    if (oldIndex === -1 || newIndex === -1) return
    const newVisible = arrayMove(visible, oldIndex, newIndex)
    let vi = 0
    const newOrder = fullOrder.map((id) =>
      hidden.includes(id) ? id : newVisible[vi++],
    )
    setOrder(newOrder)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={visible} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((id) => (
            <SortableWidget key={id} id={id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

"use client";

import { Trash2 } from "lucide-react";
import type { Todo } from "./todo-types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  highlight?: boolean;
}

export function TodoItem({ todo, onToggle, onDelete, highlight }: TodoItemProps) {
  return (
    <li
      id={`todo-${todo.id}`}
      className={`task-enter group flex items-center justify-between p-3.5 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-blue-100 ${
        todo.completed ? "bg-gray-50/50 border-gray-100" : "border-gray-100"
      } ${highlight ? "ring-2 ring-blue-400 border-blue-400 bg-blue-50/50" : ""}`}
    >
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="custom-checkbox shrink-0 appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer transition-all checked:bg-blue-600 checked:border-blue-600 relative
            after:content-[''] after:absolute after:hidden after:inset-0 after:m-auto after:w-2.5 after:h-2.5 checked:after:block
            after:[clip-path:polygon(14%_44%,0_65%,50%_100%,100%_16%,80%_0%,43%_62%)] after:bg-white"
          aria-label={todo.completed ? "סמן כלא הושלם" : "סמן כהושלם"}
        />
        <span
          className={`text-gray-700 truncate transition-all duration-200 ${
            todo.completed ? "line-through text-gray-400" : ""
          }`}
        >
          {todo.text}
        </span>
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="מחק משימה"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

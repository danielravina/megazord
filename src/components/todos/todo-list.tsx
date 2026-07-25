"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { TodoItem } from "./todo-item";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { ClipboardList, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { generateId } from "@/components/shared/generate-id";
import type { Todo } from "./todo-types";

export function TodoList() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast("שגיאה בטעינת המשימות", "error");
      } else {
        setTodos(data || []);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase, toast]);

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user) return;

    const newTodo: Todo = {
      id: generateId(),
      user_id: user.id,
      text,
      completed: false,
      created_at: new Date().toISOString(),
    };

    setTodos((prev) => [newTodo, ...prev]);
    setInput("");

    const { error } = await supabase.from("todos").insert({
      id: newTodo.id,
      user_id: user.id,
      text,
      completed: false,
    });

    if (error) {
      setTodos((prev) => prev.filter((t) => t.id !== newTodo.id));
      toast("שגיאה בשמירת המשימה", "error");
    }
  }

  async function toggleTodo(id: string) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    );

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const { error } = await supabase
      .from("todos")
      .update({ completed: !todo.completed })
      .eq("id", id);

    if (error) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, completed: todo.completed } : t,
        ),
      );
      toast("שגיאה בעדכון המשימה", "error");
    }
  }

  async function deleteTodo(id: string) {
    const removed = todos.find((t) => t.id === id);
    setTodos((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      if (removed) setTodos((prev) => [...prev, removed]);
      toast("שגיאה במחיקת המשימה", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 -mx-6 -mt-6 px-6 pt-6 pb-6 mb-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="opacity-80" size={24} />
          המשימות שלי
        </h1>
      </div>

      <form onSubmit={addTodo} className="flex gap-3 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner text-sm"
          placeholder="מה צריך לעשות?"
          autoComplete="off"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 active:scale-95"
        >
          <span>הוסף</span>
          <Plus size={14} />
        </button>
      </form>

      {todos.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={36} className="text-blue-300" />}
          title="הכל הושלם!"
          description="אין לך משימות פתוחות כרגע."
        />
      ) : (
        <ul className="space-y-3 flex-1 overflow-y-auto pb-2">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

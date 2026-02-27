import { createContext, useContext, useState, type ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";

export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Approved" | "Rejected";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
    id: string;
    title: string;
    assignee: string;
    dueDate: string;
    priority: TaskPriority;
    status: TaskStatus;
    category: "Approval" | "Faculty";
    description?: string;
}

interface TaskContextType {
    tasks: Task[];
    updateTaskStatus: (id: string, newStatus: TaskStatus) => void;
    addTask: (task: Omit<Task, "id">) => void;
    getTask: (id: string) => Task | undefined;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);

    const addTask = (task: Omit<Task, "id">) => {
        const newTask: Task = {
            ...task,
            id: uuidv4(),
        };
        setTasks(prev => [...prev, newTask]);
    };

    const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
        setTasks(prev =>
            prev.map(task =>
                task.id === id ? { ...task, status: newStatus } : task
            )
        );
    };

    const getTask = (id: string) => tasks.find(t => t.id === id);

    return (
        <TaskContext.Provider value={{ tasks, updateTaskStatus, addTask, getTask }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TaskContext);
    if (!context) throw new Error("useTasks must be used within TaskProvider");
    return context;
}
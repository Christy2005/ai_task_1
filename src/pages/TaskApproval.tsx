import { CheckCircle, XCircle, Info, PlusCircle, Pencil, Save, X } from "lucide-react";
import { useTasks, type TaskPriority, type Task } from "@/context/TaskContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function TaskApproval() {
    const { tasks, updateTaskStatus, addTask, updateTask } = useTasks();
    const navigate = useNavigate();
    const [newTask, setNewTask] = useState({
        title: "",
        assignee: "",
        dueDate: "",
        priority: "Medium" as TaskPriority,
    });

    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        title: "",
        assignee: "",
        dueDate: "",
        priority: "Medium" as TaskPriority,
    });

    const approvalTasks = tasks.filter((t) => t.category === "Approval" && t.status === "Pending");

    const handleAddTask = () => {
        if (!newTask.title.trim() || !newTask.assignee.trim() || !newTask.dueDate.trim()) {
            return;
        }

        addTask({
            title: newTask.title.trim(),
            assignee: newTask.assignee.trim(),
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            status: "Pending",
            category: "Approval"
        });

        setNewTask({ title: "", assignee: "", dueDate: "", priority: "Medium" });
    };

    const startEdit = (task: Task) => {        setEditingTaskId(task.id);
        setEditForm({
            title: task.title,
            assignee: task.assignee,
            dueDate: task.dueDate,
            priority: task.priority
        });
    };

    const saveEdit = (taskId: string) => {
        if (!editForm.title.trim() || !editForm.assignee.trim() || !editForm.dueDate.trim()) {
            return;
        }

        updateTask(taskId, {
            title: editForm.title.trim(),
            assignee: editForm.assignee.trim(),
            dueDate: editForm.dueDate,
            priority: editForm.priority,

        });
        setEditingTaskId(null);
    };

    const cancelEdit = () => {
        setEditingTaskId(null);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-foreground tracking-tight">
                    Task <span className="text-gradient-indigo">Approval</span>
                </h1>
                <p className="text-muted-foreground mt-1">Review and approve tasks assigned to faculty members.</p>
            </div>

            <div className="glass-card glass-shadow rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <PlusCircle className="h-5 w-5 text-green-500" />
                    Add a New Approval Task
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                        value={newTask.title}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                        className="p-3 border rounded-lg"
                        placeholder="Task Title"
                    />
                    <input
                        value={newTask.assignee}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, assignee: e.target.value }))}
                        className="p-3 border rounded-lg"
                        placeholder="Assignee"
                    />
                    <input
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
                        className="p-3 border rounded-lg"
                        type="date"
                    />
                    <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))}
                        className="p-3 border rounded-lg"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>
                
                <button
                    onClick={handleAddTask}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                >
                    <PlusCircle className="h-4 w-4" /> Add Task
                </button>
            </div>

            <div className="grid gap-4">
                {approvalTasks.length === 0 ? (
                    <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-indigo-300" />
                        </div>
                        <p className="text-muted-foreground font-semibold">No pending approvals — all clear! 🎉</p>
                    </div>
                ) : (
                    approvalTasks.map((task) => {
                        const isEditing = editingTaskId === task.id;

                        return (
                            <div
                                key={task.id}
                                className="glass-card glass-shadow rounded-[2rem] p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
                            >
                                <div className="w-full">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                value={editForm.title}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <input
                                                    value={editForm.assignee}
                                                    onChange={(e) => setEditForm((prev) => ({ ...prev, assignee: e.target.value }))}
                                                    className="p-2 border rounded-lg"
                                                    placeholder="Assignee"
                                                />
                                                <input
                                                    value={editForm.dueDate}
                                                    onChange={(e) => setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                                                    className="p-2 border rounded-lg"
                                                    type="date"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={editForm.priority}
                                                    onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))}
                                                    className="p-2 border rounded-lg"
                                                >
                                                    <option value="Low">Low</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="High">High</option>
                                                </select>
                                                
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-foreground text-base">{task.title}</h3>
                                                    <span className={cn(
                                                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                        task.priority === "High" ? "bg-red-100 text-red-700"
                                                            : task.priority === "Medium" ? "bg-amber-100 text-amber-700"
                                                                : "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Assigned to: <span className="font-semibold text-slate-700">{task.assignee}</span> · Due: {task.dueDate}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto shrink-0">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => saveEdit(task.id)}
                                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl"
                                            >
                                                <Save className="h-4 w-4" /> Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl"
                                            >
                                                <X className="h-4 w-4" /> Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => startEdit(task)}
                                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-xl"
                                            >
                                                <Pencil className="h-4 w-4" /> Edit
                                            </button>
                                            <button
                                                onClick={() => navigate(`/tasks/${task.id}`)}
                                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground bg-white/60 hover:bg-white/90 rounded-xl border border-white/50"
                                            >
                                                <Info className="h-4 w-4" /> Details
                                            </button>
                                            <button
                                                onClick={() => updateTaskStatus(task.id, "Rejected")}
                                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100 rounded-xl"
                                            >
                                                <XCircle className="h-4 w-4" /> Reject
                                            </button>
                                            <button
                                                onClick={() => updateTaskStatus(task.id, "Approved")}
                                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl"
                                            >
                                                <CheckCircle className="h-4 w-4" /> Approve
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import api from "../services/api";
import useApi from "../hooks/useApi";

export default function Dashboard() {
    const { data, loading, request } = useApi(api.get);

    const [tasksMap, setTasksMap] = useState({});
    const [newProject, setNewProject] = useState({ name: "", description: "" });
    const [currentPage, setCurrentPage] = useState(1);
    const projectsPerPage = 5;
    const [showAddTask, setShowAddTask] = useState({});
    const [newTaskMap, setNewTaskMap] = useState({});
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProject, setEditingProject] = useState(null);
    const [commentsMap, setCommentsMap] = useState({});
    const [newCommentMap, setNewCommentMap] = useState({});
    const [filterStatus, setFilterStatus] = useState({});
    const [filterPriority, setFilterPriority] = useState({});
    const [sortBy, setSortBy] = useState({});

    useEffect(() => { request("/projects"); }, []);

    useEffect(() => {
        if (!Array.isArray(data)) return;
        const load = async () => {
            const result = {};
            for (const p of data) {
                const res = await api.get(`/tasks/project/${p.id}`);
                result[p.id] = res.data;
            }
            setTasksMap(result);
        };
        load();
    }, [data]);

    const loadComments = async (taskId) => {
        const res = await api.get(`/comments/task/${taskId}`);
        setCommentsMap(prev => ({ ...prev, [taskId]: res.data }));
    };

    useEffect(() => {
        if (!data) return;
        const allTasks = Object.values(tasksMap).flat();
        allTasks.forEach(t => { if (t?.id) loadComments(t.id); });
    }, [tasksMap]);

    const getPriorityText = (p) => ["Low", "Medium", "High", "Critical"][p] || "";
    const statusLabels = ["Todo", "In Progress", "Review", "Done"];

    const priorityStyles = {
        0: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
        1: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
        2: { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
        3: { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" },
    };

    const statusStyles = {
        0: { background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1" },
        1: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
        2: { background: "#fefce8", color: "#a16207", border: "1px solid #fde68a" },
        3: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
    };

    // =================== LOGIC (unchanged) ===================
    const createProject = async () => {
        if (!newProject.name.trim()) return;
        await api.post("/projects", newProject);
        setNewProject({ name: "", description: "" });
        request("/projects");
    };

    const deleteProject = async (id) => {
        await api.delete(`/projects/${id}`);
        request("/projects");
    };

    const updateProject = async () => {
        await api.put(`/projects/${editingProject.id}`, editingProject);
        setEditingProjectId(null);
        setEditingProject(null);
        request("/projects");
    };

    const createTask = async (projectId) => {
        const task = newTaskMap[projectId];
        if (!task?.title) return;
        await api.post("/tasks", {
            title: task.title,
            description: task.description || "",
            status: Number(task.status || 0),
            priority: Number(task.priority || 0),
            dueDate: task.dueDate || null,
            projectId,
        });
        const res = await api.get(`/tasks/project/${projectId}`);
        setTasksMap(prev => ({ ...prev, [projectId]: res.data }));
        setNewTaskMap(prev => ({ ...prev, [projectId]: {} }));
        setShowAddTask(prev => ({ ...prev, [projectId]: false }));
    };

    const deleteTask = async (taskId, projectId) => {
        await api.delete(`/tasks/${taskId}`);
        const res = await api.get(`/tasks/project/${projectId}`);
        setTasksMap(prev => ({ ...prev, [projectId]: res.data }));
    };

    const startEditTask = (task) => {
        setEditingTaskId(task.id);
        setEditingTask({ ...task });
    };

    const saveTask = async (projectId) => {
        await api.put(`/tasks/${editingTask.id}`, editingTask);
        setEditingTaskId(null);
        setEditingTask(null);
        const res = await api.get(`/tasks/project/${projectId}`);
        setTasksMap(prev => ({ ...prev, [projectId]: res.data }));
    };

    const addComment = async (taskId) => {
        const c = newCommentMap[taskId];
        if (!c?.author || !c?.body) return;
        await api.post("/comments", { taskId, author: c.author, body: c.body });
        setNewCommentMap(prev => ({ ...prev, [taskId]: { author: "", body: "" } }));
        loadComments(taskId);
    };

    const deleteComment = async (id, taskId) => {
        await api.delete(`/comments/${id}`);
        loadComments(taskId);
    };

    // =================== FILTER & SORT ===================
    const getFilteredSortedTasks = (projectId) => {
        let tasks = tasksMap[projectId] || [];
        const fs = filterStatus[projectId];
        const fp = filterPriority[projectId];
        const sb = sortBy[projectId];

        if (fs !== undefined && fs !== "") tasks = tasks.filter(t => Number(t.status) === Number(fs));
        if (fp !== undefined && fp !== "") tasks = tasks.filter(t => Number(t.priority) === Number(fp));

        if (sb === "priority") {
            tasks = [...tasks].sort((a, b) => b.priority - a.priority);
        } else if (sb === "dueDate") {
            tasks = [...tasks].sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
        } else if (sb === "createdAt") {
            tasks = [...tasks].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }
        return tasks;
    };

    // =================== DUE DATE HELPERS ===================
    // Parse "YYYY-MM-DD" as local date — avoids UTC midnight timezone shift
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        const plain = String(dateStr).slice(0, 10);
        const [y, m, d] = plain.split("-").map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };

    const todayStr = (() => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    })();

    const formatDueDate = (dateStr) => {
        const d = parseLocalDate(dateStr);
        if (!d) return null;
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const getDueDateStatus = (dateStr) => {
        const due = parseLocalDate(dateStr);
        if (!due) return null;
        const today = parseLocalDate(todayStr);
        const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return "overdue";
        if (diff <= 2) return "soon";
        return "ok";
    };

    const dueDateStyle = (status) => {
        if (status === "overdue") return { color: "#be123c", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 };
        if (status === "soon") return { color: "#a16207", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 };
        return { color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 500 };
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, fontFamily: "system-ui,sans-serif", color: "#64748b", fontSize: 15 }}>
            <span>Loading your board…</span>
        </div>
    );

    const totalPages = data ? Math.ceil(data.length / projectsPerPage) : 0;
    const paginatedProjects = data?.slice(
        (currentPage - 1) * projectsPerPage,
        currentPage * projectsPerPage
    );

    // =================== SHARED STYLES ===================
    const font = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    const inp = {
        padding: "8px 10px",
        border: "1.5px solid #e2e8f0",
        borderRadius: 7,
        fontSize: 13,
        width: "100%",
        boxSizing: "border-box",
        outline: "none",
        fontFamily: font,
        color: "#1e293b",
        background: "#fff",
        transition: "border-color 0.15s",
    };

    const sel = {
        padding: "7px 10px",
        border: "1.5px solid #e2e8f0",
        borderRadius: 7,
        fontSize: 12,
        background: "#fff",
        cursor: "pointer",
        outline: "none",
        fontFamily: font,
        color: "#334155",
    };

    const btnBase = {
        border: "none",
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: font,
        padding: "7px 14px",
        transition: "opacity 0.1s",
    };

    const btn = {
        primary: { ...btnBase, background: "#3b82f6", color: "#fff" },
        success: { ...btnBase, background: "#10b981", color: "#fff" },
        danger: { ...btnBase, background: "#ef4444", color: "#fff", padding: "6px 12px", fontSize: 12 },
        outline: { ...btnBase, background: "#fff", color: "#3b82f6", border: "1.5px solid #93c5fd", padding: "6px 12px", fontSize: 12 },
        outlineSm: { ...btnBase, background: "#fff", color: "#64748b", border: "1.5px solid #cbd5e1", padding: "5px 10px", fontSize: 12 },
        ghost: { ...btnBase, background: "transparent", color: "#3b82f6", border: "1.5px solid #bfdbfe", padding: "6px 11px", fontSize: 12 },
    };

    const pill = (style) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        ...style,
    });

    const label = {
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 5,
    };

    return (
        <div style={{ padding: "28px 36px", background: "#f8fafc", minHeight: "100vh", fontFamily: font, color: "#1e293b" }}>

            {/* ── PAGE HEADER ── */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.9)" />
                            <rect x="11" y="1" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.6)" />
                            <rect x="1" y="11" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.6)" />
                            <rect x="11" y="11" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.9)" />
                        </svg>
                    </div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>Task Board</h1>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Manage your projects and track every task in one place.</p>
            </div>

            {/* ── CREATE PROJECT ── */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", marginBottom: 24, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1.5px solid #f1f5f9", background: "#fafbff" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>New project</span>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: "1 1 160px" }}>
                        <span style={label}>Project name</span>
                        <input
                            placeholder="e.g. Website redesign"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            style={inp}
                        />
                    </div>
                    <div style={{ flex: "2 1 240px" }}>
                        <span style={label}>Description</span>
                        <input
                            placeholder="What's this project about?"
                            value={newProject.description}
                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            style={inp}
                        />
                    </div>
                    <button style={{ ...btn.primary, padding: "9px 18px", fontSize: 13, borderRadius: 8 }} onClick={createProject}>
                        + Create project
                    </button>
                </div>
            </div>

            {/* ── PROJECTS TABLE ── */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1.5px solid #f1f5f9", background: "#fafbff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>All projects</span>
                    <span style={{ fontSize: 12, color: "#94a3b8", background: "#f1f5f9", borderRadius: 20, padding: "2px 10px" }}>
                        {data?.length || 0} {data?.length === 1 ? "project" : "projects"}
                    </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#f8fafc" }}>
                                {["#", "Project", "Description", "Tasks", "Actions"].map((h, i) => (
                                    <th key={h} style={{
                                        textAlign: "left",
                                        padding: "9px 16px",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#94a3b8",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        borderBottom: "1.5px solid #e2e8f0",
                                        whiteSpace: "nowrap",
                                        width: i === 0 ? 44 : i === 4 ? 160 : "auto",
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(!paginatedProjects || paginatedProjects.length === 0) && (
                                <tr>
                                    <td colSpan={5} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                                        No projects yet — create one above to get started.
                                    </td>
                                </tr>
                            )}

                            {paginatedProjects?.map((p, idx) => {
                                const globalIdx = (currentPage - 1) * projectsPerPage + idx + 1;
                                const tasks = getFilteredSortedTasks(p.id);
                                const isEditingProject = editingProjectId === p.id;

                                return (
                                    <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>

                                        {/* # */}
                                        <td style={{ padding: "16px", color: "#cbd5e1", fontWeight: 700, fontSize: 12, textAlign: "center" }}>
                                            {globalIdx}
                                        </td>

                                        {/* PROJECT NAME */}
                                        <td style={{ padding: "16px", verticalAlign: "top", minWidth: 140 }}>
                                            {isEditingProject ? (
                                                <input
                                                    style={{ ...inp, marginBottom: 0 }}
                                                    value={editingProject.name}
                                                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                                                />
                                            ) : (
                                                <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{p.name}</span>
                                            )}
                                        </td>

                                        {/* DESCRIPTION */}
                                        <td style={{ padding: "16px", verticalAlign: "top", minWidth: 160 }}>
                                            {isEditingProject ? (
                                                <input
                                                    style={inp}
                                                    value={editingProject.description}
                                                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                                                />
                                            ) : (
                                                <span style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>{p.description || <em style={{ color: "#cbd5e1" }}>No description</em>}</span>
                                            )}
                                        </td>

                                        {/* TASKS */}
                                        <td style={{ padding: "16px", verticalAlign: "top" }}>

                                            {/* Filter/Sort bar */}
                                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap", padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter</span>
                                                <select style={sel} value={filterStatus[p.id] ?? ""} onChange={(e) => setFilterStatus(prev => ({ ...prev, [p.id]: e.target.value }))}>
                                                    <option value="">All statuses</option>
                                                    <option value="0">Todo</option>
                                                    <option value="1">In Progress</option>
                                                    <option value="2">Review</option>
                                                    <option value="3">Done</option>
                                                </select>
                                                <select style={sel} value={filterPriority[p.id] ?? ""} onChange={(e) => setFilterPriority(prev => ({ ...prev, [p.id]: e.target.value }))}>
                                                    <option value="">All priorities</option>
                                                    <option value="0">Low</option>
                                                    <option value="1">Medium</option>
                                                    <option value="2">High</option>
                                                    <option value="3">Critical</option>
                                                </select>
                                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 4 }}>Sort</span>
                                                <select style={sel} value={sortBy[p.id] ?? ""} onChange={(e) => setSortBy(prev => ({ ...prev, [p.id]: e.target.value }))}>
                                                    <option value="">Default</option>
                                                    <option value="priority">Priority — high first</option>
                                                    <option value="dueDate">Due date</option>
                                                    <option value="createdAt">Newest first</option>
                                                </select>
                                            </div>

                                            {tasks.length === 0 && (
                                                <div style={{ color: "#cbd5e1", fontSize: 13, padding: "10px 0", fontStyle: "italic" }}>No tasks match your filter.</div>
                                            )}

                                            {tasks.map(t => {
                                                const ddStatus = getDueDateStatus(t.dueDate);
                                                const ddFormatted = formatDueDate(t.dueDate);
                                                const isEditing = editingTaskId === t.id;

                                                return (
                                                    <div key={t.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                                                        {isEditing ? (
                                                            <div>
                                                                <span style={label}>Title</span>
                                                                <input value={editingTask.title} style={{ ...inp, marginBottom: 8 }} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} />

                                                                <span style={label}>Description</span>
                                                                <input value={editingTask.description} style={{ ...inp, marginBottom: 8 }} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} />

                                                                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                                                    <div style={{ flex: 1, minWidth: 100 }}>
                                                                        <span style={label}>Status</span>
                                                                        <select style={{ ...sel, width: "100%" }} value={editingTask.status} onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}>
                                                                            <option value={0}>Todo</option>
                                                                            <option value={1}>In Progress</option>
                                                                            <option value={2}>Review</option>
                                                                            <option value={3}>Done</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 100 }}>
                                                                        <span style={label}>Priority</span>
                                                                        <select style={{ ...sel, width: "100%" }} value={editingTask.priority} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}>
                                                                            <option value={0}>Low</option>
                                                                            <option value={1}>Medium</option>
                                                                            <option value={2}>High</option>
                                                                            <option value={3}>Critical</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 120 }}>
                                                                        <span style={label}>Due date</span>
                                                                        <input
                                                                            type="date"
                                                                            style={{ ...inp }}
                                                                            min={todayStr}
                                                                            value={editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : ""}
                                                                            onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: "flex", gap: 8 }}>
                                                                    <button style={btn.success} onClick={() => saveTask(p.id)}>Save</button>
                                                                    <button style={btn.outlineSm} onClick={() => { setEditingTaskId(null); setEditingTask(null); }}>Cancel</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                                                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14, lineHeight: 1.4, flex: 1 }}>{t.title}</div>
                                                                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                                                                        <button style={btn.outline} onClick={() => startEditTask(t)}>Edit</button>
                                                                        <button style={btn.danger} onClick={() => deleteTask(t.id, p.id)}>Delete</button>
                                                                    </div>
                                                                </div>

                                                                {t.description && (
                                                                    <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{t.description}</div>
                                                                )}

                                                                {/* Badges row */}
                                                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                                                    <span style={pill(priorityStyles[Number(t.priority)] || priorityStyles[0])}>
                                                                        {getPriorityText(Number(t.priority))}
                                                                    </span>
                                                                    <span style={pill(statusStyles[Number(t.status)] || statusStyles[0])}>
                                                                        {statusLabels[Number(t.status)] || ""}
                                                                    </span>
                                                                    {ddFormatted && (
                                                                        <span style={{ ...dueDateStyle(ddStatus), display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                                                                                <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                                                                                <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                                                            </svg>
                                                                            {ddStatus === "overdue" ? "Overdue · " : ""}{ddFormatted}
                                                                        </span>
                                                                    )}
                                                                    {!ddFormatted && (
                                                                        <span style={{ color: "#cbd5e1", fontSize: 11 }}>No due date</span>
                                                                    )}
                                                                </div>

                                                                {/* Comments */}
                                                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #e2e8f0" }}>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>
                                                                        Comments {commentsMap[t.id]?.length ? `(${commentsMap[t.id].length})` : ""}
                                                                    </div>

                                                                    {(commentsMap[t.id] || []).map(c => (
                                                                        <div key={c.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "7px 10px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                                                            <div>
                                                                                <span style={{ fontWeight: 600, fontSize: 12, color: "#334155" }}>{c.author}</span>
                                                                                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{c.body}</p>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => deleteComment(c.id, t.id)}
                                                                                style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 15, padding: 0, lineHeight: 1, flexShrink: 0 }}
                                                                            >✕</button>
                                                                        </div>
                                                                    ))}

                                                                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                                                        <input
                                                                            placeholder="Your name"
                                                                            style={{ ...inp, flex: "0 0 100px", fontSize: 12, padding: "6px 9px" }}
                                                                            value={newCommentMap[t.id]?.author || ""}
                                                                            onChange={(e) => setNewCommentMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], author: e.target.value } }))}
                                                                        />
                                                                        <input
                                                                            placeholder="Write a comment…"
                                                                            style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 9px" }}
                                                                            value={newCommentMap[t.id]?.body || ""}
                                                                            onChange={(e) => setNewCommentMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], body: e.target.value } }))}
                                                                        />
                                                                        <button style={{ ...btn.success, fontSize: 12, padding: "6px 12px" }} onClick={() => addComment(t.id)}>Post</button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Add task */}
                                            {showAddTask[p.id] !== true ? (
                                                <button
                                                    style={{ ...btn.ghost, marginTop: 4 }}
                                                    onClick={() => setShowAddTask(prev => ({ ...prev, [p.id]: true }))}
                                                >
                                                    + Add task
                                                </button>
                                            ) : (
                                                <div style={{ background: "#f8fafc", border: "1.5px dashed #bfdbfe", borderRadius: 10, padding: "14px 16px", marginTop: 8 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", marginBottom: 10 }}>New task</div>

                                                    <span style={label}>Title</span>
                                                    <input
                                                        placeholder="What needs to be done?"
                                                        style={{ ...inp, marginBottom: 8 }}
                                                        value={newTaskMap[p.id]?.title || ""}
                                                        onChange={(e) => setNewTaskMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: e.target.value } }))}
                                                    />

                                                    <span style={label}>Description</span>
                                                    <input
                                                        placeholder="Optional details"
                                                        style={{ ...inp, marginBottom: 8 }}
                                                        value={newTaskMap[p.id]?.description || ""}
                                                        onChange={(e) => setNewTaskMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: e.target.value } }))}
                                                    />

                                                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                                                        <div style={{ flex: 1, minWidth: 100 }}>
                                                            <span style={label}>Status</span>
                                                            <select style={{ ...sel, width: "100%" }} onChange={(e) => setNewTaskMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], status: e.target.value } }))}>
                                                                <option value={0}>Todo</option>
                                                                <option value={1}>In Progress</option>
                                                                <option value={2}>Review</option>
                                                                <option value={3}>Done</option>
                                                            </select>
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 100 }}>
                                                            <span style={label}>Priority</span>
                                                            <select style={{ ...sel, width: "100%" }} onChange={(e) => setNewTaskMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], priority: e.target.value } }))}>
                                                                <option value={0}>Low</option>
                                                                <option value={1}>Medium</option>
                                                                <option value={2}>High</option>
                                                                <option value={3}>Critical</option>
                                                            </select>
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 130 }}>
                                                            <span style={label}>Due date</span>
                                                            <input
                                                                type="date"
                                                                style={{ ...inp }}
                                                                value={newTaskMap[p.id]?.dueDate || ""}
                                                                min={todayStr}
                                                                onChange={(e) => setNewTaskMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], dueDate: e.target.value } }))}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <button style={{ ...btn.success, fontSize: 13 }} onClick={() => createTask(p.id)}>Save task</button>
                                                        <button style={btn.outlineSm} onClick={() => setShowAddTask(prev => ({ ...prev, [p.id]: false }))}>Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* ACTIONS */}
                                        <td style={{ padding: "16px", verticalAlign: "top" }}>
                                            {isEditingProject ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                                    <button style={{ ...btn.success, fontSize: 13 }} onClick={updateProject}>Save</button>
                                                    <button style={btn.outlineSm} onClick={() => { setEditingProjectId(null); setEditingProject(null); }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                                    <button style={btn.outline} onClick={() => { setEditingProjectId(p.id); setEditingProject(p); }}>
                                                        Edit project
                                                    </button>
                                                    <button style={{ ...btn.danger, fontSize: 12 }} onClick={() => deleteProject(p.id)}>
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 20px", borderTop: "1px solid #f1f5f9" }}>
                        <button
                            style={{ ...btn.outlineSm, opacity: currentPage === 1 ? 0.4 : 1 }}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                        >← Prev</button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                            <button
                                key={pg}
                                style={{
                                    ...btn.outlineSm,
                                    minWidth: 34,
                                    background: pg === currentPage ? "#3b82f6" : "#fff",
                                    color: pg === currentPage ? "#fff" : "#64748b",
                                    border: pg === currentPage ? "1.5px solid #3b82f6" : "1.5px solid #e2e8f0",
                                }}
                                onClick={() => setCurrentPage(pg)}
                            >{pg}</button>
                        ))}

                        <button
                            style={{ ...btn.outlineSm, opacity: currentPage === totalPages ? 0.4 : 1 }}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        >Next →</button>

                        <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
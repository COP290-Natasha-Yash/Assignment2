import { useState, useEffect } from "react";
import styles from "../styles/Board.module.css";

function BoardPage() {
  
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const WIP_LIMIT = 3;
  const [role, setRole] = useState("admin"); 
  <div style={{ marginBottom: "10px" }}>
  Role: <strong>{role.toUpperCase()}</strong>
</div>
// try: "admin" | "member" | "viewer"

  const [tasks, setTasks] = useState<any>({
    todo: [
      { title: "Design UI", priority: "High" },
      { title: "Create Login Page", priority: "Medium" }
    ],
    progress: [
      { title: "Setup Database", priority: "Low" }
    ],
    review: [],
    done: [
      { title: "Project Setup", priority: "Low" }
    ]
  });

  const [extraColumns, setExtraColumns] = useState<any[]>([]);

  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [sourceColumn, setSourceColumn] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Drag start
  const handleDragStart = (task: any, column: string) => {
  if (role === "viewer") return; // ❌ block
  setDraggedTask(task);
  setSourceColumn(column);
  };

  // Drop (UPDATED)
  const handleDrop = (targetColumn: string) => {
    if (!draggedTask || !sourceColumn) return;

    const newTasks: any = { ...tasks };

    // remove from source
    newTasks[sourceColumn] = newTasks[sourceColumn].filter(
      (t: any) => t !== draggedTask
    );

    // default column
    if (newTasks[targetColumn]) {
      if (newTasks[targetColumn].length >= WIP_LIMIT) {
        alert("WIP limit reached! Cannot move task.");
          return;
      }
      newTasks[targetColumn].push(draggedTask);
      setTasks(newTasks);
    } 
    // extra column
    else {
      const updatedExtra = extraColumns.map((col: any) => {
        if (col.name === targetColumn) {
          if (col.tasks.length >= WIP_LIMIT) {
            alert("WIP limit reached!");
          return col;
        }
          return {
            ...col,
            tasks: [...col.tasks, draggedTask]
          };
        }
        return col;
      });

      setExtraColumns(updatedExtra);
      setTasks(newTasks);
    }
  };

  // Add Task (UPDATED)
  const addTask = (column: string) => {
    const title = prompt("Enter task title");
    if (!title) return;

    const priority = prompt("Enter priority (Low / Medium / High)");
    if (!priority) return;

    const newTask = { title, priority };

    const newTasks: any = { ...tasks };

    if (newTasks[column]) {
      newTasks[column].push(newTask);
      setTasks(newTasks);
    } else {
      const updatedExtra = extraColumns.map((col: any) => {
        if (col.name === column) {
          return {
            ...col,
            tasks: [...col.tasks, newTask]
          };
        }
        return col;
      });

      setExtraColumns(updatedExtra);
    }
  };
  
  const editTask = (column: string, index: number) => {
  if (role === "viewer") return;
    const newTitle = prompt("Edit task title");
    if (!newTitle) return;
    const newTasks = { ...tasks };
    newTasks[column][index].title = newTitle;

      setTasks(newTasks);
  };
  const deleteTask = (column: string, index: number) => {
  if (role === "viewer") return;
    const newTasks = { ...tasks };
    newTasks[column].splice(index, 1);

    setTasks(newTasks);
  };
  // Add Column
  const addColumn = () => {
    const name = prompt("Enter column name");
    if (!name) return;

    setExtraColumns([...extraColumns, { name, tasks: [] }]);
  };
  const renameColumn = (oldName: string) => {
  const newName = prompt("Enter new column name", oldName);
  if (!newName) return;

  const updatedExtra = extraColumns.map((col: any) => {
    if (col.name === oldName) {
      return { ...col, name: newName };
    }
    return col;
  });

    setExtraColumns(updatedExtra);
  };
  const deleteColumn = (name: string) => {
    const updated = extraColumns.filter((col: any) => col.name !== name);
    setExtraColumns(updated);
  };
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const handleColumnDrop = (target: string) => {
    if (!draggedColumn) return;

      const cols = [...extraColumns];
      const fromIndex = cols.findIndex(c => c.name === draggedColumn);
      const toIndex = cols.findIndex(c => c.name === target);

      const [moved] = cols.splice(fromIndex, 1);
      cols.splice(toIndex, 0, moved);

      setExtraColumns(cols);
  };

  return (
    
    
    <div className={styles.boardContainer}>
      <select onChange={(e) => setRole(e.target.value)}>
         <option value="admin">Global Admin</option>
        <option value="member">Project Member</option>
        <option value="viewer">Project Viewer</option>
      </select>

      {/* Add Column Button */}
      {role === "admin" && (
        <button onClick={addColumn}>+ Add Column</button>
      )}

      <div className={styles.board}>

        {/* Default Columns */}
        {Object.keys(tasks).map((col) => (
          <div
            key={col}
            className={`${styles.column} ${
              dragOverColumn === col ? styles.activeColumn : ""
            }`}
           onDragOver={(e) => {
            e.preventDefault();
            setDragOverColumn(col);
          }}
           onDragLeave={() => setDragOverColumn(null)}  
           onDrop={() => {
            handleDrop(col);
            setDragOverColumn(null);
          }}

          >
            <h3>{col} ({tasks[col].length}/{WIP_LIMIT})</h3>
            {role === "admin" && (
              <div style={{ marginBottom: "10px" }}>
                <button onClick={() => renameColumn(col)}>✏️</button>
                  <button onClick={() => deleteColumn(col)}>🗑️</button>
              </div>
            )}

            <button onClick={() => addTask(col)}>
              + Add Task
            </button>

            {tasks[col].map((task: any, index: number) => (
              <div
                key={index}
                className={styles.taskCard}
                draggable
                onDragStart={() => handleDragStart(task, col)}
              >
                <strong>{task.title}</strong>
                <p>{task.priority}</p>
                {role !== "viewer" && (
                  <div>
                    <button onClick={() => editTask(col, index)}>✏️</button>
                    <button onClick={() => deleteTask(col, index)}>🗑️</button>
                  </div>
                )}
              </div> 
            ))}
          </div>
        ))}

        {/* Extra Columns */}
        {extraColumns.map((col, index) => (
          <div
            key={index}
            className={`${styles.column} ${
              dragOverColumn === col.name ? styles.activeColumn : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.name);
            }}
           onDragLeave={() => setDragOverColumn(null)}
            onDrop={() => {
              handleColumnDrop(col.name);
              setDragOverColumn(null);
            }}
          >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>{col.name}</h3>

            {role === "admin" && (
            <div>
              <button onClick={() => renameColumn(col.name)}>✏️</button>
               <button onClick={() => deleteColumn(col.name)}>❌</button>
            </div>
            )}
          </div>

            {role !== "viewer" && (
               <button onClick={() => addTask(col.name)}>+ Add Task</button>
            )}

            {col.tasks.map((task: any, i: number) => (
              <div
                key={i}
                className={styles.taskCard}
                draggable
                onDragStart={() => handleDragStart(task, col.name)}
              >
                <strong>{task.title}</strong>
                <p>{task.priority}</p>
                {role !== "viewer" && (
                <div>
                  <button onClick={() => {
                    const updated = extraColumns.map((c: any) => {
                      if (c.name === col.name) {
                        c.tasks[i].title = prompt("Edit task") || c.tasks[i].title;
                      }
                      return c;
                    });
                      setExtraColumns(updated);
                      }}>✏️</button>
                        <button onClick={() => {
                        const updated = extraColumns.map((c: any) => {
                          if (c.name === col.name) {
                            c.tasks.splice(i, 1);
                          }
                          return c;
                      });
                     setExtraColumns(updated);
                      }}>🗑️</button>
                  </div>
                  )}
              </div>
            ))}
          </div>
        ))}

      </div>
    </div>
  );
}

export default BoardPage;
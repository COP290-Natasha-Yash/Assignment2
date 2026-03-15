import { useState , useEffect } from "react";
import styles from "../styles/Board.module.css";

function BoardPage() {

  const [tasks, setTasks] = useState({
    todo: [
        { title: "Design UI", priority: "High" },
        { title: "Create Login Page", priority: "Medium" }
    ],
    progress: [
        {title :"Setup Database", priority :"Low"}
    ],
    review: [],
    done: [
        {title:"Project Setup", priority :"Low"}
    ]
 });
 
 useEffect(() => {
  const savedTasks = localStorage.getItem("tasks");

  if (savedTasks) {
    setTasks(JSON.parse(savedTasks));
  }
  }, []);
useEffect(() => {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}, [tasks]);

 const [draggedTask, setDraggedTask] = useState<string | null>(null);
 const [sourceColumn, setSourceColumn] = useState<string | null>(null);
 const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const handleDragStart = (task: any, column: string) => {
    setDraggedTask(task);
    setSourceColumn(column);
  };

  const handleDrop = (targetColumn: string) => {
    if (!draggedTask || !sourceColumn) return;

    const newTasks: any = { ...tasks };

    newTasks[sourceColumn] = newTasks[sourceColumn].filter(
      (t: string) => t !== draggedTask
    );

    newTasks[targetColumn].push(draggedTask);

    setTasks(newTasks);
  };
  const addTask = (column: string) => {

  const title = prompt("Enter task title");
  if (!title) return;

  const description = prompt("Enter task description");
  if (!description) return;

  const assignee = prompt("Assign task to");
  if (!assignee) return;

  const dueDate = prompt("Enter due date");
  if (!dueDate) return;

  const priority = prompt("Enter priority (Low / Medium / High)");
  if (!priority) return;

  const newTasks: any = { ...tasks };

  newTasks[column].push({
    title,
    description,
    assignee,
    dueDate,
    priority
  });

  setTasks(newTasks);

};

const deleteTask = (column: string, index: number) => {

    const newTasks: any = { ...tasks };

    newTasks[column].splice(index, 1);

    setTasks(newTasks);

 };
 const editTask = (column: string, index: number) => {

  const newTitle = prompt("Enter new task title");

  if (!newTitle) return;

  const newTasks: any = { ...tasks };

  newTasks[column][index].title = newTitle;

  setTasks(newTasks);

};

  return (
    <div className={styles.boardContainer}>
      
      <h1 className={styles.boardTitle}>Project Board</h1>

      <div className={styles.board}>

        {/* To Do Column */}
        <div
          className={styles.column}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop("todo")}
        >
          <h3>To Do</h3>

          <button
            className={styles.addTaskBtn}
            onClick={() => addTask("todo")}
          >
            + Add Task
          </button>

          {tasks.todo.map((task: any , index) => (
            <div
              key={index}
              className={styles.taskCard}
              draggable
              onDragStart={() => handleDragStart(task, "todo")}
              onClick={() => setSelectedTask(task)}
            >
              <div>
                <strong>{task.title}</strong>
                <p>{task.description}</p>

                <p>Assigned: {task.assignee}</p>

                <p>Due: {task.dueDate}</p>

                <span
                    className={
                    task.priority === "High"
                       ? styles.high
                       : task.priority === "Medium"
                       ? styles.medium
                       : styles.low
                    }
                >
                    {task.priority}
                </span>
                <button
                  className={styles.editBtn}
                  onClick={() => editTask("todo", index)}
                >
                  ✏️
                </button>

                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteTask("todo", index)}
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>


        {/* In Progress Column */}
        <div
          className={styles.column}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop("progress")}
        >
          <h3>In Progress</h3>

          <button
            className={styles.addTaskBtn}
            onClick={() => addTask("progress")}
          >
            + Add Task
          </button>

          {tasks.progress.map((task:any, index) => (
            <div
              key={index}
              className={styles.taskCard}
              draggable
              onDragStart={() => handleDragStart(task, "progress")}
            >
              <div>
                <strong>{task.title}</strong>
                <span
                  className={
                  task.priority === "High"
                   ? styles.high
                   : task.priority === "Medium"
                   ? styles.medium
                   : styles.low
                }
                >
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
        </div>


        {/* Review Column */}
        <div
          className={styles.column}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop("review")}
        >
          <h3>Review</h3>

          <button
            className={styles.addTaskBtn}
            onClick={() => addTask("review")}
          >
            + Add Task
          </button>

          {tasks.review.map((task:any, index) => (
            <div
              key={index}
              className={styles.taskCard}
              draggable
              onDragStart={() => handleDragStart(task, "review")}
            >
              <div>
                <strong>{task.title}</strong>
                <span
                    className={
                        task.priority == "High"
                          ? styles.high
                          : task.priority === "Medium"
                          ? styles.medium
                          : styles.low
                    }
                >
                    {task.priority}
                </span>
                  
            </div>
            </div>
          ))}
        </div>


        {/* Done Column */}
        <div
          className={styles.column}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop("done")}
        >
          <h3>Done</h3>

          <button
            className={styles.addTaskBtn}
            onClick={() => addTask("done")}
          >
            + Add Task
          </button>

          {tasks.done.map((task:any, index) => (
            <div
              key={index}
              className={styles.taskCard}
              draggable
              onDragStart={() => handleDragStart(task, "done")}
            >
              <div>
                <strong>{task.title}</strong>
                <span
                  className = {
                    task.priority == "High"
                     ? styles.high
                     : task.priority === "Medium"
                     ? styles.medium
                     : styles.low
                  }
                >
                    {task.priority}
                   
                  </span>
            </div>
            </div>
          ))}
        </div>
      </div>
      {selectedTask && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>{selectedTask.title}</h2>

            <p>{selectedTask.description}</p>

            <p><strong>Assigned:</strong> {selectedTask.assignee}</p>

            <p><strong>Due:</strong> {selectedTask.dueDate}</p>

            <p><strong>Priority:</strong> {selectedTask.priority}</p>

            <button onClick={() => setSelectedTask(null)}>
                Close
            </button>
        </div>
      </div>
    )}
   </div>       
  );
}

export default BoardPage;
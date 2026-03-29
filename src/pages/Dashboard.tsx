import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Dashboard.module.css";

function Dashboard() {

const navigate = useNavigate();

const [projects, setProjects] = useState<
{ id: number; name: string; description: string; createdAt: string; updatedAt: string ;assignee: string;}[]
>([]);

const createProject = () => {
const name = prompt("Enter project name");
const description = prompt("Enter project description");
const assignee = prompt("Assign user (Natasha / Aman / Riya)");

if (!name) return;

const newProject = {
id: Date.now(),
name,
description: description || "",
assignee: assignee || "Unassigned",
createdAt: new Date().toLocaleString(),
updatedAt: new Date().toLocaleString() 

};

setProjects([...projects, newProject]);
};

const editProject = (project: { id: number; name: string }) => {
const newName = prompt("Edit project name", project.name);
if (!newName) return;

const updatedProjects = projects.map((p) =>
p.id === project.id ? { ...p, name: newName } : p
);

setProjects(updatedProjects);
};

const archiveProject = (id: number) => {
const updatedProjects = projects.filter((p) => p.id !== id);
setProjects(updatedProjects);
};

return (

<div className={styles.dashboardLayout}>

{/* Sidebar */}

  <div className={styles.sidebar}>

```
<div className={styles.sidebarTitle}>
  Welcome Back 👋
</div>

<ul className={styles.sidebarMenu}>
  <li>🏠 Home</li>
  <li>📁 Projects</li>
  <li>✅ Tasks</li>
</ul>
```

  </div>

{/* Main Area */}

  <div className={styles.mainArea}>

```
{/* Topbar */}

<div className={styles.topbar}>

  <div className={styles.dashboardTitle}>
    Dashboard
  </div>

  <div className={styles.topIcons}>
    <div className={styles.notification}>
      🔔
      <span className={styles.badge}>3</span>
    </div>

    <div className={styles.profile}>
      N
    </div>
  </div>

</div>

{/* Projects Section */}

<div className={styles.header}>
  <h2 className={styles.projectsTitle}>My project</h2>

  <button
    className={styles.createButton}
    onClick={createProject}
  >
    + Create Project
  </button>
</div>

<div className={styles.projectGrid}>

  {projects.map((project) => (
    <div
      key={project.id}
      className={styles.projectCard}
    >

      <div
        className={styles.projectTitle}
        onClick={() => navigate("/board")}
      >
        {project.name}
      </div>
      <p>{project.description}</p>
      <p>Assigned: {project.assignee}</p>
      <p>Created: {project.createdAt}</p>
      <p>Updated: {project.updatedAt}</p>
      

      <div style={{ marginTop: "8px" }}>

        <button onClick={() => editProject(project)}>
          ✏️
        </button>

        <button onClick={() => archiveProject(project.id)}>
          🗂
        </button>

      </div>

    </div>
  ))}

</div>
```

  </div>

</div>

);
}

export default Dashboard;

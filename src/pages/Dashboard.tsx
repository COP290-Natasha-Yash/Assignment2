import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Dashboard.module.css";

function Dashboard() {

const navigate = useNavigate();

const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

  const createProject = () => {
    const name = prompt("Enter project name");

    if (!name) return;

    const newProject = {
      id: Date.now(),
      name
    };

    setProjects([...projects, newProject]);
  };

  return (

    <div className={styles.dashboardLayout}>

      {/* Sidebar */}

      <div className={styles.sidebar}>

        <div className={styles.sidebarTitle}>
          Welcome Back 👋
        </div>

        <ul className={styles.sidebarMenu}>
            <li>🏠 Home</li>
            <li>📁 Projects</li>
            <li>✅ Tasks</li>
        </ul>

      </div>

      {/* Main Area */}

      <div className={styles.mainArea}>

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
              onClick={() => navigate("/board")}
            >
              <div className={styles.projectTitle}>
                {project.name}
              </div>
            </div>
          ))}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
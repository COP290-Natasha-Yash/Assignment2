import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithRefresh } from "../utils/fetchWithRefresh";
import styles from "../styles/Dashboard.module.css";

interface Project {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  name: string;
  role: string;
  avatar: string;
  email: string;
  username: string;
}
interface UserTask {
  id: string;
  title: string;
  column: {
    name: string;
    board: {
      project: { id: string; name: string };
    };
  };
}


function Dashboard() {
  const navigate = useNavigate();

  // try loading from localStorage first to avoid flash on reload
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : { name: "", role: "", avatar: "", email: "", username: "" };
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState<"active" | "archived" | "all">("active");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ name: "", description: "" });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<{ name: string; avatarFile?: File }>({
    name: user.name || "",
  });

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; read: boolean }[]>([]);
  const [notifFilter, setNotifFilter] = useState<"all" | "read" | "unread">("all");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  // only visible to GLOBAL_ADMIN
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; avatar: string | null; email: string; username: string }[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; avatar: string | null; email: string; username: string } | null>(null);

  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>("all");
  const [userProjects, setUserProjects] = useState<{ id: string; name: string }[]>([]);

  // derived state — no need to store these separately
  const displayedProjects = projects.filter((p) => {
    if (projectFilter === "all") return true;
    if (projectFilter === "archived") return p.archived === true;
    return !p.archived;
  });

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "read") return n.read;
    if (notifFilter === "unread") return !n.read;
    return true;
  });

  const filteredTasks = tasks.filter((t) =>
    taskProjectFilter === "all" ? true : t.column.board.project.id === taskProjectFilter
  );

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBackendError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      showToast(`Error (${res.status}): ${data.error?.message || data.message || fallback}`);
    } catch {
      showToast(`Error (${res.status}): ${fallback}`);
    }
  };

  // ---- FETCHES ----

  const fetchCurrentUser = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/users/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        console.log(data);
        const updated: User = {
          name: data.name || "",
          role: data.globalRole || "",
          avatar: data.avatar || "",
          email: data.email || "",
          username: data.username || "",
        };
        setUser(updated);
        setEditProfile({ name: updated.name });
        localStorage.setItem("user", JSON.stringify(updated));
      } else if (res.status === 401 || res.status === 403) {
        navigate("/");
      }
    } catch {
      console.error("Failed to fetch user profile");
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      console.error("Failed to fetch notifications");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/users", { credentials: "include" }, navigate);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      console.error("Failed to fetch users");
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/users/me/tasks", { credentials: "include" }, navigate);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      console.error("Failed to fetch tasks");
    }
  };

  const fetchUserProjects = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/users/me/projects", { credentials: "include" }, navigate);
      if (res.ok) {
        const data = await res.json();
        setUserProjects(data);
      }
    } catch {
      console.error("Failed to fetch user projects");
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchNotifications();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetchWithRefresh("http://localhost:3000/api/projects", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || data);
        } else if (res.status === 401 || res.status === 403) {
          navigate("/");
        }
      } catch {
        console.error("Network error fetching projects");
      }
    };
    fetchProjects();
  }, [navigate]);

  // ---- PROJECT ACTIONS ----

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.name.trim()) return;

    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newProjectData),
      });

      if (res.ok) {
        const data = await res.json();
        setProjects((prev) => [...prev, data.project || data]);
        setNewProjectData({ name: "", description: "" });
        setIsCreateModalOpen(false);
        showToast("Project created successfully!");
      } else {
        await handleBackendError(res, "Failed to create project");
      }
    } catch {
      showToast("Network Error: Could not reach the server.");
    }
  };

  const openEditModal = (project: Project) => {
    setProjectToEdit(project);
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;

    try {
      const res = await fetchWithRefresh(`http://localhost:3000/api/projects/${projectToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: projectToEdit.name.trim(),
          description: projectToEdit.description,
        }),
      });

      if (res.ok) {
        // update locally instead of refetching everything
        setProjects((prev) => prev.map((p) => (p.id === projectToEdit.id ? projectToEdit : p)));
        setIsEditModalOpen(false);
        setProjectToEdit(null);
        showToast("Project updated successfully!");
      } else {
        await handleBackendError(res, "Update failed. Check your permissions.");
      }
    } catch {
      showToast("Network error occurred during project update.");
    }
  };

  const openArchiveConfirm = (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "unarchive" : "archive";
    setConfirmModal({
      isOpen: true,
      message: `Are you sure you want to ${action} this project?`,
      onConfirm: async () => {
        try {
          const res = await fetchWithRefresh(`http://localhost:3000/api/projects/${id}/archive`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ archived: !currentStatus }),
          });

          if (res.ok) {
            setProjects((prev) =>
              prev.map((p) => (p.id === id ? { ...p, archived: !currentStatus } : p))
            );
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            showToast(`Project ${action}d successfully!`);
          } else {
            await handleBackendError(res, `Failed to ${action} project`);
          }
        } catch {
          showToast("Network error during archiving.");
        }
      },
    });
  };

  // ---- PROFILE & AUTH ----

  const handleUpdateProfile = async () => {
    try {
      let avatarBase64: string | undefined;

      if (editProfile.avatarFile) {
        // 9MB cap before base64 encoding inflates it further
        if (editProfile.avatarFile.size > 9 * 1024 * 1024) {
          showToast("Avatar must be under 9MB", "error");
          return;
        }
        avatarBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(editProfile.avatarFile!);
        });
      }

      const res = await fetchWithRefresh("http://localhost:3000/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editProfile.name,
          ...(avatarBase64 && { avatar: avatarBase64 }),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated: User = {
          name: data.name || "",
          role: data.globalRole || "",
          avatar: data.avatar || "",
          email: data.email || "",
          username: data.username || "",
        };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        setIsEditingProfile(false);
        setIsProfileModalOpen(false);
        showToast("Profile updated successfully!");
      } else {
        await handleBackendError(res, "Could not update profile");
      }
    } catch {
      showToast("Network error: Profile update failed.");
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok || res.status === 400) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        await handleBackendError(res, "Server-side logout failed");
      }
    } catch {
      // even if the API call fails, still clear local state and redirect
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  return (
    <div className={styles.dashboardLayout}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarTitle}>Welcome Back 👋</div>
        <ul className={styles.sidebarMenu}>
          {user.role === "GLOBAL_ADMIN" && (
            <li onClick={() => { fetchUsers(); setIsUsersModalOpen(true); }} style={{ cursor: "pointer" }}>
              👥 Users
            </li>
          )}
          <li onClick={() => { fetchTasks(); fetchUserProjects(); setIsTasksModalOpen(true); }} style={{ cursor: "pointer" }}>
            ✅ Tasks
          </li>
        </ul>
      </div>

      <div className={styles.mainArea}>
        <div className={styles.topbar}>
          <div className={styles.dashboardTitle}>Dashboard</div>
          <div className={styles.topIcons}>
            <div className={styles.notifWrapper}>
              <button className={styles.notifBtn} onClick={() => setIsNotifOpen(!isNotifOpen)}>
                🔔
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className={styles.notifBadge}>
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className={styles.notifDropdown}>
                  <select
                    className={styles.notifFilter}
                    value={notifFilter}
                    onChange={(e) => setNotifFilter(e.target.value as "all" | "read" | "unread")}
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  {filteredNotifications.length === 0 ? (
                    <p className={styles.noNotif}>No notifications</p>
                  ) : filteredNotifications.map((n) => (
                    <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.unread : ""}`}>
                      {n.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.userSection}>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userRole}>{user.role}</div>
              </div>
              <div className={styles.profile} onClick={() => { setIsProfileModalOpen(true); setIsEditingProfile(false); }}>
                {user.avatar ? (
                  <img
                    src={user.avatar?.startsWith("data:") ? user.avatar : `http://localhost:3000${user.avatar}`}
                    className={styles.avatarImage}
                    alt="Avatar"
                  />
                ) : user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <h2 className={styles.projectsTitle}>Projects</h2>
            <select
              className={styles.filterDropdown}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value as "active" | "archived" | "all")}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>

          {user.role === "GLOBAL_ADMIN" && (
            <button className={styles.createButton} onClick={() => setIsCreateModalOpen(true)}>
              + Create Project
            </button>
          )}
        </div>

        <div className={styles.projectGrid}>
          {displayedProjects.map((p) => (
            <div key={p.id} className={styles.projectCard} onClick={() => navigate(`/projects/${p.id}/boards`)}>
              <div className={styles.projectTitle}>{p.name}</div>
              <p>{p.description || "No description."}</p>
              {user.role === "GLOBAL_ADMIN" && (
                <div className={styles.projectActions}>
                  <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); openEditModal(p); }}>
                    ✏️ Edit
                  </button>
                  <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); openArchiveConfirm(p.id, p.archived); }}>
                    {p.archived ? "📤 Unarchive" : "🗂 Archive"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== MODALS ===== */}

      {isProfileModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProfileModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setIsProfileModalOpen(false)}>✕</button>
            {!isEditingProfile ? (
              <div className={styles.modalBody}>
                <div className={styles.modalAvatarLarge}>
                  {user.avatar
                    ? <img src={user.avatar?.startsWith("data:") ? user.avatar : `http://localhost:3000${user.avatar}`} alt="Avatar" />
                    : user.name.charAt(0).toUpperCase()
                  }
                </div>
                <h2>{user.name}</h2>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p>{user.role}</p>
                <div className={styles.modalActions}>
                  <button className={styles.saveBtn} onClick={() => setIsEditingProfile(true)}>Edit Profile</button>
                  <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
                </div>
              </div>
            ) : (
              <div className={styles.modalBody}>
                <h2>Edit Profile</h2>
                <div className={styles.inputGroup}>
                  <label>Name</label>
                  <input
                    type="text"
                    value={editProfile.name}
                    onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setEditProfile({ ...editProfile, avatarFile: file });
                    }}
                  />
                  {user.avatar && (
                    <img
                      src={user.avatar?.startsWith("data:") ? user.avatar : `http://localhost:3000${user.avatar}`}
                      alt="current avatar"
                      style={{ width: 50, height: 50, borderRadius: "50%", marginTop: 8 }}
                    />
                  )}
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.saveBtn} onClick={handleUpdateProfile}>Save Changes</button>
                  <button className={styles.cancelBtn} onClick={() => setIsEditingProfile(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className={styles.inputGroup}>
                <label>Name <span style={{ color: "red" }}>*</span></label>
                <input
                  required
                  type="text"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea
                  className={styles.modalTextarea}
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.saveBtn}>Create</button>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && projectToEdit && (
        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Edit Project</h2>
            <form onSubmit={handleUpdateProject}>
              <div className={styles.inputGroup}>
                <label>Name</label>
                <input
                  required
                  type="text"
                  value={projectToEdit.name}
                  onChange={(e) => setProjectToEdit({ ...projectToEdit, name: e.target.value })}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea
                  className={styles.modalTextarea}
                  value={projectToEdit.description}
                  onChange={(e) => setProjectToEdit({ ...projectToEdit, description: e.target.value })}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.saveBtn}>Save Changes</button>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Confirm</h2>
            <p>{confirmModal.message}</p>
            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={confirmModal.onConfirm}>Yes</button>
              <button className={styles.cancelBtn} onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}>No</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      {isUsersModalOpen && (
        <div className={styles.modalOverlay} onClick={() => { setIsUsersModalOpen(false); setSelectedUser(null); setUserSearch(""); }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => { setIsUsersModalOpen(false); setSelectedUser(null); setUserSearch(""); }}>✕</button>

            {selectedUser ? (
              <div className={styles.modalBody}>
                <div className={styles.modalAvatarLarge}>
                  {selectedUser.avatar
                    ? <img src={selectedUser.avatar?.startsWith("data:") ? selectedUser.avatar : `http://localhost:3000${selectedUser.avatar}`} alt="Avatar" />
                    : selectedUser.name.charAt(0).toUpperCase()
                  }
                </div>
                <h2>{selectedUser.name}</h2>
                <p><strong>Username:</strong> @{selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <button className={styles.cancelBtn} onClick={() => setSelectedUser(null)}>← Back</button>
              </div>
            ) : (
              <>
                <h2>Users</h2>
                <input
                  type="text"
                  placeholder="Search by name..."
                  className={styles.searchInput}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <div className={styles.usersList}>
                  {filteredUsers.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#999" }}>No users found</p>
                  ) : filteredUsers.map((u) => (
                    <div key={u.id} className={styles.userListItem} onClick={() => setSelectedUser(u)}>
                      <div className={styles.userListAvatar}>
                        {u.avatar
                          ? <img src={u.avatar?.startsWith("data:") ? u.avatar : `http://localhost:3000${u.avatar}`} alt="Avatar" />
                          : u.name.charAt(0).toUpperCase()
                        }
                      </div>
                      <span>{u.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isTasksModalOpen && (
        <div className={styles.modalOverlay} onClick={() => { setIsTasksModalOpen(false); setTaskProjectFilter("all"); }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => { setIsTasksModalOpen(false); setTaskProjectFilter("all"); }}>✕</button>
            <h2>My Tasks</h2>
            <select
              className={styles.filterDropdown}
              value={taskProjectFilter}
              onChange={(e) => setTaskProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {userProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className={styles.usersList}>
              {filteredTasks.length === 0 ? (
                <p style={{ textAlign: "center", color: "#999" }}>No tasks assigned</p>
              ) : filteredTasks.map((t) => (
                <div key={t.id} className={styles.taskItem}>
                  <div className={styles.taskName}>{t.title}</div>
                  <div className={styles.taskProject}>{t.column.board.project.name}</div>
                  <div className={styles.taskStatus}>{t.column.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
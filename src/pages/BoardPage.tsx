import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchWithRefresh } from "../utils/fetchWithRefresh";
import styles from "../styles/Boards.module.css";
import dashStyles from "../styles/Dashboard.module.css";

interface Board {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  name: string;
  role: string; // global role
  avatar: string;
  email: string;
  username: string;
}

function BoardsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [boards, setBoards] = useState<Board[]>([]);
  const [projectName, setProjectName] = useState<string>("");
  const [projectRole, setProjectRole] = useState<string | null>(null); // role in this project
  const [loading, setLoading] = useState(true);

  // Always start blank — fetchCurrentUser() populates this from the cookie on every mount
  const [user, setUser] = useState<User>({ name: "", role: "", avatar: "", email: "", username: "" });

  const [notifications, setNotifications] = useState<
    { id: string; message: string; read: boolean }[]
  >([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "read" | "unread">(
    "all"
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<{
    name: string;
    avatarFile?: File;
  }>({
    name: user.name || "",
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [boardToEdit, setBoardToEdit] = useState<Board | null>(null);
  const [editBoardName, setEditBoardName] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const isGlobalAdmin = user.role === "GLOBAL_ADMIN";
  const canManage = isGlobalAdmin || projectRole === "ADMIN";

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
  const init = async () => {
    // Fetch user and pass directly — can't await setUser() then read state,
    // React state updates are async so user would still be "" on next line
    const res = await fetchWithRefresh("http://localhost:3000/api/users/me", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      const fetchedUser: User = {
        name: data.name || "",
        role: data.globalRole || "",
        avatar: data.avatar || "",
        email: data.email || "",
        username: data.username || "",
      };
      setUser(fetchedUser);
      setEditProfile({ name: fetchedUser.name });
      await fetchProjectRole(fetchedUser); // pass directly, no stale state
    }
    fetchBoards();
    fetchProject();
    fetchNotifications();
  };
  init();
}, [projectId]);
  const handleBackendError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      showToast(
        `Error (${res.status}): ${data.error?.message || data.message || fallback}`,
        "error"
      );
    } catch {
      showToast(`Error (${res.status}): ${fallback}`, "error");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "read") return n.read;
    if (notifFilter === "unread") return !n.read;
    return true;
  });

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/boards`,
        { credentials: "include" },
        navigate
      );
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || data);
      } else if (res.status === 401 || res.status === 403) {
        navigate("/");
      }
    } catch {
      console.error("Failed to fetch boards");
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}`,
        { credentials: "include" },
        navigate
      );
      if (res.ok) {
        const data = await res.json();
        setProjectName(data.name || "Project");
      }
    } catch {
      console.error("Failed to fetch project");
    }
  };

  // Use user state (already populated by fetchCurrentUser in init()) instead of sessionStorage
  const fetchProjectRole = async (fetchedUser: User) => {
    if (user.role === "GLOBAL_ADMIN") return; // global admins don't need project membership

    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/members`,
        { credentials: "include" },
        navigate
      );
      if (res.ok) {
        const data = await res.json();
        const membersList: Array<{ user?: { username?: string }; role?: string }> = data.members || data;
        // Match on username from state — no sessionStorage read needed
        const me = membersList.find((m) => m.user?.username === fetchedUser.username);
        setProjectRole(me?.role || null);
      }
    } catch {
      console.error("Failed to fetch project role");
    }
  };


  const fetchNotifications = async () => {
    try {
      const res = await fetchWithRefresh(
        "http://localhost:3000/api/notifications",
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      console.error("Failed to fetch notifications");
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/boards`, // ← YOUR URL
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: newBoardName.trim() }),
        },
        navigate
      );
      if (res.ok) {
        const data = await res.json();
        setBoards((prev) => [...prev, data.board || data]);
        setNewBoardName("");
        setIsCreateModalOpen(false);
        showToast("Board created successfully!");
      } else {
        await handleBackendError(res, "Failed to create board");
      }
    } catch {
      showToast("Network error: Could not create board.", "error");
    }
  };

  const openEditModal = (board: Board) => {
    setBoardToEdit(board);
    setEditBoardName(board.name);
    setIsEditModalOpen(true);
  };

  const handleUpdateBoard = async () => {
    if (!boardToEdit || !editBoardName.trim()) return;
    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/boards/${boardToEdit.id}`, // ← YOUR URL
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: editBoardName.trim() }),
        },
        navigate
      );
      if (res.ok) {
        setBoards((prev) =>
          prev.map((b) =>
            b.id === boardToEdit.id ? { ...b, name: editBoardName.trim() } : b
          )
        );
        setIsEditModalOpen(false);
        setBoardToEdit(null);
        showToast("Board updated successfully!");
      } else {
        await handleBackendError(res, "Failed to update board");
      }
    } catch {
      showToast("Network error: Could not update board.", "error");
    }
  };

  const openDeleteConfirm = (board: Board) => {
    setConfirmModal({
      isOpen: true,
      message: `Are you sure you want to delete "${board.name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetchWithRefresh(
            `http://localhost:3000/api/projects/${projectId}/boards/${board.id}`, // ← YOUR URL
            { method: "DELETE", credentials: "include" },
            navigate
          );
          if (res.ok) {
            setBoards((prev) => prev.filter((b) => b.id !== board.id));
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            showToast("Board deleted successfully!");
          } else {
            await handleBackendError(res, "Failed to delete board");
          }
        } catch {
          showToast("Network error: Could not delete board.", "error");
        }
      },
    });
  };

  const handleUpdateProfile = async () => {
    try {
      let avatarBase64: string | undefined;
      if (editProfile.avatarFile) {
        if (editProfile.avatarFile.size > 9 * 1024 * 1024) {
          showToast("Avatar must be under 9MB", "error");
          return;
        }
        avatarBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve((reader.result as string).split(",")[1]);
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
        const updatedUser: User = {
          name: data.name || "",
          role: data.globalRole || "",
          avatar: data.avatar || "",
          email: data.email || "",
          username: data.username || "",
        };
        setUser(updatedUser);
        // No sessionStorage — state is the source of truth for the current session
        setIsEditingProfile(false);
        setIsProfileModalOpen(false);
        showToast("Profile updated successfully!");
      } else {
        await handleBackendError(res, "Could not update profile");
      }
    } catch {
      showToast("Network error: Profile update failed.", "error");
    }
  };

  const handleLogout = async () => {
    // No sessionStorage to clear — just invalidate the cookie and redirect
    try {
      const res = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok || res.status === 400) {
        navigate("/");
      }
    } catch {
      navigate("/");
    }
  };

  // Role badge display
  const getRoleBadge = () => {
    if (isGlobalAdmin) {
      return (
        <span className={styles.roleBadge} style={{ background: "#7c3aed" }}>
          🌐 Global Admin
        </span>
      );
    }
    if (projectRole) {
      const colors: Record<string, string> = {
        ADMIN: "#0369a1",
        MEMBER: "#047857",
        VIEWER: "#92400e",
      };
      return (
        <span
          className={styles.roleBadge}
          style={{ background: colors[projectRole] || "#374151" }}
        >
          📋 {projectRole}
        </span>
      );
    }
    return null;
  };

  return (
    <div className={dashStyles.dashboardLayout}>
      {/* SIDEBAR */}
      <div className={dashStyles.sidebar}>
        <div className={dashStyles.sidebarTitle}>Welcome Back 👋</div>
        <ul className={dashStyles.sidebarMenu}>
          <li
            onClick={() => navigate("/dashboard")}
            style={{ cursor: "pointer" }}
          >
            🏠 Home
          </li>
          <li
            className={`${styles.navItem} ${styles.activeNav}`}
            style={{ cursor: "pointer" }}
          >
            📋 Boards
          </li>
          <li
            onClick={() => navigate(`/projects/${projectId}/members`)}
            className={styles.navItem}
            style={{ cursor: "pointer" }}
          >
            👥 Members
          </li>
        </ul>
      </div>

      <div className={dashStyles.mainArea}>
        {/* TOPBAR */}
        <div className={dashStyles.topbar}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div className={dashStyles.dashboardTitle}>
              <span
                onClick={() => navigate("/dashboard")}
                style={{
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: "22px",
                  fontWeight: 400,
                }}
              >
                Projects
              </span>
              <span style={{ margin: "0 10px", color: "#94a3b8" }}>/</span>
              {projectName || "Boards"}
            </div>
            {getRoleBadge()}
          </div>

          <div className={dashStyles.topIcons}>
            {/* NOTIFICATIONS */}
            <div className={dashStyles.notifWrapper}>
              <button
                className={dashStyles.notifBtn}
                onClick={() => setIsNotifOpen(!isNotifOpen)}
              >
                🔔
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className={dashStyles.notifBadge}>
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>
              {isNotifOpen && (
                <div className={dashStyles.notifDropdown}>
                  <select
                    className={dashStyles.notifFilter}
                    value={notifFilter}
                    onChange={(e) =>
                      setNotifFilter(
                        e.target.value as "all" | "read" | "unread"
                      )
                    }
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  {filteredNotifications.length === 0 ? (
                    <p className={dashStyles.noNotif}>No notifications</p>
                  ) : (
                    filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`${dashStyles.notifItem} ${!n.read ? dashStyles.unread : ""}`}
                      >
                        {n.message}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* USER */}
            <div className={dashStyles.userSection}>
              <div className={dashStyles.userInfo}>
                <div className={dashStyles.userName}>{user.name}</div>
                <div className={dashStyles.userRole}>{user.role}</div>
              </div>
              <div
                className={dashStyles.profile}
                onClick={() => {
                  setIsProfileModalOpen(true);
                  setIsEditingProfile(false);
                }}
              >
                {user.avatar ? (
                  <img
                    src={
                      user.avatar?.startsWith("data:")
                        ? user.avatar
                        : `http://localhost:3000${user.avatar}`
                    }
                    className={dashStyles.avatarImage}
                    alt="Avatar"
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOARDS HEADER */}
        <div className={dashStyles.header}>
          <h2 className={dashStyles.projectsTitle}>Boards</h2>
          {canManage && (
            <button
              className={dashStyles.createButton}
              onClick={() => setIsCreateModalOpen(true)}
            >
              + Create Board
            </button>
          )}
        </div>

        {/* BOARDS GRID */}
        {loading ? (
          <div className={styles.emptyState}>Loading boards...</div>
        ) : boards.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>
              No boards yet.{" "}
              {canManage
                ? "Create one to get started!"
                : "No boards available."}
            </p>
          </div>
        ) : (
          <div className={dashStyles.projectGrid}>
            {boards.map((board) => (
              <div
                key={board.id}
                className={`${dashStyles.projectCard} ${styles.boardCard}`}
                onClick={() =>
                  navigate(`/projects/${projectId}/boards/${board.id}`)
                }
              >
                <div className={styles.boardCardIcon}>📋</div>
                <div className={dashStyles.projectTitle}>{board.name}</div>
                <p style={{ color: "#64748b", fontSize: "13px" }}>
                  Created {new Date(board.createdAt).toLocaleDateString()}
                </p>

                {canManage && (
                  <div className={dashStyles.projectActions}>
                    <button
                      className={dashStyles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(board);
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={`${dashStyles.actionBtn} ${styles.deleteBtn}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirm(board);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* PROFILE MODAL */}
      {isProfileModalOpen && (
        <div
          className={dashStyles.modalOverlay}
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className={dashStyles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={dashStyles.closeModalBtn}
              onClick={() => setIsProfileModalOpen(false)}
            >
              ✕
            </button>
            {!isEditingProfile ? (
              <div className={dashStyles.modalBody}>
                <div className={dashStyles.modalAvatarLarge}>
                  {user.avatar ? (
                    <img
                      src={
                        user.avatar?.startsWith("data:")
                          ? user.avatar
                          : `http://localhost:3000${user.avatar}`
                      }
                      alt="Avatar"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <h2>{user.name}</h2>
                <p>
                  <strong>Username:</strong> {user.username}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>{user.role}</p>
                <div className={dashStyles.modalActions}>
                  <button
                    className={dashStyles.saveBtn}
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Edit Profile
                  </button>
                  <button
                    className={dashStyles.logoutBtn}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className={dashStyles.modalBody}>
                <h2>Edit Profile</h2>
                <div className={dashStyles.inputGroup}>
                  <label>Name</label>
                  <input
                    type="text"
                    value={editProfile.name}
                    onChange={(e) =>
                      setEditProfile({ ...editProfile, name: e.target.value })
                    }
                  />
                </div>
                <div className={dashStyles.inputGroup}>
                  <label>Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        setEditProfile({ ...editProfile, avatarFile: file });
                    }}
                  />
                  {user.avatar && (
                    <img
                      src={
                        user.avatar?.startsWith("data:")
                          ? user.avatar
                          : `http://localhost:3000${user.avatar}`
                      }
                      alt="current avatar"
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        marginTop: 8,
                      }}
                    />
                  )}
                </div>
                <div className={dashStyles.modalActions}>
                  <button
                    className={dashStyles.saveBtn}
                    onClick={handleUpdateProfile}
                  >
                    Save Changes
                  </button>
                  <button
                    className={dashStyles.cancelBtn}
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE BOARD MODAL */}
      {isCreateModalOpen && (
        <div
          className={dashStyles.modalOverlay}
          onClick={() => {
            setIsCreateModalOpen(false);
            setNewBoardName("");
          }}
        >
          <div
            className={dashStyles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={dashStyles.closeModalBtn}
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewBoardName("");
              }}
            >
              ✕
            </button>
            <h2>Create New Board</h2>
            <div className={dashStyles.inputGroup}>
              <label>
                Board Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sprint 1"
                value={newBoardName}
                autoFocus
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateBoard();
                }}
              />
            </div>
            <div className={dashStyles.modalActions}>
              <button
                className={dashStyles.saveBtn}
                onClick={handleCreateBoard}
              >
                Create
              </button>
              <button
                className={dashStyles.cancelBtn}
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewBoardName("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BOARD MODAL */}
      {isEditModalOpen && boardToEdit && (
        <div
          className={dashStyles.modalOverlay}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className={dashStyles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={dashStyles.closeModalBtn}
              onClick={() => setIsEditModalOpen(false)}
            >
              ✕
            </button>
            <h2>Edit Board</h2>
            <div className={dashStyles.inputGroup}>
              <label>Board Name</label>
              <input
                type="text"
                value={editBoardName}
                autoFocus
                onChange={(e) => setEditBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateBoard();
                }}
              />
            </div>
            <div className={dashStyles.modalActions}>
              <button
                className={dashStyles.saveBtn}
                onClick={handleUpdateBoard}
              >
                Save Changes
              </button>
              <button
                className={dashStyles.cancelBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div className={dashStyles.modalOverlay}>
          <div className={dashStyles.modalContent}>
            <h2>Confirm Delete</h2>
            <p style={{ color: "#64748b", margin: "12px 0 20px" }}>
              {confirmModal.message}
            </p>
            <div className={dashStyles.modalActions}>
              <button
                className={dashStyles.logoutBtn}
                onClick={confirmModal.onConfirm}
              >
                Yes, Delete
              </button>
              <button
                className={dashStyles.cancelBtn}
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`${dashStyles.toast} ${toast.type === "error" ? dashStyles.toastError : dashStyles.toastSuccess}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default BoardsPage;
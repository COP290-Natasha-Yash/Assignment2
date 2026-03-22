import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchWithRefresh } from "../utils/fetchWithRefresh";
import dashStyles from "../styles/Dashboard.module.css";
import styles from "../styles/Members.module.css";

type ProjectRole = "ADMIN" | "MEMBER" | "VIEWER";

interface Member {
  id: string;
  userId: string;
  role: ProjectRole;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    avatar: string | null;
  };
}

interface UserResult {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
}

interface CurrentUser {
  name: string;
  role: string; // global role (e.g. GLOBAL_ADMIN)
  avatar: string;
  email: string;
  username: string;
}

function MembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Always start blank — fetchCurrentUser() fills this from cookie on every mount
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: "", role: "", avatar: "", email: "", username: "",
  });
  const [myProjectRole, setMyProjectRole] = useState<ProjectRole | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const [allUsers, setAllUsers] = useState<UserResult[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [addRoleSelect, setAddRoleSelect] = useState<ProjectRole>("MEMBER");

  // Three possible right-panel views: member list, add user, or user profile
  const [view, setView] = useState<"members" | "addUser" | "userProfile">("members");
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [profileAddRole, setProfileAddRole] = useState<ProjectRole>("MEMBER");

  const [projectName, setProjectName] = useState("");

  const [notifications, setNotifications] = useState<
    { id: string; message: string; read: boolean }[]
  >([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "read" | "unread">("all");

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<{ name: string; avatarFile?: File }>({ name: currentUser.name || "" });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);

  // GLOBAL_ADMIN can manage all projects without needing a project-level role
  const isGlobalAdmin = currentUser.role === "GLOBAL_ADMIN";
  const canManage = isGlobalAdmin || myProjectRole === "ADMIN";

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Init: fetch user first, then role (role check depends on currentUser being set)
  useEffect(() => {
    const init = async () => {
      await fetchCurrentUser();
      await fetchMyProjectRole();
      fetchMembers();
      fetchAllUsers();
      fetchProject();
      fetchNotifications();
    };
    init();
  }, [projectId]);

  const handleBackendError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      showToast(`Error (${res.status}): ${data.error?.message || data.message || fallback}`, "error");
    } catch {
      showToast(`Error (${res.status}): ${fallback}`, "error");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "read") return n.read;
    if (notifFilter === "unread") return !n.read;
    return true;
  });

  // Exclude users already in the project from the "Add User" list
  const memberUserIds = new Set(members.map((m) => m.userId));
  const filteredAllUsers = allUsers.filter(
    (u) => !memberUserIds.has(u.id) && u.name.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredMembers = members.filter(
    (m) =>
      m.user.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.user.username.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ─── API Fetches ───────────────────────────────────────────────────────────

  const fetchCurrentUser = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/users/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const u: CurrentUser = {
          name: data.name || "", role: data.globalRole || "",
          avatar: data.avatar || "", email: data.email || "", username: data.username || "",
        };
        setCurrentUser(u);
        setEditProfile({ name: u.name });
      }
    } catch { console.error("Failed to fetch user"); }
  };

  const fetchMyProjectRole = async () => {
    // GLOBAL_ADMIN doesn't need a project membership — skip the check
    if (currentUser.role === "GLOBAL_ADMIN") return;

    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/members`,
        { credentials: "include" }, navigate
      );
      if (res.ok) {
        const data = await res.json();
        const membersList: Array<{ user?: { username?: string }; role?: string }> = data.members || data;
        // Match by username from state (no sessionStorage needed)
        const me = membersList.find((m) => m.user?.username === currentUser.username);
        setMyProjectRole(me?.role as ProjectRole | null || null);
      }
    } catch { console.error("Failed to fetch project role"); }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/members`,
        { credentials: "include" }, navigate
      );
      if (res.ok) { const data = await res.json(); setMembers(data.members || data); }
    } catch { console.error("Failed to fetch members"); }
    finally { setLoading(false); }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/users", { credentials: "include" }, navigate);
      if (res.ok) { const data = await res.json(); console.log("Users response:", data[0]); setAllUsers(data); }
    } catch { console.error("Failed to fetch users"); }
  };

  const fetchProject = async () => {
    try {
      const res = await fetchWithRefresh(`http://localhost:3000/api/projects/${projectId}`, { credentials: "include" }, navigate);
      if (res.ok) { const data = await res.json(); setProjectName(data.name || "Project"); }
    } catch { console.error("Failed to fetch project"); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithRefresh("http://localhost:3000/api/notifications", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setNotifications(data); }
    } catch { console.error("Failed to fetch notifications"); }
  };

  // ─── Member Actions ────────────────────────────────────────────────────────

  const handleAddMember = async (user: UserResult, role: ProjectRole) => {
    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/members`,
        { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ username: user.username, role }) },
        navigate
      );
      if (res.ok) {
        await fetchMembers();
        // Reset add-user panel state after successful add
        setView("members");
        setSelectedUser(null);
        setUserSearch("");
        showToast("Member added successfully!");
      } else { await handleBackendError(res, "Failed to add member"); }
    } catch { showToast("Network error: Could not add member.", "error"); }
  };

  const handleUpdateRole = async (userId: string, newRole: ProjectRole) => {
    try {
      const res = await fetchWithRefresh(
        `http://localhost:3000/api/projects/${projectId}/members/${userId}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ role: newRole }) },
        navigate
      );
      if (res.ok) {
        // Update role locally without re-fetching the whole list
        setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)));
        showToast("Role updated!");
      } else { await handleBackendError(res, "Failed to update role"); }
    } catch { showToast("Network error: Could not update role.", "error"); }
  };

  // Opens confirm modal before actually removing a member
  const openRemoveConfirm = (member: Member) => {
    setConfirmModal({
      isOpen: true,
      message: `Are you sure you want to remove ${member.user.name} from this project?`,
      onConfirm: async () => {
        try {
          const res = await fetchWithRefresh(
            `http://localhost:3000/api/projects/${projectId}/members/${member.userId}`,
            { method: "DELETE", credentials: "include" }, navigate
          );
          if (res.ok) {
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            showToast("Member removed.");
          } else { await handleBackendError(res, "Failed to remove member"); }
        } catch { showToast("Network error: Could not remove member.", "error"); }
      },
    });
  };

  // ─── Profile Update ────────────────────────────────────────────────────────

  const handleUpdateProfile = async () => {
    try {
      let avatarBase64: string | undefined;
      // Convert avatar file to base64 only if a new file was selected
      if (editProfile.avatarFile) {
        if (editProfile.avatarFile.size > 9 * 1024 * 1024) {
          showToast("Avatar must be under 9MB", "error"); return;
        }
        avatarBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(editProfile.avatarFile!);
        });
      }
      const res = await fetchWithRefresh("http://localhost:3000/api/users/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: editProfile.name, ...(avatarBase64 && { avatar: avatarBase64 }) }),
      });
      if (res.ok) {
        const data = await res.json();
        const u: CurrentUser = { name: data.name || "", role: data.globalRole || "", avatar: data.avatar || "", email: data.email || "", username: data.username || "" };
        setCurrentUser(u);
        setIsEditingProfile(false);
        setIsProfileModalOpen(false);
        showToast("Profile updated!");
      } else { await handleBackendError(res, "Could not update profile"); }
    } catch { showToast("Network error: Profile update failed.", "error"); }
  };

  const handleLogout = async () => {
    try { await fetch("http://localhost:3000/api/auth/logout", { method: "POST", credentials: "include" }); }
    finally { navigate("/"); }
  };

  const roleColors: Record<ProjectRole, string> = {
    ADMIN: "#0369a1", MEMBER: "#047857", VIEWER: "#92400e",
  };

  // Reusable avatar component: shows image if available, otherwise initial letter
  const Avatar = ({ avatar, name, size = 40 }: { avatar: string | null; name: string; size?: number }) => (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#6366f1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: size * 0.4, overflow: "hidden", flexShrink: 0 }}>
      {avatar ? (
        <img src={avatar?.startsWith("data:") ? avatar : `http://localhost:3000${avatar}`} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (name.charAt(0).toUpperCase())}
    </div>
  );

  return (
    <div className={dashStyles.dashboardLayout}>
      {/* SIDEBAR */}
      <div className={dashStyles.sidebar}>
        <div className={dashStyles.sidebarTitle}>Welcome Back 👋</div>
        <ul className={dashStyles.sidebarMenu}>
          <li onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>🏠 Home</li>
          <li onClick={() => navigate(`/projects/${projectId}/boards`)} className={styles.navItem} style={{ cursor: "pointer" }}>📋 Boards</li>
          <li className={`${styles.navItem} ${styles.activeNav}`} style={{ cursor: "pointer" }}>👥 Members</li>
        </ul>
      </div>

      <div className={dashStyles.mainArea}>
        {/* TOPBAR */}
        <div className={dashStyles.topbar}>
          {/* Breadcrumb: Projects / ProjectName / Members */}
          <div className={dashStyles.dashboardTitle}>
            <span onClick={() => navigate("/dashboard")} style={{ cursor: "pointer", color: "#94a3b8", fontSize: "22px", fontWeight: 400 }}>Projects</span>
            <span style={{ margin: "0 10px", color: "#94a3b8" }}>/</span>
            <span onClick={() => navigate(`/projects/${projectId}/boards`)} style={{ cursor: "pointer", color: "#94a3b8", fontSize: "22px", fontWeight: 400 }}>{projectName}</span>
            <span style={{ margin: "0 10px", color: "#94a3b8" }}>/</span>
            Members
          </div>

          <div className={dashStyles.topIcons}>
            {/* Notification bell with unread badge */}
            <div className={dashStyles.notifWrapper}>
              <button className={dashStyles.notifBtn} onClick={() => setIsNotifOpen(!isNotifOpen)}>
                🔔
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className={dashStyles.notifBadge}>{notifications.filter((n) => !n.read).length}</span>
                )}
              </button>
              {isNotifOpen && (
                <div className={dashStyles.notifDropdown}>
                  <select className={dashStyles.notifFilter} value={notifFilter} onChange={(e) => setNotifFilter(e.target.value as "all" | "read" | "unread")}>
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  {filteredNotifications.length === 0 ? (
                    <p className={dashStyles.noNotif}>No notifications</p>
                  ) : (filteredNotifications.map((n) => (
                    <div key={n.id} className={`${dashStyles.notifItem} ${!n.read ? dashStyles.unread : ""}`}>{n.message}</div>
                  )))}
                </div>
              )}
            </div>

            <div className={dashStyles.userSection}>
              <div className={dashStyles.userInfo}>
                <div className={dashStyles.userName}>{currentUser.name}</div>
                <div className={dashStyles.userRole}>{currentUser.role}</div>
              </div>
              <div className={dashStyles.profile} onClick={() => { setIsProfileModalOpen(true); setIsEditingProfile(false); }}>
                {currentUser.avatar ? (
                  <img src={currentUser.avatar?.startsWith("data:") ? currentUser.avatar : `http://localhost:3000${currentUser.avatar}`} className={dashStyles.avatarImage} alt="Avatar" />
                ) : (currentUser.name.charAt(0).toUpperCase())}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className={styles.membersLayout}>

          {/* LEFT PANEL: current project members list */}
          <div className={styles.membersPanel}>
            <div className={styles.panelHeader}>
              <h2 className={dashStyles.projectsTitle}>Members ({members.length})</h2>
              {canManage && (
                // Toggle button: opens or closes the Add User panel
                <button
                  className={`${dashStyles.createButton} ${view === "addUser" ? styles.activeAddBtn : ""}`}
                  onClick={() => setView(view === "addUser" ? "members" : "addUser")}
                >
                  {view === "addUser" ? "✕ Close" : "+ Add Member"}
                </button>
              )}
            </div>

            <input type="text" placeholder="Search members..." className={dashStyles.searchInput} value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />

            {loading ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>Loading...</p>
            ) : filteredMembers.length === 0 ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>No members found.</p>
            ) : (
              <div className={styles.membersList}>
                {filteredMembers.map((member) => (
                  <div key={member.id} className={styles.memberRow}>
                    <Avatar avatar={member.user.avatar} name={member.user.name} size={44} />
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{member.user.name}</div>
                      <div className={styles.memberUsername}>@{member.user.username}</div>
                    </div>

                    {/* Admins see a role dropdown; others see a read-only pill */}
                    {canManage ? (
                      <select className={styles.roleSelect} value={member.role}
                        style={{ borderColor: roleColors[member.role] + "55", color: roleColors[member.role] }}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value as ProjectRole)}>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span className={styles.rolePill} style={{ background: roleColors[member.role] + "22", color: roleColors[member.role] }}>
                        {member.role}
                      </span>
                    )}

                    {canManage && (
                      <button className={styles.removeBtn} title="Remove member" onClick={() => openRemoveConfirm(member)}>🗑️</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Add User — shows all users not already in the project */}
          {view === "addUser" && canManage && (
            <div className={styles.addPanel}>
              <h3 className={styles.addPanelTitle}>Add from Users</h3>
              <input type="text" placeholder="Search users..." className={dashStyles.searchInput} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} autoFocus />
              <div className={styles.addRoleRow}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Default role:</label>
                <select className={styles.roleSelect} value={addRoleSelect} onChange={(e) => setAddRoleSelect(e.target.value as ProjectRole)}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className={styles.userPickerList}>
                {filteredAllUsers.length === 0 ? (
                  <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>
                    {userSearch ? "No users found." : "All users are already members."}
                  </p>
                ) : (filteredAllUsers.map((u) => (
                  <div key={u.id} className={styles.userPickerRow}
                    onClick={() => { setSelectedUser(u); setProfileAddRole(addRoleSelect); setView("userProfile"); }}>
                    <Avatar avatar={u.avatar} name={u.name} size={38} />
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{u.name}</div>
                      <div className={styles.memberUsername}>@{u.username}</div>
                    </div>
                    {/* Quick add button — stops propagation to avoid opening profile view */}
                    <button className={styles.quickAddBtn} title="Add with selected role"
                      onClick={(e) => { e.stopPropagation(); handleAddMember(u, addRoleSelect); }}>
                      + Add
                    </button>
                  </div>
                )))}
              </div>
            </div>
          )}

          {/* RIGHT PANEL: User Profile — shown when clicking a user row in Add panel */}
          {view === "userProfile" && selectedUser && (
            <div className={styles.addPanel}>
              <button className={styles.backBtn} onClick={() => setView("addUser")}>← Back</button>
              <div className={styles.profileView}>
                <Avatar avatar={selectedUser.avatar} name={selectedUser.name} size={72} />
                <h2 style={{ marginTop: "12px", color: "#1e293b" }}>{selectedUser.name}</h2>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>
                  {selectedUser.username ? `@${selectedUser.username}` : selectedUser.email}
                </p>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>{selectedUser.email}</p>

                <div className={styles.addRoleRow} style={{ marginTop: "20px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Role:</label>
                  <select className={styles.roleSelect} value={profileAddRole} onChange={(e) => setProfileAddRole(e.target.value as ProjectRole)}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>

                <button className={dashStyles.createButton} style={{ marginTop: "16px", width: "100%", padding: "10px" }}
                  onClick={() => handleAddMember(selectedUser, profileAddRole)}>
                  + Add to Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {/* Profile Modal: view or edit the logged-in user's profile */}
      {isProfileModalOpen && (
        <div className={dashStyles.modalOverlay} onClick={() => setIsProfileModalOpen(false)}>
          <div className={dashStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={dashStyles.closeModalBtn} onClick={() => setIsProfileModalOpen(false)}>✕</button>
            {!isEditingProfile ? (
              <div className={dashStyles.modalBody}>
                <div className={dashStyles.modalAvatarLarge}>
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar?.startsWith("data:") ? currentUser.avatar : `http://localhost:3000${currentUser.avatar}`} alt="Avatar" />
                  ) : (currentUser.name.charAt(0).toUpperCase())}
                </div>
                <h2>{currentUser.name}</h2>
                <p><strong>Username:</strong> {currentUser.username}</p>
                <p><strong>Email:</strong> {currentUser.email}</p>
                <p>{currentUser.role}</p>
                <div className={dashStyles.modalActions}>
                  <button className={dashStyles.saveBtn} onClick={() => setIsEditingProfile(true)}>Edit Profile</button>
                  <button className={dashStyles.logoutBtn} onClick={handleLogout}>Logout</button>
                </div>
              </div>
            ) : (
              <div className={dashStyles.modalBody}>
                <h2>Edit Profile</h2>
                <div className={dashStyles.inputGroup}>
                  <label>Name</label>
                  <input type="text" value={editProfile.name} onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })} />
                </div>
                <div className={dashStyles.inputGroup}>
                  <label>Avatar</label>
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditProfile({ ...editProfile, avatarFile: f }); }} />
                  {currentUser.avatar && (
                    <img src={currentUser.avatar?.startsWith("data:") ? currentUser.avatar : `http://localhost:3000${currentUser.avatar}`} alt="avatar" style={{ width: 50, height: 50, borderRadius: "50%", marginTop: 8 }} />
                  )}
                </div>
                <div className={dashStyles.modalActions}>
                  <button className={dashStyles.saveBtn} onClick={handleUpdateProfile}>Save Changes</button>
                  <button className={dashStyles.cancelBtn} onClick={() => setIsEditingProfile(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal: shown before removing a member */}
      {confirmModal.isOpen && (
        <div className={dashStyles.modalOverlay}>
          <div className={dashStyles.modalContent}>
            <h2>Confirm</h2>
            <p style={{ color: "#64748b", margin: "12px 0 20px" }}>{confirmModal.message}</p>
            <div className={dashStyles.modalActions}>
              <button className={dashStyles.logoutBtn} onClick={confirmModal.onConfirm}>Yes, Remove</button>
              <button className={dashStyles.cancelBtn} onClick={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast: auto-dismissing success or error message */}
      {toast && (
        <div className={`${dashStyles.toast} ${toast.type === "error" ? dashStyles.toastError : dashStyles.toastSuccess}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default MembersPage;

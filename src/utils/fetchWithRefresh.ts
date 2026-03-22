export const fetchWithRefresh = async (
  url: string,
  options: RequestInit = {},
  navigate?: (path: string) => void
): Promise<Response> => {
  let res = await fetch(url, { ...options, credentials: "include" });

  if (res.status === 401) {
    const data = await res.clone().json();

    if (data.error?.code === "TOKEN_EXPIRED") {
      const refreshRes = await fetch("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        res = await fetch(url, { ...options, credentials: "include" });
      } else {
        // Refresh token also expired — force logout
        localStorage.removeItem("user");
        navigate?.("/");
      }
    } else {
      // Any other 401 (not logged in at all) — force logout
      localStorage.removeItem("user");
      navigate?.("/");
    }
  }

  return res;
};

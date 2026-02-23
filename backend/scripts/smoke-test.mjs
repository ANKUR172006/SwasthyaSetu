const baseUrl = String(process.env.SMOKE_BASE_URL || "").trim().replace(/\/+$/, "");
const email = process.env.SMOKE_EMAIL || "schooladmin.pune@swasthyasetu.in";
const password = process.env.SMOKE_PASSWORD || "Admin@1234";

if (!baseUrl) {
  console.error("SMOKE_BASE_URL is required, e.g. https://your-backend.onrender.com");
  process.exit(1);
}

const request = async (path, { method = "GET", token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = JSON.stringify(await response.json());
    } catch {
      errorBody = await response.text();
    }
    throw new Error(`${method} ${path} failed (${response.status}): ${errorBody}`);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
};

const run = async () => {
  console.log("1/4 login");
  const session = await request("/auth/login", {
    method: "POST",
    body: { email, password }
  });
  const token = session?.accessToken;
  if (!token) {
    throw new Error("Login response missing accessToken.");
  }

  console.log("2/4 me");
  const me = await request("/auth/me", { token });
  if (!me?.schoolId) {
    throw new Error("Smoke account must include schoolId.");
  }

  console.log("3/4 list students");
  const students = await request(`/students?page=1&pageSize=5&schoolId=${encodeURIComponent(me.schoolId)}`, { token });
  if (!Array.isArray(students?.data)) {
    throw new Error("Student listing did not return expected data array.");
  }

  console.log("4/4 create health camp");
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const camp = await request("/health-camp", {
    method: "POST",
    token,
    body: {
      schoolId: me.schoolId,
      campType: "Smoke Test Camp",
      date,
      participantsCount: 25
    }
  });
  if (!camp?.id) {
    throw new Error("Health camp creation response missing id.");
  }

  console.log("Smoke test passed.");
};

run().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});

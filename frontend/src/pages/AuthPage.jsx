import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const portalRoles = ["student", "parent", "admin"];

export default function AuthPage() {
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
    grade: 6,
    target_exam: "JNV",
    phone: "",
    student_identifier: "",
  });

  useEffect(() => {
    const requestedRole = searchParams.get("role");

    if (requestedRole && portalRoles.includes(requestedRole)) {
      setRole(requestedRole);

      setForm((prev) => ({
        ...prev,
        role: requestedRole,
      }));

      if (requestedRole === "admin") {
        setMode("login");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      role,
    }));
  }, [role]);

  const submit = async (event) => {
    event.preventDefault();

    setError("");

    try {
      let payload = {};

      if (mode === "login") {
        payload = {
          email: form.email,
          password: form.password,
        };
      } else if (role === "student") {
        payload = {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: "student",
          grade: form.grade,
          target_exam: form.target_exam,
        };
      } else {
        payload = {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: "parent",
          phone: form.phone,
          student_identifier: form.student_identifier,
        };
      }

      const user =
        mode === "login"
          ? await login(payload)
          : await register(payload);

      navigate(`/${user.role}`);
    } catch (err) {
      console.error("AUTH ERROR:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Authentication failed");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(err.message || "Authentication failed");
      }

      console.log("FULL ERROR RESPONSE:", err.response?.data);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8fbf9] p-4">
      <form
        onSubmit={submit}
        className="card w-full max-w-md"
      >
        <h1 className="text-3xl font-black">
          {mode === "login"
            ? "Welcome back"
            : "Create your account"}
        </h1>

        <p className="mt-2 text-sm text-black/60">
          Use one secure account for student, parent,
          or admin access.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {/* ROLE SELECTOR */}
          <div className="grid grid-cols-3 gap-2">
            {portalRoles.map((portal) => (
              <button
                key={portal}
                type="button"
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  portal === role
                    ? "border-mint bg-mint/10"
                    : "border-black/10 bg-white"
                }`}
                onClick={() => {
                  setRole(portal);

                  if (portal === "admin") {
                    setMode("login");
                  }
                }}
              >
                {portal.charAt(0).toUpperCase() +
                  portal.slice(1)}
              </button>
            ))}
          </div>

          {/* FULL NAME */}
          {mode === "register" &&
            role !== "admin" && (
              <input
                className="input"
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    full_name: e.target.value,
                  })
                }
                required
              />
            )}

          {/* EMAIL */}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            required
          />

          {/* PASSWORD */}
          <input
            className="input"
            type="password"
            placeholder="Password (min 8 chars)"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            required
            minLength={8}
          />

          {/* STUDENT EXTRA FIELDS */}
          {mode === "register" &&
            role === "student" && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="input"
                  value={form.grade}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grade: Number(e.target.value),
                    })
                  }
                >
                  <option value={6}>Class 6</option>
                  <option value={9}>Class 9</option>
                </select>

                <select
                  className="input"
                  value={form.target_exam}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target_exam: e.target.value,
                    })
                  }
                >
                  <option value="JNV">JNV</option>
                  <option value="Sainik">
                    Sainik
                  </option>
                </select>
              </div>
            )}

          {/* PARENT EXTRA FIELDS */}
          {mode === "register" &&
            role === "parent" && (
              <>
                <input
                  className="input"
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                />

                <input
                  className="input"
                  placeholder="Student email or ID (optional)"
                  value={
                    form.student_identifier || ""
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      student_identifier:
                        e.target.value,
                    })
                  }
                />
              </>
            )}

          {/* ADMIN MESSAGE */}
          {mode === "login" &&
            role === "admin" && (
              <p className="text-sm text-black/60">
                Use your admin credentials to
                continue.
              </p>
            )}
        </div>

        {/* SUBMIT */}
        <button className="btn-primary mt-5 w-full">
          {mode === "login"
            ? "Log in"
            : "Register"}
        </button>

        {/* TOGGLE LOGIN/REGISTER */}
        {role !== "admin" && (
          <button
            type="button"
            onClick={() =>
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              )
            }
            className="mt-4 w-full text-sm font-semibold text-mint"
          >
            {mode === "login"
              ? "New here? Create account"
              : "Already registered? Log in"}
          </button>
        )}
      </form>
    </div>
  );
}
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

interface User {
    id: string;
    email: string;
    full_name?: string;
    is_premium: boolean;
    premium_expiry?: string;
    refresh_tokens: number;
    last_news_refresh_date?: string;
    last_summary_refresh_date?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean; // Initial load (checking token)
    isLoggingIn: boolean; // Login action
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const fetchUser = async () => {
        try {
            if (!localStorage.getItem("token")) {
                setUser(null);
                setIsLoading(false);
                return;
            }
            const userData = await api.auth.me();
            setUser(userData);
        } catch (error) {
            //   console.error("Auth check failed", error);
            localStorage.removeItem("token");
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const login = async (username: string, password: string) => {
        setIsLoggingIn(true);
        try {
            const data = await api.auth.login({ username, password });
            localStorage.setItem("token", data.access_token);
            if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
            await fetchUser();
            toast.success("Welcome back!");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Login failed");
            throw error;
        } finally {
            setIsLoggingIn(false);
        }
    };

    const register = async (email: string, password: string, fullName: string) => {
        setIsLoggingIn(true);
        try {
            await api.auth.signup({ email, password, full_name: fullName });
            // Auto login after signup
            await login(email, password);
        } catch (error: any) {
            toast.error(error.message || "Registration failed");
            throw error;
        } finally {
            setIsLoggingIn(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("daily_briefing_summary");
        setUser(null);
        toast.success("Logged out successfully");
        navigate("/login");
    };

    const refreshProfile = async () => {
        await fetchUser();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, isLoggingIn, login, register, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

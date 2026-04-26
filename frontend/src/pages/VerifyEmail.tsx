import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const { user } = useAuth();

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your email...");
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No verification token found.");
            return;
        }

        const verify = async () => {
            try {
                await api.auth.verifyEmail(token);
                setStatus("success");
                setMessage("Email verified successfully! You can now access all features.");
            } catch (error: unknown) {
                setStatus("error");
                const message = error instanceof Error ? error.message : "Verification failed. The link may be invalid or expired.";
                setMessage(message);
            }
        };

        verify();
    }, [token]);

    const handleResend = async () => {
        if (!user) {
            toast.error("Please log in first to resend verification email.");
            navigate("/login");
            return;
        }
        setResending(true);
        try {
            await api.auth.resendVerification();
            toast.success("Verification email sent! Check your inbox.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to resend verification email.";
            toast.error(message);
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
                        {status === "success" && <CheckCircle2 className="h-12 w-12 text-green-500" />}
                        {status === "error" && <XCircle className="h-12 w-12 text-destructive" />}
                    </div>
                    <CardTitle className="text-center">Email Verification</CardTitle>
                    <CardDescription className="text-center">{message}</CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-col items-center gap-3">
                    {status === "loading" ? (
                        <Button disabled>Please wait...</Button>
                    ) : status === "success" ? (
                        <Button onClick={() => navigate("/dashboard")}>
                            Go to Dashboard
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleResend}
                                disabled={resending}
                            >
                                {resending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Resend Verification Email
                            </Button>
                            <Button variant="ghost" onClick={() => navigate("/login")}>
                                Back to Login
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

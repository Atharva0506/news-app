import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your email...");

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
            } catch (error: any) {
                setStatus("error");
                setMessage(error.message || "Verification failed. The link may be invalid or expired.");
            }
        };

        verify();
    }, [token]);

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
                <CardFooter className="flex justify-center">
                    {status === "loading" ? (
                        <Button disabled>Please wait...</Button>
                    ) : (
                        <Button onClick={() => navigate(status === "success" ? "/dashboard" : "/login")}>
                            {status === "success" ? "Go to Dashboard" : "Back to Login"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

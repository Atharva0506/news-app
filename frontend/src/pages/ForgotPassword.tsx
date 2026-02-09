import { useState } from 'react';
import { auth } from '../api/api';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await auth.forgotPassword(email);
            setSubmitted(true);
        } catch (error) {
            console.error(error);
            // Ideally show error toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-xl">
                <h2 className="text-3xl font-bold mb-6 text-center">Reset Password</h2>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <p className="text-gray-400 text-center">Enter your email to receive a reset link.</p>
                        <div>
                            <label className="block text-sm font-medium mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:outline-none focus:border-blue-500"
                                placeholder="you@example.com"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <div className="text-center">
                            <Link to="/login" className="text-sm text-gray-400 hover:text-white">Back to Login</Link>
                        </div>
                    </form>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="text-green-500 text-5xl">✉️</div>
                        <h3 className="text-xl font-bold">Check your email</h3>
                        <p className="text-gray-400">If an account exists for {email}, we have sent a password reset link.</p>
                        <button
                            onClick={() => setSubmitted(false)}
                            className="text-blue-400 hover:underline text-sm"
                        >
                            Try another email
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;

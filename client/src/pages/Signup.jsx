import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransition } from '../context/TransitionContext';
import { store, setSignedIn } from '../utils';
import { apiService } from '../services/api';
import PageTransition from '../components/ui/PageTransition';
import DarkModeToggle from '../components/ui/DarkModeToggle';
import Footer from '../components/layout/Footer';

const Signup = () => {
    const snap = useSnapshot(store);
    const navigate = useNavigate();
    const location = useLocation();
    const { triggerTransition } = useTransition();

    const [step, setStep] = useState('signup');
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        if (location.state?.step === 'otp' && location.state?.userId) {
            setStep('otp');
            setUserId(location.state.userId);
        }
    }, [location.state]);
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const controlStyle = useMemo(() => ({
        backgroundColor: snap.dark ? 'var(--dark-color-2)' : 'var(--color-2)',
        color: snap.dark ? 'var(--dark-color-1)' : 'var(--color-1)',
        borderColor: snap.dark ? 'var(--dark-color-1)' : 'var(--color-1)'
    }), [snap.dark]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    }, [errors]);

    const handleOtpChange = useCallback((e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setOtp(value);
        if (errors.otp) {
            setErrors(prev => ({ ...prev, otp: '' }));
        }
    }, [errors]);

    const validateForm = useCallback(() => {
        const newErrors = {};

        if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        return newErrors;
    }, [formData]);

    const handleSignupSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            setIsLoading(false);
            return;
        }

        try {
            const response = await apiService.register({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });

            if (response && response.requiresVerification) {
                setUserId(response.userId);
                setStep('otp');
            }
        } catch (error) {
            setErrors({ submit: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [formData, validateForm]);

    const handleOtpSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        if (otp.length !== 6) {
            setErrors({ otp: 'Please enter a 6-digit OTP' });
            setIsLoading(false);
            return;
        }

        try {
            const response = await apiService.verifyOtp({
                userId,
                otp
            });

            if (response && response.token) {
                localStorage.setItem('amarTasks-token', response.token);
                localStorage.setItem('amarTasks-user', JSON.stringify(response.user));
                
                setSuccess(true);
                setTimeout(() => {
                    triggerTransition(() => {
                        setSignedIn(true);
                        navigate('/user');
                    });
                }, 2000);
            }
        } catch (error) {
            setErrors({ otp: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [otp, userId, triggerTransition, navigate]);

    const handleResendOtp = useCallback(async () => {
        setIsLoading(true);
        setErrors({});

        try {
            await apiService.resendOtp({ userId });
            setErrors({ resend: 'New OTP sent to your email!' });
        } catch (error) {
            setErrors({ resend: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    if (success) {
        return (
            <PageTransition>
                <div className="min-h-screen flex flex-col">
                    <div className="flex justify-between items-center p-4">
                        <button
                            aria-label="Home"
                            className="ml-3 p-2"
                            onClick={() => {
                                triggerTransition(() => {
                                    navigate('/');
                                });
                            }}
                        >
                            <img src="logout.svg" alt="" />
                        </button>
                        <DarkModeToggle />
                    </div>
                    <div className="flex-1 flex items-center justify-center font-i px-4">
                        <div className="text-center p-6 sm:p-10 max-w-md" style={controlStyle}>
                            <div className="mb-6">
                                <h1 className="text-3xl sm:text-4xl mb-4">Welcome!</h1>
                                <p className="text-lg sm:text-xl mb-4">
                                    Welcome to <span className="font-ii">আমার</span>Tasks, {formData.username}!
                                </p>
                                <p className="mb-4">Your email has been verified successfully!</p>
                                <p className="text-sm">Redirecting to your dashboard...</p>
                            </div>
                        </div>
                    </div>
                    <Footer />
                </div>
            </PageTransition>
        );
    }

    if (step === 'otp') {
        return (
            <PageTransition>
                <div className="min-h-screen flex flex-col">
                    <div className="flex justify-end p-4 gap-2">
                        <button
                            aria-label="Back to Signup"
                            className="ml-3 p-2"
                            onClick={() => {
                                setStep('signup');
                                setOtp('');
                                setErrors({});
                            }}
                        >
                            <img src="logout.svg" alt="" />
                        </button>
                        <DarkModeToggle />
                    </div>
                    <div className="flex-1 flex items-center justify-center font-i px-4">
                        <div className="w-full max-w-sm sm:max-w-md">
                            <form onSubmit={handleOtpSubmit} className="p-6 sm:p-10" style={controlStyle}>
                                <div className="text-center mb-6">
                                    <h1 className="text-3xl sm:text-4xl mb-4">Verify Your Email</h1>
                                    <p className="text-sm sm:text-base mb-2">
                                        We've sent a 6-digit code to:
                                    </p>
                                    <p className="font-semibold mb-4">{formData.email}</p>
                                </div>

                                {errors.otp && (
                                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                                        {errors.otp}
                                    </div>
                                )}

                                {errors.resend && (
                                    <div className={`mb-4 p-3 border rounded text-sm ${
                                        errors.resend.includes('sent') 
                                            ? 'bg-green-100 border-green-400 text-green-700'
                                            : 'bg-red-100 border-red-400 text-red-700'
                                    }`}>
                                        {errors.resend}
                                    </div>
                                )}

                                <div className="mb-6">
                                    <label htmlFor="otp" className="block mb-2 text-lg sm:text-xl text-center">
                                        Enter Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        id="otp"
                                        name="otp"
                                        value={otp}
                                        onChange={handleOtpChange}
                                        placeholder="000000"
                                        className="w-full p-4 border-2 text-center text-2xl font-mono tracking-widest"
                                        style={controlStyle}
                                        maxLength="6"
                                        autoComplete="one-time-code"
                                        required
                                    />
                                    <p className="text-xs mt-2 text-center opacity-70">
                                        Enter the 6-digit code from your email
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || otp.length !== 6}
                                    className="w-full p-4 mb-4 flex items-center justify-center gap-2 disabled:opacity-50"
                                    style={controlStyle}
                                >
                                    {isLoading ? (
                                        <span>Verifying...</span>
                                    ) : (
                                        <span>Verify & Continue</span>
                                    )}
                                </button>

                                <div className="text-center">
                                    <p className="text-sm mb-2">Didn't receive the code?</p>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isLoading}
                                        className="text-sm text-[#2a2727] p-2 disabled:opacity-50 bg-amber-50"
                                    >
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <Footer />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col">
                <div className="flex justify-end p-4 gap-2">
                    <button
                        aria-label="Home"
                        className="ml-3 p-2"
                        onClick={() => {
                            triggerTransition(() => {
                                navigate('/');
                            });
                        }}
                    >
                        <img
                            src="logout.svg"
                            alt=""
                        />
                    </button>
                    <DarkModeToggle className='' />
                </div>
                <div className="flex-1 flex items-center justify-center font-i px-4">
                    <div className="w-full max-w-sm sm:max-w-md">
                        <form onSubmit={handleSignupSubmit} className="p-6 sm:p-10" style={controlStyle}>
                            <h1 className="text-3xl sm:text-5xl mb-6 sm:mb-8 text-center">Sign Up</h1>

                            {errors.submit && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {errors.submit}
                                </div>
                            )}

                            <div className="mb-4">
                                <label htmlFor="username" className="block mb-2 text-lg sm:text-xl">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Choose a username"
                                    className="w-full p-3 border-2 text-base"
                                    style={controlStyle}
                                    required
                                />
                                {errors.username && (
                                    <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                                )}
                            </div>

                            <div className="mb-4">
                                <label htmlFor="email" className="block mb-2 text-lg sm:text-xl">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    className="w-full p-3 border-2 text-base"
                                    style={controlStyle}
                                    required
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                                )}
                            </div>

                            <div className="mb-4">
                                <label htmlFor="password" className="block mb-2 text-lg sm:text-xl">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    className="w-full p-3 border-2 text-base"
                                    style={controlStyle}
                                    required
                                />
                                {errors.password && (
                                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                                )}
                            </div>

                            <div className="mb-6">
                                <label htmlFor="confirmPassword" className="block mb-2 text-lg sm:text-xl">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    className="w-full p-3 border-2 text-base"
                                    style={controlStyle}
                                    required
                                />
                                {errors.confirmPassword && (
                                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full p-4 mb-4 flex items-center justify-center gap-2 disabled:opacity-50"
                                style={controlStyle}
                            >
                                {isLoading ? (
                                    <span>Creating account...</span>
                                ) : (
                                    <span>Sign Up</span>
                                )}
                            </button>

                            <div className="text-center">
                                <p className="mb-2">Already have an account?</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        triggerTransition(() => {
                                            navigate('/login');
                                        });
                                    }}
                                    className="inline-flex items-center gap-2 p-1 sm:p-2 bg-transparent border-none cursor-pointer"
                                    style={controlStyle}
                                >
                                    <span className='text-sm sm:text-md'>Sign In</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <Footer />
            </div>
        </PageTransition>
    );
};

export default Signup;
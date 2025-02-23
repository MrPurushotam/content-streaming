import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecoilRefresher_UNSTABLE, useSetRecoilState } from 'recoil';
import { fetchUserDetailsSelector } from '@/store/selectors';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import useLoggedinUser from '@/hooks/custom-hooks/useLoggedinUser';
import Spinner from '@/components/spinner';
import { isAdminAtom, isLoggedInAtom, userAtom } from '@/store/atoms';
import Seo from "@/components/seo/seo";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullname, setFullname] = useState('');
    const [role, setRole] = useState('user');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);


    const { toast } = useToast();
    const router = useNavigate();

    const setAdmin = useSetRecoilState(isAdminAtom);
    const setUserLoggedIn = useSetRecoilState(isLoggedInAtom);
    const setUser = useSetRecoilState(userAtom);
    const resetFetchUserAtom = useRecoilRefresher_UNSTABLE(fetchUserDetailsSelector);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string): boolean => {
        return password.length >= 8;
    };

    const checkFormValidity = () => {
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);
        const isConfirmPasswordValid = isLogin || password === confirmPassword;
        setIsFormValid(isEmailValid && isPasswordValid && isConfirmPasswordValid);
    };

    useEffect(() => {
        checkFormValidity();
    }, [isLogin, email, password, confirmPassword]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setEmailError('');
        setPasswordError('');
        setIsLoading(true); // Set loading state to true

        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address');
            setIsLoading(false); // Set loading state to false
            return;
        }

        if (!isLogin && !validatePassword(password)) {
            setPasswordError('Password must be at least 8 characters long');
            setIsLoading(false); // Set loading state to false
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false); // Set loading state to false
            return;
        }

        try {
            const response = await api.post(`/user/${isLogin ? 'login' : 'signup'}`, JSON.stringify({
                email,
                password,
                ...(isLogin ? {} : { fullname, role, username })
            }))
            console.log(response.data);
            if (!response.data.success) {
                setError(response.data.error);
                setIsLoading(false); // Set loading state to false
                return;
            }

            if (response.data.approved === false) {
                if (!isLogin) {
                    toast({ title: "Info", description: response.data.message })
                    setIsLogin(true);
                    setIsLoading(false); // Set loading state to false
                    return;
                }
                setError(response.data.message);
                toast({ title: "Info", description: response.data.message });
                setIsLoading(false); // Set loading state to false
                return;
            }

            if (isLogin && response.data.user.role === "user" || isLogin && response.data.approved && response.data.user.role === "admin") {
                window.localStorage.setItem("token", response.data.token);
                if (response.data?.adminToken) {
                    window.localStorage.setItem("adminToken", response.data.adminToken);
                }
                setUser(response.data.user);
                setAdmin(true);
                setUserLoggedIn(true);
            }
            resetFetchUserAtom();
            router("/");
            toast({ title: "Logged In.", description: "You are logged in." });

        } catch (error: any) {
            console.log("Error: ", error.message);
            toast({ title: "Error occurred.", description: error.message });
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false); // Set loading state to false
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setFullname('');
            setRole('user');
            setUsername('');
        }
    };

    return (
        <>
            <Seo
                title={isLogin ? "Login" : "Sign Up"}
                description={isLogin ? "Login to your account" : "Create a new account"}
                keywords="login, signup, stream,video,watch,purushotam,purushotam jeswani,stream application"
                name="Stream by Purushotam"
                type="website"
                address={"/login"}
            />
            <div className="flex items-center justify-center min-h-screen bg-neutral-700/70">
                <Card className="w-[400px] shadow-md shadow-blue-700" autoSave={'true'}>
                    <CardHeader className='items-center flex justify-center'>
                        <CardTitle className='text-2xl font-bold text-blue-700'>{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
                        <CardDescription className='text-lg font-semibold text-gray-700'>
                            {isLogin ? 'Enter your credentials to login' : 'Create a new account'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4" autoSave="true">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex justify-between items-center text-lg font-semibold pl-1">
                                    Email
                                    <div className="relative ml-1 group">
                                        <Info className="w-4 h-4 text-gray-500" />
                                        <span className="absolute left-full ml-2 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                            {validateEmail(email) ? 'Email is valid' : 'Please enter a valid email address'}
                                        </span>
                                    </div>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        checkFormValidity();
                                    }}
                                    required
                                />
                                {emailError && <i className="text-red-500 text-sm">{emailError}</i>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="flex justify-between items-center text-lg font-semibold pl-1">
                                    Password
                                    <div className="relative ml-1 group">
                                        <Info className="w-4 h-4 text-gray-500" />
                                        <span className="absolute left-full ml-2 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                            {validatePassword(password) ? 'Password is valid' : 'Password must be at least 8 characters long'}
                                        </span>
                                    </div>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            checkFormValidity();
                                        }}
                                        placeholder='********'
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                                        </button>
                                    </div>
                                </div>
                                {passwordError && <i className="text-red-500 text-sm">{passwordError}</i>}
                            </div>
                            {!isLogin && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className='flex justify-between items-center text-lg font-semibold pl-1'>Confirm Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                checkFormValidity();
                                            }}
                                            placeholder='********'
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fullname" className='flex justify-between items-center text-lg font-semibold pl-1'>Full Name</Label>
                                        <Input
                                            id="fullname"
                                            type="text"
                                            value={fullname}
                                            onChange={(e) => setFullname(e.target.value)}
                                            placeholder='John Doe'
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className='flex justify-between items-center text-lg font-semibold pl-1'>
                                            Role
                                            <div className="relative ml-1 group">
                                                <Info className="w-4 h-4 text-gray-500" />
                                                <span className="absolute left-full ml-2 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                                    Select either 'admin' or 'user'
                                                </span>
                                            </div>
                                        </Label>
                                        <select
                                            id="role"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="w-full p-2 border rounded"
                                            required
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="username" className='flex justify-between items-center text-lg font-semibold pl-1'>
                                            Username
                                            <div className="relative ml-1 group">
                                                <Info className="w-4 h-4 text-gray-500" />
                                                <span className="absolute left-full ml-2 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                                    Username must be between 7 and 14 characters and can include letters and digits
                                                </span>
                                            </div>
                                        </Label>
                                        <Input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder='johndoe123'
                                            required
                                        />
                                    </div>
                                </>
                            )}
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <Button type="submit" className="w-full" disabled={!isFormValid || isLoading}>
                                {isLoading ? <Spinner /> : (isLogin ? 'Login' : 'Sign Up')}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className='flex justify-center space-x-0 w-full'>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <Button
                            variant="link"
                            className="inline"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            <span className='font-semibold text-blue-700 text-medium hover:underline'>{isLogin ? "Sign Up" : "Login"}</span>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}


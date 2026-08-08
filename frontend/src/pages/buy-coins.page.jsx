import { useContext, useState, useEffect } from "react";
import { usercontext } from "../App";
import { storeInsession } from "../common/session";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { useSearchParams, useNavigate } from "react-router-dom";

const BuyCoinsPage = () => {
    const { userauth: { access_token }, setuserauth, userauth } = useContext(usercontext);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const packages = [
        { id: 1, coins: 50, price: 50 },
        { id: 2, coins: 200, price: 150 },
        { id: 3, coins: 500, price: 300 },
    ];

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        const canceled = searchParams.get('canceled');

        if (sessionId && access_token) {
            verifyStripePayment(sessionId);
        } else if (canceled) {
            toast.error("Payment was canceled");
            navigate('/buy-coins', { replace: true });
        }
    }, [searchParams, access_token]);

    const verifyStripePayment = async (sessionId) => {
        let loadingToast = toast.loading("Verifying payment...");
        try {
            const { data } = await axios.post(
                import.meta.env.VITE_SERVER_DOMAIN + "/api/payment/verify-session",
                { sessionId },
                { headers: { 'Authorization': `Bearer ${access_token}` } }
            );
            toast.dismiss(loadingToast);
            toast.success(`Payment verified successfully!`);
            const updatedAuth = { ...userauth, coins: data.coins };
            setuserauth(updatedAuth);
            storeInsession("user", JSON.stringify(updatedAuth));
            navigate('/buy-coins', { replace: true });
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.error || "Payment verification failed");
            navigate('/buy-coins', { replace: true });
        }
    };

    const handleBuyCoins = async (pkg) => {
        if (!access_token) return toast.error("Please login first");

        setLoading(true);
        try {
            
            const { data } = await axios.post(
                import.meta.env.VITE_SERVER_DOMAIN + "/api/payment/create-checkout-session",
                { amount: pkg.price, coins: pkg.coins },
                { headers: { 'Authorization': `Bearer ${access_token}` } }
            );

            window.location.href = data.url;
        } catch (err) {
            toast.error("Failed to initiate payment");
            console.log(err);
            setLoading(false);
        }
    };

    return (
        <section className="h-cover flex justify-center items-center">
            <Toaster />
            <div className="w-full max-w-[800px] flex flex-col items-center">
                <h1 className="text-4xl font-medium mb-2">Buy AI Coins</h1>
                <p className="text-dark-grey text-xl mb-12">Fuel your creativity with AI-powered tools.</p>
                
                <div className="flex gap-8 flex-wrap justify-center w-full">
                    {packages.map((pkg, i) => (
                        <div key={i} className="flex flex-col items-center p-8 bg-grey rounded-2xl border border-transparent hover:border-black transition-all">
                            <h2 className="text-3xl font-bold mb-2">🪙 {pkg.coins}</h2>
                            <p className="text-dark-grey mb-8">AI Coins</p>
                            <h3 className="text-4xl font-medium mb-6">₹{pkg.price}</h3>
                            <button 
                                disabled={loading}
                                onClick={() => handleBuyCoins(pkg)} 
                                className="btn-dark px-10 py-3 rounded-full">
                                {loading ? "Loading..." : "Purchase"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BuyCoinsPage;

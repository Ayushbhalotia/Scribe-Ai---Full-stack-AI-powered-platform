import React, { useContext, useRef, useState, useEffect } from 'react'
import InputBox from '../components/input.component';
import googleIcon from "../imgs/google.png"
import { Link, Navigate } from 'react-router-dom';
import AnimationWrapper from '../common/page-animation';
import { Toaster,toast } from 'react-hot-toast'
import axios from 'axios';
import { storeInsession } from '../common/session';
import { usercontext } from '../App';
import { authWithGoogle } from '../common/firebase';





const UserAuthForm = ({type}) => {
    let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; 
    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; 
    

let {userauth:{access_token},setuserauth} = useContext(usercontext)


const userAuththroughserver = (serverRoute,formData)=>{
axios.post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute,
    formData)
    .then(({data})=>{
        storeInsession("user",JSON.stringify(data))
        
        

       setuserauth(data)
    })
    .catch(({response})=>{
        toast.error(response.data.error)
    })

}






    const [otpSent, setOtpSent] = useState(false);
    const [timer, setTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

    useEffect(() => {
        let interval;
        if (otpSent && timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [otpSent, timer]);

    const handleResendOtp = (e) => {
        e.preventDefault();
        if (!canResend) return;
        
        let form = new FormData(document.getElementById('formElement'));
        let email = form.get('email');
        if (!email) return toast.error("Email is missing");

        let routeType = forgotPasswordMode ? "forgot-password" : "sign-up";
        let loadingToast = toast.loading("Resending OTP...");
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/send-otp", { email, type: routeType })
            .then(() => {
                toast.dismiss(loadingToast);
                toast.success("OTP resent successfully!");
                setTimer(120);
                setCanResend(false);
            })
            .catch(err => {
                toast.dismiss(loadingToast);
                toast.error(err.response?.data?.error || "Failed to resend OTP");
            });
    };

    const handlesubmit=(e) =>{
        e.preventDefault();
        let serverRoute = type == "sign-in"? "/signin" : "/signup";

let form = new FormData(formElement);



let formData = {};
for(let [key,value] of form.entries()){
    formData[key] = value;
}


let {fullname,email,password} = formData;
if(fullname){
if(fullname.length<3){
    return toast.error( "fullname must be atleast 3 letters long")

   }}
if(!email.length){
    return toast.error("enter email")
    

    }
    
    if(!emailRegex.test(email)){
        
        
        return toast.error( "email is invalid")
    }
    if(!passwordRegex.test(password) && !forgotPasswordMode){
    return toast.error( "password should be 6 to 20 characters long with a numeric,1 lowercase and uppercase letters")
    }

    if (forgotPasswordMode) {
        if (!otpSent) {
            let loadingToast = toast.loading("Sending OTP to email...");
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/send-otp", { email, type: "forgot-password" })
                .then(() => {
                    toast.dismiss(loadingToast);
                    toast.success("OTP sent successfully to " + email);
                    setOtpSent(true);
                    setTimer(120);
                    setCanResend(false);
                })
                .catch(err => {
                    toast.dismiss(loadingToast);
                    toast.error(err.response?.data?.error || "Failed to send OTP");
                });
            return;
        } else {
            if (!formData.otp || formData.otp.length !== 6) return toast.error("Please enter a valid 6-digit OTP");
            
            let newPassword = formData.newPassword;
            if(!passwordRegex.test(newPassword)){
                return toast.error( "password should be 6 to 20 characters long with a numeric, 1 lowercase and uppercase letters");
            }

            let loadingToast = toast.loading("Resetting password...");
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/reset-password", { email, otp: formData.otp, newPassword })
                .then(() => {
                    toast.dismiss(loadingToast);
                    toast.success("Password reset successfully! You can now log in.");
                    setForgotPasswordMode(false);
                    setOtpSent(false);
                })
                .catch(err => {
                    toast.dismiss(loadingToast);
                    toast.error(err.response?.data?.error || "Failed to reset password");
                });
            return;
        }
    }

    if (type === "sign-up") {
        if (!otpSent) {
            let loadingToast = toast.loading("Sending OTP to email...");
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/send-otp", { email, type: "sign-up" })
                .then(() => {
                    toast.dismiss(loadingToast);
                    toast.success("OTP sent successfully to " + email);
                    setOtpSent(true);
                    setTimer(120);
                    setCanResend(false);
                })
                .catch(err => {
                    toast.dismiss(loadingToast);
                    toast.error(err.response?.data?.error || "Failed to send OTP");
                });
            return; 
        } else {
            if (!formData.otp || formData.otp.length !== 6) return toast.error("Please enter a valid 6-digit OTP");
            userAuththroughserver(serverRoute, formData);
        }
    } else {
        userAuththroughserver(serverRoute, formData);
    }
    }

const handleGoogleAuth = (e) =>{
    e.preventDefault();
    authWithGoogle().then(user =>{
        let serverRoute = "/google-auth"
        let formdata ={
            access_token : user.accessToken
            
            

        }
        userAuththroughserver(serverRoute,formdata)
    }).catch(err=>{
        toast.error('trouble with login through google');
        return console.log(err)
    })
}

  return (
    

    
access_token ?
<Navigate to="/" />
:
    <AnimationWrapper keyValue={type}>

    <section className="h-cover flex items-center justify-center">
        <Toaster />
<form id='formElement' className='w-[80%] max-w-[400px]'>
    <h1 className='text-4xl font-gelasio capitalize text-center mb-24'>
        {forgotPasswordMode ? "Reset Password" : (type == "sign-in" ? "welcome back" : "join us today")}
    </h1>

{
    type != "sign-in" && !forgotPasswordMode ?
    <InputBox 
    name="fullname"
    type="text"
    placeholder="fullname"  
    icon ="fi-rr-user"
    />
  : ""
}
<InputBox 
    name="email"
    type="email"
    placeholder="email"  
    icon ="fi-rr-envelope"
    />
{
    !forgotPasswordMode && (
        <InputBox 
            name="password"
            type="password"
            placeholder="password"  
            icon ="fi-rr-key"
        />
    )
}

{
    type === "sign-in" && !forgotPasswordMode && (
        <div className="flex justify-end mt-2">
            <button type="button" onClick={() => setForgotPasswordMode(true)} className="text-dark-grey text-sm hover:text-black underline cursor-pointer">
                Forgot Password?
            </button>
        </div>
    )
}

{
    (type === "sign-up" || forgotPasswordMode) && otpSent ? (
        <div className="flex flex-col gap-2 mt-4">
            <InputBox 
                name="otp"
                type="text"
                placeholder="Enter 6-digit OTP"  
                icon ="fi-rr-lock"
            />
            {forgotPasswordMode && (
                <InputBox 
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"  
                    icon ="fi-rr-key"
                />
            )}
            <div className="flex justify-between items-center text-sm px-2 mt-1">
                <p className="text-dark-grey">Time remaining: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>
                <button type="button" onClick={handleResendOtp} disabled={!canResend} className={canResend ? "text-black underline cursor-pointer" : "text-grey cursor-not-allowed"}>
                    Resend OTP
                </button>
            </div>
        </div>
    ) : ""
}

<button
className='btn-dark center mt-14'
type='submit'
onClick={handlesubmit}
>
    {forgotPasswordMode ? (otpSent ? "Reset Password" : "Send OTP") : type.replace("-"," ")}
</button>

{
    forgotPasswordMode && (
        <button type="button" onClick={() => {setForgotPasswordMode(false); setOtpSent(false);}} className="text-dark-grey text-sm hover:text-black underline cursor-pointer center mt-4 flex items-center justify-center w-full">
            Back to Sign In
        </button>
    )
}

<div className='relative w-full flex items-center gap-2 my-10 opacity-10 uppercase text-black font-bold'>
    <hr className='w-1/2 border-black'/>
<p>or</p>
    <hr className='w-1/2 border-black'/>
    </div>
<button className='btn-dark flex items-center justify-center gap-4 w-[90%] center'
onClick={handleGoogleAuth}
>
    <img src={googleIcon} alt="" className='w-5'/>
    continue with google
</button>

{
    type == "sign-in" ? 
<p className='mt-6 text-dark-grey text-xl text-center '>
    dont have an account ? 
    <Link to="/signup" className="underline text-black text-xl ml-1">
    join us today
    </Link>
</p>
:
<p className='mt-6 text-dark-grey text-xl text-center '>
    Already a member ? 
    <Link to="/signin" className="underline text-black text-xl ml-1">
    sign in here.
    </Link>
</p>
}


</form>

    </section>
    </AnimationWrapper>
  )
}

export default UserAuthForm;
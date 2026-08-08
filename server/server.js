import express from 'express'
import mongoose from 'mongoose'
import Stripe from 'stripe'
import { GoogleGenerativeAI } from '@google/generative-ai'
import 'dotenv/config'
import bcrypt from "bcrypt"
import User from "./Schema/User.js"
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken';
import admin from "firebase-admin";
import Blog from './Schema/Blog.js'
const { credential } = admin;
import fs from "fs";
import cors from "cors";
let serviceAccountkey;
try {
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    serviceAccountkey = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
  } else {
    serviceAccountkey = JSON.parse(
      fs.readFileSync("./react-js-blog-website-bf9c9-firebase-adminsdk-ezxo0-ae42ca2537.json", "utf8")
    );
  }
} catch (err) {
  console.error("Failed to load Firebase credentials. Make sure FIREBASE_ADMIN_CREDENTIALS is set in production or the json file exists locally.");
}
import {getAuth} from "firebase-admin/auth"
import Cloudinary from "cloudinary";
const { v2: cloudinary } = Cloudinary;

import multer from "multer";

import Notification from "./Schema/Notification.js"
import Comment from "./Schema/Comment.js";
import Otp from "./Schema/Otp.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const storage = multer.memoryStorage(); 
const upload = multer({ storage }); 

const server = express();
let PORT=3000;

admin.initializeApp({
credential : admin.credential.cert(serviceAccountkey)
})

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; 
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; 

server.use(express.json());

server.use(cors({
  origin: ["https://ayush-blog-mern.netlify.app", "http://localhost:5173"],  
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

mongoose.connect(process.env.DB_LOCATION,{
    autoIndex:true
})

const cloudinaryConnect = () => {
    try{
            cloudinary.config({
                cloud_name:process.env.CLOUD_NAME,
                api_key: process.env.API_KEY,
                api_secret: process.env.API_SECRET,
            })

    }
    catch(error) {
        console.log(error);
    }
}

cloudinaryConnect();

const verifyJWT = (req,res,next) =>{

const authheader = req.headers['authorization'];
console.log(authheader)
const token = authheader && authheader.split(" ")[1];

if(token==null){
return res.status(401).json({error : "no access token"})
}
jwt.verify(token,process.env.SECRET_ACCESS_KEY,(err,user)=>{
    if(err){
        return res.status(403).json({error:"access token is invalid"})
    }

    req.user = user.id;
    next()
})
}

const formatdatatosend=(user)=>{
    const access_token = jwt.sign({id:user._id},process.env.SECRET_ACCESS_KEY)

    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname,
        coins: user.account_info ? user.account_info.coins : 50
    }
}

const generateusername = async(email) =>{
let username = email.split("@")[0];

let isusernamenotunique = await User.exists({"personal_info.username" : username}).then((result) => result)
isusernamenotunique ? username +=nanoid().substring(0,5): "";
return username;
// yaha se username wala thik kar diya and ab maanlo same email hua th aage niche handle kar liya hai email already exist 

}

// Route to send OTP
server.post("/send-otp", async (req, res) => {
    const { email, type } = req.body;
    
    if(!email.length) {
        return res.status(403).json({"error": "enter email"});
    }
    if(!emailRegex.test(email)) {
        return res.status(403).json({"error": "email is invalid"});
    }

    try {
        
        const existingUser = await User.findOne({ "personal_info.email": email });
        
        if (type === "forgot-password") {
            if (!existingUser) {
                return res.status(403).json({ error: "Email not found. Please sign up first." });
            }
        } else {
            
            if (existingUser) {
                return res.status(403).json({ error: "Email already exists" });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.findOneAndUpdate(
            { email },
            { otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        let subject = type === "forgot-password" ? 'Reset Your Password OTP' : 'Your Sign Up OTP';
        let text = type === "forgot-password" 
            ? `Your OTP to reset your password is: ${otp}. It is valid for 2 minutes.`
            : `Your OTP for sign up is: ${otp}. It is valid for 2 minutes.`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            text: text
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: "OTP sent successfully" });

    } catch (error) {
        console.error("Error sending OTP:", error);
        return res.status(500).json({ error: "Failed to send OTP" });
    }
});

server.post("/reset-password", async (req, res) => {
    let { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
        return res.status(403).json({"error": "Missing required fields"});
    }

    if(!passwordRegex.test(newPassword)){
        return res.status(403).json({"error" : "password should be 6 to 20 characters long with a numeric, 1 lowercase and uppercase letters"})
    }

    try {
        const validOtp = await Otp.findOne({ email, otp });
        if (!validOtp) {
            return res.status(403).json({"error": "Invalid or expired OTP"});
        }

        await Otp.deleteOne({ email });

        bcrypt.hash(newPassword, 10, async (err, hashed_password) => {
            if (err) {
                return res.status(500).json({ error: "Some error occurred while hashing password" });
            }

            await User.findOneAndUpdate(
                { "personal_info.email": email },
                { "personal_info.password": hashed_password }
            );

            return res.status(200).json({ success: true, message: "Password reset successfully" });
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

server.post("/signup",(req,res)=>{
   let {fullname,email,password} = req.body;

   if(fullname.length<3){
    return res.status(403).json({"error" : "fullname must be atleast 3 letters long"})

   }

if(!email.length){
return res.status(403).json({"error":"enter email"})
}

if(!emailRegex.test(email)){
    return res.status(403).json({"error" : "email is invalid"})
}
if(!passwordRegex.test(password)){
return res.status(403).json({"error" : "password should be 6 to 20 characters long with a numeric,1 lowercase and uppercase letters"})
}

bcrypt.hash(password,10,async (err,hashed_password)=>{
    let username = await generateusername(email);

    let user = new User({
        personal_info:{fullname,email,password:hashed_password,username}

    })
    user.save().then((u)=>{

        return res.status(200).json(formatdatatosend(u))

    })
    .catch(err=>{
        if(err.code == 11000){
            return res.status(500).json("email alrady exist")
        }

        return res.status(500).json({"error" : err.message})

    })

})

})

server.post("/signin",(req,res)=>{

    let {email,password} =req.body;
    
    User.findOne({"personal_info.email":email}).then((user)=>{
        if(!user){
            return res.status(403).json({"error":"email not found"})
        }

        if(!user.google_auth){
            bcrypt.compare(password,user.personal_info.password,(err,result)=>{

                    if(err){
                        return res.status(403).json({"error":"error ocurred while login please try again"})
                    
                    }
                    if(!result){
                    return res.status(403).json({"error":"incorrect password"})
                    }
                    else{
                        return res.status(200).json(formatdatatosend(user))
                    }
                    })
                    
        }else{
            return res.status(403).json({"error" :"account was creaTED USING GOOGLE"})
        }

    })
    .catch(err=>{
        console.log(err.message);
        return res.status(500).json({"error":err.message})
    })

})

server.post("/google-auth",async(req,res)=>{
let {access_token} =req.body;

getAuth()
.verifyIdToken(access_token)

.then(async (decodeUser)=>{
let {email,name,picture } =decodeUser;
picture = picture.replace("s96-c","s384-c")

let user = await User.findOne({"personal_info.email":email}).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u)=>{
    return u || null
})
.catch(err=>{
    return res.status(500).json({"error":err.message})
})

if(user){
    if(!user.google_auth){
        return res.status(403).json({"error":"this email was signed up without google. please login with password to access the account"})

    }
}

else{
    let { otp } = req.body;
    if (!otp) {
        return res.status(403).json({"error": "OTP is required for sign up"});
    }

    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
        return res.status(403).json({"error": "Invalid or expired OTP"});
    }

    await Otp.deleteOne({ email });

    let username = await generateusername(email);
    user = new User({
        personal_info : {fullname:name,email,username},
        google_auth:true
    })
    await user.save().then((u)=>{
user=u;
    })
    .catch(err=>{
        return res.status(500).json({"error":err.message})
    })
}

return res.status(200).json(formatdatatosend(user))

})
.catch(err=>{
    return res.status(500).json({"error":"failed"})
})
})

import fileUpload from "express-fileupload";

server.use(fileUpload());

server.post("/get-upload", async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageFile = req.files.image;

    const tempDir = './uploads';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const tempPath = `${tempDir}/${imageFile.name}`;
    await imageFile.mv(tempPath);

    const result = await cloudinary.uploader.upload(tempPath, {
      folder: "codehelp",
    });

    fs.unlinkSync(tempPath);

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

server.post("/change-password",verifyJWT,(req,res)=>{
    let {currentPassword,newPassword } = req.body;
    
if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
    return res.status(403).json({error : "password should be 6 to 20 characters long with a numeric,1 lowercase and uppercase letters"});
    
}

User.findOne({_id:req.user})

.then((user)=>{
    if(user.google_auth){
        return res.status(403).json({error : "you can't change account's password because you logged in through google"})
   }

bcrypt.compare(currentPassword,user.personal_info.password,(err,result)=>{
    if(err){
        return res.status(500).json({error:"some error occured while changing the password,please try again later"})
    }

if(!result){
    return res.status(403).json({error:"Incorrect current password"})
}

bcrypt.hash(newPassword,10,(err,hashed_password)=>{
    User.findOneAndUpdate({_id:req.user},{"personal_info.password":hashed_password})
    .then((u)=>{
        return res.status(200).json({status:'password changed'})
    })
    .catch(err=>{
        return res.status(500).json({error:'some error occured while saving new password,please try again later'})
    })
})

})

})
.catch(err=>{
    console.log(err);
    res.status(500).json({error:"User not found"})
})
})

server.post("/update-profile-img",verifyJWT,(req,res)=>{
    let {url} = req.body;

    User.findOneAndUpdate({_id:req.user},{"personal_info.profile_img":url})
    .then(()=>{
        return res.status(200).json({profile_img:url})
    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })
})

server.post("/update-profile",verifyJWT,(req,res)=>{
let {username,bio,social_links} = req.body;
let bioLimit = 150;
if(username.length < 3){
    return res.status(403).json({error:"username should be at least 3 letters long"})

}

if(bio.length > bioLimit){
    return res.status(403).json({error:`Bio should not be more than ${bioLimit} characters`});

}

let socialLinksArr = Object.keys(social_links);

try{
for(let i=0;i<socialLinksArr.length;i++){
    if(social_links[socialLinksArr[i]].length){
        
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname;
        
        if(!hostname.includes(`${socialLinksArr[i]}.com`) && socialLinksArr[i] !='website'){
            
            return res.status(403).json({error:`${socialLinksArr[i]} link is invalid. you must enter a full link`})

        }
    }
}
}
catch(err){
    return res.status(500).json({error:"you mst provide full social links with http(s) included"})
}

let updateObj = {
    "personal_info.username": username,
    "personal_info.bio":bio,
    social_links
}

User.findOneAndUpdate({_id:req.user},updateObj,{
runValidators:true
})
.then(()=>{
    return res.status(200).json({username})
})
.catch(err=>{
    if(err.code==11000){
        
        return res.status(409).json({error:"username is already taken"})
    }
    return res.status(500).json({error:err.message})
})

})

server.post('/latest-blogs', (req, res) => {

let {page} = req.body;

    const maxLimit = 5;

    Blog.find({ draft: false })
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ publishedAt: -1 })
        .select("blog_id title des banner activity tags publishedAt -_id")
        
       .skip((page-1)* maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post("/all-latest-blogs-count",(req,res)=>{
    Blog.countDocuments({draft : false})
    .then(count =>{
        return res.status(200).json({totalDocs : count})
    })
    .catch(err =>{
        console.log(err.message);
        return res.status(500).json({error : err.message})
    })
})

server.post("/search-blogs-count",(req,res) =>{
    let {tag,author,query} = req.body;

    let findQuery;
if(tag){
    findQuery =  {tags : tag,draft:false};
}else if(query){
    findQuery = {draft:false , title : new RegExp(query,'i')}
}
else if(author) {
    findQuery = {author,draft:false}
}
    Blog.countDocuments(findQuery)
    .then(count =>{
        return res.status(200).json({totalDocs : count})
    })
    .catch(err =>{
        console.log(err.message);
        return res.status(500).json({error:err.message})
    })
})

server.post("/search-users" , (req,res)=>{
    
let {query} = req.body;
User.find({"personal_info.username": new RegExp(query,'i')})
.limit(50)
.select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
.then(users =>{
    return res.status(200).json({users})
})
.catch(err =>{
    return res.status(500).json({error:err.message})
})
})

server.post("/get-profile",(req,res)=>{
    let {username} = req.body;
    User.findOne({"personal_info.username" : username})
    .select("-personal_info.password -google_auth -updatedAt -blogs")

    .then(user =>{
        return res.status(200).json(user)
    })
    .catch(err =>{
        console.log(err);
        return res.status(500).json({erro : err.message})
    })

})

server.get("/trending-blogs" , (req,res) =>{
    Blog.find({draft:false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"activity.total_read" : -1, "activity.total_likes" :-1,"publishedAt" : -1})
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then(blogs =>{
        return res.status(200).json({blogs})
    })

})

server.post("/search-blogs",(req,res)=>{

let {tag,query,author,page,limit,eliminate_blog} = req.body;

let findQuery;

if(tag){
    findQuery =  {tags : tag,draft:false,blog_id:{$ne:eliminate_blog}};

}else if(query){
    findQuery = {draft:false , title : new RegExp(query,'i')}
}

else if(author) {
    findQuery = {author,draft:false}
}

let maxLimit = limit ? limit:2;

Blog.find(findQuery)
 .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ publishedAt: -1 })
        .select("blog_id title des banner activity tags publishedAt -_id")
        
    .skip((page-1)*maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
})

server.post('/create-blog',verifyJWT,(req,res)=>{

let authorId = req.user

let {title,des,banner,tags,content,draft,id} = req.body;

if(!title.length){
    return res.status(403).json({error:"you must provide a title"});

}
if(!draft){

    if(!des.length || des.length > 200){
        return res.status(403).json({error:"you must provide blog description under 200 characters"});
    }

    if(!banner.length){
        return res.status(403).json({error : "you must provide blog banner to publish it"});
    
    }

    if(!content.blocks.length){
        return res.status(403).json({error: "there must be sme blog content to publish it"});
    
    }
    
    if(!tags.length || tags.length > 10){
    return res.status(403).json({error : "provide tags in order to publish the blog , Maximum 10"});
    
    }
    
}

tags = tags.map(tag => tag.toLowerCase());

let blog_id = id || title.replace(/[^a-zA-Z0-9]/g,' ').replace(/\s+/g, "-").trim()  + nanoid();

if(id){
Blog.findOneAndUpdate({blog_id},{title,des,banner,content,tags,draft:draft?draft:false})
.then(()=>{
    return res.status(200).json({id:blog_id});
})
.catch(err=>{
    return res.status(500).json({error:"failed to update total posts number"})
})
}else{

let blog = new Blog({
title,des,banner,content,tags,author : authorId , blog_id,draft: Boolean(draft)
})

blog.save().then(blog=>{
    let incrementVal = draft ? 0: 1;

User.findOneAndUpdate({_id:authorId},{$inc : {"account_info.total_posts" : incrementVal},$push : {"blogs" : blog._id}})
.then(user =>{
    return res.status(200).json({id:blog.blog_id})
})

.catch(err =>{
    return res.status(500).json({error : "failed to update total posts number"})
})

})

.catch(err =>{
    return res.status(500).json({error : err.message})
})

}

})

server.post("/get-blog",(req,res)=>{
    let { blog_id ,draft,mode}= req.body;

let incrementVal = mode!='edit'? 1 : 0 ;

    Blog.findOneAndUpdate({blog_id},{$inc : {"activity.total_reads":incrementVal}})
    .populate("author" , "personal_info.fullname personal_info.username personal_info.profile_img")
    .select("title des content banner activity publishedAt blog_id tags")
    .then(blog=>{
        User.findOneAndUpdate({"personal_info.username":blog.author.personal_info.username} ,{$inc : {"account_info.total_reads":incrementVal}})
        .catch(err=>{
            return res.status(500).json({error:err.message})
        })

        if(blog.draft && !draft){
            return res.status(500).json({error:'you cannot access draft blog'})
        }

        return res.status(200).json({blog});
    })

    .catch(err =>{
return res.status(500).json({error:err.message});
    })
})

server.post("/like-blog",verifyJWT,(req,res)=>{
    let user_id = req.user;
    let { _id,islikedByUser} = req.body;

    let incrementVal = !islikedByUser ? 1 : -1;
    Blog.findOneAndUpdate({_id},{$inc:{"activity.total_likes":incrementVal}})
    .then(blog =>{
if(!islikedByUser){
    
let like = new Notification({
    type:"like",
    blog:_id,
    notification_for:blog.author,
    user:user_id

})

like.save().then(notification =>{
    return res.status(200).json({liked_by_user:true})
})

}else{
    
    Notification.findOneAndDelete({user:user_id,blog:_id,type:"like"})
.then(data =>{
    return res.status(200).json({liked_by_user:false})
})
.catch(err=>{
    return res.status(500).json({error:err.message})
})
}
    })
})

server.post("/isliked-by-user",verifyJWT,(req,res)=>{

    let user_id = req.user;
    let{_id} =req.body;

Notification.exists({user:user_id,type:"like",blog:_id})

.then(result =>{
    return res.status(200).json({result}) 

})
.catch(err =>{
    return res.status(500).json({error:err.message})
})

})

server.post("/add-comment",verifyJWT,(req,res)=>{
    let user_id = req.user;
    let {_id,comment,blog_author,replying_to,notification_id} = req.body;
    if(!comment.length){
        return res.status(403).json({error:'writing something to leave a comment...'})

    }

    let commentObj ={
        blog_id : _id,blog_author,comment,commented_by:user_id 
    }

    if(replying_to){
        commentObj.parent = replying_to;
        commentObj.isReply=true;
    }

   new Comment(commentObj).save().then(async commentFile=>{

let {comment,commentedAt,children } =commentFile;

Blog.findOneAndUpdate({_id},{$push:{"comments": commentFile._id},$inc:{"activity.total_comments":1,"activity.total_parent_comments" :replying_to? 0:1},})

.then(blog=>{
    console.log('New comment Created')
});

let notificationObj ={
    type : replying_to?"reply":"comment",
    blog:_id,
    notification_for:blog_author,
    user:user_id,
    comment:commentFile._id
}

if(replying_to){
    notificationObj.replied_on_comment = replying_to;

    await Comment.findOneAndUpdate({_id:replying_to},{$push:{children:commentFile._id}})
    
    .then(replyingToCommentDoc =>{notificationObj.notification_for= replyingToCommentDoc.commented_by})

if(notification_id){
    Notification.findOneAndUpdate({_id:notification_id},{reply:commentFile._id})
    
    .then(notification=>console.log('notification updated'))
}

}

new Notification(notificationObj).save().then(notification=>console.log('new notification created'));

return res.status(200).json({
    comment,commentedAt,_id:commentFile._id,user_id,children
})

    })

})

server.post("/get-blog-comments",(req,res)=>{
    let {blog_id,skip} = req.body;
    let maxLimit = 5;
    Comment.find({blog_id,isReply:false})
    .populate("commented_by","personal_info.username personal_info.fullname personal_info.profile_img")
    .skip(skip)
    .limit(maxLimit)
    .sort({
        'commentedAt' : -1
    })
    .then(comment =>{
        return res.status(200).json(comment);

    })
    .catch(err=>{
        console.log(err.message);
        return res.status(500).json({error:err.message})
    })
})

server.post("/get-replies",(req,res)=>{
    let {_id,skip} = req.body;
    let maxLimit = 5;
    Comment.findOne({_id})
    .populate({
        path:"children",
        options:{
limit:maxLimit,
skip:skip,
sort:{'commentedAt' : -1}
        },
        populate:{
path:'commented_by',
select:"personal_info.profile_img personal_info.fullname perona_info.username"
        },
        select:"-blog_id -updatedAt"
    })
    .select("children")
    .then(doc=>{
        return res.status(200).json({replies:doc.children})
    })
    .catch(err =>{
        return res.status(500).json({error:err.message})
    })
})

const deleteComments = (_id) =>{
    Comment.findOneAndDelete({_id})
    .then(comment=>{
if(comment.parent){
    
   Comment.findOneAndUpdate({_id:comment.parent},{$pull:{children:_id}}) 

.then(data => console.log('comment delete from parent'))
.catch(err =>console.log(err));
}
Notification.findOneAndDelete({comment:_id}).then(notification =>console.log('comment notification deleted'))
Notification.findOneAndUpdate({reply:_id},{$unset:{reply:1}}).then(notification =>console.log('reply notification deleted'))

Blog.findOneAndUpdate({_id:comment.blog_id},{$pull:{comments:_id},$inc:{"activity.total_comments":-1},"activity.total_parent_comments":comment.parent?0:-1})
.then(blog=>{
    if(comment.children.length){
        
        comment.children.map(replies=>{
            deleteComments(replies)
        })
    }
})
    })
    .catch(err=>{
        console.log(err.message);
    })
}

server.post("/delete-comment",verifyJWT,(req,res)=>{
    let user_id = req.user;
    let {_id} = req.body;
    
    Comment.findOne({_id})
    .then(comment=>{
        if(user_id == comment.commented_by || user_id == comment.blog_author){
deleteComments(_id);

return res.status(200).json({status:'done'});
        }else{
            return res.status(403).json({error:"you can not delete this comment"})
        }
    })
})

server.get("/new-notification",verifyJWT,(req,res)=>{
    let user_id = req.user;

    Notification.exists({notification_for:user_id,seen:false,user:{$ne:user_id}})

   .then(result=>{
    if(result){
        return res.status(200).json({new_notification_available:true})
    }
    else{
        return res.status(200).json({new_notification_available:false})
    }

   })
   .catch(err=>{
    console.log(err.message);
    return res.status(500).json({error:err.message})

   })
})

server.post("/notifications",verifyJWT,(req,res)=>{
    let user_id=req.user;
    let {page, filter,deletedDocCount} = req.body;
    let maxLimit =10;

    let findQuery = {notification_for:user_id,user:{$ne:user_id}};

    let skipDocs = (page-1) * maxLimit;
if(filter != 'all'){
    findQuery.type=filter;
}

if(deletedDocCount){
    skipDocs-=deletedDocCount;
    
}

Notification.find(findQuery)
.skip(skipDocs)
.limit(maxLimit)
.populate("blog","title blog_id")
.populate("user","personal_info.fullname personal_info.username personal_info.profile_img")
.populate("comment","comment")
.populate("replied_on_comment","comment")
.populate("reply","comment")
.sort({createdAt:-1})
.select("createdAt type seen reply")
.then(notifications=>{
    Notification.updateMany(findQuery,{seen:true})
    .skip(skipDocs)
.limit(maxLimit)
.then(()=>{console.log('notification seen')});
    return res.status(200).json({notifications});
})
.catch(err=>{
    console.log(err.message);
    return res.status(500).json({error:err.message});

})

})

server.post("/all-notifications-count",verifyJWT,(req,res)=>{
    let user_id = req.user;

    let {filter} = req.body;
    let findQuery = {notification_for:user_id,user:{$ne:user_id}}

    if(filter != 'all'){
        findQuery.type=filter;

    }
    Notification.countDocuments(findQuery)
    .then(count =>{
        return res.status(200).json({totalDocs:count})

    })
.catch(err=>{
    return res.status(500).json({error:err.message})
})

})

server.post("/user-written-blogs",verifyJWT,(req,res)=>{
    let user_id = req.user;
    let {page,draft,query,deletedDocCount } = req.body;

    let maxLimit =5;
    let skipDocs=(page-1) * maxLimit;

    if(deletedDocCount){
        skipDocs -=deletedDocCount;
    }

    Blog.find({author:user_id,draft,title:new RegExp(query,'i')})
    .skip(skipDocs)
    .limit(maxLimit)
    .sort({publishedAt:-1})
    .select("title banner publishedAt blog_id activity des draft -_id")
.then(blogs=>{
    return res.status(200).json({blogs})

})
.catch(err=>{
    return res.status(500).json({error:err.message});
})
})

server.post("/user-written-blogs-count",verifyJWT,(req,res)=>{
    let user_id=req.user;
    let {draft,query} = req.body;
    Blog.countDocuments({author:user_id,draft,title: new RegExp(query,'i')})
    .then(count=>{
        return res.status(200).json({totalDocs:count})
    })
    .catch(err=>{
        console.log(err.message);
        return res.status(500).json({error:err.message});
    })
})

server.post("/delete-blog",verifyJWT,(req,res) =>{
    let user_id = req.user;
    let {blog_id} = req.body;

Blog.findOneAndDelete({blog_id})
.then(blog=>{
    Notification.deleteMany({blog:blog._id}).then(data=>console.log('notifications deleted'));
    Comment.deleteMany({blog_id:blog._id}).then(data=>console.log('comments deleted'));

const incValue = blog.draft ? 0 : -1;

User.findOneAndUpdate(
  { _id: user_id },
  {
    $pull: { blog: blog._id },
    $inc: { "account_info.total_post": incValue }
  }
)
    .then(user=>console.log('blog deleted'));

    return res.status(200).json({status:'done'});

})
.catch(err=>{
    return res.status(500).json({error:err.message})
})

})

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = ai.getGenerativeModel({ model: "gemini-3.5-flash" });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const checkCoins = (cost) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user);
            if (!user) {
                return res.status(401).json({ error: "User not found." });
            }
            
            let coins = user.account_info?.coins;

            if (coins === undefined || coins < 0) {
                coins = 50;
                await User.findByIdAndUpdate(req.user, { $set: { "account_info.coins": 50 } });
            }
            
            if (coins < cost) {
                return res.status(402).json({ error: "Insufficient coins. Please buy more." });
            }
            
            req.userData = user;
            next();
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    };
};

const deductCoins = async (userId, cost) => {
    const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { "account_info.coins": -cost } }, { new: true });
    return updatedUser.account_info.coins;
};

server.post("/api/ai/summary", verifyJWT, checkCoins(5), async (req, res) => {
    try {
        const { content } = req.body;
        const response = await geminiModel.generateContent(
            `Summarize the following blog post in 3 concise bullet points:\n\n${content}`
        );
        const remainingCoins = await deductCoins(req.user, 5);
        return res.status(200).json({ summary: response.response.text(), remainingCoins });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

server.post("/api/ai/write", verifyJWT, checkCoins(2), async (req, res) => {
    try {
        const { prompt } = req.body;
        const response = await geminiModel.generateContent(
            `You are an expert blog writing assistant. Write a high-quality section based on this prompt:\n\n${prompt}`
        );
        const remainingCoins = await deductCoins(req.user, 2);
        return res.status(200).json({ text: response.response.text(), remainingCoins });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

server.post("/api/ai/chat", verifyJWT, checkCoins(2), async (req, res) => {
    try {
        const { content, message } = req.body;
        const response = await geminiModel.generateContent(
            `Context: You are answering questions about the following blog post:\n"${content}"\n\nQuestion: ${message}\nAnswer only based on the context provided.`
        );
        const remainingCoins = await deductCoins(req.user, 2);
        return res.status(200).json({ reply: response.response.text(), remainingCoins });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

server.post("/api/ai/generate-cover", verifyJWT, checkCoins(10), async (req, res) => {
    try {
        const { title } = req.body;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent("High quality blog cover image for: " + title)}?width=1200&height=630&nologo=true`;
        const remainingCoins = await deductCoins(req.user, 10);
        return res.status(200).json({ url: imageUrl, remainingCoins });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

server.post("/api/payment/create-checkout-session", verifyJWT, async (req, res) => {
    try {
        const { amount, coins } = req.body; 
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'inr',
                    product_data: { name: `Purchase ${coins} AI Coins` },
                    unit_amount: amount * 100, 
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/buy-coins?session_id={CHECKOUT_SESSION_ID}&coins=${coins}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/buy-coins?canceled=true`,
            metadata: { userId: req.user, coins: coins },
        });
        res.status(200).json({ url: session.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.post("/api/payment/verify-session", verifyJWT, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
            const coins = parseInt(session.metadata.coins);
            const updatedUser = await User.findByIdAndUpdate(req.user, { $inc: { "account_info.coins": coins } }, { new: true });
            res.status(200).json({ success: true, coins: updatedUser.account_info.coins });
        } else {
            res.status(400).json({ error: "Payment not completed" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.listen(PORT,()=>{
    console.log('listening on port -> ' + PORT);

})


import axios from "axios";
import { createContext, useEffect, useState, useContext } from "react";
import { usercontext } from "../App";
import toast, { Toaster } from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { getDay } from "../common/date";
import BlogInteraction from "../components/blog-interaction.component";
import { storeInsession } from "../common/session";
import BlogPostCard from "../components/blog-post.component";
import BlogContent from "../components/blog-content.component";
import CommentsContainer, { fetchComments } from "../components/comments.component";

export const blogStructure = {
title:'',
des:'',
content:[],
author:{personal_info:{}},
banner:'',
publishedAt:'',
}

export const BlogContext = createContext({ })

const BlogPage = () =>{

    let { blog_id} = useParams();

    const [blog,setBlog] = useState(blogStructure);
const [loading,setLoading] = useState(true);
const [similarBlogs,setSimilarBlogs] = useState(null);
const [islikedByUser,setLikedByUser] = useState(false);
const [commentsWrapper,setCommentsWrapper] = useState(false);
const[totalParentCommentsLoaded,setTotalParentCommentsLoaded] = useState(0);

// AI States
const [aiSummary, setAiSummary] = useState("");
const [isSummarizing, setIsSummarizing] = useState(false);
const [chatMessage, setChatMessage] = useState("");
const [chatHistory, setChatHistory] = useState([]);
const [isChatting, setIsChatting] = useState(false);
const { userauth: { access_token }, setuserauth } = useContext(usercontext);

let {title,content,banner,author:{personal_info:{fullname,username : author_username,profile_img}},publishedAt} = blog;

// AI Handlers
const handleGenerateSummary = async () => {
    if (!access_token) return toast.error("Please login to use AI features");
    setIsSummarizing(true);
    let loadingToast = toast.loading("AI is generating a summary...");
    try {
        const rawContent = content[0]?.blocks?.map(b => b.data.text || '').join(" ");
        const { data } = await axios.post(
            import.meta.env.VITE_SERVER_DOMAIN + "/api/ai/summary",
            { content: rawContent },
            { headers: { 'Authorization': `Bearer ${access_token}` } }
        );
        setAiSummary(data.summary);
        toast.dismiss(loadingToast);
        setuserauth(prev => {
            const updated = {...prev, coins: data.remainingCoins};
            storeInsession("user", JSON.stringify(updated));
            return updated;
        });
    } catch (err) {
        toast.dismiss(loadingToast);
        toast.error(err.response?.data?.error || "Failed to generate summary");
    } finally {
        setIsSummarizing(false);
    }
};

const handleChat = async () => {
    if (!access_token) return toast.error("Please login to chat");
    if (!chatMessage.trim()) return;
    
    setIsChatting(true);
    const userMsg = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
        const rawContent = content[0]?.blocks?.map(b => b.data.text || '').join(" ");
        const { data } = await axios.post(
            import.meta.env.VITE_SERVER_DOMAIN + "/api/ai/chat",
            { content: rawContent, message: userMsg },
            { headers: { 'Authorization': `Bearer ${access_token}` } }
        );
        setChatHistory(prev => [...prev, { role: 'ai', text: data.reply }]);
        setuserauth(prev => {
            const updated = {...prev, coins: data.remainingCoins};
            storeInsession("user", JSON.stringify(updated));
            return updated;
        });
    } catch (err) {
        toast.error(err.response?.data?.error || "Failed to chat");
    } finally {
        setIsChatting(false);
    }
};

const fetchBlog = () =>{
    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog",{blog_id})
    .then(async({data:{blog}}) =>{
       
        blog.comments = await fetchComments({blog_id : blog._id,setParentCommentCountFun: setTotalParentCommentsLoaded})
        
setBlog(blog);
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs",{tag:blog.tags[0],limit:6,eliminate_blog:blog_id})
        .then(({data})=>{
setSimilarBlogs(data.blogs);

        })

        setLoading(false);

    })

    .catch(err =>{
        console.log(err);
        setLoading(false);
    })
}

useEffect(()=>{
    resetStates();
fetchBlog();

},[blog_id])

const resetStates = () =>{
    setBlog(blogStructure);
    setSimilarBlogs(null);
    setLoading(true);
    setLikedByUser(false);
    setCommentsWrapper(false);
    setTotalParentCommentsLoaded(0);

}

    return (
       
       <AnimationWrapper>
        {
            loading ? <Loader />
            :
            <BlogContext.Provider value={{blog,setBlog,islikedByUser,setLikedByUser,commentsWrapper,setCommentsWrapper,totalParentCommentsLoaded,setTotalParentCommentsLoaded}}>

<CommentsContainer />

            <div className="max-w-[900px] center py-10 max-lg:px-[5vw]">
<Toaster />
<img src={banner} className="aspect-video" />
<div className="mt-12">
    <h2>{title}</h2>

    <div className="my-6">
        <button 
            onClick={handleGenerateSummary} 
            disabled={isSummarizing}
            className="btn-light bg-purple/10 text-purple font-medium rounded-full py-2 px-6 flex items-center gap-2">
            <span>✨</span> {isSummarizing ? "Summarizing..." : "AI Generate Summary (5 Coins)"}
        </button>
        {aiSummary && (
            <div className="mt-4 p-6 bg-purple/5 border border-purple/20 rounded-2xl">
                <h3 className="text-xl font-bold text-purple mb-2 flex items-center gap-2"><span>✨</span> AI Summary</h3>
                <div className="text-dark-grey leading-relaxed whitespace-pre-wrap">{aiSummary}</div>
            </div>
        )}
    </div>

<div className="flex max-sm:flex-col justify-between my-8">
<div className="flex gap-5 items-start">
    <img src={profile_img} className="w-12 h-12 rounded-full"/>
    <p className="capitalize">{fullname}
        <br />
        <Link to={`/user/${author_username}`} className="underline">@{author_username}</Link>
        {}

    </p>
</div>
<p className="text-dark-grey opacity-75 max-sm:mt-6 max-sm:ml-12 max-sm:pl-5">published on {getDay(publishedAt)}</p>
</div>
</div>

<BlogInteraction />

<div className="my-12 font-gelasio blog-page-content">
{
    content[0].blocks.map((block,i) =>{
        return <div key={i} className="my-4 md:my-8">
<BlogContent block ={block} />
            </div>

    })
}
</div>

<BlogInteraction />
{
    similarBlogs != null && similarBlogs.length ? 
    <>
    <h1 className="text-2xl mt-14 mb-10 font-medium">similar blogs</h1>

    {
        similarBlogs.map((blog,i)=>{
            let {author:{personal_info}} = blog;
            return <AnimationWrapper key={i} transition={{duration:1,delay:i*0.08}}>
                <BlogPostCard content={blog} author={personal_info} />
            </AnimationWrapper>
        })
    }
    </>
    : " "
}

{}
<div className="mt-16 bg-grey p-6 rounded-2xl border border-black/10">
    <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><span>💬</span> Chat with this Article (2 Coins/Msg)</h3>
    
    <div className="flex flex-col gap-4 mb-4 max-h-[300px] overflow-y-auto">
        {chatHistory.map((msg, i) => (
            <div key={i} className={`p-4 rounded-xl max-w-[80%] ${msg.role === 'user' ? 'bg-black text-white self-end rounded-tr-none' : 'bg-white border border-black/10 self-start rounded-tl-none'}`}>
                {msg.text}
            </div>
        ))}
        {isChatting && <div className="text-dark-grey text-sm">AI is typing...</div>}
    </div>

    <div className="flex gap-2">
        <input 
            type="text" 
            placeholder="Ask a question about this article..." 
            className="w-full bg-white p-3 rounded-full border border-black/10 outline-none"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
        />
        <button onClick={handleChat} disabled={isChatting} className="btn-dark px-6 rounded-full">Send</button>
    </div>
</div>

</div>
            </BlogContext.Provider>
        }
       </AnimationWrapper>

    )
}

export default BlogPage;

import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import lightLogo from "../imgs/logo-light.png"
import { storeInsession } from "../common/session";
import darkLogo from "../imgs/logo-dark.png"
import AnimationWrapper from "../common/page-animation";
import lightBanner from "../imgs/blog banner light.png"
import darkBanner from "../imgs/blog banner dark.png"
import toast from "react-hot-toast";
import axios from "axios";
import { useContext, useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { EditorContext } from "../pages/editor.pages";
import EditorJS from "@editorjs/editorjs"
import App, { ThemeContext, usercontext } from "../App";
import { tools } from "./tools.component";

const BlogEditor = () =>{

let blogbannerref = useRef();
let {blog,blog:{title,banner,content,tags,des},setBlog,textEditor,settextEditor,setEditorState} = useContext(EditorContext)

let { userauth : { access_token }, setuserauth } = useContext(usercontext)
let {theme} = useContext(ThemeContext)
let {blog_id} = useParams();
let navigate = useNavigate();

useEffect(()=>{

if(!textEditor.isReady){

    settextEditor( new EditorJS({
        holderId:"textEditor",
        
        data:Array.isArray(content)?content[0] : content,

        tools:tools,

        placeholder:"lets write an awesome story"
    }))
}

},[])

const handlebannerupload =async(e) =>{

    let img = e.target.files[0];

if(!img){
    return toast.error("not uploaded")
}
let loadingToast = toast.loading("uploading...")

const formdata = new FormData();
formdata.append("image",img);
    axios.post(import.meta.env.VITE_SERVER_DOMAIN +'/get-upload',formdata
   
    )
    .then(({data})=>{
        const imageurl = data.url;
        toast.dismiss(loadingToast);
        toast.success("uploaded....");

      setBlog({...blog,banner:imageurl})
    })
    .catch((err)=>{
        toast.dismiss(loadingToast)
        return toast.error(err)
    })
}

const handletitlekeydown = (e) =>{

if(e.keyCode == 13){
    e.preventDefault();

}

}

const handleTitlechange = (e) =>{
    let input = e.target;

    input.style.height = 'auto';
    
    input.style.height = input.scrollHeight + "px";

setBlog({...blog,title:input.value})

}

const handleerror = (e) =>{
    let img = e.target;
    
    img.src = theme =="light" ? lightBanner : darkBanner;

}

const handlePublishEvent = () =>{

if(!banner.length){
    
    return toast.error("upload a blog banner to publish it")
}
if(!title.length){
    return toast.error("write blog title to publish it")
}

if(textEditor.isReady){

textEditor.save().then(data=>{

    if(data.blocks.length){
        setBlog({...blog,content : data});

setEditorState("publish")
    }else{
        return toast.error("write something in your blog to publish it")
    }
})
.catch((err)=>{
    console.log(err);
})
}
}

const handleSaveDraft = (e) =>{

    if(e.target.className.includes("disable")){
        return;
           }
           
               if(!title.length){
               return toast.error("write blog title before before saving it as a draft")
           }

       let loadingToast = toast.loading("saveing draft.....");
       
       e.target.classList.add('disable');

       if(textEditor.isReady){
        textEditor.save().then(content=>{
            let blogObj = {
                title,banner,des,content,tags,draft: true
             
            }
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",{...blogObj,id:blog_id},{
                headers :{

                    'Authorization' : `Bearer ${access_token}`
                }

            })
            
            .then(()=>{
                e.target.classList.remove("disable")
                toast.dismiss(loadingToast);
                toast.success("saved");
            
                setTimeout(()=>{
            navigate("/dashboard/blogs?tab=draft");
                },500);

            })
            .catch(({response})=>{
                e.target.classList.remove("disable")
                toast.dismiss(loadingToast);
                
                return toast.error(response.data.error)
            })

        })
       }

}

const [isGeneratingImage, setIsGeneratingImage] = useState(false);
const [isWriting, setIsWriting] = useState(false);
const [aiPrompt, setAiPrompt] = useState("");

const handleGenerateCover = async () => {
    if (!title.length) return toast.error("Please write a title first to generate a cover image");
    setIsGeneratingImage(true);
    let loadingToast = toast.loading("Generating AI Cover Image...");
    try {
        const { data } = await axios.post(
            import.meta.env.VITE_SERVER_DOMAIN + "/api/ai/generate-cover",
            { title },
            { headers: { 'Authorization': `Bearer ${access_token}` } }
        );
        setBlog({ ...blog, banner: data.url });
        toast.dismiss(loadingToast);
        toast.success("AI Cover Generated!");
        
        setuserauth(prev => {
            const updated = {...prev, coins: data.remainingCoins};
            storeInsession("user", JSON.stringify(updated));
            return updated;
        });
    } catch (err) {
        console.error("Error in handleGenerateCover:", err);
        toast.dismiss(loadingToast);
        toast.error(err.response?.data?.error || "Failed to generate image");
    } finally {
        setIsGeneratingImage(false);
    }
};

const handleAskAI = async () => {
    if (!aiPrompt.length) return toast.error("Please enter a prompt for the AI");
    setIsWriting(true);
    let loadingToast = toast.loading("AI is writing...");
    try {
        const { data } = await axios.post(
            import.meta.env.VITE_SERVER_DOMAIN + "/api/ai/write",
            { prompt: aiPrompt },
            { headers: { 'Authorization': `Bearer ${access_token}` } }
        );
        
        if(textEditor.isReady){
            textEditor.blocks.insert('paragraph', { text: data.text });
        }
        setAiPrompt("");
        toast.dismiss(loadingToast);
        toast.success("AI finished writing!");
        // Deduct 2 coins locally
        setuserauth(prev => {
            const updated = {...prev, coins: data.remainingCoins};
            storeInsession("user", JSON.stringify(updated));
            return updated;
        });
    } catch (err) {
        console.error("Error in handleAskAI:", err);
        toast.dismiss(loadingToast);
        toast.error(err.response?.data?.error || "Failed to generate text");
    } finally {
        setIsWriting(false);
    }
};

    return(
        <>
         <nav className="navbar">
        <Link to="/" className="flex-none w-10">
        <img src ={theme == "light" ? darkLogo : lightLogo} />
        </Link>
      <p className="max-md:hidden text-black line-clamp-1 w-full">{title.length ? title : "new blog"} </p>

<div className = "flex gap-4 ml-auto">
<button className="btn-dark py-2"
onClick={handlePublishEvent}
>
    Publish
</button>
<button className="btn-light py-2"
onClick={handleSaveDraft}
>
    Save Draft
</button>
</div>

    </nav>
<Toaster />
<AnimationWrapper>
<section>
<div className="mx-auto max-w-[900px] w-full">

<div className="flex justify-between items-center mb-4">
    <p className="text-dark-grey">Blog Cover</p>
    <button type="button" onClick={handleGenerateCover} disabled={isGeneratingImage} className="btn-light py-2 text-sm bg-purple/10 text-purple font-medium flex items-center gap-2">
        <span>✨</span> {isGeneratingImage ? "Generating..." : "AI Generate (10 Coins)"}
    </button>
</div>

<div className="relative aspect-video hover:opacity-80 bg-white border-4 border-grey mb-10">
{}
{}

<label htmlFor="uploadbanner">
    <img 
    
    src={banner}
    className="z-20"
    onError={handleerror}
    />
<input 
id="uploadbanner"
type="file"
accept=".png,.jpg,.jpeg"
hidden
onChange={handlebannerupload}

/>
{}
{}

</label>

</div>

<textarea 
defaultValue={title}

placeholder="Blog Title"
className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40 bg-white"

onKeyDown={handletitlekeydown}
onChange={handleTitlechange}
>
</textarea>

<hr className="w-full opacity-10 my-5"/>

<div className="bg-purple/5 p-4 rounded-xl border border-purple/20 mb-5 flex gap-2 items-center">
    <input 
        type="text" 
        placeholder="✨ Ask AI to write... (e.g. Write an intro about React)"
        className="w-full bg-transparent outline-none placeholder:text-purple/50 text-purple"
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
    />
    <button type="button"
        onClick={handleAskAI} 
        disabled={isWriting}
        className="btn-dark whitespace-nowrap bg-purple text-white hover:bg-purple/80">
        {isWriting ? "Writing..." : "Generate (2 Coins)"}
    </button>
</div>

<div id="textEditor" className="font-gelasio"></div>
{}

</div>
</section>
</AnimationWrapper>
</>
       
    )
}

export default BlogEditor;